import { NextRequest, NextResponse } from 'next/server'
import { listAutomationRules, toggleAutomationRule } from '@/lib/reels/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const rules = await listAutomationRules()
    return NextResponse.json(rules)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, activa } = await req.json()
    await toggleAutomationRule(id, activa)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
