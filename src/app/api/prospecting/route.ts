import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchPlaces } from '@/lib/prospecting/serper'
import { classifyLead } from '@/lib/ai/classify'
import { rubroExcluido } from '@/lib/prospecting/excluidos'
import { cargarExistentes, normName, normPhone, igFromAny } from '@/lib/prospecting/existentes'
import { esDeArgentina } from '@/lib/prospecting/geo'

export async function POST(req: NextRequest) {
  const { query, city, auto_import } = await req.json()
  if (!query || !city) return NextResponse.json({ error: 'query y city requeridos' }, { status: 400 })
  if (rubroExcluido(query)) {
    return NextResponse.json({ results: [], imported: 0, excluido: true, message: `El rubro "${query}" está excluido de la prospección.` })
  }

  const encontrados = await searchPlaces(query, city)
  // Solo Argentina (Google a veces trae homónimos del exterior)
  const places = encontrados.filter(p => esDeArgentina(p.address))
  if (!places.length) return NextResponse.json({ results: [] })

  const db = await createClient()

  // Traer TODOS los clientes existentes (paginado) para no traer duplicados
  const { names: existingNames, phones: existingPhones, instagrams: existingIg } = await cargarExistentes(db)

  // Clasificar cada lugar con IA y marcar si ya existe (por nombre, teléfono o Instagram)
  const results = await Promise.all(places.map(async (place) => {
    const ai = await classifyLead({ name: place.name, rubro: query, description: place.address })
    const ig = igFromAny(place.website)
    const nom = normName(place.name)
    const tel = normPhone(place.phone)
    const existing =
      (nom && existingNames.has(nom)) ||
      (tel && existingPhones.has(tel)) ||
      (ig && existingIg.has(ig))
    return { ...place, ig, type: ai.type, score: ai.score, channel: ai.channel, reason: ai.reason, existing }
  }))

  // Si auto_import → insertar TODOS los que no existan ya (con cualquier dato).
  // El score queda guardado para priorizar, pero no descarta leads.
  if (auto_import) {
    let imported = 0
    for (const r of results) {
      if (r.existing) continue
      const ig = igFromAny(r.website)
      // Re-chequear contra los ya insertados en esta misma tanda
      const nom = normName(r.name), tel = normPhone(r.phone)
      if ((nom && existingNames.has(nom)) || (tel && existingPhones.has(tel)) || (ig && existingIg.has(ig))) continue
      const { error } = await db.from('clients').insert({
        name: r.name, type: r.type, rubro: query,
        phone: r.phone || null, email: null,
        city, instagram: ig ? `@${ig}` : null,
        website: ig ? null : (r.website || null),
        notes: r.address || null,
        status: 'nuevo', score: r.score, channel: r.channel,
        tags: (!r.phone && !ig) ? ['sin_datos'] : [],
      })
      if (error) { console.error('Import error:', r.name, error.message); continue }
      imported++
      if (nom) existingNames.add(nom)
      if (tel) existingPhones.add(tel)
      if (ig) existingIg.add(ig)
    }
    return NextResponse.json({ results, imported })
  }

  return NextResponse.json({ results })
}
