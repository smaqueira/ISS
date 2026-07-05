import { NextRequest, NextResponse } from 'next/server'
import { generateOfertaDelDia } from '@/lib/vitto-bot'
import { getConnectedClient } from '@/lib/telegram-client'
import { createClient } from '@/lib/supabase/server'
import { Api } from 'telegram'
import bigInt from 'big-integer'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const customMessage: string | undefined = body.message
  const previewOnly: boolean = body.previewOnly === true

  // Solo generar mensaje sin enviar
  if (previewOnly) {
    const mensaje = await generateOfertaDelDia()
    return NextResponse.json({ mensaje })
  }

  // Obtener grupos donde estamos
  const db = await createClient()
  const { data: grupos } = await db
    .from('grupos')
    .select('*')
    .eq('status', 'en_grupo')
    .eq('platform', 'telegram')

  if (!grupos || grupos.length === 0) {
    return NextResponse.json({ error: 'No hay grupos de Telegram con estado "en_grupo"' }, { status: 400 })
  }

  // Generar o usar mensaje personalizado
  const mensaje = customMessage || await generateOfertaDelDia()

  // Enviar via MTProto
  const client = await getConnectedClient()
  if (!client) return NextResponse.json({ error: 'MTProto no conectado' }, { status: 401 })

  const results: { grupo: string; ok: boolean; error?: string }[] = []

  for (const grupo of grupos) {
    try {
      // Detectar tipo por el link
      if (grupo.link?.includes('t.me/')) {
        const username = grupo.link.split('t.me/')[1]?.replace(/\//g, '')
        if (username) {
          await client.invoke(new Api.messages.SendMessage({
            peer: username as unknown as Api.TypeInputPeer,
            message: mensaje,
            randomId: bigInt(Math.floor(Math.random() * 1e15)),
          }))
        }
      }
      results.push({ grupo: grupo.title, ok: true })
    } catch (e) {
      results.push({ grupo: grupo.title, ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  }

  // Guardar en historial
  await db.from('broadcast_history').insert({
    channel: 'telegram',
    message: mensaje,
    grupos_count: grupos.length,
    results: JSON.stringify(results),
    sent_at: new Date().toISOString(),
  }).select()

  const ok = results.filter(r => r.ok).length
  return NextResponse.json({ ok: true, enviados: ok, total: grupos.length, mensaje, results })
}

export async function GET() {
  const db = await createClient()
  const { data } = await db
    .from('broadcast_history')
    .select('*')
    .eq('channel', 'telegram')
    .order('sent_at', { ascending: false })
    .limit(20)
  return NextResponse.json(data || [])
}
