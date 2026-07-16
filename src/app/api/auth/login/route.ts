import { NextRequest, NextResponse } from 'next/server'
import { checkCredentials, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { user, pass } = await req.json()

  const role = checkCredentials(user, pass)
  if (!role) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, role })
  res.cookies.set(SESSION_COOKIE, role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
  })
  return res
}
