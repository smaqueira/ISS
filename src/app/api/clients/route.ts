import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyLead } from '@/lib/ai/classify'
import { generateProposal } from '@/lib/ai/proposals'
import { sendAlert } from '@/lib/telegram/send'

export async function GET(req: NextRequest) {
  const db = await createClient()
  const { searchParams } = new URL(req.url)
  let q = db.from('clients').select('*').order('created_at', { ascending: false })
  if (searchParams.get('type')) q = q.eq('type', searchParams.get('type')!)
  if (searchParams.get('status')) q = q.eq('status', searchParams.get('status')!)
  if (searchParams.get('q')) q = q.ilike('name', `%${searchParams.get('q')}%`)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const db = await createClient()
  const body = await req.json()

  // IA: clasificar automáticamente
  const ai = await classifyLead({ name: body.name, rubro: body.rubro, description: body.notes })

  // Solo campos que existen en la tabla
  const client = {
    name: body.name,
    type: body.type || ai.type,
    rubro: body.rubro || null,
    phone: body.phone || null,
    email: body.email || null,
    city: body.city || null,
    instagram: body.instagram || null,
    website: body.website || null,
    status: 'nuevo',
    score: body.score ?? ai.score,
    channel: body.channel || ai.channel,
    notes: body.notes || null,
    tags: [],
  }

  const { data, error } = await db.from('clients').insert(client).select().single()
  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await db.from('interactions').insert({
    client_id: data.id, channel: 'sistema', type: 'alta',
    notes: `Lead creado. IA: ${ai.reason}`, ai_generated: true,
  })

  if (data.score >= 75) {
    try {
      const proposal = await generateProposal({ name: data.name, rubro: data.rubro || 'negocio', type: data.type, city: data.city })
      await sendAlert(`Lead caliente: *${data.name}* (score ${data.score})\n\n📱 WA listo: _${proposal.whatsapp}_`)
    } catch { /* Telegram/IA opcional, no bloquea */ }
  }

  return NextResponse.json(data, { status: 201 })
}
