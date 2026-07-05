// Política global: SOLO herramientas con free tier real y funcional.
// Nunca recomendar herramientas de pago sin alternativa gratuita.

export type ContentTask =
  | 'imagen_producto'
  | 'imagen_lifestyle'
  | 'imagen_promocional'
  | 'copy_whatsapp'
  | 'copy_instagram_caption'
  | 'copy_instagram_bio'
  | 'copy_email'
  | 'copy_historia'
  | 'copy_estado_wa'
  | 'hashtags'
  | 'carrusel_textos'
  | 'flyer_diseno'
  | 'presentacion'
  | 'articulo_seo'

export interface AIToolRecommendation {
  herramienta: string
  url: string
  freeTier: string          // qué incluye el free tier
  limitacion: string        // límite real del free tier
  formato: string           // formato de output esperado
  prompt: string            // prompt listo para copiar
  promtpNegativo?: string
  configuracion: Record<string, string>
  alternativa?: {
    herramienta: string
    url: string
    cuando: string
  }
  tips: string[]
}

const TOOL_DB: Record<ContentTask, Omit<AIToolRecommendation, 'prompt' | 'configuracion'>> = {
  imagen_producto: {
    herramienta: 'ChatGPT (DALL-E 3)',
    url: 'https://chat.openai.com',
    freeTier: '2 imágenes/día en plan free',
    limitacion: 'Límite diario bajo, puede saturarse rápido',
    formato: '1024×1024px PNG, descargar y usar directo',
    alternativa: {
      herramienta: 'Canva AI (Magic Media)',
      url: 'https://canva.com',
      cuando: 'Cuando agotás el límite de ChatGPT',
    },
    tips: [
      'Usá "product photography" como primer término del prompt',
      'Pedí "white background" o "dark marble background" para elegancia',
      'Agregá "studio lighting, sharp focus, 8K" para calidad máxima',
    ],
  },
  imagen_lifestyle: {
    herramienta: 'ChatGPT (DALL-E 3)',
    url: 'https://chat.openai.com',
    freeTier: '2 imágenes/día en plan free',
    limitacion: 'Límite diario bajo',
    formato: '1024×1024px o 1792×1024px PNG',
    alternativa: {
      herramienta: 'Adobe Firefly',
      url: 'https://firefly.adobe.com',
      cuando: 'Mejor para escenas con personas (evita problemas de derechos)',
    },
    tips: [
      'Describí la escena completa: lugar, luz, ambiente, personas si aplica',
      'Usá "golden hour lighting" para comida — siempre queda mejor',
      'Pedí aspect ratio 9:16 para stories, 1:1 para feed',
    ],
  },
  imagen_promocional: {
    herramienta: 'Canva AI',
    url: 'https://canva.com',
    freeTier: 'Magic Media: 50 imágenes/mes free',
    limitacion: '50 usos mensuales, marcas de agua en algunos templates',
    formato: 'PNG/JPG descargable, múltiples formatos',
    alternativa: {
      herramienta: 'ChatGPT (DALL-E 3)',
      url: 'https://chat.openai.com',
      cuando: 'Para imágenes más realistas sin texto superpuesto',
    },
    tips: [
      'Canva es mejor que ChatGPT para piezas con texto (precio, CTA)',
      'Usá templates de la categoría "Food" para gastronomía',
      'La fuente Playfair Display queda muy bien para premium',
    ],
  },
  copy_whatsapp: {
    herramienta: 'ChatGPT',
    url: 'https://chat.openai.com',
    freeTier: 'GPT-4o mini ilimitado, GPT-4o con límite diario',
    limitacion: 'GPT-4o tiene límite, GPT-4o mini es libre pero menos potente',
    formato: 'Texto plano, máximo 200 caracteres para el gancho',
    tips: [
      'Siempre pedí "sin emojis excesivos, máximo 2"',
      'El mejor gancho es el precio o el beneficio en la primera línea',
      'Terminá siempre con una sola CTA clara',
    ],
  },
  copy_instagram_caption: {
    herramienta: 'ChatGPT',
    url: 'https://chat.openai.com',
    freeTier: 'GPT-4o mini ilimitado',
    limitacion: 'GPT-4o limitado diariamente',
    formato: 'Texto con saltos de línea, emojis estratégicos, CTA al final',
    tips: [
      'Pedí siempre 3 variantes y elegí la mejor',
      'El caption de Instagram no vende — genera curiosidad o emoción',
      'Usá la primera línea como gancho (es lo que se ve antes del "ver más")',
    ],
  },
  copy_instagram_bio: {
    herramienta: 'ChatGPT',
    url: 'https://chat.openai.com',
    freeTier: 'Ilimitado',
    limitacion: 'Ninguna relevante',
    formato: '150 caracteres máximo, con emoji, sin hashtags',
    tips: [
      'Línea 1: qué hacés. Línea 2: para quién. Línea 3: CTA con link',
      'Incluí siempre la ciudad si es negocio local',
    ],
  },
  copy_email: {
    herramienta: 'ChatGPT',
    url: 'https://chat.openai.com',
    freeTier: 'Ilimitado',
    limitacion: 'Ninguna relevante',
    formato: 'Subject + preheader + body con secciones + CTA',
    tips: [
      'El subject es el 80% del éxito del email — pedí 5 opciones',
      'Body: máximo 150 palabras. La gente no lee, escanea',
    ],
  },
  copy_historia: {
    herramienta: 'ChatGPT',
    url: 'https://chat.openai.com',
    freeTier: 'Ilimitado',
    limitacion: 'Ninguna relevante',
    formato: 'Texto corto (máx 3 líneas) + CTA visual',
    tips: [
      'Las historias duran 24hs — el mensaje tiene que ser urgente o de hoy',
      'Usá preguntas o encuestas para subir el engagement',
    ],
  },
  copy_estado_wa: {
    herramienta: 'ChatGPT',
    url: 'https://chat.openai.com',
    freeTier: 'Ilimitado',
    limitacion: 'Ninguna relevante',
    formato: 'Máximo 700 caracteres, tono directo, 1 emoji',
    tips: [
      'El estado de WhatsApp lo ven tus contactos que ya te conocen — es para retención',
      'Funcionan mejor las fotos reales del producto con texto encima',
    ],
  },
  hashtags: {
    herramienta: 'ChatGPT',
    url: 'https://chat.openai.com',
    freeTier: 'Ilimitado',
    limitacion: 'Ninguna relevante',
    formato: '15-20 hashtags, mezcla de alcance alto/medio/bajo',
    tips: [
      'Pedí hashtags en español + algunos en inglés para gastronomía',
      'Incluí siempre hashtags de ciudad: #BuenosAires #CABA #[barrio]',
      'Evitá hashtags genéricos como #food (demasiada competencia)',
    ],
  },
  carrusel_textos: {
    herramienta: 'ChatGPT',
    url: 'https://chat.openai.com',
    freeTier: 'Ilimitado',
    limitacion: 'Ninguna relevante',
    formato: 'Título por slide + texto corto (máx 2 líneas por slide)',
    tips: [
      'Slide 1: gancho con pregunta o dato sorprendente',
      'Slides 2-7: contenido de valor',
      'Slide final: CTA claro',
    ],
  },
  flyer_diseno: {
    herramienta: 'Canva',
    url: 'https://canva.com',
    freeTier: 'Templates gratuitos ilimitados, sin marca de agua en descarga',
    limitacion: 'Algunas fuentes y elementos son pro',
    formato: 'PNG 1080×1080px para feed, 1080×1920px para stories',
    tips: [
      'Usá los templates de "Oferta" o "Restaurante" como base',
      'Máximo 3 elementos visuales por pieza — menos es más',
      'El precio siempre en tipografía grande y color de contraste',
    ],
  },
  presentacion: {
    herramienta: 'Gamma.app',
    url: 'https://gamma.app',
    freeTier: '400 créditos al registrarse, ~10 presentaciones',
    limitacion: 'Marca de agua de Gamma en el free plan',
    formato: 'Presentación web compartible por link o exportable a PDF',
    alternativa: {
      herramienta: 'Canva Presentaciones',
      url: 'https://canva.com',
      cuando: 'Si agotás créditos de Gamma o necesitás más control visual',
    },
    tips: [
      'Gamma genera toda la presentación con un prompt — muy rápido',
      'Ideal para propuestas comerciales B2B',
    ],
  },
  articulo_seo: {
    herramienta: 'ChatGPT',
    url: 'https://chat.openai.com',
    freeTier: 'Ilimitado',
    limitacion: 'Sin análisis de keywords real — usar Google Trends para validar',
    formato: 'Markdown: H1, H2, H3, párrafos cortos, lista de keywords',
    alternativa: {
      herramienta: 'Google Trends',
      url: 'https://trends.google.com',
      cuando: 'Para validar que la keyword tiene búsquedas reales',
    },
    tips: [
      'Pedí siempre estructura con H1 + 3 H2 + conclusión con CTA',
      'Incluí la ciudad en el título para SEO local',
    ],
  },
}

export function routeToAI(
  task: ContentTask,
  context: {
    negocio: string
    producto: string
    objetivo: string
    tono: 'formal' | 'cercano' | 'urgente' | 'aspiracional'
    canal: string
    audiencia: 'b2c' | 'b2b'
  }
): AIToolRecommendation {
  const base = TOOL_DB[task]
  const prompt = buildPrompt(task, context)
  const configuracion = buildConfig(task, context)

  return { ...base, prompt, configuracion }
}

function buildPrompt(task: ContentTask, ctx: {
  negocio: string
  producto: string
  objetivo: string
  tono: string
  canal: string
  audiencia: string
}): string {
  const tonoMap: Record<string, string> = {
    formal: 'tono profesional y elegante',
    cercano: 'tono cálido y cercano, como si hablaras con un amigo',
    urgente: 'tono directo y urgente, que genere acción inmediata',
    aspiracional: 'tono aspiracional y premium, que evoque deseo',
  }
  const tonoDesc = tonoMap[ctx.tono] || ctx.tono

  switch (task) {
    case 'imagen_producto':
      return `Product photography of ${ctx.producto}, ${ctx.negocio}, dark marble background, professional studio lighting, sharp focus, high contrast, elegant presentation, 8K quality, commercial photography style`

    case 'imagen_lifestyle':
      return `Lifestyle scene featuring ${ctx.producto} from ${ctx.negocio}, Buenos Aires modern kitchen setting, golden hour natural lighting, warm atmosphere, appetizing presentation, photorealistic, cinematic composition`

    case 'imagen_promocional':
      return `Create a promotional image for ${ctx.negocio}. Product: ${ctx.producto}. Style: premium food marketing, dark background, accent lighting, text space on left side, professional commercial photography`

    case 'copy_whatsapp':
      return `Escribí un mensaje de WhatsApp para ${ctx.negocio} promocionando ${ctx.producto}. Objetivo: ${ctx.objetivo}. Audiencia: ${ctx.audiencia === 'b2b' ? 'gastronómicos y restaurantes' : 'familias y consumidores finales en CABA'}. ${tonoDesc}. Máximo 150 palabras. Empezá con el gancho más fuerte. Terminá con una sola CTA clara. Sin links genéricos. Máximo 2 emojis.`

    case 'copy_instagram_caption':
      return `Escribí 3 variantes de caption para Instagram para ${ctx.negocio}. Producto/servicio: ${ctx.producto}. Objetivo: ${ctx.objetivo}. ${tonoDesc}. Estructura: gancho (1 línea) + desarrollo (2-3 líneas) + CTA (1 línea). Cada variante con tono diferente: una emocional, una informativa, una urgente. Incluí 3 emojis estratégicos.`

    case 'copy_historia':
      return `Escribí el texto para una historia de Instagram de ${ctx.negocio} sobre ${ctx.producto}. Objetivo: ${ctx.objetivo}. Máximo 3 líneas de texto visible. ${tonoDesc}. Incluí una pregunta o encuesta para subir el engagement. Indicá qué elemento visual acompañaría la historia.`

    case 'copy_estado_wa':
      return `Escribí el texto para el estado de WhatsApp de ${ctx.negocio} mostrando ${ctx.producto}. ${tonoDesc}. Máximo 100 palabras. Debe generar que alguien quiera escribir para preguntar precio. 1 solo emoji.`

    case 'hashtags':
      return `Generá 20 hashtags para Instagram para una publicación de ${ctx.negocio} sobre ${ctx.producto} en Buenos Aires. Mezcla: 5 muy específicos del nicho, 5 de la categoría general, 5 de Buenos Aires/Argentina, 5 de gastronomía/comida. En español con algunos en inglés. Sin hashtags con más de 10M de publicaciones.`

    case 'carrusel_textos':
      return `Creá el texto para un carrusel de Instagram de 6 slides para ${ctx.negocio}. Tema: ${ctx.producto} — ${ctx.objetivo}. Audiencia: ${ctx.audiencia === 'b2b' ? 'gastronómicos' : 'consumidores finales'}. ${tonoDesc}. Slide 1: gancho con dato o pregunta impactante. Slides 2-5: contenido de valor (tips, beneficios, diferenciadores). Slide 6: CTA claro. Máximo 2 líneas por slide.`

    case 'copy_instagram_bio':
      return `Escribí 3 opciones de bio para Instagram de ${ctx.negocio}. Máximo 150 caracteres cada una. Incluir: qué hace el negocio, para quién, ciudad (CABA/Buenos Aires), CTA con emoji de flecha o teléfono. Tono premium y directo.`

    case 'flyer_diseno':
      return `Instrucciones para crear un flyer en Canva para ${ctx.negocio}. Producto: ${ctx.producto}. Objetivo: ${ctx.objetivo}. Describí: colores recomendados, tipografía, jerarquía visual, qué texto va en grande, qué imagen usar, dónde poner el logo y el CTA. Formato: 1080×1080px para feed de Instagram.`

    case 'presentacion':
      return `Creá una presentación comercial para ${ctx.negocio} ofreciendo ${ctx.producto} a ${ctx.audiencia === 'b2b' ? 'restaurantes y gastronómicos de Buenos Aires' : 'consumidores premium de CABA'}. Estructura: portada → problema que resolvemos → nuestra propuesta → por qué elegirnos → productos disponibles → cómo trabajamos → próximo paso. Tono: ${tonoDesc}. 7 slides máximo.`

    case 'articulo_seo':
      return `Escribí un artículo de blog de 600 palabras para ${ctx.negocio} sobre "${ctx.producto} en Buenos Aires". Optimizado para SEO local. Estructura: H1 con keyword principal, 3 H2 con subtemas, párrafos de máximo 3 líneas, incluí "Buenos Aires", "CABA" y el barrio al menos 3 veces. Terminá con CTA para contactar. Sin relleno, solo contenido útil.`

    default:
      return `Generá contenido para ${ctx.negocio} sobre ${ctx.producto}. Objetivo: ${ctx.objetivo}. ${tonoDesc}.`
  }
}

function buildConfig(task: ContentTask, ctx: { audiencia: string; canal: string }): Record<string, string> {
  const imageConfig = {
    resolucion: '1024×1024px',
    formato: 'PNG',
    aspect_ratio: ctx.canal === 'instagram_stories' ? '9:16' : '1:1',
    calidad: 'hd',
  }
  const copyConfig = {
    idioma: 'Español (Argentina)',
    longitud: task === 'copy_whatsapp' ? 'Máximo 150 palabras' : task === 'copy_historia' ? 'Máximo 3 líneas' : 'Según el formato',
    tono: ctx.audiencia === 'b2b' ? 'Profesional pero cercano' : 'Cálido y apetitoso',
  }

  if (task.startsWith('imagen')) return imageConfig
  return copyConfig
}
