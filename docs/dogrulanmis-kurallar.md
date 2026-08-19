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

## DK-05 — Mal cinsi & miktar: KDV dahil tutara göre en yüksek N kalem (N config'te)
Kolon 7 = en yüksek KDV dahil tutarlı **ilk N kalemin adı** (virgülle).
Kolon 8 = aynı N kalemin miktarı, **aynı sırada** (virgülle). N'den az kalemse hepsi.
- **N = `TOP_KALEM`** (`src/lib/config/extraction.ts`) — TEK KAYNAK; hem `derive` hem LLM prompt
  buradan beslenir. **Şu an N = 2** (kullanıcı kararı; önceden 3'tü).
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

## DK-12 — VKN/TCKN çıkarımında etiketli değer tercih edilir, telefon dışlanır
Metindeki ilk 10-11 haneli sayı **telefon numarası** olabilir (ör. "Tel: 8508236336").
Bu yüzden önce "VKN:/TCKN:/Vergi No" etiketiyle gelen kimlik seçilir; etiketli yoksa
telefon numaraları dışlanarak mükellef-olmayan kimlik alınır.
- **Kaynak:** ENES ÇOBAN ilk denemede telefon (8508236336) yakalanmış, checksum bayrağı
  yakalamış; etiketli tercih ile doğru VKN (8830314036) geldi.

## DK-13 — Geçersiz sayı (NaN) asla çıktıya yazılmaz
Matrah/KDV okunamazsa (NaN), çıktıya `0` yazılır ve "okunamadı" bayrağı eklenir.
Aksi halde `.xlsx` bozuk XML üretir. "Asla sessizce yanlış" ilkesinin uygulaması.
- **Kaynak:** FATURALAR.pdf'te bazı şablonlarda matrah okunamayınca xlsx bozulmuştu.

---

## Faz 1 — Deterministik motor ölçümleri (ilk uçtan uca koşu)

> Bu bölüm **deterministik motorun** (resolver zincirinin "genel kalıp" halkası)
> gerçek ölçümüdür. Üretimdeki asıl motor **LLM**'dir; buradaki zayıf alanlar
> (ünvan, kalem) LLM ile çözülecektir.

- **Fatura bölme:** `FATURALAR.pdf` 141 sayfa → **122 fatura** doğru ayrıştı (DK-10).
- **Sayısal alanlar:** matrah + KDV **103/122 (~%84)** faturada doğru okundu; kalanlar
  bayraklandı (sessiz hata yok).
- **Tevkifat (ENES ÇOBAN):** matrah/KDV/K11/K12/K13 **birebir doğru** (DK-02 doğrulandı).
- **Zayıf alanlar (beklenen):** `saticiUnvan` ve `kalemler` EDM-dışı şablonlarda
  düşük güvenli → **her satır review'a düşüyor**. Bu, LLM motorunun devreye gireceği
  net gerekçedir; deterministik motor tek başına yeterli değildir (DK-09 doğrulandı).
- **Çıktı:** üretilen `.xlsx` başlıkları örnek dosyalarla birebir; TOPLAM formüllü.

## DK-14 — LLM motoru: structured output ile şema-dışı çıktı engellenir
Çıkarım motoru Anthropic SDK `messages.parse()` + Zod şeması kullanır → model çıktısı
**sabit şemaya zorlanır**, serbest metin/halüsinasyon riski azalır. Kurallar (DK-01/04/05/07/11)
sistem prompt'una gömülüdür (satıcı=mükellef-değil, sadece KDV, top-3 kalem, fatura no≠ETTN).
Doğrulama (checksum, KDV oranı, tevkifat) türetmede (`derive.ts`) yine çalışır → LLM güveni
yüksek işaretlense de yanlış sayı yakalanır.
- Varsayılan model `claude-sonnet-5` (kalite/maliyet dengesi — çıkarım Opus-tier akıl yürütme
  gerektirmez, review hataları yakalar); `CSA_EXTRACTION_MODEL` ile değiştirilebilir.
- Resolver zinciri: **LLM birincil → deterministik yedek** (`engine.ts`). Anahtar yoksa/hata olursa
  deterministik çalışır (sessiz çökme yok).
- Toplu işlem eşzamanlılık sınırlı (`extractBatch`, varsayılan 5) → 130+ faturada API boğulmaz.
## DK-15 — KDV/matrah tek orana zorlanamaz (karışık oranlı faturalar)
Bir fatura birden çok KDV oranı içerebilir (inşaat malz. %20 + yemek/hizmet %10/%1) →
harmanlanmış KDV/matrah oranı %3–%15 gibi arada bir değer olur. Doğrulama bu yüzden tek
orana (%1/%10/%20) yakınlık **aramaz**; sadece **imkansız/şüpheli** oranı bayraklar:
`oran > %20.5` veya `oran < %0.5`.
- **Kaynak:** FATURALAR.pdf gerçek koşusu — tek-oran kuralı 10 karışık-oranlı faturayı
  yanlış bayrakladı (AHMET DEMİR, ERZİNCAN OSB vb.), hepsi doğruydu.

## DK-16 — LLM çıkarımı 1 kez retry, sonra deterministik yedek
`messages.parse` nadiren (122'de ~2) structured-output'a uymaz. Motor bir kez retry eder,
yine olmazsa deterministik yedeğe düşer (satır review'a işaretlenir, kayıp olmaz).
- **Ölçüm (FATURALAR.pdf, Sonnet 5):** 120/122 LLM ile temiz; 2 fatura kalıcı parse
  hatasıyla yedeğe düştü → doğru şekilde review'a gitti.
- **Faz 2 sağlamlaştırma:** kalıcı başarısız faturaların nedeni (uzun içerik/şablon)
  incelenmeli; gerekirse PDF'i belge olarak (base64) LLM'e verme denenebilir.

## DK-17 — TOPLAM satırı KULLANILMAZ
GİB İndirilecek KDV Listesi çıktısında TOPLAM satırı **istenmez** — hiçbir zaman eklenmez.
- **Kaynak:** kullanıcı kararı (kesin).

## DK-18 — KDV Dönemi HER ZAMAN fatura tarihinden; dönem başına ayrı sekme/dosya
Kolon 15 (KDV Dönemi) global tek değer DEĞİL, **her faturanın kendi tarihinden** türetilir
(15.02.2025 → `202502`). Çıktı döneme göre gruplanır:
- **Tek dosya:** dönem başına ayrı **sekme** (sekme adı = `YYYYMM`).
- **Ayrı dosyalar:** dönem başına ayrı `.xlsx`, tek `.zip` içinde (`...-YYYYMM.xlsx`).
- İndirme biçimini **kullanıcı seçer** (tek dosya / zip).
- **Örnek:** `FATURALAR.pdf` 122 fatura → **16 döneme** yayılı (202501–202604) → 16 sekme/16 dosya.
- **Kaynak:** kullanıcı kararı + FATURALAR.pdf gerçek dağılımı.

## DK-19 — Hedef dönem doğrulaması: dönem-dışı faturalar AYIKLANIR
Kullanıcı opsiyonel **hedef dönem** verir:
- **Hedef varsa:** dönemi eşleşmeyen faturalar **çıktıya alınmaz**; ayrı "ayıklanan" listesinde
  fatura no + satıcı + sebep (`YYYYMM dönemine ait, hedef: HHHHHH`) ile gösterilir.
- **Hedef boşsa:** tüm faturalar dönemlerine göre gruplanır (ayıklama yok).
- **Müşteri akışı varsayılanı:** hedef seçilmezse **bir önceki ay** (`oncekiAyDonem`).
- **Kaynak:** kullanıcı kararı (hariç tut/ayıkla).

## DK-20 — Para birimi: TRY biçimi, SEMBOL/İKON YOK (sadece parasal gösterim)
Tutarlar **sembolsüz** biçimlenir: binlik ayraç + 2 ondalık (ör. `23.914.916,15`).
Excel çıktısında **₺ ikonu yoktur** (kullanıcı kararı), değer sayısal kalır (GİB uyumu).
Locale (tr-TR) yalnızca ayraç düzenini belirler. Tek kaynak: `src/lib/config/currency.ts`
(`DEFAULT_CURRENCY='TRY'`, `formatAmount`, `excelNumFmt='#,##0.00'`). Hem tablo hem Excel
bu util'den beslenir — kopyalanmaz (ANA KURAL 2). İleride ayarlardan para birimi değişebilir.
- **Kaynak:** kullanıcı kararı (Excel'de ikon olmasın, sadece parasal gösterim).

## DK-21 — Review görünürlüğü + elle düzeltme (çıktı öncesi)
- Tabloda **tüm 15 GİB kolonu** gösterilir (Excel ile birebir; Seri ve GGB Tescil dahil).
- "Gözden geçir" sayacı **tıklanabilir** → sadece bayraklı satırlar filtrelenir; kullanıcı
  neyin neden bayraklandığını görür.
- **Her hücre düzenlenebilir**; kullanıcı Excel almadan önce yanlış alanı elle düzeltir,
  export düzeltilmiş veriyi kullanır.
- **Kaynak:** kullanıcı kararı.

## DK-33 — Çok-sayfalı fatura: kimliğe göre bölme (ETTN/Fatura No)
Fatura 2-3 sayfa olabilir (footer/banka/notlar taşar). Bölme artık **fatura kimliğine** göre
(`faturaKimlik`: ETTN öncelik → Fatura No): aynı kimlik = aynı fatura (başlık tekrarı),
kimliksiz sayfa = devam sayfası → mevcut faturaya eklenir; farklı kimlik = yeni fatura.
- **Ölçüm (FATURALAR):** 141 sayfa → 123 fatura, 18 devam sayfası doğru birleşti (hepsi "SAYIN"sız footer).
- **Kaynak:** kullanıcı (faturalar tek sayfa değil).

## DK-32 — Faz 3 v3: "Doğrulanmış satıcı" reçetesi (hem ucuz hem doğru)
Satıcı şablonları sabit olduğundan, deterministiğin hangi satıcıda güvenilir olduğunu **öğreniriz**:
- **Doğrulama:** LLM bir satıcıyı okurken, aynı fatura deterministik motorla da okunur ve
  **karşılaştırılır** (`deterministikEslesir`: fatura no eşit + matrah/kdv %1 yakın + mal cinsi top-N
  ad içeriyor). Eşleşirse satıcı **`detGuvenli=true`** işaretlenir (kayıt defterine).
- **Uygulama:** doğrulanmış satıcının sonraki faturaları **kural yolu** ile (LLM'siz, bedava) çözülür;
  bu faturada da temel alanlar + temiz mal cinsi doğrulanır (şablon değişmişse LLM'e düşer).
- **Doğrulanmamış satıcı** (deterministik LLM ile eşleşmeyen, ör. FKE) → **her zaman LLM** (bozuk çıktı yok).
- **Güvenli:** kural yolu yalnızca kanıtlanmış satıcılarda; sessiz yanlış olmaz.
- **Test:** karşılaştırma 4 senaryoda doğru (eşleşme/tutar farkı/bozuk mal cinsi/no farkı).
- **Sonraki (v3 v2):** standart-dışı etiketli satıcılar için özel alan-anchor reçetesi (şimdilik onlar LLM'de).
- **Kaynak:** kullanıcı içgörüsü (satıcı şablonları sabit → nereye bakacağımız belli).

## DK-31 — Faz 3 v2: kural yolu yalnızca TEMİZ mal cinsi varsa (hem ucuz hem temiz)
DK-30'daki denge sorunu (kural yolunda mal cinsi zayıf → 55 satır bayraklı) çözüldü:
- **Kalem parser'ı sağlamlaştırıldı** (`extractKalemler`): tablo bölgesi bulunur, çok-satırlı
  kalemler birleştirilir, ad `:`/`(`'den kesilir, başlık satırları atlanır. **Kalite skoru** döner.
- **Ad temizlik denetimi** (`adTemizMi`): başlık kelimesi (Tutarı/Oranı/Mal Hizmet...) veya endeks
  gürültüsü kaçmışsa "kirli" → kalite düşer.
- **Kural yolu kapısına** `guven.kalemler >= 0.75` eklendi: mal cinsi temizse kural (bedava, bayraksız),
  değilse **LLM** (temiz). Böylece **hiçbir yerde bozuk mal cinsi çıkmaz**.
- **Ölçüm (FATURALAR):** 41/122 temiz-ayrıştırılabilir → kural (bedava). OSB/ADE/HMF temiz;
  FKE (bozuk deterministik) doğru şekilde LLM'e düşüyor.
- Sonuç: token tasarrufu (kural yolu) + temiz çıktı + review yükü düşük.
- **Kaynak:** kullanıcı geri bildirimi (55 gözden geçir) + Faz 3 v2 kararı.

## DK-30 — Faz 3 öğrenme v1: Satıcı Kayıt Defteri + kural yolu (token↓)
Bilinen satıcının faturası LLM'siz (bedava) çözülür:
- **Öğrenme:** LLM bir satıcıyı başarıyla okuduğunda `VKN→ünvan` kaydedilir
  (`src/lib/learning/sellerRegistry.ts`, `.cache/seller-registry.json`, git dışı).
  Yalnızca **LLM** çıkarımından öğrenilir (yanlış veri öğrenilmesin).
- **Resolver zinciri (engine.ts):** 1) önbellek → 2) deterministik ön-çıkarım + kayıttan ünvan →
  3) **kural yolu:** satıcı biliniyor VE deterministik faturaNo+tarih+matrah+kdv güvenli ise
  → LLM'siz döner (`engine: 'rule'`). 4) değilse LLM (+öğren) → hata olursa deterministik yedek.
- **Tasarruf:** bir müşterinin **düzenli tedarikçileri** ilk aydan sonra çoğunlukla `rule`
  yoluyla bedava çözülür; sadece yeni satıcılar LLM'e gider.
- **Denge (dürüst):** kural yolunda **mal cinsi (kalemler)** deterministik (zayıf) → düşük güven
  bayrağıyla review'a düşer; kullanıcı kontrol/onaylar. Kritik alanlar (VKN, ünvan, faturaNo,
  tarih, matrah, kdv) güvenli. Tam şablon-kural öğrenimi (kalem tablosu dahil) = Faz 3 v2.
- **Doğrulandı:** ATLAS AGRO öğrenildikten sonra aynı satıcının başka faturası `rule` ile
  (LLM çağrılmadan) doğru çözüldü.
- **Arayüz:** meta'da "📐 N kuralla" göstergesi.
- **Kaynak:** Faz 3 planı (maliyet↓ + doğruluk↑).

## DK-29 — Excel tarih kolonu: gerçek tarih + GG.AA.YYYY (26.10.2025)
"Alış Faturasının Tarihi" kolonu Excel'de **gerçek tarih değeri** olarak yazılır ve
**`dd.mm.yyyy`** biçimiyle gösterilir (ör. 26.10.2025). İç temsil ISO (YYYY-MM-DD) kalır;
biçimlendirme tek kaynaktan (`src/lib/date.ts` → `isoToDate`, `EXCEL_DATE_FMT`, `formatDateTr`).
Saat kayması yok (`Date.UTC`). **Tabloda da** GG.AA.YYYY gösterilir (`DateCell`: tıkla-düzenle,
"23.01.2025" veya ISO kabul, içeride ISO kalır). Sadece gösterim/export biçimi — çıkarım etkilenmez.
- **Kaynak:** kullanıcı kararı (tarih formatı GG.AA.YYYY, hem Excel hem tablo).

## DK-28 — LLM'den sadece top-N kalem iste (çok kalemli faturada taşmayı önle)
> N = `TOP_KALEM` (config, şu an 2). Aşağıdaki "3" örneği ilk teşhis anındandır.

Kök sebep (HMF2025000001282, ~30 kalem): şema TÜM kalemleri isteyince LLM çıktısı
`max_tokens`'ı aştı (4096/4096, `stop_reason: max_tokens`) → JSON yarım → parse hatası →
deterministik yedek (ünvan boş). Az kalemli aynı-satıcı faturaları sığdığı için sorunsuzdu.
Düzeltme:
- Zaten yalnızca **en yüksek 3 kalemi** kullanıyoruz → LLM'den de **tümünü değil, top-3** istiyoruz
  (prompt + şema açıklaması). Çıktı küçülür → taşma biter, **maliyet de düşer**.
- `max_tokens` 4096 → 8192 (emniyet payı; cap maliyet değil, üretilen token faturalanır).
- `EXTRACTION_VERSION` v3 → eski önbellek geçersiz (sonraki koşu bir kez yeniden çıkarır).
- **Doğrulandı:** HİMAK faturası artık başarıyla okunuyor (satıcı + 3 kalem + tutarlar).
- **Kaynak:** gerçek başarısız fatura (30 kalem).

## DK-27 — "Satır doğru" onayı (kullanıcı bayrağı temizler)
Kullanıcı bir satırı kontrol edip doğru bulduysa (ör. yanlış-alarm) **"✓ Doğru"** butonuyla
o satırın uyarılarını temizler. Bayraklar boşalır → satır review'dan çıkar, "gözden geçir"
sayacı anlık düşer. (Faz 3'te bu onay öğrenme sinyali olacak.)
- **Kaynak:** kullanıcı kararı.

## DK-26 — %0 KDV geçerlidir, bayraklanmaz
Bazı hizmet/istisna faturalarında KDV oranı **%0**'dır (matrah var, KDV 0). Bu geçerlidir.
`kdv=0` "düşük güven / okunamadı" olarak bayraklanmaz (`derive` içinde istisna). KDV/matrah
oran kontrolü zaten `kdv>0` iken çalışır (0'ı flag'lemez).
- **Kaynak:** gerçek fatura ("Tedarik Edememe", matrah 250 / KDV %0) yanlış bayraklanmıştı.

## DK-25 — Satıcı/alıcı ayrımı: "SAYIN=alıcı" birincil + mükellef doğrulaması
Gerçek hata (TOKER faturaları): sistem mükellefi (TOKER, SAYIN tarafı) yanlışlıkla satıcı yazdı.
Kök sebep: sabit mükellef (9811593029, DK-22) bu faturalarda yoktu → DK-01 yanlış mükellefle çalıştı.
Düzeltmeler:
- **Prompt (birincil kural):** SATICI = faturayı KESEN (ETTN/MERSİS/Tic.Sicil tarafı); ALICI = "SAYIN"
  altındaki taraf. Bu kural mükellef VKN faturada olmasa bile uygulanır (mükellef HER ZAMAN alıcı).
- **Doğrulama bayrağı 1:** mükellef VKN faturada hiç yoksa → "mükellef bulunamadı, yanlış mükellef/fatura".
- **Doğrulama bayrağı 2:** satıcı VKN == mükellef VKN → "satıcı mükellefle aynı — hatalı" (imkansız).
- **Önbellek sürümü:** prompt değişince `EXTRACTION_VERSION` artar → eski (yanlış) önbellek kullanılmaz.
- **Asıl çözüm Faz 2:** sabit mükellef kalkacak, her müşteriden gelecek → yanlış mükellef sorunu biter.
- **Kaynak:** gerçek hata (CÖMERT satıcı iken TOKER yazılmış).

## DK-24 — Global loader (tüm API isteklerinde)
API isteklerinde **global loader** kullanılır (tek kaynak `LoaderProvider` + `useLoader().wrap`).
Çıkarımda "Faturalar analiz ediliyor…", indirmede "Excel hazırlanıyor…". Yeni API çağrıları da
bu `wrap(mesaj, fn)` desenini kullanmalı (kopya loader state'i AÇMA — ANA KURAL 2).
- **Kaynak:** kullanıcı kararı.

## DK-23 — Çıkarım önbelleği (tekrar çıkarım bedava)
LLM çıkarımı token/kredi harcar (her fatura = 1 API çağrısı). Aynı faturayı tekrar yüklemek
yeniden ödeme demektir. Önbellek bunu önler: sonuç `.cache/extraction/<hash>.json`'a yazılır
(DB yok). Anahtar = **model + mükellef + fatura metni** (biri değişirse yeniden çıkarılır).
- Önbellek isabeti → `engine: 'cache'`, **API'ye gitmez, bedava** (ölçüldü: 2. koşu 0.5 sn).
- Best-effort: yazma/okuma hatası akışı bozmaz. `.cache/` git dışıdır.
- Doğrulama motoru (`derive.ts`) önbellekli sonuca da uygulanır → güvenlik korunur.
- **Kaynak:** kullanıcı kararı (maliyet kontrolü).

## DK-22 — Geçici sabit mükellef (Faz 2'ye kadar)
Mükellef VKN her seferinde elle girilmez; **config'te sabit** tutulur
(`src/lib/config/mukellef.ts` → `DEFAULT_MUKELLEF`). Arayüz alanı bu değerle önceden dolar,
route boşsa config'ten alır. **Geçici**: Faz 2'de müşteri kayıtları eklenince sabit kaldırılıp
mükellef her müşteriden gelecek (satıcı=mükellef-değil kuralı DK-01 aynen çalışır).
- **Kaynak:** kullanıcı kararı (şimdilik sabit).

---

## Faz 1 — Gerçek LLM ölçümü (Sonnet 5, FATURALAR.pdf 122 fatura)

> Bu bölüm **gerçek API koşusunun** sonucudur (deterministik motorun aksine canlı LLM).

| Metrik | Deterministik | LLM (Sonnet 5, düzeltme sonrası) |
|---|---|---|
| Temiz (bayraksız) | 0/122 | **120/122** |
| Review gerektiren | 122 | **2** |
| Matrah+KDV okundu | 103/122 | **122/122** |
| Ünvan/kalem doğru | zayıf (bayraklı) | **doğru (temiz)** |

- **Elle giriş yükü ~%98 azaldı** (122 review → 2 review).
- Süre ~2.5 dk, maliyet ~$1 (eşzamanlılık 5).
- **Açık tercih sorusu:** LLM mal cinsini tam yazıyor ("Ahır (01.12.2025 tarihli 1 nolu
  hakediş)"); daha kısa isim istenirse prompt'a "parantez içi tarih/hakediş detayını atla"
  eklenebilir. Kullanıcı kararına bağlı (Faz 2 öğrenme döngüsü adayı).
