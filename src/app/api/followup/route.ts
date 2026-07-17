import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ask } from '@/lib/ai/client'

export const runtime = 'nodejs'

const FOLLOWUP_RULES = [
  { status: 'prospecto',           dias: 2,  prioridad: 'media',   accion: 'primer contacto' },
  { status: 'nuevo',               dias: 2,  prioridad: 'media',   accion: 'primer contacto' }, // legacy
  { status: 'contactado',          dias: 4,  prioridad: 'alta',    accion: 'seguimiento' },
  { status: 'sin_respuesta',       dias: 3,  prioridad: 'alta',    accion: 'recontactar' },
  { status: 'respondio',           dias: 2,  prioridad: 'alta',    accion: 'avanzar' },
  { status: 'interesado',          dias: 3,  prioridad: 'urgente', accion: 'cerrar' },
  { status: 'negociacion',         dias: 2,  prioridad: 'urgente', accion: 'negociar' },
  { status: 'presupuesto_enviado', dias: 3,  prioridad: 'urgente', accion: 'hacer seguimiento del presupuesto' },
  { status: 'esperando_respuesta', dias: 4,  prioridad: 'alta',    accion: 'consultar respuesta' },
]

export async function GET(req: NextRequest) {
  const db = await createClient()
  const { searchParams } = new URL(req.url)
  const generar = searchParams.get('mensaje') === '1'
  const clientId = searchParams.get('id')

  const now = new Date()

  // Si se pide generar mensaje para un cliente específico
  if (generar && clientId) {
    const { data: client } = await db.from('clients').select('*').eq('id', clientId).single()
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const { data: settings } = await db.from('settings').select('key, value')
      .in('key', ['COMPANY_NAME', 'COMPANY_DESCRIPTION', 'COMPANY_WHATSAPP'])
    const s = Object.fromEntries((settings || []).map((r: { key: string; value: string }) => [r.key, r.value]))

    const rule = FOLLOWUP_RULES.find(r => r.status === client.status)
    const diasSinContacto = Math.floor((now.getTime() - new Date(client.last_contact || client.created_at).getTime()) / 86400000)

    const mensaje = await ask(
      `Sos el vendedor de "${s.COMPANY_NAME || 'Vitto Mare'}" — ${s.COMPANY_DESCRIPTION || 'pescados y mariscos frescos en Buenos Aires'}.

Generá un mensaje de WhatsApp de seguimiento para este prospecto:
- Nombre: ${client.name}
- Rubro: ${client.rubro || 'no especificado'}
- Estado: ${client.status} (${rule?.accion || 'seguimiento'})
- Días sin contacto: ${diasSinContacto}
- Ciudad: ${client.city || 'Buenos Aires'}
- Notas previas: ${client.notes || 'ninguna'}

Tipo de mensaje: ${client.type === 'b2b' ? 'profesional para gastronómico/restaurante' : 'cercano para consumidor final'}
Objetivo: ${rule?.accion || 'retomar contacto'}

Escribí el mensaje en español argentino. Máximo 120 palabras. Directo, sin presentación larga.
Sin "Estimado/a". Empezá con su nombre. Terminá con una pregunta o CTA concreto.
Respondé SOLO con el mensaje, sin explicaciones.`
    )

    return NextResponse.json({ mensaje, cliente: client, diasSinContacto })
  }

  // Solo clientes con tag "listo" (listos para contactar)
  const { data: clients } = await db
    .from('clients')
    .select('*')
    .contains('tags', ['listo'])
    .not('phone', 'is', null)
    .order('updated_at', { ascending: true })

  if (!clients) return NextResponse.json([])

  const pendientes = clients
    .map(c => {
      const rule = FOLLOWUP_RULES.find(r => r.status === c.status)
      if (!rule) return null
      const lastContact = new Date(c.last_contact || c.created_at)
      const diasSinContacto = Math.floor((now.getTime() - lastContact.getTime()) / 86400000)
      if (diasSinContacto < rule.dias) return null
      return {
        ...c,
        diasSinContacto,
        prioridad: rule.prioridad,
        accion: rule.accion,
        diasLimite: rule.dias,
        vencido: diasSinContacto > rule.dias * 2,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const prioOrder = { urgente: 0, alta: 1, media: 2 }
      return (prioOrder[a!.prioridad as keyof typeof prioOrder] || 2) - (prioOrder[b!.prioridad as keyof typeof prioOrder] || 2)
    })

  return NextResponse.json(pendientes)
}
