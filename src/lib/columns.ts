// GİB "İndirilecek KDV Listesi" kolon tanımı — TEK KAYNAK (ANA KURAL 2).
// Tablo (ReviewTable) ve Excel çıktısı aynı sırayı/etiketi paylaşır; 15 kolon birebir.

import type { KdvListRow } from './extraction/types'

export type ColKind = 'index' | 'text' | 'currency'

export interface ReviewCol {
    key: keyof KdvListRow
    label: string // tablo başlığı (kısa)
    excelLabel: string // Excel başlığı (GİB resmi, uzun)
    kind: ColKind
    w: string // tablo hücre genişliği (tailwind)
    excelW: number // Excel kolon genişliği
}

export const REVIEW_COLS: ReviewCol[] = [
    { key: 'siraNo', label: 'Sıra', excelLabel: 'Sıra No', kind: 'index', w: 'w-12', excelW: 8 },
    { key: 'tarih', label: 'Tarih', excelLabel: 'Alış Faturasının Tarihi', kind: 'text', w: 'w-28', excelW: 14 },
    { key: 'seri', label: 'Seri', excelLabel: 'Alış Faturasının Serisi', kind: 'text', w: 'w-16', excelW: 10 },
    { key: 'faturaNo', label: 'Fatura No', excelLabel: "Alış Faturasının Sıra No'su", kind: 'text', w: 'w-40', excelW: 20 },
    { key: 'saticiUnvan', label: 'Satıcı Ünvan', excelLabel: 'Satıcının Adı-Soyadı / Ünvanı', kind: 'text', w: 'w-64', excelW: 30 },
    { key: 'saticiVknTckn', label: 'VKN/TCKN', excelLabel: 'Satıcının Vergi Kimlik Numarası / TC Kimlik Numarası', kind: 'text', w: 'w-32', excelW: 22 },
    { key: 'malCinsi', label: 'Mal/Hizmet Cinsi', excelLabel: 'Alınan Mal ve/veya Hizmetin Cinsi', kind: 'text', w: 'w-64', excelW: 30 },
    { key: 'miktar', label: 'Miktar', excelLabel: 'Alınan Mal ve/veya Hizmetin Miktarı', kind: 'text', w: 'w-32', excelW: 18 },
    { key: 'matrah', label: 'KDV Hariç', excelLabel: 'Alınan Mal ve/veya Hizmetin KDV Hariç Tutarı', kind: 'currency', w: 'w-32', excelW: 18 },
    { key: 'kdv', label: "KDV'si", excelLabel: "KDV'si", kind: 'currency', w: 'w-28', excelW: 14 },
    { key: 'tevkifatDisiKdv', label: 'Tevkifat Dışı', excelLabel: 'Tevkifatlı Faturanın Tevkifata Tabi Olmayan Ve Bu Dönemde İndirilen Kdv Tutarı', kind: 'currency', w: 'w-28', excelW: 20 },
    { key: 'ikiNoluKdv', label: "2 No'lu KDV", excelLabel: '2 Nolu Beyannamede Ödenen Kdv Tutarı', kind: 'currency', w: 'w-28', excelW: 20 },
    { key: 'toplamIndirilenKdv', label: 'Toplam İnd. KDV', excelLabel: 'Toplam İndirilen KDV Tutarı', kind: 'currency', w: 'w-32', excelW: 18 },
    { key: 'ggbTescilNo', label: 'GGB Tescil', excelLabel: "GGB Tescil No'su (Alış İthalat İse)", kind: 'text', w: 'w-28', excelW: 14 },
    { key: 'kdvDonemi', label: 'Dönem', excelLabel: 'Belgenin İndirim Hakkının Kullanıldığı KDV Dönemi', kind: 'text', w: 'w-24', excelW: 12 },
]
