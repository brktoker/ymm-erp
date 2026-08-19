// Çıkarım motoru — resolver zincirini uygular (mimari.md).
// Sıra: LLM (genelleme) → deterministik (yedek/hızlı-yol). İlk başarılı sonuç kazanır.
// LLM anahtarı yoksa veya hata verirse deterministik motora zarifçe düşer.

import type { InvoiceChunk } from './pdf'
import type { ExtractedInvoice } from './types'
import { parseDeterministic } from './deterministic'
import { EXTRACTION_MODEL, EXTRACTION_VERSION, llmAvailable, parseWithLLM } from './llm'
import { cacheGet, cacheSet } from './cache'
import { getSellerEntry, learnSeller } from '../learning/sellerRegistry'
import { deterministikEslesir } from './verify'

// Önbellek anahtarı model + mantık sürümünü içerir → prompt değişince eski önbellek kullanılmaz
const CACHE_MODEL = `${EXTRACTION_MODEL}|v${EXTRACTION_VERSION}`

export interface EngineCtx {
    mukellefVknTckn: string
    donem: string
    preferLLM?: boolean // varsayılan: anahtar varsa true
}

export interface EngineResult {
    invoice: ExtractedInvoice
    engine: 'llm' | 'cache' | 'rule' | 'deterministic'
    fallbackReason?: string
}

export async function extractInvoice(
    chunk: InvoiceChunk,
    ctx: EngineCtx,
): Promise<EngineResult> {
    const useLLM = ctx.preferLLM ?? llmAvailable()

    if (useLLM) {
        // 1) Önbellek: aynı fatura daha önce çıkarıldıysa API'ye gitme (bedava) — DK-23
        const cached = cacheGet(chunk.text, ctx.mukellefVknTckn, CACHE_MODEL)
        if (cached) return { invoice: cached, engine: 'cache' }

        // 2) Deterministik ön-çıkarım (bedava) + öğrenilen satıcı kaydı (Faz 3, DK-30/32)
        const det = parseDeterministic(chunk.text, chunk.lines, ctx)
        const kayit = det.saticiVknTckn ? getSellerEntry(det.saticiVknTckn) : null
        if (kayit) {
            det.saticiUnvan = kayit.unvan
            det.guven.saticiUnvan = 0.9
        }

        // 3) Kural yolu: satıcı DOĞRULANMIŞ (deterministik LLM ile eşleşmiş, DK-32) + bu faturada
        //    temel alanlar + temiz mal cinsi → LLM'siz (bedava). Değilse LLM (çıktı temiz kalır).
        const guvenilir =
            kayit?.detGuvenli === true &&
            (det.guven.faturaNo ?? 0) >= 0.75 &&
            (det.guven.faturaTarihi ?? 0) >= 0.75 &&
            (det.guven.kalemler ?? 0) >= 0.75 &&
            det.matrah > 0 &&
            Number.isFinite(det.kdv)
        if (guvenilir) return { invoice: det, engine: 'rule' }

        // 4) LLM → deterministik ile karşılaştır (doğrula) → satıcıyı öğren → önbelleğe al
        for (let deneme = 0; deneme < 2; deneme++) {
            try {
                const invoice = await parseWithLLM(chunk.text, ctx)
                const eslesti = deterministikEslesir(det, invoice) // şablon güvenilir mi?
                learnSeller(invoice.saticiVknTckn, invoice.saticiUnvan, eslesti)
                cacheSet(chunk.text, ctx.mukellefVknTckn, CACHE_MODEL, invoice)
                return { invoice, engine: 'llm' }
            } catch (err) {
                if (deneme === 0) continue // ilk hatada tekrar dene
                const reason = err instanceof Error ? err.message : 'bilinmeyen hata'
                return { invoice: det, engine: 'deterministic', fallbackReason: reason }
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
