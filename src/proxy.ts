// Geçici panel koruması — cookie'de oturum anahtarı yoksa /giris'e yönlendir.
// (Next.js 16: eski "middleware" konvansiyonu "proxy" oldu; işlev aynı.)
import { NextResponse, type NextRequest } from 'next/server'

const COOKIE = 'panel_oturum'

export function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname
    const oturum = request.cookies.get(COOKIE)?.value
    const girisli = Boolean(oturum && oturum === (process.env.PANEL_OTURUM || 'panel-oturum'))

    if (path.startsWith('/panel') && !girisli) {
        return NextResponse.redirect(new URL('/giris', request.url))
    }
    if (path === '/giris' && girisli) {
        return NextResponse.redirect(new URL('/panel', request.url))
    }
    return NextResponse.next()
}

export const config = {
    matcher: ['/panel/:path*', '/giris'],
}
