# Karşıt İnceleme Modülü

## Nedir, neden gerekli?
**KDV iadesinde** mali müşavirin (YMM) yaptığı **çapraz doğrulama**: belirli tutarın üstündeki
alımlar için "bu satıcıdan aldığım fatura gerçek mi, satıcı bu KDV'yi beyan etmiş mi?" sorusu
karşıt inceleme tutanağıyla teyit edilir. İade raporunun zorunlu parçası.

## Kural (KDV Genel Uygulama Tebliği)
- **Her yıl GİB bir eşik (sınır) belirler**; o rakamın üstündeki alımlar için karşıt inceleme zorunlu.
  Rakam yıllık güncellenir → **ayarlardan girilir** (`yillikEsik`).
- **Eşik SATICI TOPLAMINA uygulanır (kullanıcı kararı):** bir satıcıdan dönem/yıl **toplam matrahı**
  eşiği aşarsa, o satıcının **tüm faturaları** karşıt incelemeye girer → **satıcı başına ayrı dosya**.
- "Seçili olanlar" = eşiği aşan satıcılar.

> **YMM ile netleştirilecek:** eşiğin güncel rakamı; toplam KDV hariç matrah üzerinden mi
> (varsayımımız) yoksa KDV dahil mi hesaplanıyor.

## Excel formatı (kullanıcının verdiği örneklerden)
Her satıcı için AYRI `.xlsx`. İki sekme:

**Sayfa1** (10 kolon):
| # | Kolon | Kaynak |
|---|---|---|
| 1 | Faturanın Tarihi | çıkarım (`tarih`) |
| 2 | Faturanın Serisi | çıkarım (`seri`) |
| 3 | Faturanın Numarası | çıkarım (`faturaNo`) |
| 4 | Faturanın Tutarı (TL) | çıkarım (`matrah`, KDV hariç) |
| 5 | K.D.V (TL) | çıkarım (`kdv`) |
| 6 | Defter Kayıt Tarihi | **müşavir doldurur** (boş) |
| 7 | Yevmiye Numarası | **müşavir doldurur** (boş) |
| 8 | Ödeme Şekli ve Ödemeye İlişkin Belge | **müşavir doldurur** (kod 1-6) |
| 9 | Açıklama | boş |
| 10 | Hatalı Satır Açıklama | boş |

**Ödeme Şekli Referans** (sabit tablo):
| Kod | Ödeme Şekli |
|---|---|
| 1 | Nakit |
| 2 | Banka |
| 3 | Çek |
| 4 | Senet |
| 5 | C/H |
| 6 | Diğer |

## Sisteme entegrasyon
```
Çıkarılan faturalar (mevcut) → paylaşılan durum (panel context)
   → Ayarlar: yillikEsik (TL)
   → Satıcıya göre grupla (VKN)
   → toplam matrah ≥ eşik olan satıcıları SEÇ
   → her seçili satıcı için birebir Excel (Sayfa1 + Ödeme Şekli Referans)
   → tek zip (dosya adı = satıcı ünvanı)
```
- **Otomatik dolan:** tarih, seri, no, matrah, KDV
- **Müşavir dolduran:** defter kayıt tarihi, yevmiye no, ödeme şekli

## Panel yapısı (bu modülle gelen)
- Sol **sidebar**: Fatura Çıkarma · Karşıt İnceleme · Ayarlar · Çıkış
- **Ayarlar:** yıllık eşik + ileride diğer options (para birimi, mükellef, model)
- **Paylaşılan çıkarım durumu:** Fatura Çıkarma bir kez çıkarır, Karşıt İnceleme aynı veriyi kullanır (tekrar yükleme yok)

## Durum
- Karar: eşik **satıcı toplamına** uygulanır.
- Saklama: eşik şimdilik tarayıcıda (localStorage); Faz 2'de DB'ye taşınır.
