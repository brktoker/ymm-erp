// Satıcı Kayıt Defteri (Faz 3 öğrenme, DK-30) — VKN → ünvan.
// LLM bir satıcıyı başarıyla okuduğunda ünvanı öğrenilir; deterministik motor bunu kullanır
// → bilinen satıcının sonraki faturaları LLM'siz çözülebilir (token düşer).
// DB YOK: .cache/seller-registry.json (git dışı). Best-effort; hata sessiz geçilir.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const FILE = join(process.cwd(), '.cache', 'seller-registry.json')

interface Entry {
    unvan: string
    gorulme: number // kaç kez öğrenildi/güncellendi
    sonGuncelleme: string // ISO
}

let map: Record<string, Entry> | null = null

function load(): Record<string, Entry> {
    if (map) return map
    try {
        map = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, Entry>) : {}
    } catch {
        map = {}
    }
    return map
}

function persist(): void {
    try {
        mkdirSync(dirname(FILE), { recursive: true })
        writeFileSync(FILE, JSON.stringify(map, null, 2))
    } catch {
        // best-effort
    }
}

export function getSellerUnvan(vknTckn: string): string | null {
    if (!vknTckn) return null
    return load()[vknTckn]?.unvan ?? null
}

// Yalnızca güvenilir kaynaktan (LLM) çağrılır → yanlış veri öğrenilmesin
export function learnSeller(vknTckn: string, unvan: string): void {
    if (!/^\d{10,11}$/.test(vknTckn) || !unvan.trim()) return
    const m = load()
    m[vknTckn] = {
        unvan: unvan.trim(),
        gorulme: (m[vknTckn]?.gorulme ?? 0) + 1,
        sonGuncelleme: new Date().toISOString(),
    }
    persist()
}

export function registrySize(): number {
    return Object.keys(load()).length
}
