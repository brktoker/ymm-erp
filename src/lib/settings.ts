// Panel ayarları — şimdilik tarayıcıda (localStorage). Faz 2'de DB'ye taşınır.
// Tek kaynak; ileride para birimi, mükellef vb. options buraya eklenir.

const ESIK_KEY = 'yillikKarsitEsik'

export function getYillikEsik(): number {
    if (typeof window === 'undefined') return 0
    const v = window.localStorage.getItem(ESIK_KEY)
    return v ? Number(v) || 0 : 0
}

export function setYillikEsik(deger: number): void {
    if (typeof window !== 'undefined') window.localStorage.setItem(ESIK_KEY, String(deger))
}
