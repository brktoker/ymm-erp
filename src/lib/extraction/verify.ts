// Doğrulama (Faz 3 v3, DK-32) — deterministik çıkarım, LLM ile eşleşiyor mu?
// Eşleşirse o satıcının şablonunda deterministik motora GÜVENİLEBİLİR → kural yolu açılır.

import type { ExtractedInvoice } from './types'
import { TOP_KALEM } from '../config/extraction'

function norm(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9çğıöşü ]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function sayiYakin(a: number, b: number): boolean {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false
    if (a === b) return true
    const buyuk = Math.max(Math.abs(a), Math.abs(b))
    return buyuk > 0 ? Math.abs(a - b) / buyuk < 0.01 : true // %1 tolerans
}

function topAdlar(inv: ExtractedInvoice): string[] {
    return [...inv.kalemler]
        .sort((a, b) => b.kdvDahilTutar - a.kdvDahilTutar)
        .slice(0, TOP_KALEM)
        .map((k) => norm(k.ad))
        .filter(Boolean)
}

// Mal cinsi (top-N ad) yakın mı: her LLM adı, bir deterministik adında geçiyor (veya tersi)
function malCinsiYakin(det: ExtractedInvoice, llm: ExtractedInvoice): boolean {
    const l = topAdlar(llm)
    if (l.length === 0) return true // LLM kalem vermediyse bu kontrolü atla
    const d = topAdlar(det)
    if (d.length === 0) return false
    return l.every((ln) => d.some((dn) => dn.includes(ln) || ln.includes(dn)))
}

// Deterministik sonuç LLM ile eşleşiyor mu (satıcı şablonu güvenilir mi)?
export function deterministikEslesir(det: ExtractedInvoice, llm: ExtractedInvoice): boolean {
    const noEsit = det.faturaNo.length > 0 && norm(det.faturaNo) === norm(llm.faturaNo)
    return (
        noEsit &&
        sayiYakin(det.matrah, llm.matrah) &&
        sayiYakin(det.kdv, llm.kdv) &&
        malCinsiYakin(det, llm)
    )
}
