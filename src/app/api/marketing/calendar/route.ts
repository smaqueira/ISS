import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ask } from '@/lib/ai/client'

export const runtime = 'nodejs'
export const maxDuration = 45

// Lógica de estacionalidad (hemisferio sur)
function getSeason(month: number): string {
  if (month >= 6 && month <= 8) return 'invierno'
  if (month >= 9 && month <= 11) return 'primavera'
  if (month === 12 || month <= 2) return 'verano'
  return 'otoño'
}

function getSeasonTip(season: string): string {
  const tips: Record<string, string> = {
    invierno: 'época ideal para mariscos calientes: guisos, sopas de mariscos, cazuela. El consumidor busca comfort food.',
    primavera: 'temporada de frescura: ceviches, ensaladas con mariscos, platos ligeros. Aumenta la demanda en restaurantes.',
    verano: 'alta temporada gastronómica: mariscos frescos, parrilla, productos premium. Restaurantes y familias en pico de demanda.',
    otoño: 'transición hacia platos más consistentes: mariscos en salsa, pastas con mariscos. Buen momento para fidelización.',
  }
  return tips[season] || ''
}

// Lógica comercial por día de la semana
const DAY_LOGIC: Record<number, { audiencia: string; canal: string; tipo: string; hora: string; razon: string }> = {
  1: { audiencia: 'b2b', canal: 'WhatsApp', tipo: 'oferta semanal', hora: '10:00', razon: 'Lunes: gastronómicos planifican el menú de la semana' },
  2: { audiencia: 'b2b', canal: 'WhatsApp', tipo: 'contenido educativo', hora: '10:30', razon: 'Martes: buen día para posicionarse como experto con el B2B' },
  3: { audiencia: 'b2b', canal: 'Instagram', tipo: 'showcase producto', hora: '11:00', razon: 'Miércoles: último día para captar pedidos B2B antes del fin de semana' },
  4: { audiencia: 'b2c', canal: 'Instagram', tipo: 'teaser fin de semana', hora: '18:00', razon: 'Jueves: consumidor empieza a pensar el fin de semana' },
  5: { audiencia: 'b2c', canal: 'WhatsApp + Instagram', tipo: 'oferta fin de semana', hora: '17:00', razon: 'Viernes: pico de decisión de compra para el fin de semana' },
  6: { audiencia: 'b2c', canal: 'Instagram', tipo: 'lifestyle / receta', hora: '10:00', razon: 'Sábado: gente en casa, busca inspiración para cocinar' },
  0: { audiencia: 'todos', canal: 'Instagram', tipo: 'contenido de marca', hora: '12:00', razon: 'Domingo: alcance orgánico alto, contenido de inspiración' },
}

interface CalendarItem {
  fecha: string
  dia_semana: string
  dia_num: number
  audiencia: string
  canal: string
  tipo: string
  hora: string
  razon: string
  tematica: string
  hook: string
  cta: string
  status: 'pendiente' | 'publicado' | 'saltado'
  id?: string
}

export async function GET(req: NextRequest) {
  const db = await createClient()
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('week') // YYYY-MM-DD del lunes

  if (!weekStart) {
    return NextResponse.json({ error: 'Falta el parámetro week' }, { status: 400 })
  }

  const { data } = await db
    .from('content_calendar')
    .select('*')
    .gte('fecha', weekStart)
    .lte('fecha', new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().split('T')[0])
    .order('fecha')

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const db = await createClient()
  const { weekStart, productos } = await req.json()

  // Obtener settings del negocio
  const { data: settings } = await db.from('settings').select('key, value').in('key', ['COMPANY_NAME', 'COMPANY_DESCRIPTION'])
  const settingsMap = Object.fromEntries((settings || []).map((s: { key: string; value: string }) => [s.key, s.value]))
  const negocio = settingsMap['COMPANY_NAME'] || 'Vitto Mare'
  const descripcion = settingsMap['COMPANY_DESCRIPTION'] || 'Pescados y mariscos frescos en Buenos Aires'

  const startDate = new Date(weekStart + 'T12:00:00')
  const month = startDate.getMonth() + 1
  const season = getSeason(month)
  const seasonTip = getSeasonTip(season)

  // Generar los 7 días de la semana
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate.getTime() + i * 86400000)
    const dayNum = date.getDay()
    const logic = DAY_LOGIC[dayNum]
    return {
      fecha: date.toISOString().split('T')[0],
      dia_num: dayNum,
      dia_semana: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayNum],
      ...logic,
    }
  })

  // Generar contenido con IA para cada día
  const prompt = `Sos el director de marketing de "${negocio}" — ${descripcion}.
Estamos en ${season} en Argentina. ${seasonTip}
${productos ? `Productos disponibles esta semana: ${productos}` : ''}

Generá el plan de contenido para 7 días con este esquema exacto.
Para cada día devolvé un JSON con estos campos:
- tematica: tema concreto del contenido (15 palabras max)
- hook: primera línea del post, el gancho (20 palabras max, que genere curiosidad o urgencia)
- cta: llamada a la acción corta (10 palabras max)

Días y contexto:
${days.map(d => `${d.dia_semana} (${d.fecha}): audiencia ${d.audiencia}, canal ${d.canal}, tipo "${d.tipo}". ${d.razon}`).join('\n')}

Respondé SOLO con un array JSON de 7 objetos en el mismo orden. Sin texto adicional. Sin markdown.
Ejemplo: [{"tematica":"...","hook":"...","cta":"..."},...]`

  let aiItems: { tematica: string; hook: string; cta: string }[] = []
  try {
    const raw = await ask(prompt)
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      aiItems = JSON.parse(jsonMatch[0])
    }
  } catch {
    aiItems = days.map(() => ({ tematica: 'Contenido pendiente', hook: 'Próximamente', cta: 'Escribinos' }))
  }

  // Borrar la semana anterior si existe y reemplazar
  await db.from('content_calendar').delete()
    .gte('fecha', weekStart)
    .lte('fecha', days[6].fecha)

  // Insertar los 7 días
  const rows: CalendarItem[] = days.map((d, i) => ({
    ...d,
    tematica: aiItems[i]?.tematica || 'Contenido por definir',
    hook: aiItems[i]?.hook || '',
    cta: aiItems[i]?.cta || '',
    status: 'pendiente' as const,
  }))

  const { data: inserted, error } = await db.from('content_calendar').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(inserted)
}

export async function PATCH(req: NextRequest) {
  const db = await createClient()
  const { id, status, notas } = await req.json()
  const updates: Record<string, string> = {}
  if (status) updates.status = status
  if (notas !== undefined) updates.notas = notas
  const { data, error } = await db.from('content_calendar').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
