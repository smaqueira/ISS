import { NextRequest, NextResponse } from 'next/server'
import { runVentas } from '@/lib/agent/run'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runVentas()
  return NextResponse.json(result)
}
