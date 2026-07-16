import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Solo proteger rutas /admin
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const session = req.cookies.get(SESSION_COOKIE)?.value
  if (session === 'ok') return NextResponse.next()

  // Redirigir al login
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*'],
}
