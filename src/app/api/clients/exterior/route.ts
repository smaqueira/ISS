import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { esDeArgentina, paisExtranjero, direccionDeNotas } from '@/lib/prospecting/geo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

// Detecta (no borra) contactos ya cargados cuya dirección es del exterior:
// tiene un país extranjero Y no tiene marcador argentino. Paginado.
export async function GET() {
  const db = await createClient()
  const sospechosos: { id: string; name: string; city: string | null; direccion: string }[] = []

  for (let offset = 0; ; offset += 1000) {
    const { data } = await db.from('clients').select('id, name, city, notes').order('id').range(offset, offset + 999)
    if (!data || data.length === 0) break
    for (const c of data as { id: string; name: string; city: string | null; notes: string | null }[]) {
      const dir = direccionDeNotas(c.notes)
      if (dir && paisExtranjero(dir) && !esDeArgentina(dir)) {
        sospechosos.push({ id: c.id, name: c.name, city: c.city, direccion: dir.slice(0, 120) })
      }
    }
    if (data.length < 1000) break
  }

  return NextResponse.json({ total: sospechosos.length, contactos: sospechosos })
}
