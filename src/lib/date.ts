// Tarih biçimlendirme — TEK KAYNAK (ANA KURAL 2).
// İç temsil ISO (YYYY-MM-DD); Excel/gösterim TR (GG.AA.YYYY).

// Excel hücre biçimi: 26.10.2025
export const EXCEL_DATE_FMT = 'dd.mm.yyyy'

// ISO "2025-10-26" → gerçek Date (UTC, saat kayması olmadan). Geçersizse null.
export function isoToDate(iso: string): Date | null {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return null
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

// ISO "2025-10-26" → "26.10.2025" (metinsel gösterim, ör. tabloda)
export function formatDateTr(iso: string): string {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

// Kullanıcı girişini ISO'ya çevirir — hem "26.10.2025" (TR) hem "2025-10-26" (ISO) kabul edilir
export function parseDateInput(input: string): string | null {
    const s = input.trim()
    // ISO: YYYY-MM-DD
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
    // TR: GG.AA.YYYY (. / veya - ayraç)
    m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    return null
}
