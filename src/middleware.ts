import { NextRequest, NextResponse } from 'next/server'
import { getSessionRole } from '@/lib/auth'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Rutas /api que aceptan requests SIN sesión (callers externos legítimos):
// login, webhooks entrantes, cron de Vercel, chatbot público del sitio del
// cliente, y los webhooks de Telegram. Todo lo demás que mute requiere admin.
const PUBLIC_API_PREFIXES = [
  '/api/auth/',
  '/api/webhooks/',
  '/api/cron/',
  '/api/chat',
  '/api/telegram/webhook',
  '/api/telegram/bot/webhook',
]
function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(p => pathname === p || pathname.startsWith(p))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const role = getSessionRole(req)

  // Proteger páginas /admin
  if (pathname.startsWith('/admin')) {
    if (!role) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // Mutaciones a /api: solo admin, salvo las rutas públicas legítimas.
  // Antes solo se bloqueaba a 'readonly'; los no logueados (role null) podían
  // escribir. Ahora se exige admin explícitamente.
  if (
    pathname.startsWith('/api/') &&
    MUTATION_METHODS.has(req.method) &&
    !isPublicApi(pathname) &&
    role !== 'admin'
  ) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
