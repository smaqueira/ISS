import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'

type Params = Promise<{ id: string }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data: client } = await db.from('clients').select('*').eq('id', id).single()
  if (!client || !client.phone) return NextResponse.json({ error: 'Sin teléfono' }, { status: 400 })

  const [companyName, companyDesc, companyWhatsapp] = await Promise.all([
    getSetting('COMPANY_NAME'),
    getSetting('COMPANY_DESCRIPTION'),
    getSetting('COMPANY_WHATSAPP'),
  ])

  const nombre = companyName || 'nuestro equipo'
  const descripcion = companyDesc || 'pescados y mariscos frescos'
  const catalogoUrl = `https://vittomare.com`
  const telefono = companyWhatsapp ? `+${companyWhatsapp.replace(/\D/g, '')}` : ''
  const esB2B = client.type === 'b2b'

  const cuerpo = esB2B
    ? `🐟 Seleccionamos nuestros productos diariamente para garantizar la mejor calidad.\n🚚 Hacemos entregas a domicilio.\n❄️ Mantenemos la cadena de frío en todo el proceso.`
    : `🐟 Seleccionamos nuestros productos diariamente para garantizar la mejor calidad.\n🚚 Hacemos entregas a domicilio.\n❄️ Mantenemos la cadena de frío en todo el proceso.`

  const whatsapp = `¡Hola! 😊 ¿Cómo estás?

Te escribimos de *${nombre}*, especialistas en ${descripcion}.

${cuerpo}

Podés ver todos nuestros productos y precios en:
${catalogoUrl}

✨ Nuestro compromiso es que disfrutes productos frescos y de la mejor calidad en cada entrega.

¿Te gustaría recibir nuestro catálogo o hacer un pedido? Estamos para ayudarte.`

  const phone = client.phone.replace(/\D/g, '')
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsapp)}`

  return NextResponse.json({ url, message: whatsapp })
}
