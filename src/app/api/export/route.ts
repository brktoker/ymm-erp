// Export API'si: dönem grupları → tek dosya (sekmeli) veya ayrı dosyalar (zip).
import { NextRequest, NextResponse } from 'next/server'
import { buildSingleFileBuffer, buildZipBuffer } from '@/lib/export/excel'
import type { PeriodGroup } from '@/lib/period'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    const { gruplar, mode } = (await req.json()) as {
        gruplar: PeriodGroup[]
        mode: 'single' | 'zip'
    }
    if (!Array.isArray(gruplar) || gruplar.length === 0)
        return NextResponse.json({ error: 'Satır yok' }, { status: 400 })

    if (mode === 'zip') {
        const buf = await buildZipBuffer(gruplar)
        return new NextResponse(new Uint8Array(buf), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="indirilecek-kdv-listeleri.zip"',
            },
        })
    }

    const buf = await buildSingleFileBuffer(gruplar)
    return new NextResponse(new Uint8Array(buf), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="indirilecek-kdv-listesi.xlsx"',
        },
    })
}
