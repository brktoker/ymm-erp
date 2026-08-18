// Deterministik ayrıştırıcı — resolver zincirinin "genel kalıp" halkası (mimari.md).
// Sayısal/kimlik alanlarını anchor'larla güvenilir çıkarır; ünvan/kalem gibi
// şablona bağlı alanlarda düşük güven verir → review'a düşer (DK-09).
// Üretimde asıl motor LLM'dir; bu halka bilinen/temiz layout'lar için hızlı yoldur.

import type { ExtractedInvoice, ExtractedLineItem } from './types'
import { flatten, parseTrNumber } from './pdf'

interface ParseCtx {
    mukellefVknTckn: string // satıcı = mükellef-değil (DK-01)
    donem: string // "202512"
}

const TL = String.raw`[\d.]+,\d{2}`

export function parseDeterministic(
    text: string,
    lines: string[],
    ctx: ParseCtx,
): ExtractedInvoice {
    const flat = flatten(text)
    const guven: ExtractedInvoice['guven'] = {}

    // Fatura No (DK-07) — "Fatura No: XXX" / "Fatura Numarası XXX"
    const faturaNo = pick(flat, /Fatura\s*(?:No|Numaras[ıi])\s*:?\s*([A-Z0-9]{8,})/i)
    guven.faturaNo = faturaNo ? 0.95 : 0

    // Tarih (DK-08) — "Tarihi: 30-12-2025" / "23.01.2025"
    const rawTarih = pick(flat, /Tarih[ıi]?\s*:?\s*(\d{2}[.\-/]\d{2}[.\-/]\d{4})/i)
    const faturaTarihi = normalizeTarih(rawTarih)
    guven.faturaTarihi = faturaTarihi ? 0.95 : 0

    // Tevkifat tespiti (DK-03)
    const tevkifatli =
        /Fatura\s*Tipi\s*:?\s*TEVKIFAT/i.test(flat) ||
        /KDV\s*TEVKİFAT|Tevkifat\s*Sebebi|Hesaplanan\s*KDV\s*Tevkifat/i.test(flat)

    // Matrah (DK-11) — "Mal Hizmet Toplam Tutarı 23.914.916,15"
    const matrah = num(pick(flat, new RegExp(String.raw`Mal\s*Hizmet\s*Toplam\s*Tutar[ıi]\s*(${TL})`, 'i')))
    guven.matrah = matrah > 0 ? 0.95 : 0

    // KDV (DK-04) — sadece KDV; "Hesaplanan KDV (GERÇEK)(%..) tutar", Tevkifat/Konaklama HARİÇ
    const kdv = num(
        pick(flat, new RegExp(String.raw`Hesaplanan\s*KDV(?:\s*GERC?EK|\s*GERÇEK)?\s*\(%[\d.,]+\)\s*(${TL})`, 'i')),
    )
    guven.kdv = kdv > 0 ? 0.9 : 0

    // Tevkifat KDV (DK-02) — faturada yazan değer, tahmin yok
    let tevkifatKdv: number | undefined
    if (tevkifatli) {
        const t = num(pick(flat, new RegExp(String.raw`Hesaplanan\s*KDV\s*Tevkifat\s*\(%[\d.,]+\)\s*(${TL})`, 'i')))
        if (t > 0) {
            tevkifatKdv = t
            guven.tevkifatKdv = 0.9
        } else {
            guven.tevkifatKdv = 0 // tevkifatlı ama tutar okunamadı → bayrak
        }
    }

    // Satıcı = mükellef olmayan taraf (DK-01)
    const { unvan, vknTckn, guven: gSat } = extractSatici(text, lines, ctx.mukellefVknTckn)
    guven.saticiUnvan = gSat.unvan
    guven.saticiVknTckn = gSat.vkn

    // Kalemler (şablona bağlı — düşük güven, review'a açık)
    const kalemler = extractKalemler(lines)
    guven.kalemler = kalemler.length > 0 ? 0.55 : 0

    return {
        saticiUnvan: unvan,
        saticiVknTckn: vknTckn,
        faturaNo,
        faturaTarihi,
        kalemler,
        matrah,
        kdv,
        tevkifatKdv,
        guven,
    }
}

// --- yardımcılar ---

function pick(s: string, re: RegExp): string {
    const m = s.match(re)
    return m ? m[1].trim() : ''
}

function num(s: string): number {
    if (!s) return NaN
    const n = parseTrNumber(s)
    return Number.isFinite(n) ? n : NaN
}

function normalizeTarih(raw: string): string {
    const m = raw.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/)
    if (!m) return ''
    return `${m[3]}-${m[2]}-${m[1]}` // YYYY-MM-DD
}

// Satıcı: mükellef olmayan taraf (DK-01). Etiketli (VKN:/Vergi No/TCKN:) kimlik
// tercih edilir; telefon vb. numaralar dışlanır.
function extractSatici(
    text: string,
    lines: string[],
    mukellef: string,
): { unvan: string; vknTckn: string; guven: { unvan: number; vkn: number } } {
    const flat = flatten(text)
    const etiketli = [
        ...flat.matchAll(/(?:VKN|TCKN|Vergi\s*(?:Kimlik\s*)?No)\s*:?\s*(\d{10,11})\b/gi),
    ].map((m) => m[1])
    let saticiVkn = etiketli.find((k) => k !== mukellef) ?? ''
    // Etiketli bulunamazsa: tüm kimliklerden mükellef olmayan (telefon dışla: Tel: sonrası)
    if (!saticiVkn) {
        const telefonlar = new Set(
            [...flat.matchAll(/Tel\s*:?\s*(\d{10,11})/gi)].map((m) => m[1]),
        )
        saticiVkn =
            [...text.matchAll(/\b(\d{10,11})\b/g)]
                .map((m) => m[1])
                .find((k) => k !== mukellef && !telefonlar.has(k)) ?? ''
    }

    // Ünvan: EDM/e-Arşiv layout'unda "Üretilmiştir" satırından sonra gelen ünvan bloğu
    let unvan = ''
    const idx = lines.findIndex((l) => /Üretilmiştir/i.test(l))
    if (idx >= 0) {
        const blok: string[] = []
        for (let i = idx + 1; i < lines.length && blok.length < 3; i++) {
            if (/MAH\.|CAD|SOK|SK\.|BULVAR|BLOK|Tel:|Vergi/i.test(lines[i])) break
            blok.push(lines[i])
        }
        unvan = blok.join(' ').replace(/\s+/g, ' ').trim()
    }

    return {
        unvan,
        vknTckn: saticiVkn,
        guven: {
            unvan: unvan ? 0.6 : 0, // şablona bağlı → düşük güven, review'a açık
            vkn: saticiVkn ? 0.85 : 0,
        },
    }
}

// Kalemler: "N Ad ... Miktar Birim ..." — şablona çok bağlı, best-effort.
// Sıralama için kalem bloğundaki en büyük TL değeri (net satır tutarı) kullanılır.
function extractKalemler(lines: string[]): ExtractedLineItem[] {
    const items: ExtractedLineItem[] = []
    // Kalem numarası ile başlayan satırların indeksleri (blok sınırları)
    const baslar = lines
        .map((l, i) => (/^(\d{1,2})\s+\D/.test(l) ? i : -1))
        .filter((i) => i >= 0)
    for (let b = 0; b < baslar.length; b++) {
        const i = baslar[b]
        const son = b + 1 < baslar.length ? baslar[b + 1] : Math.min(i + 6, lines.length)
        const blok = lines.slice(i, son).join(' ')
        const m = lines[i].match(/^(\d{1,2})\s+(.+)/)
        if (!m) continue
        const miktarM = blok.match(/(\d[\d.,]*)\s*(Adet|KG|kğ|M2|M3|LT|METRE|TON|SAAT|GÜN|ADET)/i)
        const tutarlar = [...blok.matchAll(new RegExp(TL, 'g'))].map((x) => parseTrNumber(x[0]))
        const enBuyuk = tutarlar.length ? Math.max(...tutarlar) : 0
        if (!miktarM && !enBuyuk) continue
        // Ad: ilk parantezden önceki temiz kısım ("Ahır (01.12...)" → "Ahır")
        const ad = m[2].split(/\s*\(/)[0].replace(/\s+/g, ' ').trim()
        items.push({
            ad,
            miktar: miktarM ? `${miktarM[1]} ${miktarM[2]}` : '',
            kdvDahilTutar: enBuyuk,
        })
    }
    return items
}
