import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Ruta pública — sin autenticación, para la página de catálogo
export async function GET() {
  const db = await createClient()
  const { data, error } = await db.from('products').select('*').eq('active', true).order('category').order('name')
  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data || [])
}
