import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { elegirPrimerContacto, igHandle } from '@/lib/primer-contacto'
import TermometroEnvio from '@/components/clients/TermometroEnvio'
import InstagramList from '@/components/clients/InstagramList'
import SeguimientosHoy from '@/components/clients/SeguimientosHoy'
import MiCuentaInstagram from '@/components/clients/MiCuentaInstagram'

export const dynamic = 'force-dynamic'

const LIMITE = 60
const SELECT = 'id, name, rubro, city, instagram, score, tags'
type Row = { id: string; name: string; rubro: string | null; city: string | null; handle: string; tags: string[] }

function toRows(data: unknown[] | null): Row[] {
  return (data || [])
    .map(c => {
      const r = c as { id: string; name: string; rubro: string | null; city: string | null; instagram: string | null; tags: string[] | null }
      return { ...r, handle: igHandle(r.instagram), tags: Array.isArray(r.tags) ? r.tags : [] }
    })
    .filter(r => r.handle) as Row[]
}

export default async function InstagramHoyPage({ searchParams }: { searchParams: Promise<{ sin?: string; vista?: string }> }) {
  const filters = await searchParams
  const vista = filters.vista === 'me-siguen' ? 'me-siguen' : 'todos'
  const sinRubros = (filters.sin || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const db = await createClient()

  // Salteados → se excluyen del tablero
  const { data: skipHist } = await db.from('client_history').select('client_id').eq('accion', 'Instagram salteado')
  const skipSet = new Set((skipHist || []).map(h => h.client_id))

  // "Me siguen" pendientes (contador + vista) — por etiqueta, sin filtros de skip/rubro
  const { data: segData } = await db
    .from('clients').select(SELECT)
    .contains('tags', ['me_sigue'])
    .is('fecha_primer_contacto', null)
    .order('score', { ascending: false, nullsFirst: false })
  const seguidores = toRows(segData)
  const meSiguenCount = seguidores.length

  // Lista principal: mejores pendientes sin contactar
  const { data } = await db
    .from('clients').select(SELECT)
    .not('instagram', 'is', null)
    .neq('instagram', '')
    .is('fecha_primer_contacto', null)
    .order('score', { ascending: false, nullsFirst: false })
    .limit(LIMITE)
  const itemsTodos = toRows(data).filter(c => !skipSet.has(c.id))

  // Rubros presentes (chips) — solo en la vista "todos"
  const rubroCount: Record<string, number> = {}
  for (const c of itemsTodos) {
    const r = (c.rubro || 'sin rubro').toLowerCase()
    rubroCount[r] = (rubroCount[r] || 0) + 1
  }
  const visiblesTodos = itemsTodos.filter(c => !sinRubros.includes((c.rubro || 'sin rubro').toLowerCase()))

  const lista: Row[] = vista === 'me-siguen' ? seguidores : visiblesTodos

  const igItems = lista.map(c => ({
    id: c.id,
    name: c.name,
    rubro: c.rubro,
    city: c.city,
    handle: c.handle,
    message: elegirPrimerContacto(c.id, (c.name || '').trim()),
    seguidoInicial: c.tags.includes('ig_seguido'),
    likeInicial: c.tags.includes('ig_like'),
    teSigueInicial: c.tags.includes('me_sigue'),
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
          Todavía nadie te sigue de vuelta sin contactar. Marcá <strong>&quot;Me sigue&quot;</strong> cuando te sigan. 💚
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
