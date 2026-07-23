import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { elegirPrimerContacto, igHandle } from '@/lib/primer-contacto'
import TermometroEnvio from '@/components/clients/TermometroEnvio'
import InstagramList from '@/components/clients/InstagramList'
import SeguimientosHoy from '@/components/clients/SeguimientosHoy'
import MiCuentaInstagram from '@/components/clients/MiCuentaInstagram'

export const dynamic = 'force-dynamic'

const LIMITE = 60
type Row = { id: string; name: string; rubro: string | null; city: string | null; handle: string }

export default async function InstagramHoyPage({ searchParams }: { searchParams: Promise<{ sin?: string; vista?: string }> }) {
  const filters = await searchParams
  const vista = filters.vista === 'me-siguen' ? 'me-siguen' : 'todos'
  const sinRubros = (filters.sin || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const db = await createClient()

  // te_sigue (todos) + salteados
  const [{ data: tsHist }, { data: skipHist }] = await Promise.all([
    db.from('client_history').select('client_id').eq('accion', 'Instagram te sigue'),
    db.from('client_history').select('client_id').eq('accion', 'Instagram salteado'),
  ])
  const teSigueIds = [...new Set((tsHist || []).map(h => h.client_id))]
  const skipSet = new Set((skipHist || []).map(h => h.client_id))

  // "Me siguen" pendientes (para el contador y la vista) — sin filtros de skip/rubro
  const { data: segData } = teSigueIds.length
    ? await db.from('clients').select('id, name, rubro, city, instagram, score').in('id', teSigueIds).is('fecha_primer_contacto', null).order('score', { ascending: false, nullsFirst: false })
    : { data: [] as { id: string; name: string; rubro: string | null; city: string | null; instagram: string | null; score: number | null }[] }
  const seguidores = (segData || [])
    .map(c => ({ ...c, handle: igHandle(c.instagram as string) }))
    .filter(c => c.handle) as Row[]
  const meSiguenCount = seguidores.length

  // Lista principal (vista "todos"): mejores pendientes sin contactar
  const { data } = await db
    .from('clients')
    .select('id, name, rubro, city, instagram, score')
    .not('instagram', 'is', null)
    .neq('instagram', '')
    .is('fecha_primer_contacto', null)
    .order('score', { ascending: false, nullsFirst: false })
    .limit(LIMITE)
  const itemsTodos = (data || [])
    .filter(c => !skipSet.has(c.id))
    .map(c => ({ ...c, handle: igHandle(c.instagram as string) }))
    .filter(c => c.handle) as Row[]

  // Rubros presentes (chips) — solo aplican a la vista "todos"
  const rubroCount: Record<string, number> = {}
  for (const c of itemsTodos) {
    const r = (c.rubro || 'sin rubro').toLowerCase()
    rubroCount[r] = (rubroCount[r] || 0) + 1
  }
  const visiblesTodos = itemsTodos.filter(c => !sinRubros.includes((c.rubro || 'sin rubro').toLowerCase()))

  const lista: Row[] = vista === 'me-siguen' ? seguidores : visiblesTodos

  // Estado seguido/like/te_sigue para la lista mostrada
  const ids = lista.map(c => c.id)
  const { data: hist } = ids.length
    ? await db.from('client_history').select('client_id, accion').in('client_id', ids).in('accion', ['Instagram seguido', 'Instagram like', 'Instagram te sigue'])
    : { data: [] as { client_id: string; accion: string }[] }
  const seguidos = new Set((hist || []).filter(h => h.accion === 'Instagram seguido').map(h => h.client_id))
  const likes = new Set((hist || []).filter(h => h.accion === 'Instagram like').map(h => h.client_id))
  const teSigue = new Set((hist || []).filter(h => h.accion === 'Instagram te sigue').map(h => h.client_id))

  const igItems = lista.map(c => ({
    id: c.id,
    name: c.name,
    rubro: c.rubro,
    city: c.city,
    handle: c.handle,
    message: elegirPrimerContacto(c.id, (c.name || '').trim()),
    seguidoInicial: seguidos.has(c.id),
    likeInicial: likes.has(c.id),
    teSigueInicial: teSigue.has(c.id) || vista === 'me-siguen',
  }))

  const chip = (activo: boolean, color = 'var(--accent)') => ({
    fontSize: '0.78rem', padding: '5px 12px', borderRadius: 20, textDecoration: 'none',
    border: `1px solid ${activo ? color : 'var(--border)'}`,
    background: activo ? `${color}22` : 'transparent',
    color: activo ? color : 'var(--muted)', fontWeight: activo ? 700 : 400,
  })

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 2 }}>📸 Instagram hoy</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Contactos con Instagram sin contactar. Seguí el orden: seguir → like → DM. Pocos y espaciados.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}><MiCuentaInstagram /></div>
      <div style={{ marginBottom: 16 }}><SeguimientosHoy /></div>
      <div style={{ marginBottom: 16 }}><TermometroEnvio canal="instagram" /></div>

      {/* Recordatorio de buenas prácticas */}
      <div style={{ background: '#DD2A7B10', border: '1px solid #DD2A7B44', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        <strong style={{ color: '#DD2A7B' }}>Para no quemar la cuenta:</strong> seguí y dale like antes del DM,
        mandá <strong>pocos por día (5–10)</strong> y espaciados, mensajes cortos y <strong>sin links</strong>.
        El catálogo se los pasás cuando te respondan.
      </div>

      {/* Vista: Todos / Me siguen */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href="/admin/instagram-hoy" style={chip(vista === 'todos')}>Todos</Link>
        <Link href="/admin/instagram-hoy?vista=me-siguen" style={chip(vista === 'me-siguen', '#22c55e')}>✅ Me siguen ({meSiguenCount})</Link>
      </div>

      {/* Chips: ocultar rubros — solo en la vista "todos" */}
      {vista === 'todos' && Object.keys(rubroCount).length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Ocultar rubro:</span>
          {Object.entries(rubroCount).sort((a, b) => b[1] - a[1]).map(([r, n]) => {
            const oculto = sinRubros.includes(r)
            const set = new Set(sinRubros)
            if (oculto) set.delete(r); else set.add(r)
            const val = [...set].join(',')
            const href = val ? `/admin/instagram-hoy?sin=${encodeURIComponent(val)}` : '/admin/instagram-hoy'
            return (
              <Link key={r} href={href} style={{
                fontSize: '0.72rem', padding: '3px 10px', borderRadius: 20, textDecoration: 'none',
                border: `1px solid ${oculto ? '#ef4444' : 'var(--border)'}`,
                background: oculto ? '#ef444418' : 'transparent',
                color: oculto ? '#ef4444' : 'var(--muted)',
              }}>
                {oculto ? '🚫 ' : ''}{r} ({n})
              </Link>
            )
          })}
        </div>
      )}

      {vista === 'me-siguen' && (
        <div style={{ fontSize: '0.78rem', color: '#22c55e', background: '#22c55e10', border: '1px solid #22c55e44', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
          💚 Estos ya te siguen de vuelta — son tus leads más tibios. El DM les llega a la bandeja principal, así que son ideales para contactar.
        </div>
      )}

      {igItems.length > 0 ? (
        <InstagramList items={igItems} />
      ) : vista === 'me-siguen' ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: '0.85rem' }}>
          Todavía nadie te sigue de vuelta sin contactar. Marcá <strong>&quot;Me sigue&quot;</strong> en las tarjetas cuando te sigan. 💚
        </div>
      ) : itemsTodos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: '0.85rem' }}>
          No hay contactos con Instagram pendientes. 🎉<br />
          Cargá el @usuario en las fichas o revisá el filtro <strong>&quot;Con Instagram&quot;</strong> en Contactos.
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: '0.85rem' }}>
          Todos los pendientes son de rubros que ocultaste. Volvé a mostrarlos con los chips de arriba. 👆
        </div>
      )}
    </div>
  )
}
