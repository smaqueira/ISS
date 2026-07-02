import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { classifyLead, generateProposal } from '@/lib/groq'
import { sendProposalEmail, sendInternalAlert } from '@/lib/resend'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  let query = supabase.from('clients').select('*').order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()

  // Auto-clasificar con IA si no viene el type
  if (!body.type || body.auto_classify) {
    try {
      const classification = await classifyLead({
        name: body.name,
        rubro: body.rubro,
        description: body.description,
        instagram: body.instagram,
        website: body.website,
      })
      body.type = classification.type
      body.score = classification.score
      body.preferred_channel = classification.suggested_channel
      body.notes = body.notes
        ? `${body.notes}\n\nIA: ${classification.reason}`
        : `IA: ${classification.reason}`
    } catch (e) {
      console.error('Error clasificando lead:', e)
    }
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: body.name,
      type: body.type || 'b2b',
      rubro: body.rubro,
      phone: body.phone,
      email: body.email,
      address: body.address,
      city: body.city,
      instagram: body.instagram,
      website: body.website,
      status: 'nuevo',
      score: body.score || 50,
      preferred_channel: body.preferred_channel,
      tags: body.tags || [],
      notes: body.notes,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Alerta interna si score alto
  if (data.score >= 75) {
    try {
      await sendInternalAlert({
        subject: `Lead caliente: ${data.name}`,
        message: `Nuevo lead con score ${data.score}/100. Rubro: ${data.rubro || 'desconocido'}. Contactar hoy.`,
        client_name: data.name,
        score: data.score,
      })
    } catch (e) {
      console.error('Error enviando alerta:', e)
    }
  }

  // Auto-enviar propuesta por email si tiene email y score >= 60
  if (data.email && data.score >= 60 && body.auto_contact) {
    try {
      const proposal = await generateProposal({
        name: data.name,
        rubro: data.rubro || 'negocio',
        type: data.type,
        city: data.city,
      })
      await sendProposalEmail({
        to: data.email,
        client_name: data.name,
        subject: proposal.subject,
        body: proposal.body,
      })
      await supabase.from('clients').update({ status: 'contactado' }).eq('id', data.id)
      await supabase.from('interactions').insert({
        client_id: data.id,
        channel: 'email',
        type: 'mensaje',
        notes: `Propuesta automática enviada: ${proposal.subject}`,
      })
    } catch (e) {
      console.error('Error enviando propuesta:', e)
    }
  }

  return NextResponse.json(data, { status: 201 })
}
