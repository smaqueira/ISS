import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// Reclasifica los contactos marcados "listo" que NO tienen ningún canal para
// contactar (sin teléfono, sin Instagram, sin email): les saca "listo" y les
// pone "sin_datos". GET = contar (preview), POST = aplicar.
async function encontrar(db: Awaited<ReturnType<typeof createClient>>) {
  const malos: { id: string; name: string; tags: string[] }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data } = await db.from('clients')
      .select('id, name, phone, email, instagram, tags')
      .contains('tags', ['listo']).order('id').range(offset, offset + 999)
    if (!data || data.length === 0) break
    for (const c of data as { id: string; name: string; phone: string | null; email: string | null; instagram: string | null; tags: string[] | null }[]) {
      const sinCanal = !(c.phone || '').trim() && !(c.email || '').trim() && !(c.instagram || '').trim()
      if (sinCanal) malos.push({ id: c.id, name: c.name, tags: Array.isArray(c.tags) ? c.tags : [] })
    }
    if (data.length < 1000) break
  }
  return malos
}

export async function GET() {
  const db = await createClient()
  const malos = await encontrar(db)
  return NextResponse.json({ total: malos.length, ejemplos: malos.slice(0, 8).map(m => m.name) })
}

export async function POST() {
  const db = await createClient()
  const malos = await encontrar(db)
  let reparados = 0
  for (const m of malos) {
    const nuevos = [...new Set(m.tags.filter(t => t !== 'listo').concat('sin_datos'))]
    const { error } = await db.from('clients').update({ tags: nuevos }).eq('id', m.id)
    if (!error) reparados++
  }
  return NextResponse.json({ reparados })
}
