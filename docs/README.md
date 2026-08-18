# KDV İade Listesi Otomasyonu — Ana Doküman

> **ANA KURAL:** Bu klasör projenin tek doğruluk kaynağıdır. Yapılan her işlemde
> **doğruluk payı olan** (bir alanın nasıl okunduğu, bir hesabın nasıl yapıldığı,
> bir faturanın nasıl yorumlandığı) her karar buraya işlenir. Yeni bir fatura tipi,
> yeni bir kural veya yeni bir istisna geldiğinde **önce bu dokümana bakılır**,
> sonra koda geçilir. Kod ile bu doküman çeliştiğinde doküman güncellenir.

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
- **Faz 1 — Uçtan-uca MVP (LLM-öncelikli):** 🔨 Devam ediyor
- Faz 2 — Öğrenen kural katmanı: ⏳
- Faz 3 — Ölçek + yönetim: ⏳
- Faz 4 — Modüller: ⏳
