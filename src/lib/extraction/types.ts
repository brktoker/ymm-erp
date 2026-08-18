// Çıkarım şeması — docs/cikarim-semasi.md ile birebir aynı olmalı.
// Kod ile doküman çeliştiğinde önce dokümana bakılır (docs/README.md ANA KURAL).

export interface ExtractedLineItem {
    ad: string // Mal/Hizmet adı
    miktar: string // "1 Adet", "340 KG" — birimiyle, faturadaki gibi
    kdvDahilTutar: number // Sıralama bu değere göre (DK-05)
}

export interface ExtractedInvoice {
    saticiUnvan: string // Faturayı KESEN taraf, mükellef DEĞİL (DK-01)
    saticiVknTckn: string // 10 hane VKN / 11 hane TCKN — metin (DK-06)
    faturaNo: string // Fatura numarası, ETTN DEĞİL (DK-07)
    faturaTarihi: string // ISO YYYY-MM-DD (DK-08)
    kalemler: ExtractedLineItem[] // TÜM kalemler; top-3 türetmede seçilir
    matrah: number // KDV Hariç toplam, faturadan doğrudan (DK-11)
    kdv: number // SADECE KDV, diğer vergiler hariç (DK-04)
    tevkifatKdv?: number // Faturada yazan tevkifat KDV tutarı (DK-02)
    ggbTescilNo?: string // Sadece ithalat
    // alan bazında güven skoru (0-1); eşik altı → review bayrağı
    guven: Partial<Record<keyof Omit<ExtractedInvoice, 'guven'>, number>>
}

// GİB "İndirilecek KDV Listesi" tek satırı (türetilmiş çıktı)
export interface KdvListRow {
    siraNo: number // Kolon 1 — sistem atar
    tarih: string // Kolon 2 — YYYY-MM-DD
    seri: string // Kolon 3 — genelde boş
    faturaNo: string // Kolon 4
    saticiUnvan: string // Kolon 5
    saticiVknTckn: string // Kolon 6
    malCinsi: string // Kolon 7 — top-3 ad
    miktar: string // Kolon 8 — top-3 miktar
    matrah: number // Kolon 9
    kdv: number // Kolon 10
    tevkifatDisiKdv: number | null // Kolon 11
    ikiNoluKdv: number | null // Kolon 12
    toplamIndirilenKdv: number // Kolon 13
    ggbTescilNo: string // Kolon 14
    kdvDonemi: string // Kolon 15 — ör. "202512"
    // review için: hangi alanlar düşük güvenli / bayraklı
    bayraklar: string[]
}
