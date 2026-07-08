import { NextRequest, NextResponse } from 'next/server'
import { getReel, updateReel, deleteReel } from '@/lib/reels/db'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reel = await getReel(params.id)
    return NextResponse.json(reel)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 404 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const reel = await updateReel(params.id, body)
    return NextResponse.json(reel)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteReel(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
