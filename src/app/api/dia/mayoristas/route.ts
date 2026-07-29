import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function inicioDiaARiso(): string {
  const ar = new Date(Date.now() - 3 * 3600 * 1000)
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate(), 3, 0, 0)).toISOString()
}
const norm = (s: string) => s.toLowerCase().normalize('NFD').split('').filter(c => { const x = c.charCodeAt(0); return x < 0x300 || x > 0x36f }).join('')

const BUCKETS = [
  { key: 'sushi', label: 'Casas de sushi', test: (r: string) => r.includes('sushi') },
  { key: 'parrilla', label: 'Parrillas', test: (r: string) => r.includes('parrilla') },
  { key: 'restaurante', label: 'Restaurantes', test: (r: string) => r.includes('restaur') || r.includes('resto') },
  { key: 'cerveceria', label: 'Cervecerías', test: (r: string) => r.includes('cervec') },
]

export async function GET() {
  const db = await createClient()
  const desde = inicioDiaARiso()

  const { data: hist } = await db.from('client_history').select('client_id')
    .gte('fecha', desde).in('accion', ['WhatsApp enviado', 'Instagram enviado'])
  const ids = [...new Set((hist || []).map(h => h.client_id).filter(Boolean))]

  const rubroById = new Map<string, string>()
  if (ids.length) {
    const { data: cli } = await db.from('clients').select('id, rubro').in('id', ids)
    for (const c of cli || []) rubroById.set(c.id, norm((c.rubro as string) || ''))
  }

  const conteo: Record<string, Set<string>> = Object.fromEntries(BUCKETS.map(b => [b.key, new Set<string>()]))
  for (const id of ids) {
    const r = rubroById.get(id) || ''
    for (const b of BUCKETS) if (b.test(r)) conteo[b.key].add(id)
  }

  const rubros = BUCKETS.map(b => ({ key: b.key, label: b.label, contactados: conteo[b.key].size, ok: conteo[b.key].size > 0 }))
  return NextResponse.json({ rubros })
}
