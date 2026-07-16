import { NextRequest, NextResponse } from 'next/server'
import { getSessionRole } from '@/lib/auth'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const role = getSessionRole(req)

  // Proteger rutas /admin
  if (pathname.startsWith('/admin')) {
    if (!role) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // Bloquear mutaciones a /api para usuarios readonly (excepto /api/auth/*)
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth/') &&
    MUTATION_METHODS.has(req.method) &&
    role === 'readonly'
  ) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
