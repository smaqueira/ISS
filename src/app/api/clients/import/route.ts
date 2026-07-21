import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ImportRow {
  name: string
  phone?: string
  email?: string
  city?: string
  type?: string
  rubro?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  const { rows }: { rows: ImportRow[] } = await req.json()
  if (!rows?.length) return NextResponse.json({ imported: 0, skipped: 0 })

  // Dedup: cargar name+phone+email+city+rubro existentes
  const { data: existing } = await db.from('clients').select('name, phone, email, city, rubro')
  const existingPhones = new Set((existing || []).map(c => c.phone?.trim()).filter(Boolean))
  const existingEmails = new Set((existing || []).map(c => c.email?.trim().toLowerCase()).filter(Boolean))
  const existingNameCityRubro = new Set(
    (existing || [])
      .filter(c => c.name)
      .map(c => `${c.name.toLowerCase().trim()}||${(c.city || '').toLowerCase().trim()}||${(c.rubro || '').toLowerCase().trim()}`)
  )

  const nuevos = rows.filter(row => {
    if (!row.name?.trim()) return false
    if (row.phone && existingPhones.has(row.phone.trim())) return false
    if (row.email && existingEmails.has(row.email.trim().toLowerCase())) return false
    const key = `${row.name.toLowerCase().trim()}||${(row.city || '').toLowerCase().trim()}||${(row.rubro || '').toLowerCase().trim()}`
    if (existingNameCityRubro.has(key)) return false
    return true
  })

  const skippedCount = rows.length - nuevos.length

  const debugSkipped = rows.filter(row => !nuevos.includes(row)).map(row => {
    const reasons = []
    if (!row.name?.trim()) reasons.push('sin nombre')
    if (row.phone && existingPhones.has(row.phone.trim())) reasons.push('tel duplicado')
    if (row.email && existingEmails.has(row.email.trim().toLowerCase())) reasons.push('email duplicado')
    const key = `${row.name.toLowerCase().trim()}||${(row.city || '').toLowerCase().trim()}||${(row.rubro || '').toLowerCase().trim()}`
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
      name: row.name.trim(),
      type: row.type || 'b2c',
      rubro: row.rubro?.trim() || null,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      city: row.city?.trim() || null,
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
