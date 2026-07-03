import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const db = await createClient()
  const { data } = await db.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(200)
  return NextResponse.json(data || [])
}
