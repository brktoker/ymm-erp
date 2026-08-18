# Doğrulanmış Kurallar Günlüğü

> Bu dosya **büyür**. Her doğruluk payı olan karar buraya, kaynağıyla ve tarihiyle
> eklenir. Yeni fatura tipleri, istisnalar ve hesap kuralları burada birikir.
> Kod bu kurallara uymak zorundadır.

Kaynak faturalar (Faz 0 ispatı):
- `ENES ÇOBAN FATURA 30.12.2025 (2).pdf` — tevkifatlı e-Arşiv
- `FATURALAR.pdf` — 141 sayfa, ~130+ fatura, çok sayıda farklı şablon (mükellef: YİMMAK, VKN 9811593029)

---

## DK-01 — Satıcı = faturayı kesen taraf, mükellef DEĞİL
Listedeki "Satıcı" kolonu, faturayı **düzenleyen** (satan) taraftır. Mükellef her
zaman faturanın **alıcısıdır** ("SAYIN / Sayın" bloğu).
- **Tespit kuralı:** Mükellefin VKN'si job başında bir kez verilir; faturadaki
  **mükellef olmayan** taraf satıcıdır.
- **Örnek:** ENES ÇOBAN faturasında alıcı = ENES ÇOBAN (TCKN 12218418782),
  satıcı = VAN KAYA MADENİ YAĞLAR... LTD.ŞTİ (VKN **8830314036**). Kolona VKN 8830314036 yazılır.
- **Kaynak:** ENES ÇOBAN + FATURALAR.pdf s.1 (alıcı hep YİMMAK 9811593029).

## DK-02 — Tevkifat tutarı faturada yazılıdır, TAHMİN EDİLMEZ
Tevkifatlı faturada tevkifat KDV'si faturanın kendisinde bulunur
("Hesaplanan KDV Tevkifat (%..) = ..." / satır içi "KDV TEVKİFAT (%..)=..").
- `Kolon 12 (2 No'lu) = faturadaki tevkifat KDV`
- `Kolon 11 (tevkifat dışı) = toplam KDV − tevkifat KDV`
- `Kolon 13 = Kolon 11 + Kolon 12 = toplam KDV`
- **Örnek (ENES ÇOBAN):** toplam KDV 4.782.983,23 · tevkifat (%40) 1.913.193,29
  → K12 = 1.913.193,29 · K11 = 2.869.789,94 · K13 = 4.782.983,23.
- **Not:** Kural motorundaki tevkifat-oranı tablosu yalnızca fatura tevkifatı
  **açıkça yazmadığında** yedek olarak kullanılır.
- **Kaynak:** ENES ÇOBAN faturası.

## DK-03 — Tevkifat tespiti
Fatura tevkifatlıdır eğer: `Fatura Tipi: TEVKIFAT` **veya** metinde "KDV TEVKİFAT" /
"Tevkifat Sebebi" / "Hesaplanan KDV Tevkifat" geçiyorsa.
- **Kaynak:** ENES ÇOBAN (`Fatura Tipi:TEVKIFAT`).

## DK-04 — KDV kolonu SADECE KDV'dir, diğer vergiler hariç
Bazı faturalarda KDV dışında ek vergiler bulunur (ör. KONAKLAMA VERGİSİ %2).
Kolon 10'a **yalnızca** "Hesaplanan KDV" yazılır; diğer vergiler dahil edilmez.
- **Örnek (MTP Otelcilik, FATURALAR.pdf s.2):** KDV 196,43 alınır;
  KONAKLAMA VERGİSİ 39,29 **alınmaz**. Matrah 1.964,29.
- **Kaynak:** FATURALAR.pdf s.2.

## DK-05 — Mal cinsi & miktar: KDV dahil tutara göre en yüksek 3 kalem
Kolon 7 = en yüksek KDV dahil tutarlı **ilk 3 kalemin adı** (virgülle).
Kolon 8 = aynı 3 kalemin miktarı, **aynı sırada** (virgülle). 3'ten az kalemse hepsi.
- **Örnek (ENES ÇOBAN):** "Ahır, Yem deposu, Gübre deposu" | "1 Adet, 1 Adet, 1 Adet".
- **Kaynak:** kullanıcı kararı + ENES ÇOBAN.

## DK-06 — VKN/TCKN metin olarak, checksum doğrulamalı
10 hane = VKN, 11 hane = TCKN. Baştaki `0` korunmalı → **metin** olarak saklanır
(sayı yapılırsa `0280262365` → `280262365` olur, yanlış). VKN ve TCKN'nin kendi
checksum algoritmaları ile doğrulanır (düşük güven → review bayrağı).
- **Kaynak:** Ekim/Aralık dolu örnekleri (baştan sıfırlı VKN'ler).

## DK-07 — Fatura No ≠ ETTN
Kolon 4'e faturanın **fatura numarası** yazılır (ör. `AHT2025000000026`,
`FKE2025000000145`), ETTN (UUID) **değil**.
- **Kaynak:** kullanıcı kararı + faturalar.

## DK-08 — Tarih gerçek tarih formatında
Kolon 2 gerçek tarih olmalı (`YYYY-MM-DD` iç temsil). Ekim dolu örneğindeki
"45931" gibi ham Excel seri numarası **hatalıdır**, tekrarlanmaz. Faturalarda tarih
formatı değişkendir ("30-12-2025", "23.01.2025 – 21:29") → normalize edilir.
- **Kaynak:** Ekim dolu örneği (hata) + FATURALAR.pdf (değişken formatlar).

## DK-09 — Fatura şablonları çok çeşitlidir → alan-alan regex tek başına yetmez
FATURALAR.pdf içinde etiketler değişkendir: "Fatura No" / "Fatura Numarası",
"VKN" / "Vergi No", farklı kalem tablosu başlıkları, farklı tarih/tutar biçimleri.
- **Sonuç:** Çıkarım motoru **resolver zinciri** olmalı (XML → şablon kuralı →
  genel kalıp → LLM → bayrak). Bkz. [mimari.md](./mimari.md).
- **Kaynak:** FATURALAR.pdf s.1,2,4,10,50,100.

## DK-10 — Tek PDF birden çok fatura içerebilir
`FATURALAR.pdf` = 141 sayfa, ~130+ fatura. Bir fatura birden çok sayfa olabilir.
- **Sonuç:** Pipeline'da önce **fatura bölme** adımı gerekir; yeni fatura başlangıcı
  "Fatura No / Senaryo / ETTN / e-FATURA|e-ARŞİV" işaretleriyle tespit edilir.
- **Kaynak:** FATURALAR.pdf.

## DK-11 — Matrah faturadan doğrudan alınır (kalem toplama yok)
Kolon 9, faturanın "Mal Hizmet Toplam Tutarı" değeridir; kalemler tek tek toplanmaz.
- **Kaynak:** kullanıcı kararı.
