import { createClient } from '@/lib/supabase/server'
import { elegirPrimerContacto, igHandle } from '@/lib/primer-contacto'
import TermometroEnvio from '@/components/clients/TermometroEnvio'
import InstagramCard from '@/components/clients/InstagramCard'

export const dynamic = 'force-dynamic'

const LIMITE = 40

export default async function InstagramHoyPage() {
  const db = await createClient()

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
    .map(c => ({ ...c, handle: igHandle(c.instagram as string) }))
    .filter(c => c.handle) as { id: string; name: string; rubro: string | null; city: string | null; handle: string }[]

  // Traer qué contactos ya fueron seguidos / likeados (persistido en el historial)
  const ids = items.map(c => c.id)
  const { data: hist } = ids.length
    ? await db.from('client_history').select('client_id, accion').in('client_id', ids).in('accion', ['Instagram seguido', 'Instagram like'])
    : { data: [] as { client_id: string; accion: string }[] }
  const seguidos = new Set((hist || []).filter(h => h.accion === 'Instagram seguido').map(h => h.client_id))
  const likes = new Set((hist || []).filter(h => h.accion === 'Instagram like').map(h => h.client_id))

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

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: '0.85rem' }}>
          No hay contactos con Instagram pendientes. 🎉<br />
          Cargá el @usuario en las fichas o revisá el filtro <strong>&quot;Con Instagram&quot;</strong> en Contactos.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(c => (
            <InstagramCard
              key={c.id}
              id={c.id}
              name={c.name}
              rubro={c.rubro}
              city={c.city}
              handle={c.handle}
              message={elegirPrimerContacto(c.id, (c.name || '').trim())}
              seguidoInicial={seguidos.has(c.id)}
              likeInicial={likes.has(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
