'use client'

import { useMemo, useState } from 'react'
import type { KdvListRow } from '@/lib/extraction/types'
import { ReviewTable } from '@/components/ReviewTable'
import { DEFAULT_MUKELLEF } from '@/lib/config/mukellef'
import { useLoader } from '@/components/providers/LoaderProvider'

type PeriodGroup = { donem: string; rows: KdvListRow[] }
type Ayiklanan = { row: KdvListRow; sebep: string }
type Meta = {
    hedefDonem: string | null
    toplamFatura: number
    dahil: number
    ayiklananSayi: number
    donemler: { donem: string; adet: number }[]
    llmKullanildi: boolean
    llmCount: number
    cacheCount: number
    bayrakli: number
}

export default function Home() {
    const [files, setFiles] = useState<FileList | null>(null)
    const [mukellef, setMukellef] = useState(DEFAULT_MUKELLEF) // geçici sabit (DK-22)
    const [hedefDonem, setHedefDonem] = useState('')
    const [gruplar, setGruplar] = useState<PeriodGroup[]>([])
    const [ayiklanan, setAyiklanan] = useState<Ayiklanan[]>([])
    const [meta, setMeta] = useState<Meta | null>(null)
    const [error, setError] = useState('')
    const [sadeceBayrakli, setSadeceBayrakli] = useState(false)
    const { loading, wrap } = useLoader()

    async function handleExtract(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        if (!files?.length) return setError('En az bir PDF seçin')
        setGruplar([])
        setAyiklanan([])
        setMeta(null)
        setSadeceBayrakli(false)
        try {
            await wrap('Faturalar analiz ediliyor…', async () => {
                const fd = new FormData()
                Array.from(files).forEach((f) => fd.append('files', f))
                fd.append('mukellef', mukellef)
                fd.append('hedefDonem', hedefDonem)
                const res = await fetch('/api/extract', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Çıkarım başarısız')
                setGruplar(data.gruplar)
                setAyiklanan(data.ayiklanan)
                setMeta(data.meta)
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Hata')
        }
    }

    function updateCell(gi: number, ri: number, key: keyof KdvListRow, value: string | number | null) {
        setGruplar((prev) => {
            const next = prev.map((g) => ({ ...g, rows: [...g.rows] }))
            next[gi].rows[ri] = { ...next[gi].rows[ri], [key]: value }
            return next
        })
    }

    // Satırı "doğru" işaretle → uyarıları temizle (kullanıcı onayı, DK-27)
    function approveRow(gi: number, ri: number) {
        setGruplar((prev) => {
            const next = prev.map((g) => ({ ...g, rows: [...g.rows] }))
            next[gi].rows[ri] = { ...next[gi].rows[ri], bayraklar: [] }
            return next
        })
    }

    async function handleExport(mode: 'single' | 'zip') {
        await wrap('Excel hazırlanıyor…', async () => {
            const res = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gruplar, mode }),
            })
            if (!res.ok) {
                setError('İndirme başarısız')
                return
            }
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = mode === 'zip' ? 'indirilecek-kdv-listeleri.zip' : 'indirilecek-kdv-listesi.xlsx'
            a.click()
            URL.revokeObjectURL(url)
        })
    }

    // Canlı bayraklı satır sayısı (onay/düzeltme sonrası anlık güncellenir)
    const bayrakliCount = useMemo(
        () => gruplar.reduce((n, g) => n + g.rows.filter((r) => r.bayraklar.length > 0).length, 0),
        [gruplar],
    )
    const filtreAktif = sadeceBayrakli && bayrakliCount > 0
    // Filtre açıkken bayraklı satırı olmayan dönem gruplarını gizle
    const gorunenGruplar = useMemo(
        () => (filtreAktif ? gruplar.filter((g) => g.rows.some((r) => r.bayraklar.length > 0)) : gruplar),
        [gruplar, filtreAktif],
    )
    const hasData = gruplar.length > 0

    return (
        <main className="min-h-screen p-6 md:p-10 max-w-[1400px] mx-auto">
            <h1 className="text-2xl font-bold mb-1">İndirilecek KDV Listesi Otomasyonu</h1>
            <p className="text-sm opacity-70 mb-6">
                Fatura PDF&apos;lerini yükle → otomatik çıkar → gözden geçir → GİB formatında Excel indir.
            </p>

            <form onSubmit={handleExtract} className="grid gap-4 md:grid-cols-4 items-end mb-6 p-4 rounded-lg border border-black/10 dark:border-white/15">
                <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs font-medium opacity-70">Fatura PDF(ler)</span>
                    <input type="file" accept="application/pdf" multiple onChange={(e) => setFiles(e.target.files)}
                        className="text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white file:text-sm" />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium opacity-70">Mükellef VKN/TCKN <span className="opacity-50">(geçici sabit)</span></span>
                    <input value={mukellef} onChange={(e) => setMukellef(e.target.value)} placeholder={DEFAULT_MUKELLEF}
                        className="rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1.5 text-sm" />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium opacity-70">Hedef Dönem (opsiyonel)</span>
                    <input value={hedefDonem} onChange={(e) => setHedefDonem(e.target.value)} placeholder="202512 — boş: tüm dönemler"
                        className="rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1.5 text-sm" />
                </label>
                <div className="md:col-span-4">
                    <button type="submit" disabled={loading}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                        Faturaları Tabloya Aktar
                    </button>
                </div>
            </form>

            {error && (
                <div className="mb-4 rounded border border-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            {meta && (
                <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
                    <span><b>{meta.toplamFatura}</b> fatura</span>
                    <span><b>{meta.dahil}</b> dahil</span>
                    {meta.hedefDonem && <span>Hedef dönem: <b>{meta.hedefDonem}</b></span>}
                    {meta.ayiklananSayi > 0 && <span className="text-orange-600"><b>{meta.ayiklananSayi}</b> ayıklandı</span>}
                    <span>Motor: <b>{meta.llmKullanildi ? `LLM (${meta.llmCount})` : 'deterministik'}</b></span>
                    {meta.cacheCount > 0 && <span className="text-green-600" title="API'ye gitmedi, bedava">♻ {meta.cacheCount} önbellekten</span>}
                    {/* Gözden geçir sayacı tıklanabilir → sadece bayraklı satırları göster (DK-21) */}
                    <button
                        type="button"
                        onClick={() => setSadeceBayrakli((v) => !v)}
                        disabled={bayrakliCount === 0}
                        className={`rounded px-2 py-0.5 font-medium transition ${
                            bayrakliCount === 0
                                ? 'text-green-600 cursor-default'
                                : filtreAktif
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                    >
                        {bayrakliCount === 0
                            ? '✓ hepsi temiz'
                            : filtreAktif
                              ? `↩ tümünü göster (${bayrakliCount} gözden geçir)`
                              : `⚠ ${bayrakliCount} gözden geçir — göster`}
                    </button>
                    <span className="opacity-70">Dönemler: {meta.donemler.map((d) => `${d.donem}(${d.adet})`).join(', ') || '—'}</span>
                </div>
            )}

            {ayiklanan.length > 0 && (
                <details className="mb-5 rounded-lg border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-orange-700 dark:text-orange-300">
                        {ayiklanan.length} fatura hedef döneme ait değil — çıktıya alınmadı (aç)
                    </summary>
                    <ul className="mt-2 text-xs space-y-1">
                        {ayiklanan.map((a, i) => (
                            <li key={i} className="opacity-80">
                                <b>{a.row.faturaNo || '(no yok)'}</b> — {a.row.saticiUnvan || '(ünvan yok)'} · {a.sebep}
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            {hasData && (
                <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs opacity-70">
                            Hücreler düzenlenebilir — yanlış gördüğün alanı elle düzelt, sonra indir. Tutarları görmek için ₺ hücresine tıkla.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => handleExport('single')} disabled={loading}
                                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                                Tek dosya (dönem sekmeli)
                            </button>
                            <button onClick={() => handleExport('zip')} disabled={loading}
                                className="rounded border border-green-600 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 disabled:opacity-50">
                                Ayrı dosyalar (zip)
                            </button>
                        </div>
                    </div>

                    {gorunenGruplar.map((g) => {
                        const gi = gruplar.indexOf(g)
                        return (
                            <section key={g.donem} className="mb-6">
                                <h2 className="text-sm font-semibold mb-2">
                                    Dönem {g.donem} <span className="opacity-60">({g.rows.length} fatura)</span>
                                </h2>
                                <ReviewTable
                                    rows={g.rows}
                                    flaggedOnly={filtreAktif}
                                    onEdit={(ri, key, value) => updateCell(gi, ri, key, value)}
                                    onApprove={(ri) => approveRow(gi, ri)}
                                />
                            </section>
                        )
                    })}
                </>
            )}
        </main>
    )
}
