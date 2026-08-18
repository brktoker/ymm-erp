# Mimari

## Pipeline (uçtan uca)

```
[1] Yükleme        Toplu PDF / XML yükleme
[2] Bölme          Çok faturalı PDF → tek tek fatura (DK-10)
[3] Sınıflandırma  Belge tipi + şablon parmak izi (satıcı VKN + entegratör + etiketler)
[4] Çıkarım        Resolver zinciri ile alanları doldur (aşağıda)
[5] Türetme        Satıcı=mükellef-değil (DK-01), top-3 kalem (DK-05), tevkifat (DK-02)
[6] Doğrulama      VKN checksum (DK-06), KDV≈matrah×oran, tevkifat toplamı, dönem
[7] Review         Bayraklı satırlar; müşavir düzeltir/onaylar
[8] Export         Boş şablon taban alınarak birebir .xlsx (+ TOPLAM)
```

## Resolver zinciri (her alan için)

Her alan (faturaNo, kdv, vkn, tarih, kalemler...) sırayla denenen stratejilerle
çözülür; ilk **güvenli** sonuç kazanır, olmazsa bir alta düşer:

```
1) XML yolu            → UBL-XML varsa ilgili alan (deterministik, ~%100)
2) Şablon kuralı       → bu satıcı/şablon için kayıtlı anchor kuralı (config)
3) Genel kalıp kütüph. → eş anlamlı etiketler ["Fatura No","Fatura Numarası","Belge No"]
4) LLM çıkarımı        → sabit şemaya göre genelleme (yeni şablonları yakalar)
5) → güven yoksa       → REVIEW'a bayrakla düşür ("alan bulunamadı")
```

- **Faz 1'de** ağırlık LLM + genel kalıp; şablon config ve öğrenme **Faz 2**.
- Her strateji bir **güven skoru** döndürür; eşik altı → review.

## Şablon parmak izi

Bir faturayı tanımak için: `satıcı VKN + entegratör imzası (ör. "EDM Teknolojileri") +
etiket seti hash`. Tanınan parmak izi → o şablonun kural setine yönlendirilir.
Tanınmayan → "yeni tip" → LLM + öğrenme döngüsü.

## Öğrenme döngüsü (Faz 2)

```
Yeni/bilinmeyen şablon → alan bulunamadı → review'da müşavir doğru değeri işaretler
  → sistem düzeltmeden aday kural üretir (anchor + konum)
  → tek tık onay → templates/<id>.json'a yazılır (versiyonlu)
  → sıradaki aynı fatura otomatik + deterministik
```

Bu "demonstrasyonla öğrenme"dir: denetlenebilir, geri alınabilir, versiyonlanabilir
**config**. Riskli/opak ML değil. Her düzeltme sistemi bir adım güçlendirir.

## Config / kural katmanları

| Katman | İçerik | Değişiklik türü |
|---|---|---|
| `templates/*.json` | Satıcı/şablon bazlı anchor kuralları | Config (kod değil) |
| `patterns.json` | Alan eş anlamlıları (genel kalıp kütüphanesi) | Config |
| `tevkifat.json` | Mal/hizmet → tevkifat oranı (yedek; DK-02 önceliklidir) | Config |
| `validation.json` | Doğrulama kuralları + severity | Config |

## Teknoloji

- **Next.js (App Router) + TypeScript** — UI + API route'lar
- **Tailwind + cva + `cn()`** — config-driven className yapısı
- **PDF metin:** `pdfjs-dist` / `unpdf`; **XML:** `fast-xml-parser`
- **Çıkarım motoru:** Anthropic SDK + `messages.parse()` (structured output, Zod şeması) —
  şema-dışı çıktı SDK'da engellenir. Varsayılan model `claude-sonnet-5` (env `CSA_EXTRACTION_MODEL`
  ile değiştirilebilir), `effort: 'low'`. Anahtar (`ANTHROPIC_API_KEY`) yoksa deterministik yedeğe düşer.
- **Excel:** `exceljs` (şablonu taban alıp birebir yazar, TOPLAM formülü)
- **OCR (Faz 3):** taranmış fatura / yazarkasa fişi

## Modülerlik

"Format" ve "kural" birer **eklenti**. Yeni resmi liste tipi (Faz 4) = yeni şablon
dosyası + yeni kolon eşlemesi + yeni kural seti; **motor aynı kalır**.
