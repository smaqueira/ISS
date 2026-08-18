// Configuración del módulo de demanda (se guarda en settings) + aprendizaje.
import { createClient } from '@/lib/supabase/server'

export interface DemandaConfig {
  negocio: string
  rubro: string
  descripcion: string
  ubicacion: string
  zona: string          // zona de cobertura
  radioKm: number
  clientesObjetivo: string[]
  rssUrls: string[]
}

const KEYS = [
  'DEM_NEGOCIO', 'DEM_RUBRO', 'DEM_DESCRIPCION', 'DEM_UBICACION',
  'DEM_ZONA', 'DEM_RADIO_KM', 'DEM_CLIENTES', 'DEM_RSS',
  'COMPANY_NAME', 'COMPANY_DESCRIPTION',
]

const lista = (v?: string) => (v || '').split('\n').map(s => s.trim()).filter(Boolean)

export async function getDemandaConfig(db?: Awaited<ReturnType<typeof createClient>>): Promise<DemandaConfig> {
  const client = db ?? await createClient()
  const { data } = await client.from('settings').select('key, value').in('key', KEYS)
  const s = Object.fromEntries((data || []).map((r: { key: string; value: string }) => [r.key, r.value]))
  return {
    negocio: s.DEM_NEGOCIO || s.COMPANY_NAME || '',
    rubro: s.DEM_RUBRO || '',
    descripcion: s.DEM_DESCRIPCION || s.COMPANY_DESCRIPTION || '',
    ubicacion: s.DEM_UBICACION || '',
    zona: s.DEM_ZONA || '',
    radioKm: Number(s.DEM_RADIO_KM) || 0,
    clientesObjetivo: lista(s.DEM_CLIENTES),
    rssUrls: lista(s.DEM_RSS),
  }
}

// ── APRENDIZAJE ──────────────────────────────────────────────
// Ajusta el score según el feedback histórico del usuario, sin cambiar sus
// criterios: solo prioriza lo que viene aceptando y baja lo que descarta.
export async function ajusteAprendizaje(
  db: Awaited<ReturnType<typeof createClient>>,
  dims: { dimension: string; valor: string | null }[],
): Promise<{ ajuste: number; motivos: string[] }> {
  const activos = dims.filter(d => d.valor)
  if (!activos.length) return { ajuste: 0, motivos: [] }

  const { data } = await db.from('demand_learning').select('dimension, valor, positivos, negativos')
  const filas = (data || []) as { dimension: string; valor: string; positivos: number; negativos: number }[]

  let ajuste = 0
  const motivos: string[] = []
  for (const d of activos) {
    const f = filas.find(x => x.dimension === d.dimension && x.valor.toLowerCase() === (d.valor || '').toLowerCase())
    if (!f) continue
    const total = f.positivos + f.negativos
    if (total < 3) continue // poca muestra: no ajustar todavía
    const ratio = f.positivos / total
    if (ratio >= 0.7) { ajuste += 8; motivos.push(`solés aceptar ${d.valor}`) }
    else if (ratio <= 0.3) { ajuste -= 8; motivos.push(`solés descartar ${d.valor}`) }
  }
  return { ajuste: Math.max(-15, Math.min(15, ajuste)), motivos }
}

export async function registrarFeedback(
  db: Awaited<ReturnType<typeof createClient>>,
  dims: { dimension: string; valor: string | null }[],
  positivo: boolean,
) {
  for (const d of dims) {
    if (!d.valor) continue
    const { data: ex } = await db.from('demand_learning')
      .select('id, positivos, negativos').eq('dimension', d.dimension).eq('valor', d.valor).maybeSingle()
    if (ex) {
      await db.from('demand_learning').update({
        positivos: ex.positivos + (positivo ? 1 : 0),
        negativos: ex.negativos + (positivo ? 0 : 1),
        updated_at: new Date().toISOString(),
      }).eq('id', ex.id)
    } else {
      await db.from('demand_learning').insert({
        dimension: d.dimension, valor: d.valor,
        positivos: positivo ? 1 : 0, negativos: positivo ? 0 : 1,
      })
    }
  }
}
