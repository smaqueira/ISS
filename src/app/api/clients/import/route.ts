import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { rows } = await req.json()
  if (!rows?.length) return NextResponse.json({ imported: 0, skipped: 0 })

  const db = await createClient()
  const { data: existing } = await db.from('clients').select('name, phone')
  const existingNames = new Set((existing || []).map(c => c.name?.toLowerCase().trim()))
  const existingPhones = new Set((existing || []).map(c => c.phone).filter(Boolean))

  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const isDupe =
      existingNames.has(row.name?.toLowerCase().trim()) ||
      (row.phone && existingPhones.has(row.phone))

    if (isDupe) { skipped++; continue }

    const { error } = await db.from('clients').insert({
      name: row.name,
      phone: row.phone || null,
      email: row.email || null,
      city: row.city || null,
      type: row.type || 'b2c',
      rubro: row.rubro || null,
      notes: row.notes || null,
      status: 'nuevo',
      channel: 'importado',
      tags: [],
    })

    if (!error) {
      imported++
      existingNames.add(row.name?.toLowerCase().trim())
      if (row.phone) existingPhones.add(row.phone)
    }
  }

  return NextResponse.json({ imported, skipped })
}
