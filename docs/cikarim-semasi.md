# Çıkarım Şeması ve Kolon Eşlemesi

Bu doküman, bir faturadan **hangi alanların** çıkarıldığını ve bunların GİB Excel
listesindeki **hangi kolona** nasıl yerleştirildiğini tanımlar. Kod tarafındaki tip
sözleşmesi (`ExtractedInvoice`) bu dokümanla birebir aynı olmalıdır.

## Çıkarım hedefi (fatura → nesne)

```ts
interface ExtractedLineItem {
  ad: string          // Mal/Hizmet adı
  miktar: string      // "1 Adet", "340 KG" (birimiyle, faturadaki gibi)
  kdvDahilTutar: number  // sıralama bu değere göre yapılır
}

interface ExtractedInvoice {
  saticiUnvan: string        // Faturayı KESEN taraf (mükellef DEĞİL)
  saticiVknTckn: string      // 10 hane VKN veya 11 hane TCKN — metin (baştaki 0 korunur)
  faturaNo: string           // Fatura numarası (ETTN DEĞİL)
  faturaTarihi: string       // ISO: YYYY-MM-DD
  kalemler: ExtractedLineItem[]  // TÜM kalemler; top-3 seçimi türetme aşamasında
  matrah: number             // KDV Hariç toplam (Mal Hizmet Toplam Tutarı)
  kdv: number                // SADECE KDV (konaklama vb. diğer vergiler HARİÇ)
  tevkifatKdv?: number       // Faturada yazan tevkifat KDV tutarı (varsa)
  ggbTescilNo?: string       // Sadece ithalatta
  guven: Record<string, number>  // alan bazında güven skoru (0-1)
}
```

## Kolon eşlemesi (GİB "İndirilecek KDV Listesi")

| # | Kolon | Kaynak alan | Türetme kuralı |
|---|---|---|---|
| 1 | Sıra No | — | Sistem atar (giriş sırası) |
| 2 | Alış Faturasının Tarihi | `faturaTarihi` | Gerçek tarih (ham Excel seri no DEĞİL) |
| 3 | Alış Faturasının Serisi | — | Genelde boş |
| 4 | Alış Faturasının Sıra No'su | `faturaNo` | Fatura numarası |
| 5 | Satıcının Adı-Soyadı / Ünvanı | `saticiUnvan` | Kesen taraf |
| 6 | Satıcının VKN / TCKN | `saticiVknTckn` | Metin, checksum doğrulamalı |
| 7 | Mal/Hizmetin Cinsi | `kalemler` | **KDV dahil tutara göre en yüksek 3 kalemin adı**, virgülle |
| 8 | Mal/Hizmetin Miktarı | `kalemler` | Aynı 3 kalemin miktarı, aynı sırada, virgülle |
| 9 | KDV Hariç Tutar | `matrah` | Faturadan doğrudan (toplama yapılmaz) |
| 10 | KDV'si | `kdv` | Faturadan doğrudan, sadece KDV |
| 11 | Tevkifat dışı bu dönemde indirilen KDV | türetme | Tevkifatlıysa: `kdv - tevkifatKdv`; değilse boş |
| 12 | 2 No'lu Beyannamede Ödenen KDV | `tevkifatKdv` | Tevkifatlıysa faturadaki değer; değilse boş |
| 13 | Toplam İndirilen KDV | türetme | Tevkifatsız: `= kdv`. Tevkifatlı: `= (11) + (12) = kdv` |
| 14 | GGB Tescil No | `ggbTescilNo` | Sadece ithalat |
| 15 | KDV Dönemi | dönem | Seçili dönem (ör. `202512`) |

## Top-3 kalem seçimi (kolon 7 ve 8)

1. `kalemler` dizisi `kdvDahilTutar` **azalan** sıralanır.
2. İlk 3 alınır (3'ten azsa hepsi).
3. Kolon 7 = adların virgülle birleşimi, Kolon 8 = miktarların **aynı sırada** birleşimi.

> Sıralama **KDV dahil** tutara göredir (kullanıcı onayı). Kalem KDV dahil tutarı
> faturada yoksa `matrah kalemi + kalem KDV` ile hesaplanır.
