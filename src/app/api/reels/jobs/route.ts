import { NextRequest, NextResponse } from 'next/server'
import { listJobs } from '@/lib/reels/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reelId = searchParams.get('reel_id') || undefined
  try {
    const jobs = await listJobs(reelId)
    return NextResponse.json(jobs)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
