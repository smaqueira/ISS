import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
)

interface ImportRow {
  name?: string
  phone?: string
  email?: string
  city?: string
  type?: string
  rubro?: string
  notes?: string
  instagram?: string
}

// Deriva un nombre si la fila no lo trae: importar SIEMPRE, con cualquier dato.
function nombreDe(row: ImportRow): string {
  return (row.name?.trim() || row.phone?.trim() || row.instagram?.trim() || row.email?.trim() || 'Contacto sin nombre')
}

export async function POST(req: NextRequest) {
  const { rows }: { rows: ImportRow[] } = await req.json()
  if (!rows?.length) return NextResponse.json({ imported: 0, skipped: 0 })

  // Normalizar: cada fila queda con un nombre (real o derivado)
  for (const row of rows) row.name = nombreDe(row)

  // Dedup: cargar datos existentes
  const { data: existing } = await db.from('clients').select('name, phone, email, city, rubro, instagram')
  const norm = (v?: string | null) => (v || '').trim().toLowerCase()
  const igUser = (v?: string | null) => norm(v).replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/^@/, '').replace(/[/?].*$/, '')
  const existingPhones = new Set((existing || []).map(c => c.phone?.trim()).filter(Boolean))
  const existingEmails = new Set((existing || []).map(c => norm(c.email)).filter(Boolean))
  const existingIg = new Set((existing || []).map(c => igUser(c.instagram)).filter(Boolean))
  const existingNameCityRubro = new Set(
    (existing || [])
      .filter(c => c.name)
      .map(c => `${norm(c.name)}||${norm(c.city)}||${norm(c.rubro)}`)
  )

  const nuevos = rows.filter(row => {
    if (row.phone && existingPhones.has(row.phone.trim())) return false
    if (row.email && existingEmails.has(norm(row.email))) return false
    if (row.instagram && igUser(row.instagram) && existingIg.has(igUser(row.instagram))) return false
    const key = `${norm(row.name)}||${norm(row.city)}||${norm(row.rubro)}`
    if (existingNameCityRubro.has(key)) return false
    return true
  })

  const skippedCount = rows.length - nuevos.length

  const debugSkipped = rows.filter(row => !nuevos.includes(row)).map(row => {
    const reasons = []
    if (row.phone && existingPhones.has(row.phone.trim())) reasons.push('tel duplicado')
    if (row.email && existingEmails.has(norm(row.email))) reasons.push('email duplicado')
    if (row.instagram && igUser(row.instagram) && existingIg.has(igUser(row.instagram))) reasons.push('instagram duplicado')
    const key = `${norm(row.name)}||${norm(row.city)}||${norm(row.rubro)}`
    if (existingNameCityRubro.has(key)) reasons.push('nombre+ciudad+rubro duplicado')
    return { name: row.name, phone: row.phone, city: row.city, reasons }
  })

  if (!nuevos.length) return NextResponse.json({
    imported: 0,
    skipped: skippedCount,
    debug: debugSkipped.slice(0, 5),
    existingCount: existing?.length ?? 0,
    sampleExisting: existing?.slice(0, 2),
    sampleRows: rows.slice(0, 2).map(r => ({ name: r.name, phone: r.phone, email: r.email, city: r.city })),
  })

  // Insertar en lotes de 100
  let imported = 0
  let firstError = ''
  for (let i = 0; i < nuevos.length; i += 100) {
    const batch = nuevos.slice(i, i + 100).map(row => ({
      name: (row.name || 'Contacto sin nombre').trim(),
      type: row.type || 'b2c',
      rubro: row.rubro?.trim() || null,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      city: row.city?.trim() || null,
      instagram: row.instagram?.trim() || null,
      notes: row.notes?.trim() || null,
      status: 'nuevo',
      score: 50,
      tags: [],
    }))
    const { data: inserted, error } = await db.from('clients').insert(batch).select('id')
    if (error) {
      if (error.code === '23505') {
        // Hay un duplicado en el lote: insertar uno por uno, salteando los que ya existen
        for (const row of batch) {
          const { data: r } = await db.from('clients').insert([row]).select('id')
          if (r?.[0]) {
            await db.from('client_history').insert([{ client_id: r[0].id, accion: 'Cliente importado', detalle: 'Importación CSV', usuario: 'sistema' }])
            imported++
          }
        }
      } else {
        firstError = error.message
        break
      }
    } else if (inserted?.length) {
      await db.from('client_history').insert(
        inserted.map(c => ({ client_id: c.id, accion: 'Cliente importado', detalle: 'Importación CSV', usuario: 'sistema' }))
      )
      imported += inserted.length
    }
  }

  return NextResponse.json({
    imported,
    skipped: skippedCount,
    nuevos: nuevos.length,
    ...(firstError ? { error: firstError } : {}),
    sample: nuevos.slice(0, 3),
  })
}
