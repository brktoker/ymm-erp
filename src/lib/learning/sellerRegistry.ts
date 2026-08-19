// Satıcı Kayıt Defteri (Faz 3 v3, DK-32) — VKN → { ünvan, deterministik güvenli mi }.
// "detGuvenli": LLM ile deterministik çıkarım bu satıcının şablonunda EŞLEŞTİ mi?
// Eşleştiyse (doğrulandıysa) o satıcının sonraki faturaları LLM'siz (kural yolu) çözülür → token↓.
// DB YOK: .cache/seller-registry.json (git dışı). Best-effort.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const FILE = join(process.cwd(), '.cache', 'seller-registry.json')

export interface SellerEntry {
    unvan: string
    detGuvenli: boolean // deterministik motor bu şablonda LLM ile eşleşti (doğrulandı)
    gorulme: number
    sonGuncelleme: string
}

let map: Record<string, SellerEntry> | null = null

function load(): Record<string, SellerEntry> {
    if (map) return map
    try {
        map = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, SellerEntry>) : {}
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

export function getSellerEntry(vknTckn: string): SellerEntry | null {
    if (!vknTckn) return null
    return load()[vknTckn] ?? null
}

export function getSellerUnvan(vknTckn: string): string | null {
    return getSellerEntry(vknTckn)?.unvan ?? null
}

// Yalnızca LLM çıkarımından öğrenilir. detGuvenli = deterministik ile eşleşme sonucudur.
export function learnSeller(vknTckn: string, unvan: string, detGuvenli: boolean): void {
    if (!/^\d{10,11}$/.test(vknTckn) || !unvan.trim()) return
    const m = load()
    const prev = m[vknTckn]
    m[vknTckn] = {
        unvan: unvan.trim(),
        detGuvenli,
        gorulme: (prev?.gorulme ?? 0) + 1,
        sonGuncelleme: new Date().toISOString(),
    }
    persist()
}

export function registrySize(): number {
    return Object.keys(load()).length
}
