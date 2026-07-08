import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getReel, updateReel, createJob, updateJob } from '@/lib/reels/db'
import { generateReelScript, generateHashtags } from '@/lib/reels/ai'
import type { GenerateReelInput } from '@/lib/reels/types'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getGroqKey(): Promise<string> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await db.from('settings').select('key, value').in('key', ['GROQ_API_KEY', 'GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_API_KEY_4'])
  const keys = ['GROQ_API_KEY', 'GROQ_API_KEY_1', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_API_KEY_4']
  for (const k of keys) {
    const row = (data || []).find(r => r.key === k)
    if (row?.value) return row.value
  }
  return process.env.GROQ_API_KEY || ''
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let job

  try {
    const reel = await getReel(id)

    job = await createJob({
      reel_id: id,
      tipo: 'script',
      estado: 'procesando',
      proveedor: 'groq',
    })

    // Marcar el reel como generando
    await updateReel(id, { estado: 'generando' })

    const apiKey = await getGroqKey()
    if (!apiKey) {
      await updateJob(job.id, { estado: 'error', error: 'GROQ_API_KEY no configurada' })
      await updateReel(id, { estado: 'error' })
      return NextResponse.json({ error: 'GROQ_API_KEY no configurada en settings' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))

    const input: GenerateReelInput = {
      producto_nombre: body.producto_nombre || reel.producto_nombre || reel.titulo,
      producto_id: body.producto_id || reel.producto_id,
      categoria: body.categoria || reel.categoria,
      objetivo: body.objetivo || reel.objetivo,
      plataforma: body.plataforma || reel.plataforma,
      duracion_objetivo: body.duracion_objetivo || reel.duracion || 30,
      notas_adicionales: body.notas_adicionales,
    }

    const [scriptResult, hashtags] = await Promise.all([
      generateReelScript(input, apiKey),
      generateHashtags(input.producto_nombre, input.categoria, apiKey),
    ])

    if (!scriptResult.ok || !scriptResult.script) {
      await updateJob(job.id, { estado: 'error', error: scriptResult.error })
      await updateReel(id, { estado: 'error' })
      return NextResponse.json({ error: scriptResult.error }, { status: 500 })
    }

    const updated = await updateReel(id, {
      script: scriptResult.script,
      estado: 'listo',
      hashtags: hashtags.length > 0 ? hashtags : reel.hashtags,
      duracion: scriptResult.script.escenas.reduce((acc, s) => acc + s.duracion, 0),
      ai_provider: 'groq',
    })

    await updateJob(job.id, {
      estado: 'finalizado',
      output: { script: scriptResult.script },
    })

    return NextResponse.json({ ok: true, reel: updated })

  } catch (err) {
    if (job) {
      await updateJob(job.id, { estado: 'error', error: String(err) }).catch(() => null)
    }
    await updateReel(id, { estado: 'error' }).catch(() => null)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
