// GİB "İndirilecek KDV Listesi" .xlsx üretici.
// Başlık metinleri ve kolon sırası örnek dosyalarla birebir aynıdır.
// TOPLAM satırı KULLANILMAZ (DK-17). Dönem başına ayrı sekme veya ayrı dosya (DK-18).

import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import type { KdvListRow } from '../extraction/types'
import type { PeriodGroup } from '../period'
import { excelNumFmt } from '../config/currency'
import { REVIEW_COLS } from '../columns'
import { EXCEL_DATE_FMT, isoToDate } from '../date'

// Kolon başlıkları/genişlikleri/sırası TEK KAYNAK'tan gelir (columns.ts, ANA KURAL 2)
// Veri, örnek dosyadaki gibi B sütunundan başlar (A boş bırakılır)
const ILK_KOLON = 2 // B
const BASLIK_SATIRI = 4
const ILK_VERI_SATIRI = 5

// Tek bir sayfayı GİB düzeniyle doldurur (başlık + kolonlar + veri; TOPLAM YOK)
function fillSheet(ws: ExcelJS.Worksheet, rows: KdvListRow[]): void {
    const titleCell = ws.getCell(2, ILK_KOLON + 7)
    titleCell.value = 'İNDİRİLECEK KDV LİSTESİ'
    titleCell.font = { bold: true }

    REVIEW_COLS.forEach((col, i) => {
        const c = ws.getCell(BASLIK_SATIRI, ILK_KOLON + i)
        c.value = col.excelLabel
        c.font = { bold: true }
        c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
        ws.getColumn(ILK_KOLON + i).width = col.excelW
    })

    rows.forEach((r, idx) => {
        const rowNum = ILK_VERI_SATIRI + idx
        REVIEW_COLS.forEach((col, i) => {
            const cell = ws.getCell(rowNum, ILK_KOLON + i)
            if (col.key === 'tarih') {
                // Gerçek tarih değeri + GG.AA.YYYY biçimi (DK-29)
                const d = isoToDate(r.tarih)
                if (d) {
                    cell.value = d
                    cell.numFmt = EXCEL_DATE_FMT
                } else {
                    cell.value = r.tarih
                }
                return
            }
            cell.value = r[col.key] as string | number | null
            // VKN/TCKN ve dönem metin (baştaki 0 korunur — DK-06); tutarlar TL biçimi (DK-20)
            if (col.key === 'saticiVknTckn' || col.key === 'kdvDonemi') cell.numFmt = '@'
            else if (col.kind === 'currency') cell.numFmt = excelNumFmt()
        })
    })
}

// Tek dosya, dönem başına ayrı sekme
export async function buildWorkbookByPeriod(groups: PeriodGroup[]): Promise<ExcelJS.Workbook> {
    const wb = new ExcelJS.Workbook()
    if (groups.length === 0) {
        fillSheet(wb.addWorksheet('İndirilecek KDV Listesi'), [])
        return wb
    }
    for (const g of groups) {
        fillSheet(wb.addWorksheet(g.donem), g.rows)
    }
    return wb
}

export async function buildSingleFileBuffer(groups: PeriodGroup[]): Promise<Buffer> {
    const wb = await buildWorkbookByPeriod(groups)
    return Buffer.from(await wb.xlsx.writeBuffer())
}

// Dönem başına ayrı dosya → tek zip
export async function buildZipBuffer(groups: PeriodGroup[]): Promise<Buffer> {
    const zip = new JSZip()
    for (const g of groups) {
        const wb = new ExcelJS.Workbook()
        fillSheet(wb.addWorksheet(g.donem), g.rows)
        const buf = await wb.xlsx.writeBuffer()
        zip.file(`indirilecek-kdv-listesi-${g.donem}.xlsx`, buf)
    }
    return zip.generateAsync({ type: 'nodebuffer' })
}

// --- Geriye dönük (prove script + tek sayfa) ---
export async function buildKdvListWorkbook(rows: KdvListRow[]): Promise<ExcelJS.Workbook> {
    const wb = new ExcelJS.Workbook()
    fillSheet(wb.addWorksheet('İndirilecek KDV Listesi'), rows)
    return wb
}

export async function writeKdvListFile(rows: KdvListRow[], path: string): Promise<void> {
    const wb = await buildKdvListWorkbook(rows)
    await wb.xlsx.writeFile(path)
}

export async function buildKdvListBuffer(rows: KdvListRow[]): Promise<Buffer> {
    const wb = await buildKdvListWorkbook(rows)
    return Buffer.from(await wb.xlsx.writeBuffer())
}
