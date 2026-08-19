// Karşıt inceleme Excel üretici — satıcı başına birebir formatta .xlsx, tek zip.
// Format: docs/karsit-inceleme.md (Sayfa1 10 kolon + Ödeme Şekli Referans sekmesi).

import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import type { KdvListRow } from '../extraction/types'
import { secilenler, type SaticiGrup } from '../karsit'
import { excelNumFmt } from '../config/currency'
import { EXCEL_DATE_FMT, isoToDate } from '../date'

const BASLIKLAR = [
    'Faturanın Tarihi',
    'Faturanın Serisi',
    'Faturanın Numarası',
    'Faturanın Tutarı (TL)',
    'K.D.V(TL)',
    'Defter Kayıt Tarihi',
    'Yevmiye Numarası',
    'Ödeme Şekli ve Ödemeye İlişkin Belge',
    'Açıklama',
    'Hatalı Satır Açıklama',
]
const GENISLIK = [14, 10, 20, 16, 14, 16, 14, 30, 20, 20]
const ODEME_REF: [string | number, string][] = [
    ['Kod', 'Ödeme Şekli'],
    [1, 'Nakit'],
    [2, 'Banka'],
    [3, 'Çek'],
    [4, 'Senet'],
    [5, 'C/H'],
    [6, 'Diğer'],
]

function dosyaAdi(unvan: string): string {
    return (unvan || 'satici').replace(/[^\p{L}\p{N} .-]/gu, '_').slice(0, 80).trim() || 'satici'
}

function saticiWorkbook(grup: SaticiGrup): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Sayfa1')

    BASLIKLAR.forEach((b, i) => {
        const c = ws.getCell(1, i + 1)
        c.value = b
        c.font = { bold: true }
    })
    GENISLIK.forEach((w, i) => (ws.getColumn(i + 1).width = w))

    grup.rows.forEach((r, idx) => {
        const row = idx + 2
        // 1 Tarih (gerçek tarih + GG.AA.YYYY)
        const d = isoToDate(r.tarih)
        if (d) {
            ws.getCell(row, 1).value = d
            ws.getCell(row, 1).numFmt = EXCEL_DATE_FMT
        } else {
            ws.getCell(row, 1).value = r.tarih
        }
        ws.getCell(row, 2).value = r.seri // Seri
        const noCell = ws.getCell(row, 3) // Fatura No (metin)
        noCell.value = r.faturaNo
        noCell.numFmt = '@'
        const mCell = ws.getCell(row, 4) // Tutar = matrah
        mCell.value = r.matrah
        mCell.numFmt = excelNumFmt()
        const kCell = ws.getCell(row, 5) // KDV
        kCell.value = r.kdv
        kCell.numFmt = excelNumFmt()
        // 6-10: Defter Kayıt Tarihi / Yevmiye / Ödeme Şekli / Açıklama / Hatalı → BOŞ (müşavir doldurur)
    })

    // Ödeme Şekli Referans sekmesi (sabit)
    const ref = wb.addWorksheet('Ödeme Şekli Referans')
    ODEME_REF.forEach((r, i) => {
        ref.getCell(i + 1, 1).value = r[0]
        ref.getCell(i + 1, 2).value = r[1]
        if (i === 0) {
            ref.getCell(1, 1).font = { bold: true }
            ref.getCell(1, 2).font = { bold: true }
        }
    })
    ref.getColumn(1).width = 8
    ref.getColumn(2).width = 20

    return wb
}

export async function buildKarsitZip(
    rows: KdvListRow[],
    esik: number,
): Promise<{ buf: Buffer; adet: number }> {
    const secili = secilenler(rows, esik)
    const zip = new JSZip()
    const kullanilan = new Set<string>()
    for (const grup of secili) {
        let ad = dosyaAdi(grup.unvan)
        let n = 1
        while (kullanilan.has(ad)) ad = `${dosyaAdi(grup.unvan)}-${++n}`
        kullanilan.add(ad)
        const wb = saticiWorkbook(grup)
        zip.file(`${ad}.xlsx`, await wb.xlsx.writeBuffer())
    }
    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    return { buf: Buffer.from(buf), adet: secili.length }
}
