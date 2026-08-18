// PDF metin çıkarımı + fatura bölme (DK-10).
// Tek PDF birden çok fatura içerebilir; yeni fatura başlangıcı işaretlerle tespit edilir.

import { extractText, getDocumentProxy } from 'unpdf'

export interface InvoiceChunk {
    index: number // 0-tabanlı fatura sırası
    startPage: number // 1-tabanlı
    endPage: number
    text: string // faturanın tüm sayfalarının birleşik metni
    lines: string[] // satır dizisi (yapısal alanlar için)
}

// Yeni fatura başlangıcını belirten işaretler (herhangi biri = yeni belge)
const BASLANGIC = /(Özelleştirme\s*No|Senaryo\s*:|Fatura\s*(No|Numaras[ıi])\s*:)/i

export async function extractPages(buf: Uint8Array): Promise<string[]> {
    const pdf = await getDocumentProxy(buf)
    const { text } = await extractText(pdf, { mergePages: false })
    return text
}

// Sayfaları faturalara böler. Bir sayfada başlangıç işareti varsa yeni fatura sayılır.
export function splitInvoices(pages: string[]): InvoiceChunk[] {
    const chunks: InvoiceChunk[] = []
    let cur: { start: number; texts: string[] } | null = null

    const flush = (endPage: number) => {
        if (!cur) return
        const text = cur.texts.join('\n')
        chunks.push({
            index: chunks.length,
            startPage: cur.start + 1,
            endPage: endPage + 1,
            text,
            lines: text.split('\n').map((l) => l.trim()).filter(Boolean),
        })
    }

    pages.forEach((pageText, i) => {
        const yeniFatura = BASLANGIC.test(pageText)
        if (yeniFatura) {
            if (cur) flush(i - 1)
            cur = { start: i, texts: [pageText] }
        } else if (cur) {
            cur.texts.push(pageText) // önceki faturanın devam sayfası
        } else {
            cur = { start: i, texts: [pageText] }
        }
    })
    if (cur) flush(pages.length - 1)
    return chunks
}

// Türk sayı formatı "16.552.555,44" → 16552555.44
export function parseTrNumber(s: string): number {
    const m = s.match(/-?[\d.]*\d(?:,\d+)?/)
    if (!m) return NaN
    return Number(m[0].replace(/\./g, '').replace(',', '.'))
}

// Metni tek satıra indirger (anchor tabanlı sayısal çıkarım için)
export function flatten(text: string): string {
    return text.replace(/\s+/g, ' ').trim()
}
