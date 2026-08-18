import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { construirQueries, buscarSenales } from '@/lib/demanda/motor'
import { getDemandaConfig } from '@/lib/demanda/config'
import { getSerperKeys } from '@/lib/link-hunt'
import type { Producto } from '@/lib/demanda/ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 45

// Diagnóstico del radar: muestra config, productos, queries y resultados CRUDOS
// (sin pasar por la IA). Sirve para ver dónde se corta la cadena.
export async function GET() {
  if ((await cookies()).get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const db = await createClient()
  const cfg = await getDemandaConfig(db)
  const { data } = await db.from('demand_products').select('*').eq('activo', true)
  const productos = (data || []) as Producto[]
  const keys = await getSerperKeys()

  const diag: Record<string, unknown> = {
    serper_configurado: keys.length > 0,
    serper_keys: keys.length,
    productos_activos: productos.length,
    productos: productos.map(p => ({ nombre: p.nombre, keywords: p.keywords })),
    config: { zona: cfg.zona, clientes: cfg.clientesObjetivo, negocio: cfg.negocio },
  }

  if (!keys.length) { diag.problema = 'Falta SERPER_API_KEY_1 en Configuración'; return NextResponse.json(diag) }
  if (!productos.length) { diag.problema = 'No hay productos activos cargados en "Qué vendo"'; return NextResponse.json(diag) }

  diag.queries = construirQueries(productos, cfg.zona, cfg.clientesObjetivo).slice(0, 12)

  // Sonda directa a Serper: reporta el status REAL (searchSerper se traga los errores)
  const sonda: Record<string, unknown>[] = []
  for (const k of keys) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': k, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'busco proveedor langostinos', gl: 'ar', hl: 'es', num: 10 }),
      })
      const txt = await res.text()
      let organicos = 0
      try { organicos = (JSON.parse(txt).organic || []).length } catch { /* no json */ }
      sonda.push({
        key: k.slice(0, 6) + '…',
        status: res.status,
        ok: res.ok,
        organicos,
        respuesta: res.ok ? undefined : txt.slice(0, 200),
      })
    } catch (e) {
      sonda.push({ key: k.slice(0, 6) + '…', error: String(e).slice(0, 160) })
    }
  }
  diag.sonda_serper = sonda

  const { senales, errores } = await buscarSenales({
    productos, zona: cfg.zona, clientes: cfg.clientesObjetivo, maxQueries: 6,
  })
  diag.resultados_crudos = senales.length
  diag.errores = errores
  diag.muestra = senales.slice(0, 8).map(s => ({ titulo: s.titulo, url: s.url, fragmento: s.fragmento?.slice(0, 150) }))
  if (!senales.length) diag.problema = 'El buscador no devolvió resultados para estas consultas'

  return NextResponse.json(diag)
}
