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
  const descripcion = companyDesc || 'pescados y mariscos frescos'
  const catalogoUrl = 'https://vittomare.com'

  // Unicode escapes — no literal emoji in source to avoid encoding issues
  // emoji generated at runtime from codepoints -- no emoji chars in source
  const fish  = String.fromCodePoint(0x1F41F)  // fish
  const truck = String.fromCodePoint(0x1F69A)  // truck
  const snow  = String.fromCodePoint(0x2744, 0xFE0F)  // snowflake
  const wave  = String.fromCodePoint(0x1F60A)  // smile
  const spark = String.fromCodePoint(0x2728)   // sparkles
  const cuerpo = `${fish} Seleccionamos nuestros productos diariamente para garantizar la mejor calidad.\n${truck} Hacemos entregas a domicilio.\n${snow} Mantenemos la cadena de frío en todo el proceso.`

  const whatsapp = `¡Hola! ${wave} ¿Cómo estás?\n\nTe escribimos de *${nombre}*, especialistas en ${descripcion}.\n\n${cuerpo}\n\nPodés ver todos nuestros productos y precios en:\n${catalogoUrl}\n\n${spark} Nuestro compromiso es que disfrutes productos frescos y de la mejor calidad en cada entrega.\n\n¿Te gustaría recibir nuestro catálogo o hacer un pedido? Estamos para ayudarte.`

  const phone = client.phone.replace(/\D/g, '')
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsapp)}`

  return NextResponse.json({ url, message: whatsapp })
}
