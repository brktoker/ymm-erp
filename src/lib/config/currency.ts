// Para birimi yapılandırması — TEK KAYNAK (DK-20, ANA KURAL 2).
// Varsayılan TRY; ileride platform ayarlarından değiştirilebilir.
// GÖSTERİM: sembol/ikon YOK — sadece parasal biçim (binlik ayraç + 2 ondalık), ör. 23.914.916,15
// Hem UI (formatAmount) hem Excel (excelNumFmt) buradan beslenir.

export type CurrencyCode = 'TRY' | 'USD' | 'EUR'

export const DEFAULT_CURRENCY: CurrencyCode = 'TRY'

// Yalnızca binlik/ondalık ayraç düzenini belirler (sembol göstermeyiz)
const LOCALE: Record<CurrencyCode, string> = { TRY: 'tr-TR', USD: 'en-US', EUR: 'de-DE' }

// UI'da tutar biçimlendirme — sembolsüz (23914916.15 → "23.914.916,15")
export function formatAmount(
    n: number | null | undefined,
    currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
    if (n === null || n === undefined || !Number.isFinite(n)) return ''
    return new Intl.NumberFormat(LOCALE[currency], {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n)
}

// Excel hücre biçimi — sembolsüz sayısal (değer sayısal kalır, GİB uyumu korunur)
export function excelNumFmt(_currency: CurrencyCode = DEFAULT_CURRENCY): string {
    return '#,##0.00'
}

// Kullanıcı girişini sayıya çevirir — hem "23.914.916,15" (TR) hem "23914916.15" kabul edilir
export function parseAmount(input: string): number | null {
    const s = input.trim()
    if (s === '') return null
    const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
}
