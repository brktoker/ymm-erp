'use client'

// Geçici panel girişi — tek parola. (Supabase Auth ertelendi.)
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GirisPage() {
    const router = useRouter()
    const [parola, setParola] = useState('')
    const [hata, setHata] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setHata('')
        setLoading(true)
        const res = await fetch('/api/giris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parola }),
        })
        setLoading(false)
        if (!res.ok) {
            setHata('Parola hatalı.')
            return
        }
        router.push('/panel')
        router.refresh()
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm rounded-xl border border-black/10 dark:border-white/15 p-6 flex flex-col gap-4"
            >
                <div>
                    <h1 className="text-xl font-bold">Panel Girişi</h1>
                    <p className="text-sm opacity-70">İndirilecek KDV Listesi Otomasyonu</p>
                </div>

                <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium opacity-70">Parola</span>
                    <input
                        type="password"
                        required
                        autoFocus
                        value={parola}
                        onChange={(e) => setParola(e.target.value)}
                        className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm"
                    />
                </label>

                {hata && <p className="text-sm text-red-600">{hata}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
                </button>
            </form>
        </main>
    )
}
