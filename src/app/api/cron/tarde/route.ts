import { NextRequest, NextResponse } from 'next/server'
import { runTarde } from '@/lib/agent/run'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runTarde()
  return NextResponse.json(result)
}
