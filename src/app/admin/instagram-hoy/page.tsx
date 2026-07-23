import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { elegirPrimerContacto, igHandle } from '@/lib/primer-contacto'
import TermometroEnvio from '@/components/clients/TermometroEnvio'
import InstagramList from '@/components/clients/InstagramList'

export const dynamic = 'force-dynamic'

const LIMITE = 60

export default async function InstagramHoyPage({ searchParams }: { searchParams: Promise<{ sin?: string }> }) {
  const filters = await searchParams
  const sinRubros = (filters.sin || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const db = await createClient()

  // Contactos ya salteados → se excluyen del tablero
  const { data: skipHist } = await db.from('client_history').select('client_id').eq('accion', 'Instagram salteado')
  const skipSet = new Set((skipHist || []).map(h => h.client_id))

  // Contactos con Instagram y todavía sin primer contacto, mejores primero.
  const { data } = await db
    .from('clients')
    .select('id, name, rubro, city, instagram, score')
    .not('instagram', 'is', null)
    .neq('instagram', '')
    .is('fecha_primer_contacto', null)
    .order('score', { ascending: false, nullsFirst: false })
    .limit(LIMITE)

  const items = (data || [])
    .filter(c => !skipSet.has(c.id))
    .map(c => ({ ...c, handle: igHandle(c.instagram as string) }))
    .filter(c => c.handle) as { id: string; name: string; rubro: string | null; city: string | null; handle: string }[]

  // Rubros presentes (para los chips) + lista filtrada por los rubros ocultos
  const rubroCount: Record<string, number> = {}
  for (const c of items) {
    const r = (c.rubro || 'sin rubro').toLowerCase()
    rubroCount[r] = (rubroCount[r] || 0) + 1
  }
  const visibles = items.filter(c => !sinRubros.includes((c.rubro || 'sin rubro').toLowerCase()))

  // Traer qué contactos ya fueron seguidos / likeados (persistido en el historial)
  const ids = visibles.map(c => c.id)
  const { data: hist } = ids.length
    ? await db.from('client_history').select('client_id, accion').in('client_id', ids).in('accion', ['Instagram seguido', 'Instagram like'])
    : { data: [] as { client_id: string; accion: string }[] }
  const seguidos = new Set((hist || []).filter(h => h.accion === 'Instagram seguido').map(h => h.client_id))
  const likes = new Set((hist || []).filter(h => h.accion === 'Instagram like').map(h => h.client_id))

  const igItems = visibles.map(c => ({
    id: c.id,
    name: c.name,
    rubro: c.rubro,
    city: c.city,
    handle: c.handle,
    message: elegirPrimerContacto(c.id, (c.name || '').trim()),
    seguidoInicial: seguidos.has(c.id),
    likeInicial: likes.has(c.id),
  }))

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 2 }}>📸 Instagram hoy</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Contactos con Instagram sin contactar. Seguí el orden: seguir → like → DM. Pocos y espaciados.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <TermometroEnvio canal="instagram" />
      </div>

      {/* Recordatorio de buenas prácticas */}
      <div style={{ background: '#DD2A7B10', border: '1px solid #DD2A7B44', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        <strong style={{ color: '#DD2A7B' }}>Para no quemar la cuenta:</strong> seguí y dale like antes del DM,
        mandá <strong>pocos por día (5–10)</strong> y espaciados, mensajes cortos y <strong>sin links</strong>.
        El catálogo se los pasás cuando te respondan.
      </div>

      {/* Chips: ocultar rubros (ej: hoteles) de un clic */}
      {Object.keys(rubroCount).length > 1 && (
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

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: '0.85rem' }}>
          No hay contactos con Instagram pendientes. 🎉<br />
          Cargá el @usuario en las fichas o revisá el filtro <strong>&quot;Con Instagram&quot;</strong> en Contactos.
        </div>
      ) : igItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: '0.85rem' }}>
          Todos los contactos pendientes son de rubros que ocultaste. Volvé a mostrarlos con los chips de arriba. 👆
        </div>
      ) : (
        <InstagramList items={igItems} />
      )}
    </div>
  )
}
