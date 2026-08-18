// Dönem gruplama + hedef dönem doğrulaması (DK-18/DK-19).
// - Hedef dönem seçiliyse: eşleşmeyen faturalar AYIKLANIR (çıktıya girmez).
// - Hedef dönem boşsa: tüm faturalar dönemlerine göre gruplanır (çok-dönem çıktı).

import type { KdvListRow } from './extraction/types'

export interface PeriodGroup {
    donem: string // YYYYMM
    rows: KdvListRow[]
}

export interface AyiklananRow {
    row: KdvListRow
    sebep: string
}

export interface PeriodResult {
    gruplar: PeriodGroup[] // çıktıya girecek, döneme göre gruplu (sıra no yeniden verilir)
    ayiklanan: AyiklananRow[] // hedef döneme ait olmayanlar
}

// Bir önceki ayın dönemi (müşteri akışı varsayılanı)
export function oncekiAyDonem(now = new Date()): string {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function groupByPeriod(rows: KdvListRow[], hedefDonem: string | null): PeriodResult {
    const dahil: KdvListRow[] = []
    const ayiklanan: AyiklananRow[] = []

    for (const row of rows) {
        if (hedefDonem && row.kdvDonemi !== hedefDonem) {
            ayiklanan.push({
                row,
                sebep: `${row.kdvDonemi} dönemine ait (hedef: ${hedefDonem})`,
            })
        } else {
            dahil.push(row)
        }
    }

    // Döneme göre grupla, dönemleri artan sırala, her grupta sıra no'yu 1'den başlat
    const map = new Map<string, KdvListRow[]>()
    for (const row of dahil) {
        if (!map.has(row.kdvDonemi)) map.set(row.kdvDonemi, [])
        map.get(row.kdvDonemi)!.push(row)
    }
    const gruplar: PeriodGroup[] = [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([donem, gr]) => ({
            donem,
            rows: gr.map((r, i) => ({ ...r, siraNo: i + 1 })),
        }))

    return { gruplar, ayiklanan }
}
