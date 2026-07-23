// Lógica compartida del primer mensaje de contacto y del @instagram.
// La usan la ruta de WhatsApp y el tablero "Instagram hoy".

// 10 variantes del primer mensaje — se rotan por cliente para que no se detecten
// como plantilla masiva. Sin enlaces: el catálogo se manda cuando responden.
// [restaurante] se reemplaza por el nombre real.
export const VARIANTES_PRIMER_CONTACTO = [
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

export function elegirPrimerContacto(id: string, nombre: string): string {
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

// Normaliza el campo instagram a un usuario limpio (soporta @user, url, etc.)
export function igHandle(raw?: string | null): string | null {
  if (!raw) return null
  let s = raw.trim()
  if (!s) return null
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
  s = s.replace(/^@/, '').replace(/[/?].*$/, '').trim()
  return s || null
}
