import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchPlaces } from '@/lib/prospecting/serper'
import { classifyLead } from '@/lib/ai/classify'

export async function POST(req: NextRequest) {
  const { query, city, auto_import } = await req.json()
  if (!query || !city) return NextResponse.json({ error: 'query y city requeridos' }, { status: 400 })

  const places = await searchPlaces(query, city)
  if (!places.length) return NextResponse.json({ results: [] })

  const db = await createClient()

  // Traer todos los clientes existentes para comparar por nombre y teléfono
  const { data: existingClients } = await db.from('clients').select('id, name, phone')
  const existingNames = new Set((existingClients || []).map(c => c.name?.toLowerCase().trim()))
  const existingPhones = new Set((existingClients || []).map(c => c.phone).filter(Boolean))

  // Clasificar cada lugar con IA y marcar si ya existe
  const results = await Promise.all(places.map(async (place) => {
    const ai = await classifyLead({ name: place.name, rubro: query, description: place.address })
    const existing =
      existingNames.has(place.name?.toLowerCase().trim()) ||
      (place.phone && existingPhones.has(place.phone))
    return { ...place, type: ai.type, score: ai.score, channel: ai.channel, reason: ai.reason, existing }
  }))

  // Si auto_import → insertar los de score >= 60 que no existan ya
  if (auto_import) {
    const toImport = results.filter(r => r.score >= 60 && (r.phone || r.website) && !r.existing)
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
