import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'

type Params = Promise<{ id: string }>

// 10 variantes del primer mensaje de contacto — se rotan por cliente para que no
// se detecten como plantilla masiva. Sin enlaces: el catálogo se manda recién
// cuando el contacto responde. [restaurante] se reemplaza por el nombre real.
const VARIANTES_PRIMER_CONTACTO = [
  `¡Hola! ¿Cómo andan en [restaurante]? 😊 Te escribo de Vitto Mare, distribuimos pescados y mariscos frescos a restaurantes de Buenos Aires, con entrega a domicilio y cadena de frío. ¿Les interesaría que les pase precios y disponibilidad?`,
  `Buenas! Soy de Vitto Mare 🐟 Trabajamos con mariscos y pescados frescos seleccionados a diario para restaurantes de la ciudad. Vi que están en [restaurante] y quería consultarles: ¿estarían abiertos a recibir nuestra lista de productos?`,
  `Hola, ¿qué tal en [restaurante]? Les escribo de Vitto Mare, proveedores de pescados y mariscos frescos con reparto a domicilio en Buenos Aires. Si les sirve, con gusto les acerco info y valores. ¿Les interesa?`,
  `¡Hola equipo de [restaurante]! 👋 Somos Vitto Mare, nos dedicamos a proveer pescado y marisco fresco a la gastronomía porteña. ¿Tendrían un minuto para que les cuente qué manejamos y a qué precios?`,
  `Buen día! Te contacto de Vitto Mare, especialistas en mariscos y pescados frescos para restaurantes de Buenos Aires. Mantenemos la cadena de frío y entregamos a domicilio. ¿Les gustaría que les pase nuestro catálogo actual?`,
  `Hola! ¿Cómo va todo en [restaurante]? Soy de Vitto Mare 🐟 Abastecemos de pescados y mariscos frescos a restaurantes de la zona. Quería saber si estarían interesados en conocer nuestra propuesta y precios.`,
  `¡Buenas! Les escribo de Vitto Mare. Trabajamos producto de mar fresco (pescados y mariscos) para restaurantes y hoteles de Buenos Aires, con selección diaria. ¿Les vendría bien que les comparta disponibilidad y valores?`,
  `Hola [restaurante]! 😊 Somos Vitto Mare, proveedores de pescados y mariscos frescos con entrega a domicilio en CABA. Si andan buscando o quieren comparar proveedor, les paso info sin compromiso. ¿Les interesa?`,
  `Qué tal! Me presento: Vitto Mare, distribución de pescado y marisco fresco para gastronomía en Buenos Aires. Seleccionamos a diario y cuidamos la cadena de frío. ¿Estarían abiertos a que les acerque nuestra lista?`,
  `Hola! Escribo desde Vitto Mare 🐟 Proveemos a restaurantes de Buenos Aires con mariscos y pescados frescos, entrega a domicilio incluida. ¿Les gustaría recibir el catálogo de hoy y precios? Se los mando enseguida si les sirve.`,
]

function elegirPrimerContacto(id: string, nombre: string): string {
  // Hash estable del id: el mismo cliente siempre ve la misma variante y los
  // distintos contactos se reparten (rotación sin mandar todo igual).
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const lugar = nombre.trim()
  // Con nombre → priorizar las variantes con [restaurante] (el nombre las vuelve
  // únicas). Sin nombre → usar las que no lo necesitan.
  const conNombre = VARIANTES_PRIMER_CONTACTO.filter(v => v.includes('[restaurante]'))
  const sinNombre = VARIANTES_PRIMER_CONTACTO.filter(v => !v.includes('[restaurante]'))
  const pool = lugar ? conNombre : sinNombre
  const msg = pool[h % pool.length]
  return lugar ? msg.replace(/\[restaurante\]/g, lugar) : msg
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data: client } = await db.from('clients').select('*').eq('id', id).single()
  if (!client || !client.phone) return NextResponse.json({ error: 'Sin teléfono' }, { status: 400 })

  const [companyName, companyDesc, compraMinima] = await Promise.all([
    getSetting('COMPANY_NAME'),
    getSetting('COMPANY_DESCRIPTION'),
    getSetting('COMPRA_MINIMA'),
  ])

  const nombre = companyName || 'nuestro equipo'
  const descripcion = companyDesc || 'pescados y mariscos frescos'
  const catalogoUrl  = 'https://vittomare.com/productos'

  const fish  = String.fromCodePoint(0x1F41F)
  const truck = String.fromCodePoint(0x1F69A)
  const snow  = String.fromCodePoint(0x2744, 0xFE0F)
  const wave  = String.fromCodePoint(0x1F60A)
  const spark = String.fromCodePoint(0x2728)

  const esPrimerContacto = !client.fecha_primer_contacto && !client.last_contact

  const cuerpo = `${fish} Seleccionamos nuestros productos diariamente para garantizar la mejor calidad.\n${truck} Hacemos entregas a domicilio.\n${snow} Mantenemos la cadena de frío en todo el proceso.${compraMinima ? `\n🛒 Compra mínima: ${compraMinima}` : ''}`

  const nombreLugar = (client.name || '').trim()
  const whatsapp = esPrimerContacto
    ? elegirPrimerContacto(id, nombreLugar)
    : `¡Hola! ${wave} ¿Cómo estás?\n\nTe escribimos de *${nombre}*, especialistas en ${descripcion}.\n\n${cuerpo}\n\nPodés ver todos nuestros productos y precios en:\n${catalogoUrl}\n\n${spark} Nuestro compromiso es que disfrutes productos frescos y de la mejor calidad en cada entrega.\n\n¿Te gustaría recibir nuestro catálogo o hacer un pedido? Estamos para ayudarte.`

  const phone = client.phone.replace(/\D/g, '')
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsapp)}`

  return NextResponse.json({ url, message: whatsapp })
}
