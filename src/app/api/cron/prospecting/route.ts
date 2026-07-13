import { NextResponse } from 'next/server'
import { searchPlaces } from '@/lib/prospecting/serper'
import { classifyLead } from '@/lib/ai/classify'
import { createClient } from '@supabase/supabase-js'
import { getBusinessConfig } from '@/lib/business-context'

export const runtime = 'nodejs'
export const maxDuration = 60

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function GET() {
  const db = getDb()
  const biz = await getBusinessConfig(db)

  // Rotar el rubro según el día del mes
  const diaDelMes = new Date().getDate()
  const rubro = biz.rubrosProspectar[diaDelMes % biz.rubrosProspectar.length]

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  try {
    const places = await searchPlaces(rubro, biz.zona)

    if (!places.length) {
      return NextResponse.json({ ok: true, rubro, imported: 0, message: 'Sin resultados de búsqueda' })
    }

    // Traer clientes existentes para no duplicar
    const { data: existingClients } = await db.from('clients').select('name, phone')
    const existingNames = new Set((existingClients || []).map(c => c.name?.toLowerCase().trim()))
    const existingPhones = new Set((existingClients || []).map(c => c.phone).filter(Boolean))

    for (const place of places) {
      // Solo importar si tiene teléfono o sitio web (para poder contactar)
      if (!place.phone && !place.website) {
        skipped++
        continue
      }

      // Filtrar por zona configurada
      const addr = (place.address || '').toLowerCase()
      const zonaTokens = biz.zona.toLowerCase().split(/\s+/).filter(t => t.length > 3)
      const esDeLaZona = zonaTokens.some(t => addr.includes(t))
      if (!esDeLaZona) {
        skipped++
        continue
      }

      // No duplicar
      const yaExiste =
        existingNames.has(place.name?.toLowerCase().trim()) ||
        (place.phone && existingPhones.has(place.phone))

      if (yaExiste) {
        skipped++
        continue
      }

      try {
        const ai = await classifyLead({ name: place.name, rubro, description: place.address })

        if (ai.score < 50) {
          skipped++
          continue
        }

        const { error } = await db.from('clients').insert({
          name: place.name,
          type: 'b2b',
          rubro,
          phone: place.phone || null,
          email: null,
          website: place.website || null,
          notes: `Prospectado automáticamente. Dirección: ${place.address || ''}${place.rating ? `. Rating: ${place.rating}` : ''}`,
          status: 'nuevo',
          score: ai.score,
          channel: 'sistema',
          tags: ['prospectado-auto'],
        })

        if (error) {
          errors.push(`${place.name}: ${error.message}`)
        } else {
          imported++
          existingNames.add(place.name.toLowerCase().trim())
          if (place.phone) existingPhones.add(place.phone)
        }
      } catch (err) {
        errors.push(`${place.name}: ${String(err)}`)
      }
    }

    // Notificar al admin si se importaron leads
    if (imported > 0) {
      const { data: tokenRow } = await db.from('settings').select('value').eq('key', 'TELEGRAM_BOT_TOKEN').single()
      const { data: chatRow } = await db.from('settings').select('value').eq('key', 'TELEGRAM_CHAT_ID').single()
      const token = tokenRow?.value
      const chatId = chatRow?.value

      if (token && chatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🎯 *Prospección automática* — ${biz.name}\n\n+${imported} nuevos leads B2B agregados hoy\nRubro: _${rubro}_\nZona: ${biz.zona}\n\nEntran con teléfono o web listos para contactar. Revisalos en /admin/clients`,
            parse_mode: 'Markdown',
          }),
        })
      }
    }

    return NextResponse.json({ ok: true, rubro, imported, skipped, errors })

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
