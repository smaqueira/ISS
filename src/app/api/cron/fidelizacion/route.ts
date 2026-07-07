import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Cron que etiqueta clientes frecuentes y detecta clientes inactivos
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && secret !== 'run') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Contar interacciones por cliente
  const { data: interactions } = await db
    .from('interactions')
    .select('client_id')

  if (!interactions) return NextResponse.json({ ok: true, updated: 0 })

  const counts: Record<string, number> = {}
  for (const i of interactions) {
    if (i.client_id) counts[i.client_id] = (counts[i.client_id] || 0) + 1
  }

  let updated = 0

  for (const [clientId, count] of Object.entries(counts)) {
    // Score basado en interacciones: más interacciones = mayor score
    const score = Math.min(100, 40 + count * 10)

    // Tag de fidelización
    const tag = count >= 10 ? 'vip' : count >= 5 ? 'frecuente' : count >= 2 ? 'recurrente' : null

    const updateData: Record<string, unknown> = { score }
    if (tag) updateData.rubro_tag = tag

    await db.from('clients').update(updateData).eq('id', clientId)
    updated++
  }

  // Marcar clientes inactivos (sin contacto en 30+ días) como "frio"
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  await db
    .from('clients')
    .update({ status: 'frio' })
    .eq('status', 'contactado')
    .lt('last_contact', thirtyDaysAgo.toISOString())

  return NextResponse.json({ ok: true, updated, ts: new Date().toISOString() })
}
