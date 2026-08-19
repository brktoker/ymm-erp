// Karşıt inceleme API'si: satırlar + eşik → satıcı başına Excel, tek zip.
import { NextRequest, NextResponse } from 'next/server'
import { buildKarsitZip } from '@/lib/export/karsitInceleme'
import type { KdvListRow } from '@/lib/extraction/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    const { rows, esik } = (await req.json()) as { rows: KdvListRow[]; esik: number }
    if (!Array.isArray(rows) || rows.length === 0)
        return NextResponse.json({ error: 'Satır yok' }, { status: 400 })

    const { buf, adet } = await buildKarsitZip(rows, Number(esik) || 0)
    if (adet === 0) return NextResponse.json({ error: 'Eşiği aşan satıcı yok' }, { status: 400 })

    return new NextResponse(new Uint8Array(buf), {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="karsit-inceleme.zip"',
        },
    })
}
