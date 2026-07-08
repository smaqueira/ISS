// ─── Tipos del módulo Reels IA ───────────────────────────────────────────────

export type ReelStatus = 'borrador' | 'generando' | 'listo' | 'publicado' | 'error'
export type ReelPlatform = 'instagram' | 'tiktok' | 'facebook' | 'todos'
export type ReelObjective = 'venta' | 'branding' | 'educacion' | 'promocion' | 'oferta' | 'novedad'
export type ReelCategory = 'pescados' | 'mariscos' | 'sushi' | 'seleccion' | 'recetas' | 'general'
export type JobStatus = 'esperando' | 'procesando' | 'finalizado' | 'error'
export type AIProvider = 'groq' | 'openai' | 'claude' | 'gemini' | 'kling' | 'pika' | 'runway' | 'wonda'

export interface ReelScene {
  orden: number
  duracion: number         // segundos
  descripcion: string      // qué se ve en pantalla
  texto_pantalla?: string  // texto superpuesto
  camara?: string          // plano sugerido
}

export interface ReelScript {
  gancho: string           // primeros 3 segundos
  guion_completo: string
  escenas: ReelScene[]
  voz_sugerida: string
  musica_sugerida: string
  subtitulos: string[]
  prompt_video: string     // prompt para IA generadora de video
}

export interface Reel {
  id: string
  titulo: string
  descripcion: string
  producto_id?: string
  producto_nombre?: string
  categoria: ReelCategory
  objetivo: ReelObjective
  duracion?: number        // segundos
  estado: ReelStatus
  plataforma: ReelPlatform
  hashtags: string[]
  cta: string
  thumbnail_url?: string
  video_url?: string
  script?: ReelScript
  ai_provider?: AIProvider
  created_at: string
  updated_at: string
  publicado_at?: string
  programado_at?: string
}

export interface RealJob {
  id: string
  reel_id: string
  tipo: 'script' | 'video' | 'thumbnail' | 'publicacion'
  estado: JobStatus
  proveedor: AIProvider
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  created_at: string
  updated_at: string
}

export interface ReelPublication {
  id: string
  reel_id: string
  plataforma: ReelPlatform
  estado: 'programado' | 'publicado' | 'fallido'
  programado_at?: string
  publicado_at?: string
  url_publicacion?: string
  error?: string
}

export interface AutomationRule {
  id: string
  nombre: string
  trigger: 'producto_nuevo' | 'producto_oferta' | 'stock_alto' | 'bajas_ventas'
  objetivo: ReelObjective
  plataforma: ReelPlatform
  activa: boolean
  created_at: string
}

export interface GenerateReelInput {
  producto_nombre: string
  producto_id?: string
  categoria: ReelCategory
  objetivo: ReelObjective
  plataforma: ReelPlatform
  duracion_objetivo?: number
  notas_adicionales?: string
}
