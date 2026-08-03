'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Prop { rubro?: string; city?: string; tag?: string }
interface Item { id: string; name: string; city: string | null; handle: string; elegido: boolean }

const TAG_LABEL: Record<string, string> = { listo: '✅ listos', sin_datos: '⚠️ sin datos', me_sigue: '💚 me siguen' }

export default function BuscarIgTanda({ rubro, city, tag }: Prop) {
  const router = useRouter()
  const [estado, setEstado] = useState<'idle' | 'buscando' | 'revisar' | 'guardando'>('idle')
  const [progreso, setProgreso] = useState('')
  const [items, setItems] = useState<Item[]>([])

  const filtro = [rubro, city, tag ? (TAG_LABEL[tag] || tag) : ''].filter(Boolean).join(' · ')
  if (!rubro && !city && !tag) return null // solo con un filtro activo, para no barrer toda la base

  async function buscar() {
    setEstado('buscando')
    setItems([])
    setProgreso('Buscando contactos sin Instagram…')
    try {
      const lr = await fetch('/api/clients/sin-ig', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubro, city, tag, limite: 30 }),
      })
      const ld = await lr.json()
      const contactos: { id: string; name: string; city: string | null }[] = ld.contactos || []
      if (contactos.length === 0) { setProgreso(''); setEstado('idle'); alert('No hay contactos sin Instagram en este filtro. 🎉'); return }

      const encontrados: Item[] = []
      for (let i = 0; i < contactos.length; i++) {
        const c = contactos[i]
        setProgreso(`Buscando ${i + 1}/${contactos.length}: ${c.name}`)
        try {
          const r = await fetch('/api/clients/buscar-ig', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: c.name, city: c.city }),
          })
          const d = await r.json()
          if (d.handle) encontrados.push({ id: c.id, name: c.name, city: c.city, handle: d.handle, elegido: true })
        } catch { /* seguir */ }
      }
      setItems(encontrados)
      setEstado('revisar')
      setProgreso('')
    } catch {
      setEstado('idle'); setProgreso('')
      alert('No se pudo hacer la búsqueda en tanda.')
    }
  }

  async function guardar() {
    setEstado('guardando')
    const aGuardar = items.filter(it => it.elegido && it.handle.trim())
    for (const it of aGuardar) {
      await fetch(`/api/clients/${it.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagram: '@' + it.handle.trim().replace(/^@/, '') }),
      })
    }
    setItems([]); setEstado('idle')
    router.refresh()
    alert(`✓ ${aGuardar.length} Instagram guardados.`)
  }

  function set(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  if (estado === 'idle') {
    return (
      <div style={{ marginBottom: 12 }}>
        <button onClick={buscar} className="btn btn-ghost" style={{ fontSize: '0.8rem', borderColor: '#DD2A7B55', color: '#DD2A7B' }}>
          🔎 Buscar Instagram en tanda ({filtro})
        </button>
      </div>
    )
  }

  if (estado === 'buscando') {
    return (
      <div style={{ marginBottom: 12, padding: '10px 14px', border: '1px solid var(--accent)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--accent)' }}>
        ⏳ {progreso}
      </div>
    )
  }

  const elegidos = items.filter(it => it.elegido).length
  return (
    <div style={{ marginBottom: 12, border: '1px solid #DD2A7B55', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
          🔎 {items.length} propuestas — revisá y destildá las que estén mal
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={guardar} disabled={estado === 'guardando' || elegidos === 0} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            {estado === 'guardando' ? 'Guardando…' : `Guardar ${elegidos}`}
          </button>
          <button onClick={() => { setItems([]); setEstado('idle') }} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Cancelar</button>
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>No se encontró Instagram para ninguno. Probá cargarlos a mano.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(it => (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', opacity: it.elegido ? 1 : 0.5 }}>
              <input type="checkbox" checked={it.elegido} onChange={e => set(it.id, { elegido: e.target.checked })} />
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}{it.city ? ` · ${it.city}` : ''}</span>
              <span style={{ color: 'var(--muted)' }}>@</span>
              <input value={it.handle} onChange={e => set(it.id, { handle: e.target.value.replace(/^@/, '') })}
                style={{ width: 150, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: '0.8rem' }} />
              <a href={`https://instagram.com/${it.handle.replace(/^@/, '')}`} target="_blank" rel="noreferrer" title="Ver perfil" style={{ textDecoration: 'none' }}>↗</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
