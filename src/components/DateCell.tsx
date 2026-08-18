'use client'

// Tarih hücresi — GG.AA.YYYY gösterir, tıklayınca düzenlenir; içeride ISO kalır (DK-29).
// Tek kaynak date util'inden beslenir (ANA KURAL 2).

import { useState } from 'react'
import { formatDateTr, parseDateInput } from '@/lib/date'

interface DateCellProps {
    value: string // ISO YYYY-MM-DD
    onCommit: (iso: string) => void
    className?: string
}

export function DateCell({ value, onCommit, className = '' }: DateCellProps) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')

    if (editing) {
        return (
            <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                    onCommit(parseDateInput(draft) ?? value)
                    setEditing(false)
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditing(false)
                }}
                className={className}
                placeholder="GG.AA.YYYY"
            />
        )
    }

    return (
        <button
            type="button"
            onClick={() => {
                setDraft(formatDateTr(value))
                setEditing(true)
            }}
            className={`${className} w-full cursor-text text-left`}
            title="Düzenlemek için tıkla"
        >
            {value ? formatDateTr(value) : '—'}
        </button>
    )
}
