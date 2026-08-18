# KDV İade Listesi Otomasyonu — Ana Doküman

> **ANA KURAL 1 — Doküman doğruluk kaynağı:** Bu klasör projenin tek doğruluk kaynağıdır.
> Yapılan her işlemde **doğruluk payı olan** (bir alanın nasıl okunduğu, bir hesabın nasıl
> yapıldığı, bir faturanın nasıl yorumlandığı) her karar buraya işlenir. Yeni bir fatura tipi,
> kural veya istisna geldiğinde **önce bu dokümana bakılır**, sonra koda geçilir. Kod ile
> doküman çeliştiğinde doküman güncellenir.
>
> **ANA KURAL 2 — Ölçeklenebilir, tekrarsız kod:** Tekrarlayan kod bloğuna **asla** izin
> verilmez. UI **dinamik/yeniden-kullanılabilir component** yapısında kurulur; ortak mantık
> (para birimi/fiyat gösterimi, kolon tanımları, biçimlendirme vb.) **`utils`/`config`/`components`**
> dosyalarından import edilir, kopyalanmaz. Her iş profesyonel bir yazılımcı gibi incelenir,
> ölçeklenebilirlik gözetilerek sonuçlandırılır.

## Amaç

Mali müşavirlerin ay ay elle girdiği **GİB "İndirilecek KDV Listesi"** Excel'ini,
müşteri faturalarının (çoğunlukla PDF, bazen UBL-XML) toplu yüklenmesiyle otomatik
üretmek. Nihai hedef: **elle giriş süresini büyük ölçüde azaltmak** ve çıktının
**%100 doğru** olmasını **çıkarım + doğrulama + insan onayı (review)** ile garanti etmek.

> **Doğruluk ilkesi:** "%100 otomatik okuma" hedeflenmez (hiçbir OCR/PDF bunu garanti
> edemez). "%100 doğru nihai çıktı" hedeflenir: sistem bulamadığında/şüphelendiğinde
> **sessizce uydurmaz**, review ekranında **açıkça işaretler**.

## Dokümanlar

| Dosya | İçerik |
|---|---|
| [mimari.md](./mimari.md) | Sistem mimarisi, pipeline, resolver zinciri, öğrenme döngüsü |
| [cikarim-semasi.md](./cikarim-semasi.md) | Çıkarım şeması (fatura → alanlar) ve kolon eşlemesi |
| [dogrulanmis-kurallar.md](./dogrulanmis-kurallar.md) | **Doğrulanmış kurallar günlüğü** — büyüyen doğruluk kayıtları |
| [fazlar.md](./fazlar.md) | Faz planı ve her fazın "biten iş" tanımı |

## Faz durumu

- **Faz 0 — İspat:** ✅ Bitti (3 fatura tipi doğru satıra döndü)
- **Faz 1 — Uçtan-uca MVP (LLM-öncelikli):** ✅ Bitti — gerçek koşu: 122 faturanın **120'si otomatik+temiz**, 2'si review (Sonnet 5)
  - ✅ Next.js + Tailwind iskelet, çekirdek pipeline (PDF→bölme→çıkarım→türetme→xlsx)
  - ✅ Headless ispat: `scripts/prove.mts` — ENES ÇOBAN birebir; FATURALAR.pdf 122 fatura
  - ✅ Excel çıktı birebir (başlıklar + TOPLAM formülü); tevkifat K11/K12/K13 doğru
  - ✅ LLM çıkarım motoru (`messages.parse` + Zod, claude-opus-5) — kod hazır, anahtarla çalışır
  - ✅ Web arayüzü: `/api/extract` + `/api/export` + düzenlenebilir review tablosu (bayraklı satır) + Excel indirme

**Çalıştırma:** `npm run dev` (varsayılan :3000). Uçtan uca akış: PDF yükle → mükellef VKN + dönem →
"Faturaları Çıkar" → sarı bayraklı satırları düzelt → "Excel İndir". LLM için `.env.local`'e
`ANTHROPIC_API_KEY` ekle (yoksa deterministik motor çalışır).
- **Faz 1.5 — Çıktı + review iyileştirmeleri:** ✅ TOPLAM kaldırıldı, dönem-bazlı sekme/dosya, hedef dönem ayıklama, indirme seçeneği, **15 kolon tam**, **TL para birimi** (config-driven, ayarlanabilir), **"gözden geçir" filtresi**, elle düzeltme, yeniden-kullanılabilir component yapısı (ANA KURAL 2)
- Faz 2 — Platform (auth + müşteri portalı + YMM dashboard): ⏳ (sıradaki)
- Faz 3 — Öğrenen kural katmanı: ⏳
- Faz 4 — Ölçek + modüller: ⏳
