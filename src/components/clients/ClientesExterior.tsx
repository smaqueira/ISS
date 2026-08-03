'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Item { id: string; name: string; city: string | null; direccion: string }

export default function ClientesExterior() {
  const router = useRouter()
  const [items, setItems] = useState<Item[] | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [texto, setTexto] = useState('')
  const [borrando, setBorrando] = useState(false)

  function cargar() {
    setItems(null)
    fetch('/api/clients/exterior').then(r => r.json()).then(d => {
      const c: Item[] = d.contactos || []
      setItems(c)
      setSel(new Set(c.map(i => i.id))) // todos seleccionados por defecto
    }).catch(() => setItems([]))
  }
  useEffect(() => { cargar() }, [])

  function toggle(id: string) {
    setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function borrar() {
    if (texto.trim().toUpperCase() !== 'BORRAR' || sel.size === 0) return
    setBorrando(true)
    try {
      const r = await fetch('/api/clients/bulk-delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...sel] }),
      })
      const d = await r.json()
      if (!r.ok) { alert('No se pudo borrar: ' + (d?.error || r.status)); return }
      alert(`✓ ${d.deleted} contactos del exterior borrados.`)
      setTexto('')
      cargar()
      router.refresh()
    } finally { setBorrando(false) }
  }

  if (items === null) return <div style={{ color: 'var(--muted)', padding: 20 }}>⏳ Escaneando la base…</div>

  if (items.length === 0) return (
    <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
      ✅ No se encontraron contactos con dirección del exterior. Todo limpio.
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
          🌎 {items.length} contactos del exterior · <span style={{ color: '#ef4444' }}>{sel.size} seleccionados</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--muted)' }}>
          <input type="checkbox" checked={sel.size === items.length} onChange={e => setSel(e.target.checked ? new Set(items.map(i => i.id)) : new Set())} />
          Seleccionar todos
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {items.map(it => (
          <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', opacity: sel.has(it.id) ? 1 : 0.5 }}>
            <input type="checkbox" checked={sel.has(it.id)} onChange={() => toggle(it.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{it.name}{it.city ? ` · ${it.city}` : ''}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>📍 {it.direccion}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ border: '1px solid #ef4444', background: '#ef444412', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8 }}>
          Escribí <strong>BORRAR</strong> para eliminar los {sel.size} seleccionados. Es irreversible.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="BORRAR"
            onKeyDown={e => { if (e.key === 'Enter') borrar() }}
            style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem' }} />
          <button onClick={borrar} disabled={borrando || sel.size === 0 || texto.trim().toUpperCase() !== 'BORRAR'} className="btn btn-primary"
            style={{ fontSize: '0.8rem', background: '#ef4444', opacity: texto.trim().toUpperCase() === 'BORRAR' && sel.size ? 1 : 0.5 }}>
            {borrando ? 'Borrando…' : `Borrar ${sel.size}`}
          </button>
        </div>
      </div>
    </div>
  )
}
