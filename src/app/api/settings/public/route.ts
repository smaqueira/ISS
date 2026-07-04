import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Solo datos públicos de la empresa — nunca API keys ni tokens
const PUBLIC_KEYS = [
  'COMPANY_NAME',
  'COMPANY_LOGO_URL',
  'COMPANY_WHATSAPP',
  'COMPANY_INSTAGRAM',
  'COMPANY_SLOGAN',
  'COMPANY_DESCRIPTION',
]

export async function GET() {
  const db = await createClient()
  const { data, error } = await db.from('settings').select('key, value').in('key', PUBLIC_KEYS)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
