'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ClientRow from '@/components/ui/ClientRow'
import type { Client, ClientMarcas } from '@/lib/types'

export default function BulkClients({ clients, isAdmin, marcas }: { clients: Client[]; isAdmin: boolean; marcas?: Record<string, ClientMarcas> }) {
  const router = useRouter()
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [confirmando, setConfirmando] = useState(false)
  const [texto, setTexto] = useState('')
  const [borrando, setBorrando] = useState(false)

  function toggle(id: string) {
    setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleTodos() {
    setSel(prev => prev.size === clients.length ? new Set() : new Set(clients.map(c => c.id)))
  }

  async function borrar() {
    if (texto.trim().toUpperCase() !== 'BORRAR') return
    setBorrando(true)
    try {
      const r = await fetch('/api/clients/bulk-delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...sel] }),
      })
      const d = await r.json()
      if (!r.ok) { alert('No se pudo borrar: ' + (d?.error || r.status)); return }
      setSel(new Set()); setConfirmando(false); setTexto('')
      router.refresh()
      alert(`✓ ${d.deleted} contactos borrados.`)
    } finally { setBorrando(false) }
  }

  return (
    <div>
      {isAdmin && (
        <div style={{ position: 'sticky', top: 0, zIndex: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: sel.size ? '10px 12px' : '6px 12px', marginBottom: 8, borderRadius: 10, background: sel.size ? '#ef444412' : 'transparent', border: sel.size ? '1px solid #ef444455' : '1px solid transparent' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer', color: 'var(--muted)' }}>
            <input type="checkbox" checked={sel.size > 0 && sel.size === clients.length} onChange={toggleTodos} />
            Seleccionar todos ({clients.length})
          </label>
          {sel.size > 0 && (
            <>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{sel.size} seleccionados</span>
              <button onClick={() => setConfirmando(true)} className="btn btn-ghost" style={{ fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef444455', marginLeft: 'auto' }}>
                🗑️ Borrar seleccionados
              </button>
            </>
          )}
        </div>
      )}

      {confirmando && (
        <div style={{ border: '1px solid #ef4444', background: '#ef444412', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>
            ⚠️ Vas a borrar {sel.size} contactos. Es irreversible.
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8 }}>
            Escribí <strong>BORRAR</strong> para confirmar:
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="BORRAR"
              onKeyDown={e => { if (e.key === 'Enter') borrar() }}
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem' }} />
            <button onClick={borrar} disabled={borrando || texto.trim().toUpperCase() !== 'BORRAR'} className="btn btn-primary"
              style={{ fontSize: '0.8rem', background: '#ef4444', opacity: texto.trim().toUpperCase() === 'BORRAR' ? 1 : 0.5 }}>
              {borrando ? 'Borrando…' : `Borrar ${sel.size}`}
            </button>
            <button onClick={() => { setConfirmando(false); setTexto('') }} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Cancelar</button>
          </div>
        </div>
      )}

      {clients.map(c => (
        <ClientRow key={c.id} client={c} selected={sel.has(c.id)} onToggle={isAdmin ? toggle : undefined} marcas={marcas?.[c.id]} />
      ))}
    </div>
  )
}
