export type ClientType = 'b2b' | 'b2c'
export type ClientStatus = 'nuevo' | 'contactado' | 'interesado' | 'cliente' | 'inactivo'
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
  notes?: string
  tags?: string[]
  last_contact?: string
  next_followup?: string
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
