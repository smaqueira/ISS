import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { rows } = await req.json()
  if (!rows?.length) return NextResponse.json({ imported: 0, skipped: 0, debug: 'empty rows' })

  const db = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const toInsert = rows.map((row: Record<string, string>) => ({
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

  // upsert con onConflict en el índice único — si ya existe, lo ignora (ignoreDuplicates)
  const { data, error } = await db
    .from('clients')
    .upsert(toInsert, {
      onConflict: 'name,city,rubro',
      ignoreDuplicates: true,
    })
    .select('id')

  if (error) return NextResponse.json({ imported: 0, skipped: 0, error: error.message })

  const imported = data?.length || 0
  const skipped = rows.length - imported

  return NextResponse.json({ imported, skipped })
}
