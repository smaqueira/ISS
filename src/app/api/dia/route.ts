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

// Lee el valor guardado del día. Nuevo formato: { id: fechaISO }. Formato viejo:
// [id, id] (array) — se lee como tildado sin hora, para no perder días pasados.
function parseChecks(value?: string | null): Record<string, string> {
  try {
    const parsed = JSON.parse(value || '{}')
    if (Array.isArray(parsed)) {
      const out: Record<string, string> = {}
      for (const id of parsed) out[id] = ''
      return out
    }
    return (parsed && typeof parsed === 'object') ? parsed as Record<string, string> : {}
  } catch { return {} }
}

// Clasifica el rubro de un contacto en uno de los 4 que trabajamos (para el
// desglose de MD del día). Todo lo que no es sushi/parrilla/cervecería cae en resto.
function bucketRubro(rubro?: string | null): 'sushi' | 'parrilla' | 'cerveceria' | 'resto' {
  const n = (rubro || '').toLowerCase().normalize('NFD').split('').filter(c => { const x = c.charCodeAt(0); return x < 0x300 || x > 0x36f }).join('')
  if (n.includes('sushi')) return 'sushi'
  if (n.includes('parrilla')) return 'parrilla'
  if (n.includes('cervec')) return 'cerveceria'
  return 'resto'
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

  const [histRes, nuevosRes, ordersRes, setRes, metaRes] = await Promise.all([
    db.from('client_history').select('accion, clients(rubro)').gte('fecha', desde).in('accion', ['WhatsApp enviado', 'Instagram enviado', 'Instagram seguido']),
    db.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', desde),
    db.from('orders').select('id, total').gte('created_at', desde),
    db.from('settings').select('value').eq('key', `DIA_${fecha}`).single(),
    db.from('settings').select('value').eq('key', 'META_FACTURACION_MES').single(),
  ])

  const rows = (histRes.data || []) as unknown as { accion: string; clients: { rubro: string | null } | null }[]
  const mdRows = rows.filter(r => r.accion === 'WhatsApp enviado' || r.accion === 'Instagram enviado')
  const follows = rows.filter(r => r.accion === 'Instagram seguido').length
  // Desglose de MD por rubro (los 4 que trabajamos): 5 de cada uno = 20
  const mdRubro = { sushi: 0, parrilla: 0, cerveceria: 0, resto: 0 }
  for (const r of mdRows) mdRubro[bucketRubro(r.clients?.rubro)]++
  const nuevos = nuevosRes.count || 0
  const ordenes = ordersRes.data || []
  const pedidos = ordenes.length
  const facturadoHoy = ordenes.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const metaMes = Math.max(0, Number(metaRes.data?.value) || 0)
  const metaDia = metaMes ? Math.round(metaMes / 26) : 0
  const checks = parseChecks(setRes.data?.value)

  const auto = [
    { id: 'md_sushi', label: '5 MD a casas de sushi', modulo: 'Ventas', target: 5, actual: mdRubro.sushi, peso: 1 },
    { id: 'md_parrilla', label: '5 MD a parrillas', modulo: 'Ventas', target: 5, actual: mdRubro.parrilla, peso: 1 },
    { id: 'md_cerveceria', label: '5 MD a cervecerías', modulo: 'Ventas', target: 5, actual: mdRubro.cerveceria, peso: 1 },
    { id: 'md_resto', label: '5 MD a restaurantes', modulo: 'Ventas', target: 5, actual: mdRubro.resto, peso: 1 },
    { id: 'nuevos', label: '10 negocios nuevos agregados', modulo: 'Ventas', target: 10, actual: nuevos, peso: 2 },
    { id: 'pedidos', label: '2 pedidos', modulo: 'Facturación', target: 2, actual: pedidos, peso: 3 },
    ...(metaDia > 0 ? [{ id: 'facturacion', label: `Facturar $${metaDia.toLocaleString('es-AR')} hoy`, modulo: 'Facturación', target: metaDia, actual: Math.round(facturadoHoy), peso: 4 }] : []),
    { id: 'seguir', label: 'Seguir 30 cuentas', modulo: 'Captación', target: 30, actual: follows, peso: 1 },
  ].map(o => ({ ...o, tipo: 'auto' as const, done: o.actual >= o.target, frac: Math.min(o.actual / o.target, 1) }))

  const man = MANUAL.map(m => {
    const done = m.id in checks
    return { ...m, tipo: 'manual' as const, target: 1, actual: done ? 1 : 0, done, frac: done ? 1 : 0, checkedAt: checks[m.id] || null }
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
  const checks = parseChecks(data?.value)
  if (check in checks) delete checks[check]
  else checks[check] = new Date().toISOString()
  await db.from('settings').upsert({ key, value: JSON.stringify(checks) })
  return NextResponse.json({ checks })
}
