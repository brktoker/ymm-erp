// Çıkarım motoru — resolver zincirini uygular (mimari.md).
// Sıra: LLM (genelleme) → deterministik (yedek/hızlı-yol). İlk başarılı sonuç kazanır.
// LLM anahtarı yoksa veya hata verirse deterministik motora zarifçe düşer.

import type { InvoiceChunk } from './pdf'
import type { ExtractedInvoice } from './types'
import { parseDeterministic } from './deterministic'
import { EXTRACTION_MODEL, EXTRACTION_VERSION, llmAvailable, parseWithLLM } from './llm'
import { cacheGet, cacheSet } from './cache'

// Önbellek anahtarı model + mantık sürümünü içerir → prompt değişince eski önbellek kullanılmaz
const CACHE_MODEL = `${EXTRACTION_MODEL}|v${EXTRACTION_VERSION}`

export interface EngineCtx {
    mukellefVknTckn: string
    donem: string
    preferLLM?: boolean // varsayılan: anahtar varsa true
}

export interface EngineResult {
    invoice: ExtractedInvoice
    engine: 'llm' | 'cache' | 'deterministic'
    fallbackReason?: string
}

export async function extractInvoice(
    chunk: InvoiceChunk,
    ctx: EngineCtx,
): Promise<EngineResult> {
    const useLLM = ctx.preferLLM ?? llmAvailable()

    if (useLLM) {
        // Önbellek: aynı fatura daha önce çıkarıldıysa API'ye gitme (bedava) — DK-23
        const cached = cacheGet(chunk.text, ctx.mukellefVknTckn, CACHE_MODEL)
        if (cached) return { invoice: cached, engine: 'cache' }

        // LLM'i bir kez retry ile dene (geçici parse/ağ hatalarını kurtarır) → sonra deterministik yedek
        for (let deneme = 0; deneme < 2; deneme++) {
            try {
                const invoice = await parseWithLLM(chunk.text, ctx)
                cacheSet(chunk.text, ctx.mukellefVknTckn, CACHE_MODEL, invoice)
                return { invoice, engine: 'llm' }
            } catch (err) {
                if (deneme === 0) continue // ilk hatada tekrar dene
                const reason = err instanceof Error ? err.message : 'bilinmeyen hata'
                const invoice = parseDeterministic(chunk.text, chunk.lines, ctx)
                return { invoice, engine: 'deterministic', fallbackReason: reason }
            }
        }
    }

    const invoice = parseDeterministic(chunk.text, chunk.lines, ctx)
    return { invoice, engine: 'deterministic' }
}

// Eşzamanlılık sınırlı toplu çıkarım — 130+ faturayı aynı anda API'ye boğmadan işler
export async function extractBatch(
    chunks: InvoiceChunk[],
    ctx: EngineCtx,
    concurrency = 5,
): Promise<EngineResult[]> {
    const results: EngineResult[] = new Array(chunks.length)
    let next = 0
    async function worker() {
        while (next < chunks.length) {
            const i = next++
            results[i] = await extractInvoice(chunks[i], ctx)
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, worker))
    return results
}
