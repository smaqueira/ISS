import { getSetting } from '@/lib/settings'

interface EnrichResult {
  phone?: string
  website?: string
  instagram?: string
}

async function getKeys(): Promise<string[]> {
  const [k1, k2, k3] = await Promise.all([
    getSetting('SERPER_API_KEY_1'),
    getSetting('SERPER_API_KEY_2'),
    getSetting('SERPER_API_KEY_3'),
  ])
  return [k1, k2, k3].filter(Boolean)
}

// Valida y normaliza un teléfono argentino a formato wa.me (549 + área + número).
// Devuelve undefined si no parece un teléfono real (precios, rangos, códigos, etc).
export function normalizePhone(raw?: string | null): string | undefined {
  if (!raw) return undefined
  // Rechazar textos con símbolos de precio o rangos tipo "150-450"
  if (/[$€]|Q\s?\d/.test(raw)) return undefined
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 13) return undefined
  let n = digits
  if (n.startsWith('54')) n = n.slice(2)
  if (n.startsWith('9') && n.length > 10) n = n.slice(1)
  if (n.startsWith('0')) n = n.slice(1)
  // Un número argentino sin prefijos queda en 10 dígitos (área + abonado)
  if (n.length !== 10) return undefined
  return `549${n}`
}

// Teléfonos argentinos: +54 11 xxxx-xxxx, 011 xxxx xxxx, 11-xxxx-xxxx, etc.
function extractPhone(text: string): string | undefined {
  const match = text.match(/(?:\+?54\s?)?(?:9\s?)?(?:0?11|0?2\d{2,3}|0?3\d{2,3})[\s.-]?\d{4}[\s.-]?\d{4}/)
  if (!match) return undefined
  return normalizePhone(match[0])
}

function extractInstagram(link: string, text: string): string | undefined {
  const fromLink = link.match(/instagram\.com\/([a-zA-Z0-9._]+)/)
  if (fromLink && !['p', 'reel', 'explore', 'stories'].includes(fromLink[1])) return `@${fromLink[1]}`
  const fromText = text.match(/@([a-zA-Z0-9._]{3,30})/)
  if (fromText) return `@${fromText[1]}`
  return undefined
}

// Busca datos de contacto de un negocio con una búsqueda orgánica en Google
export async function enrichContact(name: string, zona: string): Promise<EnrichResult> {
  const keys = await getKeys()
  if (!keys.length) return {}

  for (const key of keys) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `"${name}" ${zona} teléfono whatsapp instagram contacto`, gl: 'ar', hl: 'es', num: 5 }),
      })
      if (!res.ok) continue

      const data = await res.json()
      const organic: { title?: string; link?: string; snippet?: string }[] = data.organic || []

      const result: EnrichResult = {}
      for (const r of organic) {
        const text = `${r.title || ''} ${r.snippet || ''}`
        const link = r.link || ''

        if (!result.phone) result.phone = extractPhone(text)
        if (!result.instagram) result.instagram = extractInstagram(link, text)
        if (!result.website && link && !link.includes('instagram.com') && !link.includes('facebook.com') &&
            !link.includes('google.com') && !link.includes('tripadvisor') && !link.includes('pedidosya') &&
            link.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase())) {
          result.website = link
        }
      }
      return result
    } catch {
      continue
    }
  }
  return {}
}
