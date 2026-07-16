import { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'iss_session'

// Returns the role ('admin' | 'readonly') or null if invalid credentials
export function checkCredentials(user: string, pass: string): 'admin' | 'readonly' | null {
  if (user.toLowerCase() === 'admin' && process.env.AUTH_ADMIN_PASS && pass === process.env.AUTH_ADMIN_PASS) return 'admin'
  if (user.toLowerCase() === 'prueba' && process.env.AUTH_PRUEBA_PASS && pass === process.env.AUTH_PRUEBA_PASS) return 'readonly'
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
