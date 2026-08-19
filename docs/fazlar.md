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

## Faz 1.5 — Çıktı düzeltmeleri ✅ (kullanıcı geri bildirimi sonrası)
- ✅ TOPLAM satırı kaldırıldı (DK-17)
- ✅ KDV Dönemi fatura tarihinden; dönem başına sekme/dosya (DK-18)
- ✅ Hedef dönem doğrulaması + ayıklama (DK-19)
- ✅ İndirme seçeneği: tek dosya (sekmeli) / ayrı dosyalar (zip)

---

## İki taraflı platform mimarisi (yeni — kullanıcı ile netleşti)

Araç tek-kullanıcılıdan **çok kiracılı (multi-tenant) platforma** dönüşüyor. İki aktör:

**MÜŞTERİ ayağı** (YMM'nin verdiği URL, giriş korumalı):
- Dönem seç (varsayılan: bir önceki ay) — opsiyonel "şu döneme ekliyorum"
- Faturaları toplu yükle → sistem tarih ≠ hedef dönem olanları **ayıklar + bildirir**
- "Teslim et" → YMM'ye düşer

**YMM ayağı** (dashboard, giriş korumalı):
- **Müşteri kayıtları** (uniq, yönetilebilir)
- **Dönem takibi:** hangi müşteri X dönemini yükledi mi (rapor)
- **Hata belirteçleri** (dönem-dışı, review gereken)
- Excel çıktısı al / kendi de yükleyip çıktı alabilir

Teknik gereksinim (Faz 1'in tek-kullanıcı halinden fark): **auth + roller**, **veritabanı**
(müşteri/dönem/yükleme/sonuç), **dosya depolama** (PDF + çıktı), **müşteri portalı**, **YMM dashboard**.

---

## ŞU ANKİ MOD — Kayıtsız / auth'suz (geçici, kullanıcı kararı)

> **Karar:** Platform şimdilik **veritabanı ve kimlik doğrulama OLMADAN** kullanılır.
> Mevcut akış durumsuzdur (stateless): tek oturumda PDF yükle → çıkar → gözden geçir → indir.
> Hiçbir veri kalıcı saklanmaz. Bu **bilinçli geçici** bir moddur; Faz 2'de auth + DB eklenecek.

**Faz 2 nereye eklenecek (seam'ler):**
- **Auth:** `src/app` route'larının önüne middleware; roller (YMM/müşteri). Mevcut sayfa/route'lar korunur.
- **DB:** çıkarım sonuçları + müşteri/dönem kayıtları için servis katmanı (bugün bellek/istek-içi).
- **Dosya depolama:** yüklenen PDF + üretilen çıktı (bugün sadece istek süresince bellekte).
- **Müşteri portalı / YMM dashboard:** ayrı route grupları; çekirdek pipeline (çıkarım/derive/export) aynen kullanılır.

Not: Çekirdek mantık (extraction, derive, period, columns, currency, export) auth/DB'den **bağımsız**
tasarlandı → Faz 2 bunların ÜSTÜNE oturur, yeniden yazılmaz (ANA KURAL 2).

# YAPILACAKLAR — Detaylı liste (fazlar + alt içerikler)

## Faz 1.6 — Küçük düzeltmeler (arayüz testi sonrası) ⏳
- [ ] Tarayıcı testinden çıkan ince ayarlar (scroll, hizalama, mesajlar)
- [ ] (Opsiyonel) Maliyet göstergesi — koşu başına token / tahmini tutar
- [ ] (Opsiyonel) Motor seçimi toggle — ücretsiz (deterministik) / ücretli (LLM)

## Faz 2 — Platform (auth + müşteri portalı + YMM dashboard) ⏳
**Amaç:** Tek-kullanıcı araçtan çok-kiracılı (multi-tenant) ürüne geçiş.

> **GEÇİCİ DURUM (kullanıcı kararı):** Supabase Auth **ertelendi** ("başka zaman"). Yerine
> **geçici tek-parola girişi** kondu: `/giris` (parola) → cookie → `/panel` korumalı; fatura aracı
> `/panel` içine taşındı; `/` → `/panel`'e yönlenir. Parola `.env.local` → `PANEL_PAROLA` (varsayılan
> `ymm2025`, değiştir). Supabase projesi/tabloları bulutta duruyor (silinmedi); auth/db kodu geri alındı.
> `middleware.ts` basit cookie guard'a döndü. Gerçek auth (Supabase) sonraki turda geri gelecek.

> **YIĞIN KARARI (kullanıcı): Vercel + Supabase** — basitlik için (sunucu yönetimi yok).
> DB+Auth+Storage = Supabase (`@supabase/supabase-js`, Prisma YOK); deploy = Vercel (`git push`);
> KVKK için Supabase bölgesi **EU (Frankfurt)**. 300 sn serverless sınırı: tipik hacim altında,
> büyük yüklemede chunk gerekebilir. (Kendi-sunucu/Prisma yolu denendi, sadelik için bırakıldı.)

**2.1 Kimlik doğrulama & roller**
- [ ] Giriş sistemi (özel, dışarı kapalı)
- [ ] Roller: YMM (mali müşavir) / Müşteri
- [ ] Oturum yönetimi + route koruması (middleware)

**2.2 Veritabanı**
- [ ] Müşteri (mükellef) kayıtları — uniq, yönetilebilir
- [ ] Dönem kayıtları + yükleme durumu (kim, hangi dönem, ne zaman)
- [ ] Çıkarım sonuçlarının kalıcı saklanması
- [ ] (Öğrenilen kurallar — Faz 3 ile ortak tablo)

**2.3 Dosya depolama**
- [ ] Yüklenen PDF'ler
- [ ] Üretilen Excel çıktıları

**2.4 Müşteri portalı** (YMM'nin verdiği URL)
- [ ] Giriş
- [ ] Dönem seç (varsayılan: bir önceki ay) — opsiyonel "şu döneme ekliyorum"
- [ ] Toplu fatura yükle
- [ ] Dönem-dışı ayıklama uyarısı (DK-19)
- [ ] "Teslim et" → YMM'ye düşer

**2.5 YMM dashboard**
- [ ] Müşteri listesi + yönetim (ekle/düzenle/sil)
- [ ] Dönem takibi: hangi müşteri X dönemini yükledi mi (durum tablosu)
- [ ] Hata belirteçleri (dönem-dışı, review gereken)
- [ ] Excel çıktısı al / kendi yükleyip çıktı al
- [ ] Raporlar (dönem bazlı özet)

**2.6 Ayarlar**
- [ ] Para birimi (DK-20 — ayarlanabilir yap)
- [ ] Sabit mükellef (DK-22) kaldır → müşteri kaydından gelsin

## Faz 3 — Öğrenme döngüsü (maliyet ↓ + doğruluk ↑) ⏳
> DB gerektirmez — kurallar dosyada saklanabilir (önbellek gibi). Mevcut modda başlanabilir.

- [ ] Şablon parmak izi (satıcı VKN + entegratör imzası + etiket seti)
- [ ] Kural üretimi:
  - [ ] LLM ilk okuduğunda otomatik kural türetme (değer nerede bulundu)
  - [ ] Review düzeltmesinden kural pekiştirme
- [ ] Kural deposu (dosya/config; DB gelince oraya taşınır)
- [ ] Resolver zinciri: XML → şablon kuralı → genel kalıp → LLM → bayrak
- [ ] Bilinen şablonlar LLM'siz çözülür → **token düşer**
- [ ] Güven skoru (şablon bazlı)
- [ ] Kalıcı LLM-parse sağlamlaştırması (başarısız 2 fatura)
- [ ] XML (UBL) hızlı-yol (deterministik, ~%100)

## Faz 4 — Ölçek + modüller ⏳
- [ ] OCR modülü (taranmış fatura / yazarkasa fişi)
- [ ] Audit log (kim ne düzeltti)
- [ ] Toplu kuyruk / performans (100+ fatura)
- [ ] 2. liste tipi (ör. yüklenilecek KDV / satış) — plugin, motor aynı
- [ ] Gelecek GİB formatları
