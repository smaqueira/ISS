import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

interface Cli { id: string; name: string | null; city: string | null; rubro: string | null; phone: string | null; email: string | null; instagram: string | null }
interface Grupo { tipo: string; label: string; valor: string; items: Cli[] }

const normIg = (v: string) => v.toLowerCase().replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '').replace(/[/?].*$/, '').trim()

// Normalización "fuerte" del nombre para detectar parecidos: minúsculas, sin
// acentos, sin puntuación, sin palabras comunes, espacios colapsados.
const PALABRAS_COMUNES = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'bar', 'resto', 'restaurante', 'parrilla', 'cerveceria', 'the'])
function normNombre(v: string): string {
  return v.toLowerCase().normalize('NFD')
    .split('').filter(c => { const x = c.charCodeAt(0); return x < 0x300 || x > 0x36f }).join('')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(w => w && !PALABRAS_COMUNES.has(w)).join(' ')
    .trim()
}

export async function GET(req: NextRequest) {
  const fuzzy = new URL(req.url).searchParams.get('fuzzy') === '1'
  const db = await createClient()

  // Traer todos (paginado)
  const rows: Cli[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('clients').select('id, name, city, rubro, phone, email, instagram').order('id').range(offset, offset + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    rows.push(...(data as Cli[]))
    if (data.length < 1000) break
  }

  // Agrupar por cada tipo de dato
  const defs: { tipo: string; label: string; key: (c: Cli) => string | null }[] = [
    { tipo: 'telefono', label: 'Mismo teléfono', key: c => { const p = (c.phone || '').replace(/\D/g, ''); return p.length >= 6 ? p : null } },
    { tipo: 'instagram', label: 'Mismo Instagram', key: c => { const h = c.instagram ? normIg(c.instagram) : ''; return h.length > 1 ? h : null } },
    { tipo: 'email', label: 'Mismo email', key: c => { const e = (c.email || '').toLowerCase().trim(); return e.includes('@') ? e : null } },
    { tipo: 'nombre', label: 'Mismo nombre + ciudad', key: c => { const n = (c.name || '').toLowerCase().trim(); const ci = (c.city || '').toLowerCase().trim(); return n ? `${n}||${ci}` : null } },
  ]

  if (fuzzy) {
    defs.push(
      { tipo: 'telefono-parecido', label: 'Teléfono parecido (mismos últimos 8 dígitos)', key: c => { const p = (c.phone || '').replace(/\D/g, ''); return p.length >= 8 ? p.slice(-8) : null } },
      { tipo: 'nombre-parecido', label: 'Nombre parecido', key: c => { const n = normNombre(c.name || ''); const ci = (c.city || '').toLowerCase().trim(); return n.length > 2 ? `${n}||${ci}` : null } },
    )
  }

  const grupos: Grupo[] = []
  for (const def of defs) {
    const mapa = new Map<string, Cli[]>()
    for (const c of rows) {
      const k = def.key(c)
      if (!k) continue
      const arr = mapa.get(k) || []
      arr.push(c)
      mapa.set(k, arr)
    }
    for (const [valor, items] of mapa) {
      if (items.length > 1) grupos.push({ tipo: def.tipo, label: def.label, valor, items })
    }
  }

  grupos.sort((a, b) => b.items.length - a.items.length)
  const totalDuplicados = grupos.reduce((acc, g) => acc + (g.items.length - 1), 0)

  return NextResponse.json({ grupos: grupos.slice(0, 200), total: grupos.length, totalDuplicados })
}
