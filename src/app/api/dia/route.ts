import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Fecha y comienzo del día en horario Argentina (UTC-3). Todo se resetea a las 00:00 AR.
function fechaAR(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10)
}
function inicioDiaARiso(): string {
  const ar = new Date(Date.now() - 3 * 3600 * 1000)
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate(), 3, 0, 0)).toISOString()
}

// Tareas manuales (se tildan a mano; también se resetean cada día)
const MANUAL = [
  { id: 'reel', label: 'Reel del día publicado', modulo: 'Instagram', peso: 1 },
  { id: 'publicacion', label: 'Publicación del día', modulo: 'Instagram', peso: 1 },
  { id: 'historias', label: '5 historias publicadas', modulo: 'Instagram', peso: 1 },
  { id: 'producto_destacado', label: 'Producto destacado publicado', modulo: 'Instagram', peso: 1 },
  { id: 'responder', label: 'Respondiste MD y consultas pendientes', modulo: 'Instagram', peso: 2 },
  { id: 'comentar', label: 'Comentaste 10 publicaciones', modulo: 'Captación', peso: 1 },
  { id: 'resp_historias', label: 'Respondiste 10 historias', modulo: 'Captación', peso: 1 },
]

export async function GET() {
  const db = await createClient()
  const desde = inicioDiaARiso()
  const fecha = fechaAR()

  const [histRes, nuevosRes, ordersRes, setRes] = await Promise.all([
    db.from('client_history').select('accion').gte('fecha', desde).in('accion', ['WhatsApp enviado', 'Instagram enviado', 'Instagram seguido']),
    db.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', desde),
    db.from('orders').select('id').gte('created_at', desde),
    db.from('settings').select('value').eq('key', `DIA_${fecha}`).single(),
  ])

  const rows = histRes.data || []
  const md = rows.filter(r => r.accion === 'WhatsApp enviado' || r.accion === 'Instagram enviado').length
  const follows = rows.filter(r => r.accion === 'Instagram seguido').length
  const nuevos = nuevosRes.count || 0
  const pedidos = (ordersRes.data || []).length
  let checks: string[] = []
  try { checks = JSON.parse(setRes.data?.value || '[]') } catch { checks = [] }

  const auto = [
    { id: 'md', label: '20 MD enviados', modulo: 'Ventas', target: 20, actual: md, peso: 3 },
    { id: 'nuevos', label: '10 negocios nuevos agregados', modulo: 'Ventas', target: 10, actual: nuevos, peso: 2 },
    { id: 'pedidos', label: '2 pedidos', modulo: 'Facturación', target: 2, actual: pedidos, peso: 3 },
    { id: 'seguir', label: 'Seguir 30 cuentas', modulo: 'Captación', target: 30, actual: follows, peso: 1 },
  ].map(o => ({ ...o, tipo: 'auto' as const, done: o.actual >= o.target, frac: Math.min(o.actual / o.target, 1) }))

  const man = MANUAL.map(m => {
    const done = checks.includes(m.id)
    return { ...m, tipo: 'manual' as const, target: 1, actual: done ? 1 : 0, done, frac: done ? 1 : 0 }
  })

  const objetivos = [...auto, ...man]
  const pesoTotal = objetivos.reduce((a, o) => a + o.peso, 0)
  const score = Math.round((objetivos.reduce((a, o) => a + o.frac * o.peso, 0) / pesoTotal) * 100)

  const modAcc: Record<string, { done: number; peso: number }> = {}
  for (const o of objetivos) {
    const m = modAcc[o.modulo] || { done: 0, peso: 0 }
    m.done += o.frac * o.peso; m.peso += o.peso; modAcc[o.modulo] = m
  }
  const scoreModulos = Object.entries(modAcc).map(([nombre, v]) => ({ nombre, score: Math.round((v.done / v.peso) * 100) }))

  return NextResponse.json({
    fecha,
    objetivos,
    pendientes: objetivos.filter(o => !o.done),
    score,
    cerrable: score >= 90,
    scoreModulos,
  })
}

export async function POST(req: NextRequest) {
  const { check } = await req.json()
  if (typeof check !== 'string') return NextResponse.json({ error: 'check requerido' }, { status: 400 })
  const db = await createClient()
  const key = `DIA_${fechaAR()}`
  const { data } = await db.from('settings').select('value').eq('key', key).single()
  let checks: string[] = []
  try { checks = JSON.parse(data?.value || '[]') } catch { checks = [] }
  checks = checks.includes(check) ? checks.filter(c => c !== check) : [...checks, check]
  await db.from('settings').upsert({ key, value: JSON.stringify(checks) })
  return NextResponse.json({ checks })
}
