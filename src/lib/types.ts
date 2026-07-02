export type ClientType = 'b2b' | 'b2c'

export type ClientStatus = 'nuevo' | 'contactado' | 'interesado' | 'cliente' | 'inactivo'

export type OrderStatus = 'pendiente' | 'confirmado' | 'preparacion' | 'enviado' | 'entregado'

export type InteractionChannel = 'whatsapp' | 'email' | 'telefono' | 'instagram' | 'web'

export type InteractionType = 'mensaje' | 'llamada' | 'visita' | 'pedido' | 'seguimiento'

export type MessageClassification = 'compra' | 'consulta' | 'reclamo' | 'otro'

export interface Client {
  id: string
  name: string
  type: ClientType
  rubro?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  instagram?: string
  website?: string
  status: ClientStatus
  score: number
  preferred_channel?: InteractionChannel
  tags?: string[]
  notes?: string
  last_contact?: string
  next_followup?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  category: string
  description?: string
  price_retail: number
  price_wholesale: number
  unit: string
  stock?: number
  image_url?: string
  active: boolean
  seasonal?: boolean
  promo_price?: number
  created_at: string
}

export interface Order {
  id: string
  client_id: string
  client?: Client
  type: ClientType
  status: OrderStatus
  total: number
  delivery_date?: string
  delivery_address?: string
  notes?: string
  items?: OrderItem[]
  created_at: string
  updated_at: string
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
  client?: Client
  channel: InteractionChannel
  type: InteractionType
  classification?: MessageClassification
  notes: string
  ai_response?: string
  next_followup?: string
  created_at: string
}

export interface ProspectSearch {
  query: string
  city: string
  radius_km?: number
  rubro?: string
}

export interface DashboardMetrics {
  clients_new: number
  clients_contacted: number
  clients_interested: number
  clients_converted: number
  orders_today_b2b: number
  orders_today_b2c: number
  revenue_today: number
  revenue_month: number
  cold_clients: number
  pending_followups: number
}
