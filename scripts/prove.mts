// Faz 1 ispatı: PDF → çıkarım → türetme → birebir .xlsx
// Kullanım: npx tsx scripts/prove.mts <pdf> <mukellefVknTckn> <donem> [outXlsx]

import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { extractPages, splitInvoices } from '../src/lib/extraction/pdf'

// .env.local'i yükle (Next.js ile aynı dosya) — anahtar shell'de yoksa buradan okunur
if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
}

import { extractBatch } from '../src/lib/extraction/engine'
import { llmAvailable } from '../src/lib/extraction/llm'
import { deriveRow } from '../src/lib/derive'
import { writeKdvListFile } from '../src/lib/export/excel'
import type { KdvListRow } from '../src/lib/extraction/types'

const [pdfPath, mukellef, donem, out = '/tmp/kdv-listesi.xlsx'] = process.argv.slice(2)

const buf = await readFile(pdfPath)
const pages = await extractPages(new Uint8Array(buf))
const chunks = splitInvoices(pages)
console.log(`Sayfa: ${pages.length} | Fatura (chunk): ${chunks.length}`)
console.log(`Motor: ${llmAvailable() ? 'LLM (birincil)' : 'deterministik (LLM anahtarı yok)'}\n`)

const results = await extractBatch(chunks, { mukellefVknTckn: mukellef, donem })
const rows: KdvListRow[] = results.map((r, i) => deriveRow(r.invoice, i + 1, donem))
const llmCount = results.filter((r) => r.engine === 'llm').length

// İlk faturayı detaylı yazdır (ispat)
const r = rows[0]
console.log('--- 1. FATURA → SATIR ---')
console.log('Satıcı Ünvan :', r.saticiUnvan, r.bayraklar.includes('vkn/tckn: checksum geçersiz') ? '' : '')
console.log('VKN/TCKN     :', r.saticiVknTckn)
console.log('Fatura No    :', r.faturaNo)
console.log('Tarih        :', r.tarih)
console.log('Mal Cinsi    :', r.malCinsi)
console.log('Miktar       :', r.miktar)
console.log('Matrah (K9)  :', r.matrah)
console.log("KDV (K10)    :", r.kdv)
console.log('Tevkifat dışı (K11):', r.tevkifatDisiKdv)
console.log('2 Nolu (K12) :', r.ikiNoluKdv)
console.log('Toplam İnd (K13):', r.toplamIndirilenKdv)
console.log('Dönem (K15)  :', r.kdvDonemi)
console.log('Bayraklar    :', r.bayraklar.length ? r.bayraklar.join(' | ') : '(yok)')

// Kalite özeti
const temiz = rows.filter((r) => r.bayraklar.length === 0).length
const sayisalTam = rows.filter((r) => r.matrah > 0 && r.kdv > 0).length
console.log('\n--- KALİTE ÖZETİ ---')
const cacheCount = results.filter((r) => r.engine === 'cache').length
console.log(`Toplam satır      : ${rows.length}`)
console.log(`LLM ile çıkarılan  : ${llmCount}/${rows.length}`)
console.log(`Önbellekten (bedava): ${cacheCount}/${rows.length}`)
console.log(`Bayraksız (temiz) : ${temiz}`)
console.log(`Matrah+KDV okundu : ${sayisalTam}/${rows.length}`)
console.log(`Review gerektiren : ${rows.length - temiz}`)

// Analiz için satırları + motor bilgisini JSON'a yaz (tekrar API çağrısı olmadan inceleme)
const { writeFileSync } = await import('node:fs')
writeFileSync(
    out.replace(/\.xlsx$/, '') + '.rows.json',
    JSON.stringify(
        rows.map((r, i) => ({ ...r, _engine: results[i].engine, _fallback: results[i].fallbackReason })),
        null,
        2,
    ),
)

await writeKdvListFile(rows, out)
console.log(`\n✓ ${rows.length} satır → ${out}`)
