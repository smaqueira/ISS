import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { generarMensajeVenta } from '@/lib/demanda/ai'
import { getDemandaConfig } from '@/lib/demanda/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// Genera el mensaje comercial para una oportunidad. NUNCA lo envía solo:
// devuelve el texto para que el usuario lo revise, edite y decida.
export async function POST(req: NextRequest) {
  if ((await cookies()).get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { id } = await req.json()
  const db = await createClient()
  const { data: o } = await db.from('demand_opportunities').select('*').eq('id', id).single()
  if (!o) return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 })

  const cfg = await getDemandaConfig(db)
  const mensaje = await generarMensajeVenta({
    negocio: cfg.negocio || 'nuestro negocio',
    descripcionNegocio: cfg.descripcion || cfg.rubro || '',
    producto: o.producto_nombre || o.titulo,
    tipoComprador: o.tipo_comprador,
    necesidad: o.necesidad,
    ubicacion: o.ubicacion,
    zona: cfg.zona,
  })
  return NextResponse.json({ mensaje })
}
