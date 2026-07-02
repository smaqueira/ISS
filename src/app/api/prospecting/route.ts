import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchPlaces } from '@/lib/prospecting/serper'
import { classifyLead } from '@/lib/ai/classify'

export async function POST(req: NextRequest) {
  const { query, city, auto_import } = await req.json()
  if (!query || !city) return NextResponse.json({ error: 'query y city requeridos' }, { status: 400 })

  const places = await searchPlaces(query, city)
  if (!places.length) return NextResponse.json({ results: [] })

  // Clasificar cada lugar con IA
  const results = await Promise.all(places.map(async (place) => {
    const ai = await classifyLead({ name: place.name, rubro: query, description: place.address })
    return { ...place, type: ai.type, score: ai.score, channel: ai.channel, reason: ai.reason }
  }))

  // Si auto_import → insertar los de score >= 60 directo al CRM
  if (auto_import) {
    const db = await createClient()
    const toImport = results.filter(r => r.score >= 60 && (r.phone || r.website))
    for (const r of toImport) {
      const { data: exists } = await db.from('clients').select('id').eq('name', r.name).single()
      if (!exists) {
        const { error } = await db.from('clients').insert({
          name: r.name, type: r.type, rubro: query,
          phone: r.phone || null, email: null,
          city, website: r.website || null,
          notes: r.address || null,
          status: 'nuevo', score: r.score, channel: r.channel, tags: [],
        })
        if (error) console.error('Import error:', r.name, error.message)
      }
    }
    return NextResponse.json({ results, imported: toImport.length })
  }

  return NextResponse.json({ results })
}
