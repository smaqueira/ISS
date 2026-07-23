'use client'
import { useEffect, useState } from 'react'

interface Snap { fecha: string; posts: number; followers: number; following: number }

function delta(actual: number, prev: number | undefined) {
  if (prev === undefined) return null
  const d = actual - prev
  return d
}

function Metrica({ label, valor, d }: { label: string; valor: number; d: number | null }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{valor.toLocaleString('es-AR')}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {d !== null && d !== 0 && (
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: d > 0 ? '#22c55e' : '#ef4444' }}>
          {d > 0 ? '▲ +' : '▼ '}{d}
        </div>
      )}
    </div>
  )
}

export default function MiCuentaInstagram() {
  const [snaps, setSnaps] = useState<Snap[] | null>(null)
  const [posts, setPosts] = useState('')
  const [followers, setFollowers] = useState('')
  const [following, setFollowing] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    fetch('/api/instagram/cuenta').then(r => r.json()).then(d => {
      const s: Snap[] = d?.snapshots || []
      setSnaps(s)
      const last = s[s.length - 1]
      if (last) { setPosts(String(last.posts)); setFollowers(String(last.followers)); setFollowing(String(last.following)) }
    }).catch(() => setSnaps([]))
  }, [])

  async function guardar() {
    setSaving(true)
    try {
      const r = await fetch('/api/instagram/cuenta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: Number(posts), followers: Number(followers), following: Number(following) }),
      })
      const d = await r.json()
      setSnaps(d?.snapshots || [])
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      setAbierto(false)
    } finally { setSaving(false) }
  }

  if (snaps === null) return null

  const last = snaps[snaps.length - 1]
  const prev = snaps[snaps.length - 2]
  // Ratio seguidos/seguidores: si seguís a muchos más de los que te siguen, señal de riesgo
  const ratioRiesgo = last && last.followers > 0 && last.following > last.followers * 1.5

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>📊 Mi cuenta de Instagram</span>
        <button onClick={() => setAbierto(v => !v)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem' }}>
          {abierto ? 'Cerrar' : (last ? '✏️ Actualizar' : '+ Cargar')}
        </button>
      </div>

      {last ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <Metrica label="Publicaciones" valor={last.posts} d={delta(last.posts, prev?.posts)} />
          <Metrica label="Seguidores" valor={last.followers} d={delta(last.followers, prev?.followers)} />
          <Metrica label="Seguidos" valor={last.following} d={delta(last.following, prev?.following)} />
        </div>
      ) : (
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          Cargá los números de tu perfil para empezar a seguir la evolución.
        </div>
      )}

      {last && (
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
          Última carga: {new Date(last.fecha).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          {prev && ` · antes: ${new Date(prev.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`}
        </div>
      )}

      {ratioRiesgo && (
        <div style={{ fontSize: '0.74rem', color: '#f59e0b', background: '#f59e0b12', border: '1px solid #f59e0b44', borderRadius: 8, padding: '7px 10px' }}>
          ⚠️ Seguís a bastantes más de los que te siguen. Bajá el ritmo de follows y considerá dejar de seguir a los que no te siguieron de vuelta — ese desbalance es una señal de riesgo para Instagram.
        </div>
      )}

      {abierto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { ph: 'Publicaciones', v: posts, set: setPosts },
              { ph: 'Seguidores', v: followers, set: setFollowers },
              { ph: 'Seguidos', v: following, set: setFollowing },
            ].map(f => (
              <input key={f.ph} type="number" inputMode="numeric" value={f.v} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                style={{ flex: 1, minWidth: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: '0.85rem' }} />
            ))}
          </div>
          <button onClick={guardar} disabled={saving} className="btn btn-primary" style={{ padding: '8px', fontSize: '0.85rem' }}>
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar de hoy'}
          </button>
          <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
            Copiá los 3 números tal cual figuran en tu perfil de Instagram.
          </div>
        </div>
      )}
    </div>
  )
}
