import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { buscarContacto } from '@/lib/demanda/contacto'
import { getDemandaConfig } from '@/lib/demanda/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 45

// Busca teléfono / dirección / web / Instagram / email de la oportunidad y los guarda.
export async function POST(req: NextRequest) {
  if ((await cookies()).get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { id, negocio } = await req.json()
  const db = await createClient()
  const { data: o } = await db.from('demand_opportunities').select('*').eq('id', id).single()
  if (!o) return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 })

  const cfg = await getDemandaConfig(db)
  // El nombre puede venir del usuario (si lo corrige) o inferirse de la señal
  const nombre = (negocio || o.negocio || o.ubicacion || o.titulo || '').toString().slice(0, 80)

  const c = await buscarContacto(nombre, cfg.zona, o.url)

  const patch = {
    negocio: c.negocio || null,
    telefono: c.telefono || null,
    direccion: c.direccion || null,
    web: c.web || null,
    instagram: c.instagram || null,
    email: c.email || null,
    updated_at: new Date().toISOString(),
  }
  const encontrados = [
    c.telefono && 'teléfono', c.instagram && 'Instagram', c.email && 'email',
    c.web && 'web', c.direccion && 'dirección',
  ].filter(Boolean)

  const { data, error } = await db.from('demand_opportunities').update(patch).eq('id', id).select().single()

  // Si el guardado falla (ej. faltan las columnas), igual devolvemos los datos
  // encontrados para que se puedan usar y para ver el motivo real.
  if (error) {
    return NextResponse.json({
      ...o, ...patch, encontrados,
      aviso: `Datos encontrados pero NO guardados: ${error.message}`,
      diagnostico: c.diagnostico,
    })
  }
  return NextResponse.json({ ...data, encontrados, diagnostico: c.diagnostico })
}
