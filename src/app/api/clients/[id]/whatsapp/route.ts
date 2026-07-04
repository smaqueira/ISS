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
  const descripcion = companyDesc || 'pescados y mariscos frescos para tu negocio'
  const catalogoUrl = `https://vittomare.com`
  const telefono = companyWhatsapp ? `+${companyWhatsapp.replace(/\D/g, '')}` : ''
  const whatsapp = `¡Hola! ¿Cómo estás? Te escribo de *${nombre}* 🐟

${descripcion}.

Trabajamos con restaurantes, hoteles y rotisarías de la zona — entrega puntual, cadena de frío garantizada y selección diaria del puerto.

Mirá nuestros productos y precios acá 👉 ${catalogoUrl}

Calidad garantizada en cada entrega — si no quedas conforme, lo resolvemos. Hablamos?${telefono ? ` Tel: ${telefono}` : ''}`

  const phone = client.phone.replace(/\D/g, '')
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsapp)}`

  return NextResponse.json({ url, message: whatsapp })
}
