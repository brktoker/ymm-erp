'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
    const router = useRouter()
    async function cikis() {
        await fetch('/api/cikis', { method: 'POST' })
        router.push('/giris')
        router.refresh()
    }
    return (
        <button
            onClick={cikis}
            className="rounded border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
            Çıkış
        </button>
    )
}
