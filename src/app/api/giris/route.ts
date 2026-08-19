// Geçici giriş — parola doğruysa httpOnly oturum cookie'si set eder.
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    const { parola } = (await req.json()) as { parola?: string }
    const dogruParola = process.env.PANEL_PAROLA || 'ymm2025'
    const oturum = process.env.PANEL_OTURUM || 'panel-oturum'

    if (!parola || parola !== dogruParola) {
        return NextResponse.json({ error: 'Parola hatalı' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set('panel_oturum', oturum, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 gün
    })
    return res
}
