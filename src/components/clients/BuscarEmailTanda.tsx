'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Prop { rubro?: string; city?: string }
interface Item { id: string; name: string; city: string | null; email: string; elegido: boolean }

export default function BuscarEmailTanda({ rubro, city }: Prop) {
  const router = useRouter()
  const [estado, setEstado] = useState<'idle' | 'buscando' | 'revisar' | 'guardando'>('idle')
  const [progreso, setProgreso] = useState('')
  const [items, setItems] = useState<Item[]>([])

  const filtro = [rubro, city].filter(Boolean).join(' · ')
  if (!rubro && !city) return null // solo con un filtro activo, para no barrer toda la base

  async function buscar() {
    setEstado('buscando')
    setItems([])
    setProgreso('Buscando contactos con web y sin email…')
    try {
      const lr = await fetch('/api/clients/sin-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubro, city, limite: 12 }),
      })
      const ld = await lr.json()
      const contactos: { id: string; name: string; city: string | null; website: string | null }[] = ld.contactos || []
      if (contactos.length === 0) { setProgreso(''); setEstado('idle'); alert('No hay contactos con web y sin email en este filtro. Cargá webs o probá otro rubro/zona.'); return }

      const encontrados: Item[] = []
      for (let i = 0; i < contactos.length; i++) {
        const c = contactos[i]
        setProgreso(`Buscando ${i + 1}/${contactos.length}: ${c.name}`)
        try {
          const r = await fetch('/api/clients/buscar-email', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: c.name, city: c.city, website: c.website }),
          })
          const d = await r.json()
          if (d.email) encontrados.push({ id: c.id, name: c.name, city: c.city, email: d.email, elegido: true })
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
    const aGuardar = items.filter(it => it.elegido && it.email.trim())
    for (const it of aGuardar) {
      await fetch(`/api/clients/${it.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: it.email.trim() }),
      })
    }
    setItems([]); setEstado('idle')
    router.refresh()
    alert(`✓ ${aGuardar.length} emails guardados.`)
  }

  function set(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  if (estado === 'idle') {
    return (
      <div style={{ marginBottom: 12 }}>
        <button onClick={buscar} className="btn btn-ghost" style={{ fontSize: '0.8rem', borderColor: '#7EC8C855', color: '#7EC8C8' }}>
          ✉️ Buscar emails en tanda ({filtro})
        </button>
      </div>
    )
  }

  if (estado === 'buscando') {
    return (
      <div style={{ marginBottom: 12, padding: '10px 14px', border: '1px solid var(--accent)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--accent)' }}>
        ⏳ {progreso} <span style={{ color: 'var(--muted)' }}>· puede tardar (abre webs + Google)</span>
      </div>
    )
  }

  const elegidos = items.filter(it => it.elegido).length
  return (
    <div style={{ marginBottom: 12, border: '1px solid #7EC8C855', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
          ✉️ {items.length} emails encontrados — revisá y destildá los que estén mal
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={guardar} disabled={estado === 'guardando' || elegidos === 0} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            {estado === 'guardando' ? 'Guardando…' : `Guardar ${elegidos}`}
          </button>
          <button onClick={() => { setItems([]); setEstado('idle') }} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Cancelar</button>
        </div>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>No se encontró email para ninguno. En gastronomía es común (usan WhatsApp/IG).</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(it => (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', opacity: it.elegido ? 1 : 0.5 }}>
              <input type="checkbox" checked={it.elegido} onChange={e => set(it.id, { elegido: e.target.checked })} />
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}{it.city ? ` · ${it.city}` : ''}</span>
              <input value={it.email} onChange={e => set(it.id, { email: e.target.value })}
                style={{ width: 220, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: '0.8rem' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
