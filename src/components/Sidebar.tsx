'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/LogoutButton'

const MENU = [
    { href: '/panel', label: 'Fatura Çıkarma', icon: '📄' },
    { href: '/panel/karsit-inceleme', label: 'Karşıt İnceleme', icon: '🔍' },
    { href: '/panel/ayarlar', label: 'Ayarlar', icon: '⚙️' },
]

export function Sidebar() {
    const pathname = usePathname()
    return (
        <aside className="w-56 shrink-0 border-r border-black/10 dark:border-white/15 flex flex-col p-3 min-h-screen">
            <div className="px-2 py-3 mb-2">
                <p className="text-sm font-bold leading-tight">İndirilecek KDV</p>
                <p className="text-xs opacity-60">Otomasyon Paneli</p>
            </div>
            <nav className="flex flex-col gap-1">
                {MENU.map((m) => {
                    const aktif = pathname === m.href
                    return (
                        <Link
                            key={m.href}
                            href={m.href}
                            className={`flex items-center gap-2 rounded px-3 py-2 text-sm transition ${
                                aktif
                                    ? 'bg-blue-600 text-white font-medium'
                                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                        >
                            <span>{m.icon}</span>
                            {m.label}
                        </Link>
                    )
                })}
            </nav>
            <div className="mt-auto pt-3">
                <LogoutButton />
            </div>
        </aside>
    )
}
