import { NextRequest, NextResponse } from 'next/server'
import { getSessionRole } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const role = getSessionRole(req)
  if (!role) return NextResponse.json({ role: null }, { status: 401 })
  return NextResponse.json({ role })
}
