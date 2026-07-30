import { NextResponse } from 'next/server'
import { searchPlaces } from '@/lib/prospecting/serper'
import { createClient } from '@supabase/supabase-js'
import { getBusinessConfig } from '@/lib/business-context'
import { rubroExcluido } from '@/lib/prospecting/excluidos'
import { cargarExistentes } from '@/lib/prospecting/existentes'

export const runtime = 'nodejs'
export const maxDuration = 60

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
  )
}

// CABA + partidos del Gran Buenos Aires. El cron rota por un lote de zonas por día
// (junto con el rubro), así con el tiempo cubre toda el área sin pasarse de tiempo.
const ZONAS = [
  'CABA', 'Vicente López', 'San Isidro', 'Tigre', 'San Martín',
  'Tres de Febrero', 'Morón', 'Ituzaingó', 'Ramos Mejía', 'San Justo',
  'Lomas de Zamora', 'Lanús', 'Avellaneda', 'Quilmes', 'Berazategui',
  'Moreno', 'Pilar', 'Escobar',
]
const ZONAS_POR_DIA = 4

// Score rápido sin IA (ya no filtramos por score; solo sirve para priorizar).
function scoreLead(place: { phone?: string; website?: string; rating?: number }): number {
  let s = 50
  if (place.phone) s += 15
  if (place.website) s += 10
  if (place.rating && place.rating >= 4) s += 10
  return Math.min(100, s)
}

export async function GET() {
  const db = getDb()
  const biz = await getBusinessConfig(db)

  // Rotar el rubro según el día del mes, salteando los rubros excluidos
  const disponibles = biz.rubrosProspectar.filter(r => !rubroExcluido(r))
  if (!disponibles.length) {
    return NextResponse.json({ ok: true, imported: 0, message: 'No hay rubros para prospectar (todos excluidos o sin configurar)' })
  }
  const diaDelMes = new Date().getDate()
  const rubro = disponibles[diaDelMes % disponibles.length]

  // Lote de zonas de CABA/GBA para hoy (rota cada día para cubrir todo el área)
  const inicio = (diaDelMes * ZONAS_POR_DIA) % ZONAS.length
  const zonasHoy = Array.from({ length: ZONAS_POR_DIA }, (_, i) => ZONAS[(inicio + i) % ZONAS.length])

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  try {
    // Traer TODOS los clientes existentes (paginado) para no duplicar
    const { names: existingNames, phones: existingPhones } = await cargarExistentes(db)

    for (const zona of zonasHoy) {
      let places: Awaited<ReturnType<typeof searchPlaces>> = []
      try {
        places = await searchPlaces(rubro, `${zona}, Buenos Aires, Argentina`)
      } catch (err) {
        errors.push(`búsqueda ${zona}: ${String(err)}`)
        continue
      }

      for (const place of places) {
        // Entra cualquiera con lo que haya; solo se evita el duplicado.
        const yaExiste =
          existingNames.has(place.name?.toLowerCase().trim()) ||
          (place.phone && existingPhones.has(place.phone))
        if (yaExiste) { skipped++; continue }

        const { error } = await db.from('clients').insert({
          name: place.name,
          type: 'b2b',
          rubro,
          phone: place.phone || null,
          email: null,
          city: zona,
          website: place.website || null,
          notes: `Prospectado automáticamente. Dirección: ${place.address || ''}${place.rating ? `. Rating: ${place.rating}` : ''}`,
          status: 'nuevo',
          score: scoreLead(place),
          channel: place.phone ? 'whatsapp' : 'web',
          tags: ['prospectado-auto'],
        })

        if (error) {
          errors.push(`${place.name}: ${error.message}`)
        } else {
          imported++
          existingNames.add(place.name.toLowerCase().trim())
          if (place.phone) existingPhones.add(place.phone)
        }
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
            text: `🎯 *Prospección automática* — ${biz.name}\n\n+${imported} nuevos leads B2B agregados hoy\nRubro: _${rubro}_\nZonas: ${zonasHoy.join(', ')}\n\nEntran con lo que haya (nombre, dirección, teléfono o web). Revisalos en /admin/clients`,
            parse_mode: 'Markdown',
          }),
        })
      }
    }

    return NextResponse.json({ ok: true, rubro, zonas: zonasHoy, imported, skipped, errors })

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
