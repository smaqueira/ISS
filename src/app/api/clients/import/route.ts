import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const db = await createClient()
  const { rows }: { rows: ImportRow[] } = await req.json()
  if (!rows?.length) return NextResponse.json({ imported: 0, skipped: 0 })

  // Dedup: cargar name+phone+email existentes
  const { data: existing } = await db.from('clients').select('name, phone, email, city')
  const existingPhones   = new Set((existing || []).map(c => c.phone?.trim()).filter(Boolean))
  const existingEmails   = new Set((existing || []).map(c => c.email?.trim().toLowerCase()).filter(Boolean))
  // dedup nombre+ciudad: solo cuando AMBOS están presentes en DB y en el CSV
  const existingNameCity = new Set(
    (existing || [])
      .filter(c => c.name && c.city)
      .map(c => `${c.name.toLowerCase().trim()}||${c.city.toLowerCase().trim()}`)
  )

  const nuevos = rows.filter(row => {
    if (!row.name?.trim()) return false
    // 1. teléfono duplicado
    if (row.phone && existingPhones.has(row.phone.trim())) return false
    // 2. email duplicado
    if (row.email && existingEmails.has(row.email.trim().toLowerCase())) return false
    // 3. mismo nombre + misma ciudad (solo si ambos están definidos)
    if (row.name && row.city) {
      const key = `${row.name.toLowerCase().trim()}||${row.city.toLowerCase().trim()}`
      if (existingNameCity.has(key)) return false
    }
    return true
  })

  const skippedCount = rows.length - nuevos.length
  if (!nuevos.length) return NextResponse.json({ imported: 0, skipped: skippedCount })

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
      status: 'prospecto',
      score: 50,
      origen: 'importacion',
      tags: [],
    }))
    const { data: inserted, error } = await db.from('clients').insert(batch).select('id')
    if (error) { firstError = error.message; break }
    if (inserted?.length) {
      await db.from('client_history').insert(
        inserted.map(c => ({ client_id: c.id, accion: 'Cliente importado', detalle: 'Importación CSV', usuario: 'sistema' }))
      )
      imported += inserted.length
    }
  }

  return NextResponse.json({ imported, skipped: skippedCount, ...(firstError ? { error: firstError } : {}) })
}
