'use client'

// Para hücresi — TL biçimli gösterir, tıklayınca ham sayı düzenlenir (DK-20/DK-21).
// Tek kaynak currency util'inden beslenir (ANA KURAL 2).

import { useState } from 'react'
import { formatAmount, parseAmount } from '@/lib/config/currency'

interface CurrencyCellProps {
    value: number | null
    onCommit: (v: number | null) => void
    className?: string
}

export function CurrencyCell({ value, onCommit, className = '' }: CurrencyCellProps) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')

    if (editing) {
        return (
            <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                    onCommit(parseAmount(draft))
                    setEditing(false)
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditing(false)
                }}
                className={`${className} text-right tabular-nums`}
            />
        )
    }

    return (
        <button
            type="button"
            onClick={() => {
                setDraft(value === null || value === undefined ? '' : String(value))
                setEditing(true)
            }}
            className={`${className} text-right tabular-nums w-full cursor-text`}
            title="Düzenlemek için tıkla"
        >
            {value === null || value === undefined ? '—' : formatAmount(value)}
        </button>
    )
}
