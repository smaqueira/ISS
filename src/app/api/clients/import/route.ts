import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { rows } = await req.json()
  if (!rows?.length) return NextResponse.json({ imported: 0, skipped: 0, debug: 'empty rows' })

  const db = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Traer solo name+city+rubro existentes para dedup eficiente
  const { data: existing } = await db.from('clients').select('name, city, rubro')
  const existingKeys = new Set(
    (existing || []).map(c =>
      `${c.name?.toLowerCase().trim()}|${(c.city || '').toLowerCase().trim()}|${(c.rubro || '').toLowerCase().trim()}`
    )
  )

  const nuevos = rows.filter((row: Record<string, string>) => {
    const key = `${row.name?.toLowerCase().trim()}|${(row.city || '').toLowerCase().trim()}|${(row.rubro || '').toLowerCase().trim()}`
    return !existingKeys.has(key)
  })

  if (!nuevos.length) return NextResponse.json({ imported: 0, skipped: rows.length })

  // Insertar en lotes de 100
  let imported = 0
  let firstError = ''
  for (let i = 0; i < nuevos.length; i += 100) {
    const batch = nuevos.slice(i, i + 100).map((row: Record<string, string>) => ({
      name: row.name,
      phone: row.phone || null,
      email: row.email || null,
      city: row.city || null,
      type: row.type || 'b2c',
      rubro: row.rubro || null,
      notes: row.notes || null,
      status: 'nuevo',
      channel: null,
      tags: [],
    }))
    const { data, error } = await db.from('clients').insert(batch).select('id')
    if (error) { firstError = error.message; break }
    imported += data?.length || 0
  }

  const skipped = rows.length - imported
  return NextResponse.json({ imported, skipped, ...(firstError ? { error: firstError } : {}) })
}
