import { getSetting } from '@/lib/settings'

interface PlaceResult {
  name: string
  address: string
  phone?: string
  website?: string
  rating?: number
  category?: string
}

async function getKeys(): Promise<string[]> {
  const [k1, k2, k3] = await Promise.all([
    getSetting('SERPER_API_KEY_1'),
    getSetting('SERPER_API_KEY_2'),
    getSetting('SERPER_API_KEY_3'),
  ])
  return [k1, k2, k3].filter(Boolean)
}

export async function searchPlaces(query: string, city: string): Promise<PlaceResult[]> {
  const keys = await getKeys()
  if (!keys.length) throw new Error('Serper API Key no configurada')

  for (const key of keys) {
    try {
      const res = await fetch('https://google.serper.dev/places', {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `${query} ${city}`, gl: 'ar', hl: 'es', num: 20 }),
      })

      if (!res.ok || res.status === 429 || res.status === 403) continue

      const data = await res.json()
      if (!data.places) return []

      return data.places.map((p: { title: string; address?: string; phoneNumber?: string; website?: string; rating?: number; category?: string }) => ({
        name: p.title,
        address: p.address || city,
        phone: p.phoneNumber,
        website: p.website,
        rating: p.rating,
        category: p.category,
      }))
    } catch {
      continue
    }
  }

  throw new Error('Todas las Serper API keys están agotadas')
}
