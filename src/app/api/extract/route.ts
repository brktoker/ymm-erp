// Çıkarım API'si: PDF(ler) → bölme → çıkarım → dönem gruplama + ayıklama.
// Node runtime zorunlu (unpdf/exceljs/anthropic Node'a bağlı).
import { NextRequest, NextResponse } from 'next/server'
import { extractPages, splitInvoices, type InvoiceChunk } from '@/lib/extraction/pdf'
import { extractBatch } from '@/lib/extraction/engine'
import { llmAvailable } from '@/lib/extraction/llm'
import { deriveRow } from '@/lib/derive'
import { groupByPeriod, oncekiAyDonem } from '@/lib/period'
import { DEFAULT_MUKELLEF } from '@/lib/config/mukellef'
import type { KdvListRow } from '@/lib/extraction/types'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
    const form = await req.formData()
    const files = form.getAll('files').filter((f): f is File => f instanceof File)
    // Geçici sabit mükellef (DK-22): alan boşsa config'ten gelir; Faz 2'de müşteriden gelecek
    const mukellef = String(form.get('mukellef') || '').trim() || DEFAULT_MUKELLEF
    const hedefDonem = String(form.get('hedefDonem') || '').trim() // opsiyonel

    if (!files.length) return NextResponse.json({ error: 'PDF yüklenmedi' }, { status: 400 })
    if (!/^\d{10,11}$/.test(mukellef))
        return NextResponse.json({ error: 'Geçerli mükellef VKN/TCKN girin' }, { status: 400 })
    if (hedefDonem && !/^\d{6}$/.test(hedefDonem))
        return NextResponse.json({ error: 'Dönem YYYYAA formatında olmalı (ör. 202512)' }, { status: 400 })

    const donem = hedefDonem || null
    const fallback = donem ?? oncekiAyDonem() // tarih okunamazsa

    const chunks: InvoiceChunk[] = []
    for (const file of files) {
        const buf = new Uint8Array(await file.arrayBuffer())
        const pages = await extractPages(buf)
        chunks.push(...splitInvoices(pages))
    }

    const results = await extractBatch(chunks, { mukellefVknTckn: mukellef, donem: fallback })
    const allRows: KdvListRow[] = results.map((r, i) => deriveRow(r.invoice, i + 1, fallback))

    // Mükellef doğrulaması (DK-25): satıcı yanlışlıkla mükellef seçilmiş olabilir
    allRows.forEach((row, i) => {
        const text = chunks[i].text
        // Mükellef VKN faturada hiç yoksa → yanlış mükellef veya yanlış fatura
        if (!text.includes(mukellef)) {
            row.bayraklar.push('mükellef bu faturada bulunamadı — yanlış mükellef/fatura olabilir')
        }
        // Satıcı mükellefle aynıysa → imkansız (satıcı=mükellef-değil, DK-01)
        if (row.saticiVknTckn && row.saticiVknTckn === mukellef) {
            row.bayraklar.push('satıcı mükellefle aynı — hatalı')
        }
    })

    // Dönem gruplama + hedef döneme ait olmayanları ayıkla
    const { gruplar, ayiklanan } = groupByPeriod(allRows, donem)

    const dahilRows = gruplar.flatMap((g) => g.rows)
    return NextResponse.json({
        gruplar,
        ayiklanan,
        meta: {
            hedefDonem: donem,
            toplamFatura: allRows.length,
            dahil: dahilRows.length,
            ayiklananSayi: ayiklanan.length,
            donemler: gruplar.map((g) => ({ donem: g.donem, adet: g.rows.length })),
            llmKullanildi: llmAvailable(),
            llmCount: results.filter((r) => r.engine === 'llm').length,
            cacheCount: results.filter((r) => r.engine === 'cache').length,
            bayrakli: dahilRows.filter((r) => r.bayraklar.length > 0).length,
        },
    })
}
