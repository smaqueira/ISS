import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { buscarSenales, hashSenal, esRuidoObvio } from '@/lib/demanda/motor'
import { analizarSenal, calcularScore, type Producto } from '@/lib/demanda/ai'
import { getDemandaConfig, ajusteAprendizaje } from '@/lib/demanda/config'
import { igDeTexto } from '@/lib/demanda/contacto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// Activa el radar: busca señales públicas, las analiza con IA, puntúa y guarda
// solo las que son oportunidades reales (descarta el ruido).
export async function POST() {
  const store = await cookies()
  if (store.get('iss_session')?.value !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const db = await createClient()
  const cfg = await getDemandaConfig(db)

  const { data: prodData } = await db.from('demand_products').select('*').eq('activo', true)
  const productos = (prodData || []) as Producto[]
  if (!productos.length) {
    return NextResponse.json({ error: 'Cargá al menos un producto en "Qué vendo" antes de activar el radar.' }, { status: 400 })
  }

  // 1) Buscar señales en las fuentes activas
  let senales, queries, errores
  try {
    ({ senales, queries, errores } = await buscarSenales({
      productos, zona: cfg.zona, clientes: cfg.clientesObjetivo, rssUrls: cfg.rssUrls, maxQueries: 12,
    }))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error buscando' }, { status: 500 })
  }

  // 2) Descartar ruido evidente (recetas, wikipedia, videos) SIN gastar IA
  const preFiltradas = senales.filter(s => !esRuidoObvio(s))
  const ruidoObvio = senales.length - preFiltradas.length

  // 3) Descartar las que ya tenemos guardadas. Tope 12: cada análisis usa una
  // llamada de IA (~3s) y la función tiene 60s de límite.
  const hashes = preFiltradas.map(hashSenal)
  const { data: yaHay } = await db.from('demand_opportunities').select('hash').in('hash', hashes)
  const conocidos = new Set((yaHay || []).map(r => r.hash))
  const nuevas = preFiltradas.filter(s => !conocidos.has(hashSenal(s))).slice(0, 12)

  // 3) Analizar con IA + puntuar + guardar las que son oportunidad
  let guardadas = 0, descartadas = 0, fallosIA = 0
  const creadas: { titulo: string; score: number }[] = []
  const muestraDescartadas: { titulo: string; por_que: string }[] = []
  let ultimoErrorIA = ''

  // Analizar en paralelo (lotes de 4) para no pasarse del límite de tiempo
  const analisis: { s: typeof nuevas[number]; a: Awaited<ReturnType<typeof analizarSenal>> }[] = []
  for (let i = 0; i < nuevas.length; i += 4) {
    const lote = nuevas.slice(i, i + 4)
    const res = await Promise.all(lote.map(async s => ({
      s, a: await analizarSenal(s, productos, cfg.clientesObjetivo, cfg.zona),
    })))
    analisis.push(...res)
  }

  for (const { s, a } of analisis) {
    // Un fallo de la IA NO es ruido: se cuenta aparte para no ocultar el problema.
    if (a.explicacion?.startsWith('ERROR IA:')) {
      fallosIA++
      ultimoErrorIA = a.explicacion
      continue
    }
    if (a.intencion === 'ninguna') {
      descartadas++
      if (muestraDescartadas.length < 10) {
        muestraDescartadas.push({ titulo: s.titulo.slice(0, 80), por_que: a.explicacion || 'sin intención de compra' })
      }
      continue  // ruido: no se guarda
    }

    const { ajuste } = await ajusteAprendizaje(db, [
      { dimension: 'tipo_comprador', valor: a.tipo_comprador },
      { dimension: 'producto', valor: a.producto_nombre },
      { dimension: 'fuente', valor: s.fuente || null },
    ])

    const pub = s.publicado_en ? new Date(s.publicado_en) : null
    const sc = calcularScore(a, {
      clientesObjetivo: cfg.clientesObjetivo,
      zona: cfg.zona,
      publicadoEn: pub && !isNaN(pub.getTime()) ? pub : null,
      ajusteAprendizaje: ajuste,
    })

    const prod = productos.find(p => p.nombre === a.producto_nombre)
    const accion = sc.score >= 80
      ? 'Contactar hoy y ofrecer disponibilidad.'
      : sc.score >= 60 ? 'Contactar esta semana con propuesta.' : 'Revisar y decidir si vale el contacto.'

    const { error } = await db.from('demand_opportunities').insert({
      fuente: s.fuente, url: s.url || null, titulo: s.titulo,
      fragmento: s.fragmento?.slice(0, 800) || null,
      publicado_en: pub && !isNaN(pub.getTime()) ? pub.toISOString() : null,
      producto_id: prod?.id || null,
      producto_nombre: a.producto_nombre,
      match_pct: a.match_pct,
      intencion: a.intencion,
      score: sc.score,
      score_detalle: sc.detalle,
      explicacion: sc.resumen + (a.explicacion ? ` ${a.explicacion}` : ''),
      accion,
      cantidad: a.cantidad, unidad: a.unidad, ubicacion: a.ubicacion,
      tipo_comprador: a.tipo_comprador, urgencia: a.urgencia,
      presupuesto: a.presupuesto, necesidad: a.necesidad,
      estado: 'nueva',
      // Instagram gratis si la señal viene de un post (sin gastar búsquedas)
      instagram: igDeTexto(s.url) || igDeTexto(s.titulo) || null,
      hash: hashSenal(s),
    })
    if (!error) { guardadas++; creadas.push({ titulo: s.titulo, score: sc.score }) }
  }

  return NextResponse.json({
    ok: true,
    revisadas: senales.length,
    nuevas: nuevas.length,
    oportunidades: guardadas,
    ruido_descartado: descartadas + ruidoObvio,
    ruido_obvio: ruidoObvio,
    queries: queries.length,
    errores,
    fallos_ia: fallosIA,
    error_ia: ultimoErrorIA || undefined,
    top: creadas.sort((a, b) => b.score - a.score).slice(0, 5),
    descartadas_muestra: muestraDescartadas,   // para ver qué está trayendo el buscador
  })
}
