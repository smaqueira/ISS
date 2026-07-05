// Verificación de comunidades públicas contra sus páginas de invitación.
// Sin APIs pagas: WhatsApp, Telegram y Discord exponen metadata pública.

export interface VerifiedCommunity {
  title: string
  description: string
  link: string
  platform: 'whatsapp' | 'telegram' | 'discord'
  members: number | null
}

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }

function getMeta(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i')
  const m = html.match(re) || html.match(re2)
  return m ? m[1] : null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
}

export async function verifyWhatsApp(code: string): Promise<VerifiedCommunity | null> {
  try {
    const res = await fetch(`https://chat.whatsapp.com/${code}`, { headers: UA, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const html = await res.text()
    const title = getMeta(html, 'og:title')
    if (!title || /whatsapp group invite/i.test(title)) return null
    return {
      title: decodeEntities(title),
      description: '',
      link: `https://chat.whatsapp.com/${code}`,
      platform: 'whatsapp',
      members: null,
    }
  } catch { return null }
}

export async function verifyTelegram(username: string): Promise<VerifiedCommunity | null> {
  try {
    const res = await fetch(`https://t.me/${username}`, { headers: UA, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const html = await res.text()
    const title = getMeta(html, 'og:title')
    const desc = getMeta(html, 'og:description') || ''
    if (!title || /^telegram: contact/i.test(title)) return null
    const m = desc.match(/([\d\s.,]+)\s*(members|subscribers|miembros|suscriptores)/i)
    const extra = html.match(/([\d\s.,]+)\s*(members|subscribers)/i)
    const raw = m?.[1] || extra?.[1]
    const members = raw ? parseInt(raw.replace(/[\s.,]/g, ''), 10) || null : null
    if (!m && !extra && !/tgme_page_extra/.test(html)) return null
    return {
      title: decodeEntities(title),
      description: decodeEntities(desc).slice(0, 300),
      link: `https://t.me/${username}`,
      platform: 'telegram',
      members,
    }
  } catch { return null }
}

// Discord expone la API de invites sin autenticación
export async function verifyDiscord(code: string): Promise<VerifiedCommunity | null> {
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, {
      headers: UA, signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.guild?.name) return null
    return {
      title: data.guild.name,
      description: (data.guild.description || '').slice(0, 300),
      link: `https://discord.gg/${code}`,
      platform: 'discord',
      members: data.approximate_member_count || null,
    }
  } catch { return null }
}

// Re-verifica un link ya guardado (para detectar grupos caídos)
export async function verifyLink(link: string): Promise<VerifiedCommunity | null> {
  const wa = link.match(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{18,24})/)
  if (wa) return verifyWhatsApp(wa[1])
  const tg = link.match(/t\.me\/([A-Za-z][A-Za-z0-9_]{4,31})/)
  if (tg) return verifyTelegram(tg[1])
  const dc = link.match(/discord\.(?:gg|com\/invite)\/([A-Za-z0-9-]+)/)
  if (dc) return verifyDiscord(dc[1])
  return null
}

export function extractCodes(text: string) {
  const waCodes = [...new Set(
    [...text.matchAll(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{18,24})/g)].map(m => m[1])
  )]
  const tgUsers = [...new Set(
    [...text.matchAll(/t\.me\/(?:s\/)?([A-Za-z][A-Za-z0-9_]{4,31})(?![A-Za-z0-9_])/g)]
      .map(m => m[1])
      .filter(u => !['share', 'joinchat', 'addstickers', 'proxy', 'socks', 'iv', 'setlanguage'].includes(u.toLowerCase()))
  )]
  const dcCodes = [...new Set(
    [...text.matchAll(/discord\.(?:gg|com\/invite)\/([A-Za-z0-9-]{2,20})(?![A-Za-z0-9-])/g)].map(m => m[1])
  )]
  return { waCodes, tgUsers, dcCodes }
}
