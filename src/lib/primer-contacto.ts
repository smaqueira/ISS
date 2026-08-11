// Lógica compartida del primer mensaje de contacto y del @instagram.
// La usan la ruta de WhatsApp y el tablero "Instagram hoy".
//
// Enfoque MAYORISTA B2B: mensajes cortos, no invasivos, con una pregunta abierta
// que invita a responder (nunca venta agresiva, sin precios ni links). El ángulo
// cambia según el rubro (sushi / parrilla / restaurante). [restaurante] se
// reemplaza por el nombre real del negocio.

// Variedad general (restaurantes, bares, bodegones, cervecerías…)
const RESTAURANTE = [
  `¡Hola! ¿Cómo andan en [restaurante]? 😊 Te escribo de Vitto Mare, distribuimos pescados y mariscos a restaurantes, con cadena de frío cuidada y entrega a domicilio. ¿Les interesaría recibir precios mayoristas y disponibilidad?`,
  `Buenas! Soy de Vitto Mare 🐟 Proveemos pescados y mariscos de calidad a la gastronomía. Vi que están en [restaurante] y quería consultarles: ¿con qué proveedor de mar se manejan hoy? ¿Estarían abiertos a comparar?`,
  `¡Hola equipo de [restaurante]! 👋 Somos Vitto Mare, proveedores mayoristas de pescados y mariscos con reparto propio. Si les sirve, con gusto les acerco disponibilidad y valores, sin compromiso. ¿Les interesa?`,
  `Buen día! Les escribo de Vitto Mare, especialistas en pescados y mariscos para gastronomía, con cadena de frío de punta a punta. ¿Les vendría bien que les pase nuestra lista mayorista actual?`,
  `¡Buenas! De Vitto Mare — trabajamos producto de mar (pescados y mariscos) para restaurantes y hoteles, con entrega a domicilio. ¿Estarían abiertos a que les comparta disponibilidad y precios de mayorista?`,
]

// Locales de sushi: la calidad sashimi es el argumento clave
const SUSHI = [
  `¡Hola! ¿Cómo andan en [restaurante]? 😊 Te escribo de Vitto Mare, proveemos salmón, atún y mariscos calidad sashimi a locales de sushi, con cadena de frío cuidada. ¿Les interesaría recibir disponibilidad y precios mayoristas?`,
  `Buenas! Soy de Vitto Mare 🍣 Trabajamos pescado y marisco para sushi (salmón, atún, langostinos). Vi que están en [restaurante] y quería consultarles con qué proveedor se manejan. ¿Estarían para comparar calidad?`,
  `¡Hola equipo de [restaurante]! 👋 Somos Vitto Mare, abastecemos locales de sushi con salmón y atún de calidad, entrega a domicilio y cadena de frío cuidada. Si les sirve, les paso la lista mayorista sin compromiso. ¿Les interesa?`,
  `Buen día! Les escribo de Vitto Mare — salmón, atún y mariscos para sushi. Para sushi la calidad es todo, por eso cuidamos la cadena de frío de punta a punta. ¿Les gustaría recibir disponibilidad y valores?`,
]

// Parrillas: mariscos para la carta / entradas (rabas, langostinos, pulpo)
const PARRILLA = [
  `¡Hola! ¿Cómo andan en [restaurante]? 😊 Te escribo de Vitto Mare, proveemos rabas, langostinos y pulpo a parrillas, con reparto a domicilio. ¿Les interesaría recibir precios mayoristas y disponibilidad para la carta?`,
  `Buenas! Soy de Vitto Mare 🦑 Trabajamos mariscos para parrillas (rabas, langostinos, pulpo). Vi que están en [restaurante] y quería consultarles: ¿con qué proveedor de mariscos trabajan hoy? ¿Estarían para comparar?`,
  `¡Hola equipo de [restaurante]! 👋 Somos Vitto Mare, abastecemos parrillas con mariscos para las entradas y la carta, con entrega a domicilio. Si les sirve, les paso disponibilidad y valores de mayorista. ¿Les interesa?`,
  `Buen día! Les escribo de Vitto Mare — rabas, langostinos, pulpo y más, seleccionados para parrillas. ¿Les vendría bien que les comparta la lista mayorista actual?`,
]

const GENERICO = RESTAURANTE

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').split('').filter(c => { const x = c.charCodeAt(0); return x < 0x300 || x > 0x36f }).join('')
}

function setPorRubro(rubro?: string | null): string[] {
  const n = normalizar(rubro || '')
  if (n.includes('sushi')) return SUSHI
  if (n.includes('parrilla')) return PARRILLA
  if (n.includes('restaur') || n.includes('resto') || n.includes('bar') || n.includes('bodegon') || n.includes('cervec') || n.includes('marisq') || n.includes('comida')) return RESTAURANTE
  return GENERICO
}

export function elegirPrimerContacto(id: string, nombre: string, rubro?: string | null): string {
  // Hash estable del id: el mismo cliente siempre ve la misma variante y los
  // distintos contactos se reparten (rotación sin mandar todo igual).
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const lugar = nombre.trim()
  const set = setPorRubro(rubro)
  // Con nombre → priorizar las variantes con [restaurante] (el nombre las vuelve
  // únicas). Sin nombre → usar las que no lo necesitan (si no hay, sacar el placeholder).
  const conNombre = set.filter(v => v.includes('[restaurante]'))
  const sinNombre = set.filter(v => !v.includes('[restaurante]'))
  if (lugar) {
    const pool = conNombre.length ? conNombre : set
    return pool[h % pool.length].replace(/\[restaurante\]/g, lugar)
  }
  const pool = sinNombre.length ? sinNombre : set
  return pool[h % pool.length].replace(/\s*en \[restaurante\]/g, '').replace(/\[restaurante\]/g, 'ustedes')
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
