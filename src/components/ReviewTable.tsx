'use client'

// Gözden geçirme tablosu — yeniden-kullanılabilir, kolon tanımı tek kaynaktan (ANA KURAL 2).
// 15 GİB kolonunu gösterir; para kolonları CurrencyCell, diğerleri düzenlenebilir input.
// flaggedOnly: sadece bayraklı satırları gösterir (orijinal index korunur → düzenleme doğru satıra yazar).

import { REVIEW_COLS } from '@/lib/columns'
import type { KdvListRow } from '@/lib/extraction/types'
import { CurrencyCell } from './CurrencyCell'

interface ReviewTableProps {
    rows: KdvListRow[]
    onEdit: (rowIndex: number, key: keyof KdvListRow, value: string | number | null) => void
    onApprove: (rowIndex: number) => void // satırı "doğru" işaretle → bayrakları temizle
    flaggedOnly?: boolean
}

const CELL = 'bg-transparent px-1.5 py-1 outline-none focus:bg-blue-50 dark:focus:bg-blue-950/40 rounded'

export function ReviewTable({ rows, onEdit, onApprove, flaggedOnly = false }: ReviewTableProps) {
    const visible = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => !flaggedOnly || row.bayraklar.length > 0)

    if (visible.length === 0) return null

    return (
        <div className="scroll-x pb-1 rounded-lg border border-black/10 dark:border-white/15">
            <table className="text-xs border-collapse w-max min-w-full">
                <thead className="bg-black/5 dark:bg-white/10">
                    <tr>
                        {REVIEW_COLS.map((c) => (
                            <th key={c.key} className="px-2 py-2 text-left font-semibold whitespace-nowrap" title={c.excelLabel}>
                                {c.label}
                            </th>
                        ))}
                        <th className="px-2 py-2 text-left font-semibold">Uyarılar</th>
                        <th className="px-2 py-2 text-center font-semibold">Onay</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map(({ row, index }) => {
                        const flagged = row.bayraklar.length > 0
                        return (
                            <tr key={index} className={flagged ? 'bg-amber-50 dark:bg-amber-950/30' : ''}>
                                {REVIEW_COLS.map((c) => {
                                    const v = row[c.key]
                                    return (
                                        <td key={c.key} className="border-t border-black/5 dark:border-white/10 p-0.5">
                                            {c.kind === 'currency' ? (
                                                <CurrencyCell
                                                    value={(v as number | null) ?? null}
                                                    onCommit={(nv) => onEdit(index, c.key, nv)}
                                                    className={`${c.w} ${CELL}`}
                                                />
                                            ) : (
                                                <input
                                                    value={v === null || v === undefined ? '' : String(v)}
                                                    onChange={(e) => onEdit(index, c.key, e.target.value)}
                                                    className={`${c.w} ${CELL}`}
                                                />
                                            )}
                                        </td>
                                    )
                                })}
                                <td className="border-t border-black/5 dark:border-white/10 px-2 py-1 whitespace-nowrap text-amber-700 dark:text-amber-400">
                                    {flagged ? row.bayraklar.join(' · ') : ''}
                                </td>
                                <td className="border-t border-black/5 dark:border-white/10 px-2 py-1 text-center">
                                    {flagged && (
                                        <button
                                            type="button"
                                            onClick={() => onApprove(index)}
                                            className="rounded bg-green-600 px-2 py-0.5 text-white text-[11px] font-medium hover:bg-green-700 whitespace-nowrap"
                                            title="Bu satır doğru — uyarıları temizle"
                                        >
                                            ✓ Doğru
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
