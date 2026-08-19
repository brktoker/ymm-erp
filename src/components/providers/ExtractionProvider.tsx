'use client'

// Paylaşılan çıkarım durumu — Fatura Çıkarma bir kez çıkarır, Karşıt İnceleme aynı veriyi kullanır.
import {
    createContext,
    useContext,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react'
import type { PeriodGroup } from '@/lib/period'

interface ExtractionContextValue {
    gruplar: PeriodGroup[]
    setGruplar: Dispatch<SetStateAction<PeriodGroup[]>>
}

const ExtractionContext = createContext<ExtractionContextValue | null>(null)

export function ExtractionProvider({ children }: { children: ReactNode }) {
    const [gruplar, setGruplar] = useState<PeriodGroup[]>([])
    return (
        <ExtractionContext.Provider value={{ gruplar, setGruplar }}>
            {children}
        </ExtractionContext.Provider>
    )
}

export function useExtraction(): ExtractionContextValue {
    const ctx = useContext(ExtractionContext)
    if (!ctx) throw new Error('useExtraction must be used within ExtractionProvider')
    return ctx
}
