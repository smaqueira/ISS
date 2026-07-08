import { NextRequest, NextResponse } from 'next/server'
import { listReels, createReel, getReelStats } from '@/lib/reels/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stats = searchParams.get('stats') === '1'

  try {
    if (stats) {
      const data = await getReelStats()
      return NextResponse.json(data)
    }

    const reels = await listReels({
      estado: searchParams.get('estado') || undefined,
      plataforma: searchParams.get('plataforma') || undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    })
    return NextResponse.json(reels)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const reel = await createReel({
      titulo: body.titulo || 'Nuevo Reel',
      descripcion: body.descripcion || '',
      producto_id: body.producto_id,
      producto_nombre: body.producto_nombre,
      categoria: body.categoria || 'general',
      objetivo: body.objetivo || 'venta',
      plataforma: body.plataforma || 'instagram',
      estado: 'borrador',
      hashtags: body.hashtags || [],
      cta: body.cta || 'Pedí en vittomare.com',
      duracion: body.duracion,
    })
    return NextResponse.json(reel, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
