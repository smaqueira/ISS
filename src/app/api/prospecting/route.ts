import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchPlaces } from '@/lib/prospecting/serper'
import { classifyLead } from '@/lib/ai/classify'
import { rubroExcluido } from '@/lib/prospecting/excluidos'
import { cargarExistentes } from '@/lib/prospecting/existentes'

export async function POST(req: NextRequest) {
  const { query, city, auto_import } = await req.json()
  if (!query || !city) return NextResponse.json({ error: 'query y city requeridos' }, { status: 400 })
  if (rubroExcluido(query)) {
    return NextResponse.json({ results: [], imported: 0, excluido: true, message: `El rubro "${query}" está excluido de la prospección.` })
  }

  const places = await searchPlaces(query, city)
  if (!places.length) return NextResponse.json({ results: [] })

  const db = await createClient()

  // Traer TODOS los clientes existentes (paginado) para no traer duplicados
  const { names: existingNames, phones: existingPhones } = await cargarExistentes(db)

  // Clasificar cada lugar con IA y marcar si ya existe
  const results = await Promise.all(places.map(async (place) => {
    const ai = await classifyLead({ name: place.name, rubro: query, description: place.address })
    const existing =
      existingNames.has(place.name?.toLowerCase().trim()) ||
      (place.phone && existingPhones.has(place.phone))
    return { ...place, type: ai.type, score: ai.score, channel: ai.channel, reason: ai.reason, existing }
  }))

  // Si auto_import → insertar TODOS los que no existan ya (con cualquier dato).
  // El score queda guardado para priorizar, pero no descarta leads.
  if (auto_import) {
    const toImport = results.filter(r => !r.existing)
    for (const r of toImport) {
      const { error } = await db.from('clients').insert({
        name: r.name, type: r.type, rubro: query,
        phone: r.phone || null, email: null,
        city, website: r.website || null,
        notes: r.address || null,
        status: 'nuevo', score: r.score, channel: r.channel, tags: [],
      })
      if (error) console.error('Import error:', r.name, error.message)
    }
    return NextResponse.json({ results, imported: toImport.length })
  }

  return NextResponse.json({ results })
}
