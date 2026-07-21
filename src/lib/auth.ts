import { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'iss_session'

// Returns the role ('admin' | 'readonly') or null if invalid credentials
export function checkCredentials(user: string, pass: string): 'admin' | 'readonly' | null {
  const adminPass = process.env.AUTH_ADMIN_PASS?.trim()
  const pruebaPass = process.env.AUTH_PRUEBA_PASS?.trim()
  if (user.toLowerCase().trim() === 'admin' && adminPass && pass.trim() === adminPass) return 'admin'
  if (user.toLowerCase().trim() === 'prueba' && pruebaPass && pass.trim() === pruebaPass) return 'readonly'
  return null
}

export function getSessionRole(req: NextRequest): 'admin' | 'readonly' | null {
  const val = req.cookies.get(SESSION_COOKIE)?.value
  if (val === 'admin' || val === 'readonly') return val
  return null
}

export function isAdmin(req: NextRequest): boolean {
  return getSessionRole(req) === 'admin'
}
