export type ClientType = 'b2b' | 'b2c'
export type ClientStatus =
  | 'prospecto' | 'contactado' | 'sin_respuesta' | 'respondio'
  | 'interesado' | 'negociacion' | 'presupuesto_enviado' | 'esperando_respuesta'
  | 'cliente' | 'cliente_recurrente' | 'no_interesado' | 'perdido'
  | 'nuevo' | 'inactivo' // legacy — kept for backward compatibility
export type OrderStatus = 'pendiente' | 'confirmado' | 'preparacion' | 'enviado' | 'entregado'
export type Channel = 'whatsapp' | 'email' | 'telefono' | 'instagram' | 'web'
export type TaskPriority = 'urgente' | 'importante' | 'rutina'

export interface Client {
  id: string
  name: string
  type: ClientType
  rubro?: string
  phone?: string
  email?: string
  city?: string
  instagram?: string
  website?: string
  status: ClientStatus
  score: number
  channel?: Channel
  empresa?: string
  contacto_nombre?: string
  contacto_cargo?: string
  notes?: string
  tags?: string[]
  last_contact?: string
  next_followup?: string
  created_at: string
  updated_at?: string
  // CRM fields
  fecha_primer_contacto?: string
  proxima_accion?: string
  prioridad?: 'alta' | 'media' | 'baja'
  temperatura?: 'frio' | 'tibio' | 'caliente'
  probabilidad_cierre?: number
  productos_interes?: string
  proveedor_actual?: string
  presupuesto_estimado?: number
  motivo_perdida?: string
  observaciones?: string
}

export interface ClientHistory {
  id: string
  client_id: string
  fecha: string
  usuario: string
  accion: string
  detalle?: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  category: string
  price_retail: number
  price_wholesale: number
  unit: string
  stock?: number
  image_url?: string
  active: boolean
}

export interface Order {
  id: string
  client_id: string
  client?: Client
  type: ClientType
  status: OrderStatus
  total: number
  delivery_date?: string
  notes?: string
  items?: OrderItem[]
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product?: Product
  qty: number
  unit_price: number
  subtotal: number
}

export interface Interaction {
  id: string
  client_id: string
  channel: Channel
  type: string
  notes: string
  ai_generated?: boolean
  created_at: string
}

export interface DailyTask {
  id: string
  priority: TaskPriority
  title: string
  description: string
  client_id?: string
  client_name?: string
  action: string
  payload?: Record<string, unknown>
  done: boolean
  created_at: string
}
