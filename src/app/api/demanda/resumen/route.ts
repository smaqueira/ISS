import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { resumirDemanda } from '@/lib/demanda/ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface Opp {
  producto_nombre: string | null; tipo_comprador: string | null; ubicacion: string | null
  intencion: string | null; score: number | null; created_at: string
}
const top = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1])[0]

// "¿QUÉ DEBERÍA VENDER HOY?" + RESUMEN DE HOY
export async function GET() {
  if ((await cookies()).get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const db = await createClient()
  const hace7 = new Date(Date.now() - 7 * 86400000).toISOString()
  const hace14 = new Date(Date.now() - 14 * 86400000).toISOString()
  const hoy0 = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10)

  const { data } = await db.from('demand_opportunities')
    .select('producto_nombre, tipo_comprador, ubicacion, intencion, score, created_at')
    .gte('created_at', hace14)
  const todas = (data || []) as Opp[]
  const ultimos7 = todas.filter(o => o.created_at >= hace7)
  const previos7 = todas.filter(o => o.created_at < hace7)
  const deHoy = todas.filter(o => o.created_at >= hoy0)

  // Producto con más demanda en los últimos 7 días
  const porProducto: Record<string, number> = {}
  for (const o of ultimos7) if (o.producto_nombre) porProducto[o.producto_nombre] = (porProducto[o.producto_nombre] || 0) + 1
  const mejor = top(porProducto)

  let vender: Record<string, unknown> | null = null
  if (mejor) {
    const [producto, cantidad] = mejor
    const delProducto = ultimos7.filter(o => o.producto_nombre === producto)
    const porComprador: Record<string, number> = {}
    for (const o of delProducto) {
      const k = o.tipo_comprador || 'sin identificar'
      porComprador[k] = (porComprador[k] || 0) + 1
    }
    const prevCant = previos7.filter(o => o.producto_nombre === producto).length
    const variacion = prevCant > 0 ? Math.round(((cantidad - prevCant) / prevCant) * 100) : null
    const altas = delProducto.filter(o => o.intencion === 'alta' || o.intencion === 'muy_alta').length
    const narrativa = await resumirDemanda({ producto, oportunidades: cantidad, porComprador, variacionPct: variacion })
    vender = {
      producto, oportunidades: cantidad, porComprador, variacionPct: variacion,
      intencionPromedio: altas >= cantidad / 2 ? 'Alta' : 'Media',
      narrativa,
    }
  }

  // Resumen de hoy
  const porZona: Record<string, number> = {}
  const porCliente: Record<string, number> = {}
  for (const o of deHoy) {
    if (o.ubicacion) porZona[o.ubicacion] = (porZona[o.ubicacion] || 0) + 1
    if (o.tipo_comprador) porCliente[o.tipo_comprador] = (porCliente[o.tipo_comprador] || 0) + 1
  }

  return NextResponse.json({
    vender,
    resumenHoy: {
      encontradas: deHoy.length,
      altaIntencion: deHoy.filter(o => o.intencion === 'alta').length,
      muyAlta: deHoy.filter(o => o.intencion === 'muy_alta').length,
      conProducto: deHoy.filter(o => !!o.producto_nombre).length,
      productoTop: top(Object.fromEntries(deHoy.reduce((m, o) => {
        if (o.producto_nombre) m.set(o.producto_nombre, (m.get(o.producto_nombre) || 0) + 1)
        return m
      }, new Map<string, number>())))?.[0] || null,
      zonaTop: top(porZona)?.[0] || null,
      clienteTop: top(porCliente)?.[0] || null,
    },
  })
}
