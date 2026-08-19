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

export async function extractPages(buf: Uint8Array): Promise<string[]> {
    const pdf = await getDocumentProxy(buf)
    const { text } = await extractText(pdf, { mergePages: false })
    return text
}

// Bir sayfadaki fatura tekil kimliği (ETTN öncelik → Fatura No). Çok-sayfalı faturaları
// doğru gruplamak için: aynı kimlik = aynı fatura (başlık tekrar etmiş), kimlik yok = devam sayfası.
export function faturaKimlik(text: string): string | null {
    const ettn = text.match(
        /ETTN\s*:?\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/,
    )
    if (ettn) return 'ettn:' + ettn[1].toLowerCase()
    const no = text.match(/Fatura\s*(?:No|Numaras[ıi])\s*:?\s*([A-Za-z]{2,5}\d{8,}|[A-Z0-9]{10,})/i)
    if (no) return 'no:' + no[1].toUpperCase()
    return null
}

// Sayfaları faturalara böler — fatura kimliğine göre (çok-sayfalı faturaları birleştirir).
export function splitInvoices(pages: string[]): InvoiceChunk[] {
    const chunks: InvoiceChunk[] = []
    let cur: { start: number; texts: string[]; kimlik: string | null } | null = null

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
        const k = faturaKimlik(pageText)
        if (!cur) {
            cur = { start: i, texts: [pageText], kimlik: k }
        } else if (k && cur.kimlik && k !== cur.kimlik) {
            // Farklı fatura kimliği → yeni fatura
            flush(i - 1)
            cur = { start: i, texts: [pageText], kimlik: k }
        } else {
            // Aynı kimlik (başlık tekrarı) veya kimliksiz (devam sayfası) → mevcut faturaya ekle
            cur.texts.push(pageText)
            if (!cur.kimlik && k) cur.kimlik = k
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
