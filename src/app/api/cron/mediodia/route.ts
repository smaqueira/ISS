import { NextRequest, NextResponse } from 'next/server'
import { runMediodía } from '@/lib/agent/run'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runMediodía()
  return NextResponse.json(result)
}
