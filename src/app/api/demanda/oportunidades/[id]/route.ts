import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { registrarFeedback } from '@/lib/demanda/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

const ESTADOS = ['nueva', 'revisada', 'contactar', 'contactada', 'respondio', 'negociacion', 'venta', 'descartada', 'no_relevante', 'sin_respuesta', 'perdida']
const FEEDBACKS = ['relevante', 'no_relevante', 'venta', 'no_sirve']

// Cambiar estado y/o dejar feedback (el feedback alimenta el aprendizaje).
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  if ((await cookies()).get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { id } = await params
  const { estado, feedback } = await req.json()
  const db = await createClient()

  const patch: Record<string, string> = { updated_at: new Date().toISOString() }
  if (typeof estado === 'string' && ESTADOS.includes(estado)) patch.estado = estado
  if (typeof feedback === 'string' && FEEDBACKS.includes(feedback)) patch.feedback = feedback

  const { data, error } = await db.from('demand_opportunities').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aprendizaje: 👍/venta suman, 👎/no sirve restan
  if (patch.feedback) {
    const positivo = patch.feedback === 'relevante' || patch.feedback === 'venta'
    await registrarFeedback(db, [
      { dimension: 'tipo_comprador', valor: data.tipo_comprador },
      { dimension: 'producto', valor: data.producto_nombre },
      { dimension: 'fuente', valor: data.fuente },
      { dimension: 'ubicacion', valor: data.ubicacion },
    ], positivo)
  }
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  if ((await cookies()).get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { id } = await params
  const db = await createClient()
  const { error } = await db.from('demand_opportunities').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
