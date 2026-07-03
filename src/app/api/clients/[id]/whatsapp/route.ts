import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'

type Params = Promise<{ id: string }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data: client } = await db.from('clients').select('*').eq('id', id).single()
  if (!client || !client.phone) return NextResponse.json({ error: 'Sin teléfono' }, { status: 400 })

  const [companyName, companyDesc] = await Promise.all([
    getSetting('COMPANY_NAME'),
    getSetting('COMPANY_DESCRIPTION'),
  ])

  const nombre = companyName || 'nuestro equipo'
  const descripcion = companyDesc || 'productos de calidad para tu negocio'
  const whatsapp = `Hola! Soy de *${nombre}*. ${descripcion}. ¿Te puedo contar más? 🙌`

  const phone = client.phone.replace(/\D/g, '')
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsapp)}`

  return NextResponse.json({ url, message: whatsapp })
}
