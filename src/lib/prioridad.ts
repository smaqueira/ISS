import type { Client } from './types'

// Prioriza a quién contactar primero por probabilidad de compra. Heurística
// instantánea (sin llamar a la IA por contacto): combina el score del lead con
// señales que en mayorista mueven la aguja — rubro que trabajamos, si te sigue,
// temperatura y si es alcanzable (WhatsApp/Instagram).

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').split('').filter(c => { const x = c.charCodeAt(0); return x < 0x300 || x > 0x36f }).join('')
}

export interface Prioridad { score: number; motivo: string }

export function prioridadContacto(c: Client): Prioridad {
  let p = c.score || 0
  const motivos: string[] = []

  const n = normalizar(c.rubro || '')
  const esRubroClave = /sushi|parrilla|cervec|restaur|resto|bar|bodegon|marisq/.test(n)
  if (esRubroClave) { p += 15; motivos.push('rubro clave') }

  const tags = c.tags || []
  if (tags.includes('me_sigue')) { p += 20; motivos.push('te sigue') }

  if (c.temperatura === 'caliente') { p += 18; motivos.push('caliente') }
  else if (c.temperatura === 'tibio') { p += 8 }

  if (c.prioridad === 'alta') { p += 10; motivos.push('prioridad alta') }

  // Alcanzable: sumar por canal disponible (WhatsApp pesa más que solo IG)
  if (c.phone) p += 8
  if (c.instagram) p += 4
  if (!c.phone && !c.instagram) { p -= 30; motivos.push('sin canal') }

  const motivo = motivos.slice(0, 2).join(' · ') || (c.phone ? 'con WhatsApp' : c.instagram ? 'con Instagram' : '')
  return { score: Math.round(p), motivo }
}

// Ordena una lista de contactos por prioridad (mayor primero) y adjunta el motivo.
export function ordenarPorPrioridad<T extends Client>(clients: T[]): { client: T; prioridad: Prioridad }[] {
  return clients
    .map(client => ({ client, prioridad: prioridadContacto(client) }))
    .sort((a, b) => b.prioridad.score - a.prioridad.score)
}
