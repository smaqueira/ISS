import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const KEY = 'IG_CUENTA_HISTORIAL'

interface Snap { fecha: string; posts: number; followers: number; following: number }

async function leer(db: Awaited<ReturnType<typeof createClient>>): Promise<Snap[]> {
  const { data } = await db.from('settings').select('value').eq('key', KEY).single()
  try { return JSON.parse(data?.value || '[]') } catch { return [] }
}

export async function GET() {
  const db = await createClient()
  return NextResponse.json({ snapshots: await leer(db) })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = await createClient()
  const snaps = await leer(db)
  const snap: Snap = {
    fecha: new Date().toISOString(),
    posts: Math.max(0, Math.round(Number(body.posts) || 0)),
    followers: Math.max(0, Math.round(Number(body.followers) || 0)),
    following: Math.max(0, Math.round(Number(body.following) || 0)),
  }
  snaps.push(snap)
  const recortado = snaps.length > 90 ? snaps.slice(-90) : snaps
  await db.from('settings').upsert({ key: KEY, value: JSON.stringify(recortado) })
  return NextResponse.json({ snapshots: recortado })
}
