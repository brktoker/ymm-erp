# Faz Planı

## Faz 0 — İspat ✅
Şema çıktı; normal / tevkifatlı / farklı-şablon 3 fatura doğru satıra döndü. Mimari kilitlendi.

## Faz 1 — Uçtan-uca MVP (LLM-öncelikli) 🔨
**Amaç:** Tek mükellef için PDF yükle → birebir Excel indir.

- Next.js iskelet + toplu yükleme ekranı
- PDF bölme (DK-10)
- LLM çıkarım (sabit şema — [cikarim-semasi.md](./cikarim-semasi.md))
- Türetme: satıcı=mükellef-değil (DK-01), top-3 kalem (DK-05), tevkifat (DK-02), KDV izolasyonu (DK-04)
- Temel doğrulama (KDV≈matrah×oran, VKN checksum DK-06)
- Basit review ekranı (satır düzenle + bayrak)
- `exceljs` birebir export (şablon taban + TOPLAM)

**Kapsam dışı:** şablon config/öğrenme, XML, OCR/fiş, çok-mükellef yönetimi.
**Biten iş:** `FATURALAR.pdf` → senin formatınla birebir `.xlsx`.

## Faz 2 — Öğrenen kural katmanı ⏳
Resolver zinciri (config templates + genel kalıp), şablon parmak izi, güven skoru,
**öğrenme döngüsü** (review düzeltmesi → kalıcı kural), VKN/TC checksum, XML hızlı-yol.

## Faz 3 — Ölçek + yönetim ⏳
Mükellef & dönem yönetimi, arşiv, audit log, roller, toplu kuyruk/performans,
OCR modülü (taranmış fatura / yazarkasa fişi).

## Faz 4 — Modüller ⏳
2. liste tipi (plugin ispatı: yeni şablon + kolon + kural, motor aynı), gelecek GİB formatları.
