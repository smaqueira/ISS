// Respuestas rápidas (2º mensaje): lo que se manda DESPUÉS de que el prospecto
// responde, para convertir la consulta en pedido. Enfoque mayorista B2B, tono
// cordial y directo. El ángulo de producto cambia según el rubro.

function normalizar(s: string): string {
  return s.toLowerCase().normalize('NFD').split('').filter(c => { const x = c.charCodeAt(0); return x < 0x300 || x > 0x36f }).join('')
}

// Frase de productos según el rubro (para que el 2º mensaje hable de lo que le sirve)
function productos(rubro?: string | null): string {
  const n = normalizar(rubro || '')
  if (n.includes('sushi')) return 'salmón, atún y mariscos calidad sashimi'
  if (n.includes('parrilla')) return 'rabas, langostinos, pulpo y mariscos'
  return 'pescados y mariscos de calidad'
}

export interface RespuestaRapida { id: string; emoji: string; label: string; texto: string }

export function respuestasRapidas(nombre?: string | null, rubro?: string | null, compraMinima?: string | null): RespuestaRapida[] {
  const lugar = (nombre || '').trim()
  const vos = lugar ? lugar : 'ustedes'
  const prod = productos(rubro)
  const min = (compraMinima || '').trim()

  return [
    {
      id: 'catalogo', emoji: '📋', label: 'Catálogo + lista',
      texto: `¡Genial! 🙌 Te paso el catálogo con la lista de precios mayorista actualizada. Trabajamos ${prod}, con cadena de frío cuidada y entrega a domicilio. Si querés, decime qué productos usan más y te confirmo disponibilidad y valor puntual. 🐟`,
    },
    {
      id: 'precios', emoji: '💲', label: 'Cotización',
      texto: `Perfecto 👌 ¿Qué productos te interesan para arrancar? Te armo la cotización con precios mayoristas y disponibilidad de esta semana, sin compromiso.`,
    },
    {
      id: 'cerrar', emoji: '🤝', label: 'Cerrar pedido',
      texto: `¿Arrancamos con un primer pedido? 🚚 Coordinamos el día de entrega y te lo llevamos a domicilio con la cadena de frío cuidada de punta a punta.${min ? ` La compra mínima es ${min}.` : ''} ¿Qué día te queda cómodo?`,
    },
    {
      id: 'minima', emoji: '🛒', label: 'Mínima / entrega',
      texto: `Te cuento: ${min ? `la compra mínima es ${min}, ` : ''}entregamos a domicilio y cuidamos la cadena de frío de punta a punta. Coordinamos el reparto según tu zona. ¿Avanzamos con un pedido de prueba?`,
    },
    {
      id: 'seguimiento', emoji: '🔁', label: 'Seguimiento suave',
      texto: `¡Hola${lugar ? ' ' + vos : ''}! 😊 ¿Pudieron ver lo que les pasé? Sin apuro — cuando quieran les acerco la disponibilidad de la semana con ${prod}. Quedo atento a lo que necesiten. 🐟`,
    },
  ]
}
