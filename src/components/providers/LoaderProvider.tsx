'use client'

// Global loader — TEK KAYNAK (ANA KURAL 2). Tüm API istekleri bunu kullanır.
// Kullanım: const { wrap } = useLoader(); await wrap('Faturalar analiz ediliyor…', () => fetch(...))
// wrap otomatik gösterir/gizler (finally ile hata durumunda da kapanır).

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface LoaderContextValue {
    loading: boolean
    show: (message?: string) => void
    hide: () => void
    wrap: <T>(message: string, fn: () => Promise<T>) => Promise<T>
}

const LoaderContext = createContext<LoaderContextValue | null>(null)

export function LoaderProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<{ on: boolean; message: string }>({ on: false, message: '' })

    const show = useCallback((message = 'Yükleniyor…') => setState({ on: true, message }), [])
    const hide = useCallback(() => setState((s) => ({ ...s, on: false })), [])
    const wrap = useCallback(
        async <T,>(message: string, fn: () => Promise<T>): Promise<T> => {
            show(message)
            try {
                return await fn()
            } finally {
                hide()
            }
        },
        [show, hide],
    )

    return (
        <LoaderContext.Provider value={{ loading: state.on, show, hide, wrap }}>
            {children}
            {state.on && <LoaderOverlay message={state.message} />}
        </LoaderContext.Provider>
    )
}

function LoaderOverlay({ message }: { message: string }) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
            role="status"
            aria-live="polite"
        >
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white dark:bg-neutral-900 px-8 py-7 shadow-xl">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{message}</p>
            </div>
        </div>
    )
}

export function useLoader(): LoaderContextValue {
    const ctx = useContext(LoaderContext)
    if (!ctx) throw new Error('useLoader must be used within LoaderProvider')
    return ctx
}
