export const SESSION_COOKIE = 'iss_session'

export function checkCredentials(user: string, pass: string): boolean {
  const users: Record<string, string | undefined> = {
    admin: process.env.AUTH_ADMIN_PASS,
    prueba: process.env.AUTH_PRUEBA_PASS,
  }
  const expected = users[user.toLowerCase()]
  return !!expected && expected === pass
}
