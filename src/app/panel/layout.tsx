// Panel düzeni — sol sidebar + sağ içerik. Çıkarım durumu iki sayfa arasında paylaşılır.
import { Sidebar } from '@/components/Sidebar'
import { ExtractionProvider } from '@/components/providers/ExtractionProvider'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
    return (
        <ExtractionProvider>
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 min-w-0 p-6 md:p-8">{children}</div>
            </div>
        </ExtractionProvider>
    )
}
