'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useExtraction } from '@/components/providers/ExtractionProvider'
import { useLoader } from '@/components/providers/LoaderProvider'
import { getYillikEsik } from '@/lib/settings'
import { grupla } from '@/lib/karsit'
import { formatAmount } from '@/lib/config/currency'

export default function KarsitIncelemePage() {
    const { gruplar } = useExtraction()
    const { wrap } = useLoader()
    const [esik, setEsik] = useState(0)
    const [hata, setHata] = useState('')

    useEffect(() => setEsik(getYillikEsik()), [])

    const rows = useMemo(() => gruplar.flatMap((g) => g.rows), [gruplar])
    const saticilar = useMemo(() => grupla(rows), [rows])
    const secili = useMemo(() => saticilar.filter((s) => s.toplamMatrah >= esik), [saticilar, esik])

    async function indir() {
        setHata('')
        await wrap('Karşıt inceleme dosyaları hazırlanıyor…', async () => {
            const res = await fetch('/api/karsit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows, esik }),
            })
            if (!res.ok) {
                setHata('İndirme başarısız')
                return
            }
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'karsit-inceleme.zip'
            a.click()
            URL.revokeObjectURL(url)
        })
    }

    return (
        <main className="max-w-4xl">
            <h1 className="text-2xl font-bold mb-1">Karşıt İnceleme</h1>
            <p className="text-sm opacity-70 mb-6">
                Yıllık eşiği aşan satıcılar için satıcı başına Excel üretilir (birebir GİB formatı).
            </p>

            {rows.length === 0 ? (
                <div className="rounded-lg border border-black/10 dark:border-white/15 p-6 text-sm">
                    Önce <Link href="/panel" className="text-blue-600 underline">Fatura Çıkarma</Link>{' '}
                    sayfasında faturaları çıkarın. Çıkarılan veriler burada otomatik kullanılır.
                </div>
            ) : esik <= 0 ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-6 text-sm">
                    Önce <Link href="/panel/ayarlar" className="text-blue-600 underline">Ayarlar</Link>{' '}
                    sayfasından <b>yıllık eşik</b> tutarını girin.
                </div>
            ) : (
                <>
                    <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
                        <span>Eşik: <b>{formatAmount(esik)} ₺</b></span>
                        <span>Toplam satıcı: <b>{saticilar.length}</b></span>
                        <span className="text-green-600">Seçilen (eşik üstü): <b>{secili.length}</b></span>
                        <button
                            onClick={indir}
                            disabled={secili.length === 0}
                            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                            Karşıt İnceleme Excelleri (zip)
                        </button>
                    </div>
                    {hata && <p className="text-sm text-red-600 mb-3">{hata}</p>}

                    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
                        <table className="text-sm w-full">
                            <thead className="bg-black/5 dark:bg-white/10">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">Satıcı</th>
                                    <th className="px-3 py-2 text-left font-semibold">VKN/TCKN</th>
                                    <th className="px-3 py-2 text-right font-semibold">Fatura</th>
                                    <th className="px-3 py-2 text-right font-semibold">Toplam Matrah</th>
                                    <th className="px-3 py-2 text-center font-semibold">Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {saticilar.map((s, i) => {
                                    const sec = s.toplamMatrah >= esik
                                    return (
                                        <tr key={i} className={sec ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                                            <td className="px-3 py-1.5 border-t border-black/5 dark:border-white/10">{s.unvan || '—'}</td>
                                            <td className="px-3 py-1.5 border-t border-black/5 dark:border-white/10 tabular-nums">{s.vkn || '—'}</td>
                                            <td className="px-3 py-1.5 border-t border-black/5 dark:border-white/10 text-right tabular-nums">{s.rows.length}</td>
                                            <td className="px-3 py-1.5 border-t border-black/5 dark:border-white/10 text-right tabular-nums">{formatAmount(s.toplamMatrah)}</td>
                                            <td className="px-3 py-1.5 border-t border-black/5 dark:border-white/10 text-center">
                                                {sec ? <span className="text-green-600 font-medium">✓ Seçildi</span> : <span className="opacity-40">eşik altı</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </main>
    )
}
