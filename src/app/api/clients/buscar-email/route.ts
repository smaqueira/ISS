import { NextRequest, NextResponse } from 'next/server'
import { getSerperKeys, searchSerper } from '@/lib/link-hunt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// Dominios / remitentes que NO son el email del negocio (plantillas, tracking, hosting)
const DOMINIO_BASURA = /(sentry\.io|wixpress\.com|example\.com|godaddy\.com|cloudflare|w3\.org|schema\.org|googleapis|gstatic|jquery|bootstrap|fontawesome|sentry|\.png$|\.jpg$|\.jpeg$|\.gif$|\.svg$|\.webp$|\.css$|\.js$)/i
const LOCAL_BASURA = /^(no[-_]?reply|noreply|no[-_]?responder|mailer|postmaster|abuse|donotreply|test|user|email|your|nombre|ejemplo|example)$/i

function limpiarTexto(html: string): string {
  // De-ofuscación simple: "info [at] dominio [dot] com" → info@dominio.com
  return html
    .replace(/\s*\[\s*at\s*\]\s*|\s*\(\s*at\s*\)\s*|\s+at\s+/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*|\s*\(\s*dot\s*\)\s*|\s+dot\s+/gi, '.')
    .replace(/&#64;|%40/gi, '@')
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ''
    const type = res.headers.get('content-type') || ''
    if (!type.includes('html') && !type.includes('text')) return ''
    return (await res.text()).slice(0, 500_000)
  } catch { return '' }
}

function extraerEmails(texto: string): string[] {
  const t = limpiarTexto(texto)
  const found = new Set<string>()
  for (const m of t.matchAll(EMAIL_RE)) {
    const e = m[0].toLowerCase().replace(/\.$/, '')
    const [local, dominio] = e.split('@')
    if (!dominio || DOMINIO_BASURA.test(e) || DOMINIO_BASURA.test(dominio)) continue
    if (LOCAL_BASURA.test(local)) continue
    if (e.length > 60) continue
    found.add(e)
  }
  return [...found]
}

// Prioriza el email que más pinta de "contacto del negocio"
function ranking(emails: string[], dominioWeb?: string): string[] {
  const pref = /^(info|contacto|ventas|hola|pedidos|comercial|administracion|reservas|atencion)@/i
  return emails.sort((a, b) => {
    const am = dominioWeb && a.endsWith('@' + dominioWeb) ? 0 : 1
    const bm = dominioWeb && b.endsWith('@' + dominioWeb) ? 0 : 1
    if (am !== bm) return am - bm
    const ap = pref.test(a) ? 0 : 1
    const bp = pref.test(b) ? 0 : 1
    return ap - bp
  })
}

export async function POST(req: NextRequest) {
  const { name, city, website } = await req.json()
  const nombre = (typeof name === 'string' ? name : '').trim()
  const web = (typeof website === 'string' ? website : '').trim()

  const paginas: string[] = []
  let dominioWeb: string | undefined

  // 1) Sitio propio (home + páginas de contacto): la mejor fuente
  if (web) {
    let base = web.startsWith('http') ? web : `https://${web}`
    try { dominioWeb = new URL(base).hostname.replace(/^www\./, '') } catch { /* ignore */ }
    base = base.replace(/\/+$/, '')
    paginas.push(base, `${base}/contacto`, `${base}/contact`, `${base}/contactanos`)
  }

  // 2) Respaldo: Google (Serper) — snippets + páginas de resultados
  if (nombre) {
    const keys = await getSerperKeys()
    if (keys.length) {
      const q = `${nombre} ${(city || '').trim()} email contacto`.trim()
      let organics: { link?: string; snippet?: string; title?: string }[] = []
      for (const key of keys) { organics = await searchSerper(q, key); if (organics.length) break }
      // Emails que ya aparecen en los snippets
      const snippetText = organics.map(r => `${r.title || ''} ${r.snippet || ''}`).join('\n')
      paginas.push('SNIPPET::' + snippetText)
      // Abrir las primeras páginas de resultado
      for (const r of organics.slice(0, 4)) if (r.link?.startsWith('http')) paginas.push(r.link)
    }
  }

  // Traer todo y extraer
  const textos = await Promise.all(paginas.map(p => p.startsWith('SNIPPET::') ? Promise.resolve(p.slice(9)) : fetchPage(p)))
  const emails = ranking(extraerEmails(textos.join('\n')), dominioWeb)

  return NextResponse.json({ email: emails[0] ?? null, candidatos: emails.slice(0, 5) })
}
