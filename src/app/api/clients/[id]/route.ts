import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STATUS_LABELS } from '@/lib/crm'
import { cookies } from 'next/headers'
import { classifyLead } from '@/lib/ai/classify'

// Score delta by status — ajuste relativo sobre el score IA original
const STATUS_SCORE_DELTA: Record<string, number> = {
  prospecto:           0,
  contactado:          5,
  sin_respuesta:       -5,
  respondio:           10,
  interesado:          20,
  negociacion:         30,
  presupuesto_enviado: 25,
  esperando_respuesta: 15,
  cliente:             40,
  cliente_recurrente:  50,
  no_interesado:       -30,
  perdido:             -40,
}

type Params = Promise<{ id: string }>

async function getUsuario(): Promise<string> {
  const store = await cookies()
  return store.get('iss_session')?.value === 'admin' ? 'admin' : 'usuario'
}

async function logHistory(db: Awaited<ReturnType<typeof createClient>>, clientId: string, accion: string, detalle?: string) {
  const usuario = await getUsuario()
  await db.from('client_history').insert({ client_id: clientId, accion, detalle: detalle || null, usuario })
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data: client } = await db.from('clients').select('*').eq('id', id).single()
  const { data: interactions } = await db.from('interactions').select('*').eq('client_id', id).order('created_at', { ascending: false })
  const { data: orders } = await db.from('orders').select('*, order_items(*, products(*))').eq('client_id', id).order('created_at', { ascending: false })
  const { data: history } = await db.from('client_history').select('*').eq('client_id', id).order('fecha', { ascending: false })
  return NextResponse.json({ ...client, interactions, orders, history })
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const body = await req.json()

  // Get current client to detect changes
  const { data: prev } = await db.from('clients').select('status, prioridad, temperatura, next_followup, name, rubro, notes, score').eq('id', id).single()

  // Remove virtual fields before sending to DB
  const { _accion, ...rawBody } = body

  // Allowlist de columnas válidas en la tabla clients
  const ALLOWED = new Set([
    'name','empresa','contacto_nombre','contacto_cargo','type','rubro',
    'phone','email','city','website','instagram','notes','observaciones',
    'status','proxima_accion','prioridad','temperatura','score',
    'probabilidad_cierre','productos_interes','proveedor_actual',
    'presupuesto_estimado','motivo_perdida','channel','origen','tags',
    'fecha_primer_contacto','last_contact','next_followup',
  ])
  const dbBody = Object.fromEntries(Object.entries(rawBody).filter(([k]) => ALLOWED.has(k))) as Record<string, string>

  // Campos con CHECK constraints: nunca enviar string vacío
  const CHECK_FIELDS = ['type','prioridad','temperatura','proxima_accion','motivo_perdida','status']
  for (const f of CHECK_FIELDS) {
    if (f in dbBody && !dbBody[f]) delete dbBody[f]
  }

  const { data, error } = await db.from('clients').update(dbBody).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log status change + recalcular score dinámicamente
  if (dbBody.status && prev && dbBody.status !== prev.status) {
    const de = STATUS_LABELS[prev.status] || prev.status
    const a  = STATUS_LABELS[dbBody.status as string] || dbBody.status
    await logHistory(db, id, 'Estado cambiado', `${de} → ${a}`)
    await db.from('interactions').insert({ client_id: id, channel: 'sistema', type: 'estado', notes: `Estado cambiado: ${de} → ${a}`, ai_generated: false })

    // Recalcular score: base IA + delta por estado
    try {
      const ai = await classifyLead({ name: prev.name, rubro: prev.rubro, description: prev.notes })
      const delta = STATUS_SCORE_DELTA[dbBody.status as string] ?? 0
      const newScore = Math.max(0, Math.min(100, ai.score + delta))
      await db.from('clients').update({ score: newScore }).eq('id', id)
    } catch { /* score update es best-effort */ }
  }

  // Log seguimiento date change
  if (dbBody.next_followup && prev && dbBody.next_followup !== prev.next_followup) {
    await logHistory(db, id, 'Próximo seguimiento actualizado', dbBody.next_followup.split('T')[0])
  }

  // Log prioridad change
  if (dbBody.prioridad && prev && dbBody.prioridad !== prev.prioridad) {
    await logHistory(db, id, 'Prioridad cambiada', dbBody.prioridad)
  }

  // Log generic update if no specific change logged
  if (!dbBody.status && !dbBody.next_followup && !dbBody.prioridad && !dbBody.tags && !_accion) {
    await logHistory(db, id, 'Datos actualizados')
  }

  // Log WhatsApp sent
  if (_accion === 'whatsapp_enviado') {
    await logHistory(db, id, 'WhatsApp enviado')
    await db.from('clients').update({ last_contact: new Date().toISOString() }).eq('id', id)
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const store = await cookies()
  if (store.get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { id } = await params
  const db = await createClient()
  const { error } = await db.from('clients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
