// LLM çıkarım motoru — resolver zincirinin genelleme halkası (mimari.md).
// Anthropic SDK + structured output (messages.parse) ile faturayı sabit şemaya çıkarır.
// Şema doğrulaması SDK tarafında yapılır → şema-dışı/halüsinasyon çıktı engellenir.
// Tüm kurallar docs/dogrulanmis-kurallar.md (DK-xx) referanslıdır.

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { ExtractedInvoice } from './types'
import { TOP_KALEM } from '../config/extraction'

// Varsayılan model: claude-sonnet-5 — fatura çıkarımı için kalite/maliyet dengesi
// (structured output destekli, Türkçe güçlü). Ortam değişkeniyle değiştirilebilir.
export const EXTRACTION_MODEL = process.env.CSA_EXTRACTION_MODEL || 'claude-sonnet-5'
const MODEL = EXTRACTION_MODEL

// Prompt/şema mantığı sürümü — DEĞİŞTİĞİNDE ARTTIR (önbellek geçersiz kılınır, DK-25)
export const EXTRACTION_VERSION = '4'

// Structured output şeması — tüm alanlar zorunlu, sentinel değerlerle (0 / "")
const InvoiceSchema = z.object({
    saticiUnvan: z.string().describe('Faturayı KESEN tarafın ünvanı (alıcı/mükellef DEĞİL)'),
    saticiVknTckn: z.string().describe('Satıcının VKN (10 hane) veya TCKN (11 hane), sadece rakam'),
    faturaNo: z.string().describe('Fatura numarası (ETTN/UUID değil)'),
    faturaTarihi: z.string().describe('Fatura tarihi, ISO formatı YYYY-MM-DD'),
    kalemler: z
        .array(
            z.object({
                ad: z.string().describe('Mal/hizmet adı'),
                miktar: z.string().describe('Miktar birimiyle, ör. "1 Adet", "340 KG"'),
                kdvDahilTutar: z.number().describe('Kalemin KDV dahil tutarı (sayı, ör. 19863066.53)'),
            }),
        )
        .describe(
            `Faturadaki EN YÜKSEK KDV dahil tutarlı EN FAZLA ${TOP_KALEM} kalem (hepsi DEĞİL). ${TOP_KALEM}'den az kalem varsa var olanlar.`,
        ),
    matrah: z.number().describe('KDV hariç toplam (Mal Hizmet Toplam Tutarı), sayı'),
    kdv: z.number().describe('SADECE KDV toplamı, sayı. Konaklama vergisi vb. diğer vergiler HARİÇ'),
    tevkifatKdv: z
        .number()
        .describe('Faturada yazan tevkifat KDV tutarı; tevkifat yoksa 0'),
    ggbTescilNo: z.string().describe('GGB tescil no (sadece ithalatta); yoksa boş string'),
})

const SYSTEM = `Sen Türk e-Fatura/e-Arşiv belgelerinden veri çıkaran bir uzmansın.
Sana verilen fatura metninden alanları çıkar. Kurallar:

SATICI vs ALICI (EN ÖNEMLİ KURAL):
- Faturada İKİ taraf vardır.
- ALICI = "SAYIN" başlığının hemen altındaki taraftır. Bu taraf faturayı ALAN/mükelleftir.
- SATICI = faturayı DÜZENLEYEN/GÖNDEREN taraftır — genelde ETTN, MERSİS No veya Ticaret
  Sicil No bilgisi onun yanında olur; "e-Fatura"/"e-Arşiv" onun adına düzenlenir.
- SATICI, "SAYIN" altında OLMAYAN taraftır. "SAYIN" altındaki tarafı ASLA satıcı yazma.
- Sana bilgi olarak mükellef (alıcı) VKN verilir. Bu VKN faturada görünmese bile yukarıdaki
  "SAYIN = alıcı" kuralını uygula — mükellef HER ZAMAN alıcıdır, satıcı değildir.
- saticiUnvan ve saticiVknTckn için SATICI (kesen taraf) bilgilerini yaz; ALICI'nınkini DEĞİL.

Diğer kurallar:
- kalemler: Faturanın EN YÜKSEK KDV DAHİL TUTARLI ${TOP_KALEM} kalemini ver — TÜM kalemleri DEĞİL.
  ${TOP_KALEM}'den az kalem varsa hepsini ver. Her kalem: ad, miktar (birimiyle), KDV dahil tutar.
- Fatura No = faturanın numarasıdır (ör. AHT2025000000026), ETTN (UUID) DEĞİL.
- Tarih her zaman YYYY-MM-DD formatında.
- kalemler: faturadaki tüm satır kalemleri; her biri ad, miktar (birimiyle) ve KDV dahil tutar.
- matrah: KDV hariç toplam ("Mal Hizmet Toplam Tutarı").
- kdv: SADECE hesaplanan KDV toplamı. KONAKLAMA VERGİSİ gibi diğer vergileri DAHİL ETME.
- tevkifatKdv: fatura tevkifatlıysa faturada yazan tevkifat KDV tutarı; değilse 0.
- Sayıları düz sayı olarak ver (ondalık nokta): 23.914.916,15 → 23914916.15.
- Emin olmadığın metinsel alanı boş string, sayısal alanı 0 bırak; UYDURMA.`

let client: Anthropic | null = null
function getClient(): Anthropic {
    if (!client) client = new Anthropic() // ANTHROPIC_API_KEY / profil ortamdan
    return client
}

export function llmAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

export async function parseWithLLM(
    text: string,
    ctx: { mukellefVknTckn: string; donem: string },
): Promise<ExtractedInvoice> {
    const response = await getClient().messages.parse({
        model: MODEL,
        max_tokens: 8192, // emniyet payı; çok kalemli faturada taşmayı önler (DK-28)
        output_config: { effort: 'low', format: zodOutputFormat(InvoiceSchema) },
        system: SYSTEM,
        messages: [
            {
                role: 'user',
                content: `Mükellef (ALICI) VKN/TCKN: ${ctx.mukellefVknTckn} — bu taraf satıcı DEĞİLDİR.\n\nFATURA METNİ:\n${text}`,
            },
        ],
    })

    const p = response.parsed_output
    if (!p) throw new Error('LLM çıkarımı şemaya uymadı (parsed_output null)')

    // LLM çıkarımı yüksek güvenli işaretlenir; doğrulama (checksum, KDV oranı) türetmede yapılır
    return {
        saticiUnvan: p.saticiUnvan,
        saticiVknTckn: p.saticiVknTckn.replace(/\D/g, ''),
        faturaNo: p.faturaNo,
        faturaTarihi: p.faturaTarihi,
        kalemler: p.kalemler,
        matrah: p.matrah,
        kdv: p.kdv,
        tevkifatKdv: p.tevkifatKdv > 0 ? p.tevkifatKdv : undefined,
        ggbTescilNo: p.ggbTescilNo || undefined,
        guven: {
            saticiUnvan: 0.9,
            saticiVknTckn: 0.9,
            faturaNo: 0.9,
            faturaTarihi: 0.9,
            kalemler: p.kalemler.length ? 0.9 : 0,
            matrah: p.matrah > 0 ? 0.9 : 0,
            kdv: 0.9, // %0 KDV geçerli (DK-26); LLM çıkarımı başarılı sayılır

            tevkifatKdv: p.tevkifatKdv > 0 ? 0.9 : undefined,
        },
    }
}
