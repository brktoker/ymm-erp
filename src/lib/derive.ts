// Çıkarılan faturayı GİB liste satırına türetir.
// Tüm türetme kuralları docs/dogrulanmis-kurallar.md (DK-xx) referanslıdır.

import type { ExtractedInvoice, KdvListRow } from './extraction/types'
import { TOP_KALEM } from './config/extraction'

const GUVEN_ESIGI = 0.75

// VKN (10 hane) checksum doğrulaması — DK-06
export function vknGecerli(vkn: string): boolean {
    if (!/^\d{10}$/.test(vkn)) return false
    const d = vkn.split('').map(Number)
    let sum = 0
    for (let i = 0; i < 9; i++) {
        const tmp = (d[i] + (9 - i)) % 10
        sum = tmp === 9 ? sum + tmp : (tmp * 2 ** (9 - i)) % 9 + sum
    }
    const last = (10 - (sum % 10)) % 10
    return last === d[9]
}

// TCKN (11 hane) checksum doğrulaması — DK-06
export function tcknGecerli(t: string): boolean {
    if (!/^[1-9]\d{10}$/.test(t)) return false
    const d = t.split('').map(Number)
    const tek = d[0] + d[2] + d[4] + d[6] + d[8]
    const cift = d[1] + d[3] + d[5] + d[7]
    const h10 = (tek * 7 - cift) % 10
    if ((h10 + 10) % 10 !== d[9]) return false
    const h11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10
    return h11 === d[10]
}

export function kimlikGecerli(vknTckn: string): boolean {
    if (vknTckn.length === 10) return vknGecerli(vknTckn)
    if (vknTckn.length === 11) return tcknGecerli(vknTckn)
    return false
}

// KDV dahil tutara göre en yüksek TOP_KALEM kalem → ad ve miktar (DK-05, config'te)
function topKalemler(inv: ExtractedInvoice): { malCinsi: string; miktar: string } {
    const sirali = [...inv.kalemler].sort((a, b) => b.kdvDahilTutar - a.kdvDahilTutar)
    const secili = sirali.slice(0, TOP_KALEM)
    return {
        malCinsi: secili.map((k) => k.ad.trim()).join(', '),
        miktar: secili.map((k) => k.miktar.trim()).join(', '),
    }
}

// Fatura tarihinden (YYYY-MM-DD) KDV dönemi (YYYYMM) türetir; geçersizse null
export function donemFromTarih(tarih: string): string | null {
    const m = tarih.match(/^(\d{4})-(\d{2})-\d{2}/)
    return m ? `${m[1]}${m[2]}` : null
}

export function deriveRow(
    inv: ExtractedInvoice,
    siraNo: number,
    fallbackDonem: string,
): KdvListRow {
    const bayraklar: string[] = []
    // KDV dönemi HER ZAMAN fatura tarihinden (DK-18); tarih okunamazsa fallback + bayrak
    const kdvDonemi = donemFromTarih(inv.faturaTarihi) ?? fallbackDonem
    if (!donemFromTarih(inv.faturaTarihi)) bayraklar.push('tarih okunamadı → dönem fallback')

    // Düşük güvenli alanları bayrakla (review'a düşsün) — "asla sessizce yanlış"
    for (const [alan, skor] of Object.entries(inv.guven)) {
        if (typeof skor !== 'number' || skor >= GUVEN_ESIGI) continue
        // %0 KDV geçerli bir orandır (bazı hizmetler/istisnalar) — kdv=0 bayraklanmaz (DK-26)
        if (alan === 'kdv' && inv.kdv === 0) continue
        bayraklar.push(`${alan}: düşük güven (${skor.toFixed(2)})`)
    }

    // Kimlik doğrulama (DK-06)
    if (!kimlikGecerli(inv.saticiVknTckn)) {
        bayraklar.push('vkn/tckn: checksum geçersiz')
    }

    // Sayısal alanları güvenli hale getir — NaN asla çıktıya yazılmaz, bayraklanır
    const matrah = safeNum(inv.matrah, 'matrah', bayraklar)
    const kdv = safeNum(inv.kdv, 'kdv', bayraklar)

    // KDV/matrah makul bandı — karışık oranlı faturalarda harmanlanmış oran arada olur (DK-15).
    // Tek orana (%1/%10/%20) zorlamayız; sadece imkansız/şüpheli oranları bayraklarız.
    if (matrah > 0 && kdv > 0) {
        const oran = kdv / matrah
        // %20'yi (en yüksek KDV) aşan veya ~%0.5'in altına düşen oran şüphelidir
        if (oran > 0.205 || oran < 0.005)
            bayraklar.push(`kdv/matrah oranı sıradışı (%${(oran * 100).toFixed(1)})`)
    }

    // Tevkifat kolonları (DK-02): fatura tevkifat KDV'sini YAZAR, tahmin yok
    let tevkifatDisiKdv: number | null = null
    let ikiNoluKdv: number | null = null
    if (inv.tevkifatKdv && inv.tevkifatKdv > 0) {
        ikiNoluKdv = round2(inv.tevkifatKdv)
        tevkifatDisiKdv = round2(kdv - inv.tevkifatKdv)
        if (tevkifatDisiKdv < 0) bayraklar.push('tevkifat KDV > toplam KDV')
    }

    // Toplam indirilen KDV (DK-02): tevkifatsız = kdv; tevkifatlı = (11)+(12) = kdv
    const toplamIndirilenKdv = kdv

    const { malCinsi, miktar } = topKalemler(inv)
    if (inv.kalemler.length === 0) bayraklar.push('kalem bulunamadı')

    return {
        siraNo,
        tarih: inv.faturaTarihi,
        seri: '',
        faturaNo: inv.faturaNo,
        saticiUnvan: inv.saticiUnvan,
        saticiVknTckn: inv.saticiVknTckn,
        malCinsi,
        miktar,
        matrah: round2(matrah),
        kdv: round2(kdv),
        tevkifatDisiKdv,
        ikiNoluKdv,
        toplamIndirilenKdv,
        ggbTescilNo: inv.ggbTescilNo ?? '',
        kdvDonemi,
        bayraklar,
    }
}

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100
}

// NaN/sonsuz değerleri 0'a indirger ve bayraklar — çıktıya asla geçersiz sayı gitmez
function safeNum(n: number, alan: string, bayraklar: string[]): number {
    if (!Number.isFinite(n)) {
        bayraklar.push(`${alan}: okunamadı`)
        return 0
    }
    return n
}
