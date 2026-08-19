'use client'

import { useEffect, useState } from 'react'
import { getYillikEsik, setYillikEsik } from '@/lib/settings'
import { formatAmount } from '@/lib/config/currency'

export default function AyarlarPage() {
    const [esik, setEsik] = useState('')
    const [kaydedildi, setKaydedildi] = useState(false)

    useEffect(() => {
        const v = getYillikEsik()
        if (v > 0) setEsik(String(v))
    }, [])

    function kaydet() {
        setYillikEsik(Number(esik) || 0)
        setKaydedildi(true)
        setTimeout(() => setKaydedildi(false), 2000)
    }

    return (
        <main className="max-w-2xl">
            <h1 className="text-2xl font-bold mb-1">Ayarlar</h1>
            <p className="text-sm opacity-70 mb-6">Panel yapılandırması.</p>

            <section className="rounded-lg border border-black/10 dark:border-white/15 p-5 mb-4">
                <h2 className="text-sm font-semibold mb-1">Karşıt İnceleme — Yıllık Eşik</h2>
                <p className="text-xs opacity-70 mb-3">
                    Bir satıcıdan toplam matrah bu tutarı aşarsa, o satıcı karşıt incelemeye seçilir.
                    (Her yıl GİB tarafından güncellenir — güncel rakamı buraya girin.)
                </p>
                <div className="flex items-end gap-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium opacity-70">Yıllık eşik (TL)</span>
                        <input
                            type="number"
                            value={esik}
                            onChange={(e) => setEsik(e.target.value)}
                            placeholder="ör. 200000"
                            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm w-48"
                        />
                    </label>
                    <button
                        onClick={kaydet}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                    >
                        Kaydet
                    </button>
                    {kaydedildi && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
                </div>
                {Number(esik) > 0 && (
                    <p className="text-xs opacity-60 mt-2">Girilen: {formatAmount(Number(esik))} ₺</p>
                )}
            </section>

            <p className="text-xs opacity-50">
                Not: Ayarlar şimdilik bu tarayıcıda saklanıyor. Faz 2&apos;de (giriş + veritabanı) hesabınıza bağlanacak.
            </p>
        </main>
    )
}
