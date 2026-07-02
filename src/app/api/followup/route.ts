import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateFollowUp } from '@/lib/groq'
import { sendFollowUpEmail } from '@/lib/resend'

// POST /api/followup — cron job diario que detecta clientes sin respuesta y manda follow-up
export async function POST(req: NextRequest) {
  // Verificar que viene del cron de Vercel
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const day3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const day14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Clientes contactados sin respuesta hace 3 días
  const { data: followup3 } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'contactado')
    .lt('updated_at', day3)
    .gt('updated_at', day7)
    .not('email', 'is', null)

  // Clientes contactados sin respuesta hace 7 días
  const { data: followup7 } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'contactado')
    .lt('updated_at', day7)
    .gt('updated_at', day14)
    .not('email', 'is', null)

  // Clientes activos sin contacto hace 14 días → marcar como fríos
  const { data: cold } = await supabase
    .from('clients')
    .select('id')
    .eq('status', 'cliente')
    .lt('last_contact', day14)

  let sent = 0

  for (const client of [...(followup3 || []), ...(followup7 || [])]) {
    try {
      const daysSince = followup3?.find(c => c.id === client.id) ? 3 : 7
      const followup = await generateFollowUp({
        client_name: client.name,
        rubro: client.rubro || 'negocio',
        days_since_contact: daysSince,
        last_interaction: 'propuesta inicial',
        type: client.type,
      })
      await sendFollowUpEmail({
        to: client.email,
        client_name: client.name,
        subject: followup.subject,
        body: followup.body,
        followup_number: daysSince === 3 ? 1 : 2,
      })
      await supabase.from('interactions').insert({
        client_id: client.id,
        channel: 'email',
        type: 'seguimiento',
        notes: `Follow-up automático día ${daysSince}: ${followup.subject}`,
      })
      sent++
    } catch (e) {
      console.error(`Error en follow-up cliente ${client.id}:`, e)
    }
  }

  // Marcar fríos
  if (cold && cold.length > 0) {
    await supabase
      .from('clients')
      .update({ status: 'inactivo' })
      .in('id', cold.map(c => c.id))
  }

  return NextResponse.json({ sent, cold: cold?.length || 0 })
}
