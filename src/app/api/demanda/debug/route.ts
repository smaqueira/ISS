import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { construirQueries, buscarSenales, hashSenal } from '@/lib/demanda/motor'
import { getDemandaConfig } from '@/lib/demanda/config'
import { getSerperKeys } from '@/lib/link-hunt'
import { analizarSenal, type Producto } from '@/lib/demanda/ai'

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

  // ¿Cuántas ya están guardadas? (dedup) — si todas son "conocidas", no se analiza nada
  const hashes = senales.map(hashSenal)
  const { data: yaHay } = await db.from('demand_opportunities').select('hash').in('hash', hashes)
  const { count: totalGuardadas } = await db.from('demand_opportunities').select('*', { count: 'exact', head: true })
  diag.ya_conocidas = (yaHay || []).length
  diag.sin_ver_antes = senales.length - (yaHay || []).length
  diag.filas_en_tabla = totalGuardadas ?? 0

  // Modelos de Groq realmente disponibles con la key actual
  try {
    const { getSetting } = await import('@/lib/settings')
    const gk = (await getSetting('GROQ_API_KEY_1')) || (await getSetting('GROQ_API_KEY'))
    if (gk) {
      const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${gk}` } })
      const j = await res.json()
      diag.groq_modelos = (j.data || []).map((m: { id: string }) => m.id).sort()
    }
  } catch (e) { diag.groq_modelos_error = String(e).slice(0, 120) }

  // PRUEBA DIRECTA DE LA IA sobre la primera señal (para ver si responde)
  if (senales.length) {
    const a = await analizarSenal(senales[0], productos, cfg.clientesObjetivo, cfg.zona)
    diag.prueba_ia = { sobre: senales[0].titulo.slice(0, 70), resultado: a }
  }

  return NextResponse.json(diag)
}
