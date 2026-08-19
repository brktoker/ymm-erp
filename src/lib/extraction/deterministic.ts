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
    const { items: kalemler, kalite: kalemKalite } = extractKalemler(lines)
    guven.kalemler = kalemKalite

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

const BIRIM = 'Adet|ADET|KG|kğ|M2|M3|MT|METRE|LT|TON|SAAT|GÜN|KWH|KWT'
const TL_TUTAR = `([\\d.]+,\\d{2})\\s*TL` // yalnızca "TL" ekli tutarlar (%oran hariç)

// Kalem tablosunu ayrıştırır (Faz 3 v2, DK-31): tablo bölgesi → çok-satırlı kalemleri birleştir
// → ad/miktar/KDV-dahil çıkar. Kalite skoru döner (adlar temizse yüksek → kural yolu uygun).
function extractKalemler(lines: string[]): { items: ExtractedLineItem[]; kalite: number } {
    // 1. Tablo bölgesi: başlık satırından toplam satırına
    const bas = lines.findIndex(
        (l) => /(Mal\s*\/?\s*Hizmet|Malzeme|Ürün)/i.test(l) && /(Miktar|Birim|Tutar|Açıklama)/i.test(l),
    )
    if (bas < 0) return { items: [], kalite: 0 }
    let son = lines.findIndex(
        (l, i) =>
            i > bas &&
            /(Mal\s*Hizmet\s*Toplam|Toplam\s*İskonto|Toplam\s*Tutar|Hesaplanan\s*KDV|Vergiler\s*Dahil|Ödenecek)/i.test(l),
    )
    if (son < 0) son = lines.length

    // 2. Bölgedeki satırları mantıksal kaleme birleştir (ad birden çok satıra yayılabilir).
    //    Bir kalem: "MIKTAR BIRIM ... %ORAN ... <tutar>TL" ile biter.
    const rowEnd = new RegExp(`(\\d[\\d.,]*)\\s*(${BIRIM})\\b.*%[\\d.,]+.*${TL_TUTAR}`, 'i')
    const tlVar = new RegExp(TL_TUTAR, 'i')
    // Başlık kelimeleri (tutar içermeyen başlık satırları kalem sanılmasın)
    const baslikKw = /Sıra\s*No|Mal\s*\/?\s*Hizmet|Miktar|Birim\s*Fiyat|İskonto|KDV\s*Oran|KDV\s*Tutar|Diğer\s*Vergiler|Açıklama|Ürün\s*Kodu|Malzeme/i
    const rows: string[] = []
    let acc = ''
    for (let i = bas + 1; i < son; i++) {
        const line = lines[i].trim()
        if (!line) continue
        // Sarılmış başlık satırı (başlık kelimesi var, tutar yok) → atla
        if (!acc && baslikKw.test(line) && !tlVar.test(line)) continue
        acc = acc ? acc + ' ' + line : line
        if (rowEnd.test(acc)) {
            rows.push(acc)
            acc = ''
        }
    }

    // 3. Her satırdan ad + miktar + KDV-dahil tutar
    const items: ExtractedLineItem[] = []
    let temiz = 0
    const miktarRe = new RegExp(`(\\d[\\d.,]*)\\s*(${BIRIM})\\b`, 'i')
    const tlRe = new RegExp(TL_TUTAR, 'gi')
    for (const row of rows) {
        const noNum = row.replace(/^\d{1,2}\s+/, '') // baştaki kalem numarası
        const mm = noNum.match(miktarRe)
        if (!mm) continue
        // Ad: miktardan önceki kısım, ":" veya "(" ile başlayan gürültüden kesilir
        let ad = noNum.slice(0, noNum.indexOf(mm[0]))
        ad = ad.split(/\s*[(:]/)[0].replace(/\s+/g, ' ').trim()
        // Son iki TL: [KDV tutarı, mal hizmet tutarı] → KDV-dahil = ikisinin toplamı
        const tls = [...row.matchAll(tlRe)].map((x) => parseTrNumber(x[1]))
        const mal = tls.length ? tls[tls.length - 1] : 0
        const kdv = tls.length >= 2 ? tls[tls.length - 2] : 0
        const kdvDahil = mal + kdv
        if (!ad || !(kdvDahil > 0)) continue
        items.push({ ad, miktar: `${mm[1]} ${mm[2]}`, kdvDahilTutar: kdvDahil })
        if (adTemizMi(ad)) temiz++
    }

    // 4. Kalite: kalem var mı + adların çoğu temiz mi
    let kalite = 0
    if (items.length > 0) {
        const oran = temiz / items.length
        kalite = oran >= 0.7 ? 0.85 : oran >= 0.4 ? 0.55 : 0.35
    }
    return { items, kalite }
}

// Ad temiz mi: gürültü (endeks) veya başlık kelimesi kaçmışsa temiz DEĞİL → LLM'e düşer
function adTemizMi(ad: string): boolean {
    if (/Endeks|Çarpan|Say\.|İlk\s|Son\s*Endeks/i.test(ad)) return false
    // Tablo başlığı ada sızmışsa (bozuk ayrıştırma) → temiz değil
    if (/Tutarı|Oranı|Mal\s*Hizmet|İskonto|Birim\s*Fiyat|Sıra\s*No|Diğer\s*Vergiler|Miktar/i.test(ad)) return false
    // En az bir harf grubu olmalı (sadece sayı/simge değil)
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]{2,}/.test(ad)) return false
    return ad.length >= 2 && ad.length <= 60
}
