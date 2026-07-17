import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STATUS_LABELS } from '@/lib/crm'
import { cookies } from 'next/headers'

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
  const { data: prev } = await db.from('clients').select('status, prioridad, temperatura, next_followup').eq('id', id).single()

  const { data, error } = await db.from('clients').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log status change
  if (body.status && prev && body.status !== prev.status) {
    const de = STATUS_LABELS[prev.status] || prev.status
    const a = STATUS_LABELS[body.status] || body.status
    await logHistory(db, id, 'Estado cambiado', `${de} → ${a}`)
    // legacy: also log to interactions
    await db.from('interactions').insert({ client_id: id, channel: 'sistema', type: 'estado', notes: `Estado cambiado: ${de} → ${a}`, ai_generated: false })
  }

  // Log seguimiento date change
  if (body.next_followup && prev && body.next_followup !== prev.next_followup) {
    await logHistory(db, id, 'Próximo seguimiento actualizado', body.next_followup.split('T')[0])
  }

  // Log prioridad change
  if (body.prioridad && prev && body.prioridad !== prev.prioridad) {
    await logHistory(db, id, 'Prioridad cambiada', body.prioridad)
  }

  // Log generic update if no specific change logged
  if (!body.status && !body.next_followup && !body.prioridad && !body.tags) {
    await logHistory(db, id, 'Datos actualizados')
  }

  // Log WhatsApp sent
  if (body._accion === 'whatsapp_enviado') {
    await logHistory(db, id, 'WhatsApp enviado')
    await db.from('clients').update({ last_contact: new Date().toISOString() }).eq('id', id)
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { error } = await db.from('clients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
