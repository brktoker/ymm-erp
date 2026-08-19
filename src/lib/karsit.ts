// Karşıt inceleme — satıcıya göre gruplama + eşik seçimi (saf mantık, server/client ortak).
// Eşik SATICI TOPLAM MATRAHINA uygulanır (kullanıcı kararı, docs/karsit-inceleme.md).

import type { KdvListRow } from './extraction/types'

export interface SaticiGrup {
    vkn: string
    unvan: string
    rows: KdvListRow[]
    toplamMatrah: number
    toplamKdv: number
}

export function grupla(rows: KdvListRow[]): SaticiGrup[] {
    const map = new Map<string, SaticiGrup>()
    for (const r of rows) {
        const key = r.saticiVknTckn || r.saticiUnvan || '?'
        let g = map.get(key)
        if (!g) {
            g = { vkn: r.saticiVknTckn, unvan: r.saticiUnvan, rows: [], toplamMatrah: 0, toplamKdv: 0 }
            map.set(key, g)
        }
        g.rows.push(r)
        g.toplamMatrah += r.matrah || 0
        g.toplamKdv += r.kdv || 0
        if (!g.unvan && r.saticiUnvan) g.unvan = r.saticiUnvan
    }
    return [...map.values()].sort((a, b) => b.toplamMatrah - a.toplamMatrah)
}

// Eşiği aşan satıcılar (toplam matrah >= eşik)
export function secilenler(rows: KdvListRow[], esik: number): SaticiGrup[] {
    return grupla(rows).filter((g) => g.toplamMatrah >= esik)
}
