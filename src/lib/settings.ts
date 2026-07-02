import { createClient } from '@/lib/supabase/server'

export async function getSettings(): Promise<Record<string, string>> {
  const db = await createClient()
  const { data } = await db.from('settings').select('key, value')
  if (!data) return {}
  return Object.fromEntries(data.map(r => [r.key, r.value]))
}

export async function getSetting(key: string): Promise<string> {
  const s = await getSettings()
  return s[key] || process.env[key] || ''
}
