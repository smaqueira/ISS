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
  const catalogoUrl  = 'https://vittomare.com/productos'
  const catalogoImgUrl = 'https://app.vittomare.com/api/catalogo/imagen'

  const fish  = String.fromCodePoint(0x1F41F)
  const truck = String.fromCodePoint(0x1F69A)
  const snow  = String.fromCodePoint(0x2744, 0xFE0F)
  const wave  = String.fromCodePoint(0x1F60A)
  const spark = String.fromCodePoint(0x2728)
  const cam   = String.fromCodePoint(0x1F4F8)

  const esPrimerContacto = !client.fecha_primer_contacto && !client.last_contact

  const cuerpo = `${fish} Seleccionamos nuestros productos diariamente para garantizar la mejor calidad.\n${truck} Hacemos entregas a domicilio.\n${snow} Mantenemos la cadena de frío en todo el proceso.`

  const whatsapp = esPrimerContacto
    ? `¡Hola! ${wave} ¿Cómo estás?\n\nTe escribimos de *${nombre}*, especialistas en ${descripcion}.\n\n${cuerpo}\n\n${cam} *Te compartimos nuestro catálogo de hoy:*\n${catalogoImgUrl}\n\nTambién podés ver todos nuestros productos en:\n${catalogoUrl}\n\n${spark} Nuestro compromiso es que disfrutes productos frescos y de la mejor calidad en cada entrega.\n\n¿Te gustaría hacer un pedido? Estamos para ayudarte.`
    : `¡Hola! ${wave} ¿Cómo estás?\n\nTe escribimos de *${nombre}*, especialistas en ${descripcion}.\n\n${cuerpo}\n\nPodés ver todos nuestros productos y precios en:\n${catalogoUrl}\n\n${spark} Nuestro compromiso es que disfrutes productos frescos y de la mejor calidad en cada entrega.\n\n¿Te gustaría recibir nuestro catálogo o hacer un pedido? Estamos para ayudarte.`

  const phone = client.phone.replace(/\D/g, '')
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsapp)}`

  return NextResponse.json({ url, message: whatsapp })
}
