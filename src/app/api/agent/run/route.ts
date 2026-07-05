import { NextRequest, NextResponse } from 'next/server'
import { runMañana, runMediodía, runTarde, runVentas } from '@/lib/agent/run'

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const turno = searchParams.get('turno') || 'manana'

  try {
    let result
    if (turno === 'manana') result = await runMañana()
    else if (turno === 'mediodia') result = await runMediodía()
    else if (turno === 'tarde') result = await runTarde()
    else if (turno === 'ventas') result = await runVentas()
    else return NextResponse.json({ error: 'turno inválido' }, { status: 400 })
    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
