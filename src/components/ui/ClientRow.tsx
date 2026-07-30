'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Client, ClientMarcas } from '@/lib/types'
import WhatsAppModal from '@/components/clients/WhatsAppModal'
import { STATUS_LABELS, STATUS_COLORS, STATUS_OPTIONS, PRIORIDAD_OPTIONS, TEMPERATURA_OPTIONS } from '@/lib/crm'

interface Props { client: Client; selected?: boolean; onToggle?: (id: string) => void; marcas?: ClientMarcas }

function isOverdue(date?: string) {
  if (!date) return false
  return new Date(date) < new Date(new Date().toDateString())
}
function isToday(date?: string) {
  if (!date) return false
  return new Date(date).toDateString() === new Date().toDateString()
}
function fechaCorta(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}
// Color según hace cuánto fue el último trato: verde ≤2 días, ámbar ≤7, rojo +7.
function colorRecencia(iso?: string) {
  if (!iso) return '#6b7280'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '#6b7280'
  const dias = (Date.now() - d.getTime()) / 86400000
  return dias <= 2 ? '#22c55e' : dias <= 7 ? '#f59e0b' : '#ef4444'
}

const RESERVED_TAGS = ['listo', 'sin_datos', 'me_sigue', 'ig_seguido', 'ig_like']

export default function ClientRow({ client, selected, onToggle, marcas: marcasProp }: Props) {
  const router = useRouter()
  const [tags, setTags] = useState<string[]>(client.tags || [])
  const [waOpen, setWaOpen] = useState(false)
  const [instagram, setInstagram] = useState<string>(client.instagram || '')
  const [igInput, setIgInput] = useState('')
  const [buscandoIg, setBuscandoIg] = useState(false)
  // Marcas de acciones ya hechas (con fecha). Solo sumamos fechas al marcar en
  // vivo; el resto viene del historial (server) y prevalece al refrescar.
  const [marcasExtra, setMarcasExtra] = useState<ClientMarcas>({})
  const marcas: ClientMarcas = { ...marcasProp, ...marcasExtra }

  async function buscarIg() {
    setBuscandoIg(true)
    try {
      const r = await fetch('/api/clients/buscar-ig', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: client.name, city: client.city }),
      })
      const d = await r.json()
      if (d.handle) setIgInput('@' + d.handle)
      else alert(`No se encontró Instagram para "${client.name}". Cargalo a mano si lo tenés.`)
    } catch { alert('No se pudo buscar.') }
    finally { setBuscandoIg(false) }
  }

  async function guardarInstagram(v: string) {
    const val = v.trim()
    if (!val || val === instagram) return
    setInstagram(val)
    await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instagram: val }),
    })
    router.refresh()
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm(`¿Eliminar a ${client.name}?`)) return
    await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function registrarPedido() {
    const val = prompt(`💵 Pedido de ${client.name} — monto en $:`)
    if (val == null) return
    const total = Number(val.replace(/[^0-9.]/g, ''))
    if (!total) { alert('Poné un monto válido.'); return }
    const r = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: client.id, total, status: 'confirmado' }),
    })
    if (!r.ok) { alert('No se pudo registrar el pedido.'); return }
    const now = new Date().toISOString()
    setMarcasExtra(m => ({ ...m, pedido: now, ultimoFecha: now, ultimoAccion: 'Pedido' }))
    router.refresh()
  }

  async function toggleTag(tag: string) {
    const next = tags.includes(tag)
      ? tags.filter(t => t !== tag)
      : [...tags.filter(t => t !== tag && t !== (tag === 'listo' ? 'sin_datos' : 'listo')), tag]
    setTags(next)
    await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    })
  }

  // Marcas de Instagram (sigo / like / me sigue). Al marcar se registra en el
  // historial (cuenta para el ritmo diario); al desmarcar solo se quita la etiqueta.
  async function toggleIg(tag: string, accion: string) {
    const activo = tags.includes(tag)
    const next = activo ? tags.filter(t => t !== tag) : [...tags, tag]
    setTags(next)
    // Al marcar, registramos la fecha (queda en el historial para siempre).
    if (!activo) {
      const now = new Date().toISOString()
      const campo = accion === 'instagram_seguido' ? 'seguido' : accion === 'instagram_like' ? 'like' : 'sigue'
      const label = accion === 'instagram_seguido' ? 'Seguido IG' : accion === 'instagram_like' ? 'Like IG' : 'Te sigue'
      setMarcasExtra(m => ({ ...m, [campo]: now, ultimoFecha: now, ultimoAccion: label }))
    }
    await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activo ? { tags: next } : { _accion: accion }),
    })
  }

  // Normalizar status legacy para que el <select> siempre tenga una opción válida
  const initialStatus = (client.status === 'nuevo' ? 'prospecto' : client.status === 'inactivo' ? 'perdido' : client.status) as typeof client.status
  const [status, setStatus] = useState(initialStatus)
  const isListo    = tags.includes('listo')
  const isSinDatos = tags.includes('sin_datos')
  const overdue    = isOverdue(client.next_followup)
  const todayFU    = isToday(client.next_followup)
  const alertColor = overdue ? '#ef4444' : todayFU ? '#f59e0b' : null

  async function changeStatus(newStatus: string) {
    if (newStatus === status) return
    setStatus(newStatus as typeof client.status)
    const now = new Date().toISOString()
    setMarcasExtra(m => ({ ...m, estado: now, ultimoFecha: now, ultimoAccion: 'Cambio de estado' }))
    await fetch(`/api/clients/${client.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
  }

  const statusLabel = STATUS_LABELS[status] || status
  const statusColor = STATUS_COLORS[status] || '#6366f1'
  const prioColor   = PRIORIDAD_OPTIONS.find(o => o.value === client.prioridad)?.color
  const tempColor   = TEMPERATURA_OPTIONS.find(o => o.value === client.temperatura)?.color

  const borderColor = alertColor || (isListo ? '#22c55e' : isSinDatos ? '#f59e0b' : 'transparent')
  const igUser = instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?].*$/, '').trim()

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, borderLeft: `3px solid ${borderColor}`, background: selected ? 'var(--accent)10' : undefined }}>
      {onToggle && (
        <input type="checkbox" checked={!!selected} onChange={() => onToggle(client.id)} title="Seleccionar" style={{ cursor: 'pointer', flexShrink: 0, width: 16, height: 16 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {isListo    && <span style={{ fontSize: '0.68rem', background: '#22c55e20', color: '#22c55e', borderRadius: 4, padding: '1px 5px' }}>✓ listo</span>}
          {isSinDatos && <span style={{ fontSize: '0.68rem', background: '#f59e0b20', color: '#f59e0b', borderRadius: 4, padding: '1px 5px' }}>⚠ datos</span>}
          {alertColor && (
            <span style={{ fontSize: '0.68rem', background: alertColor + '20', color: alertColor, borderRadius: 4, padding: '1px 5px' }}>
              {overdue ? '🔴 vencido' : '🟡 hoy'}
            </span>
          )}
          {client.name}
          {client.prioridad && prioColor && (
            <span style={{ fontSize: '0.65rem', background: prioColor + '20', color: prioColor, borderRadius: 4, padding: '1px 5px' }}>
              {client.prioridad}
            </span>
          )}
          {client.temperatura && tempColor && (
            <span style={{ fontSize: '0.65rem', background: tempColor + '20', color: tempColor, borderRadius: 4, padding: '1px 5px' }}>
              {client.temperatura}
            </span>
          )}
          {tags.filter(t => !RESERVED_TAGS.includes(t)).map(t => (
            <span key={t} style={{ fontSize: '0.63rem', background: 'var(--accent)18', color: 'var(--accent)', borderRadius: 4, padding: '1px 5px', border: '1px solid var(--accent)33' }}>
              {t}
            </span>
          ))}
          {marcas.ultimoFecha && (
            <span title={`Último trato: ${marcas.ultimoAccion || 'movimiento'} el ${fechaCorta(marcas.ultimoFecha)}`}
              style={{ fontSize: '0.64rem', fontWeight: 700, background: colorRecencia(marcas.ultimoFecha) + '22', color: colorRecencia(marcas.ultimoFecha), border: `1px solid ${colorRecencia(marcas.ultimoFecha)}55`, borderRadius: 4, padding: '1px 6px' }}>
              🕒 {marcas.ultimoAccion || 'Movimiento'} · {fechaCorta(marcas.ultimoFecha)}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.77rem', color: 'var(--muted)' }}>
          {client.rubro || '—'} · {client.city || '—'}
          {client.phone && <span> · 📱 {client.phone}</span>}
          {instagram && igUser && (
            <span> · <a href={`https://instagram.com/${igUser}`} target="_blank" rel="noreferrer" style={{ color: '#DD2A7B', fontWeight: 600, textDecoration: 'none' }} title="Abrir Instagram">📸 @{igUser}</a></span>
          )}
          {tags.includes('me_sigue') && <span style={{ color: '#22c55e', fontWeight: 600 }} title="Te sigue en Instagram"> · 💚 Te sigue</span>}
          {!client.phone && client.notes && <span style={{ fontStyle: 'italic' }}> · {client.notes}</span>}
        </div>
        {(marcas.contacto || marcas.seguido || marcas.like || marcas.sigue || marcas.pedido) && (
          <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {marcas.contacto && <span title="Último mensaje enviado (WhatsApp/Instagram)">📤 MD {fechaCorta(marcas.contacto)}</span>}
            {marcas.seguido && <span title="Lo seguís en Instagram" style={{ color: '#DD2A7B' }}>👣 {fechaCorta(marcas.seguido)}</span>}
            {marcas.like && <span title="Le diste like en Instagram" style={{ color: '#DD2A7B' }}>❤️ {fechaCorta(marcas.like)}</span>}
            {marcas.sigue && <span title="Te sigue en Instagram" style={{ color: '#22c55e' }}>💚 {fechaCorta(marcas.sigue)}</span>}
            {marcas.pedido && <span title="Último pedido registrado" style={{ color: '#22c55e', fontWeight: 700 }}>💵 {fechaCorta(marcas.pedido)}</span>}
          </div>
        )}
      </div>

      <span className={`badge badge-${client.type}`}>{client.type.toUpperCase()}</span>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <select
          value={status}
          onChange={e => changeStatus(e.target.value)}
          style={{ padding: '2px 6px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44`, cursor: 'pointer', outline: 'none' }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {marcas.estado && (
          <span style={{ fontSize: '0.58rem', color: 'var(--muted)' }} title="Fecha del último cambio de estado">desde {fechaCorta(marcas.estado)}</span>
        )}
      </div>

      <div style={{ textAlign: 'right', minWidth: 50 }}>
        <div style={{ fontWeight: 700, color: client.score >= 75 ? '#22c55e' : client.score >= 50 ? '#eab308' : '#ef4444' }}>
          {client.score}
        </div>
        <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>score</div>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => toggleTag('listo')} title="Listo para contactar"
          style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${isListo ? '#22c55e' : 'var(--border)'}`, background: isListo ? '#22c55e20' : 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>
          ✅
        </button>
        <button onClick={() => toggleTag('sin_datos')} title="Faltan datos"
          style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${isSinDatos ? '#f59e0b' : 'var(--border)'}`, background: isSinDatos ? '#f59e0b20' : 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>
          ⚠️
        </button>
        {instagram ? ([
          { tag: 'ig_seguido', accion: 'instagram_seguido',  icon: '👣', title: 'Lo sigo en Instagram', color: '#DD2A7B' },
          { tag: 'ig_like',    accion: 'instagram_like',     icon: '❤️', title: 'Le di like',           color: '#DD2A7B' },
          { tag: 'me_sigue',   accion: 'instagram_te_sigue', icon: '💚', title: 'Me sigue',             color: '#22c55e' },
        ].map(m => (
          <button key={m.tag} onClick={() => toggleIg(m.tag, m.accion)} title={m.title}
            style={{
              padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem',
              border: `1px solid ${tags.includes(m.tag) ? m.color : 'var(--border)'}`,
              background: tags.includes(m.tag) ? `${m.color}20` : 'transparent',
              opacity: tags.includes(m.tag) ? 1 : 0.45,
            }}>
            {m.icon}
          </button>
        ))) : (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              value={igInput}
              onChange={e => setIgInput(e.target.value)}
              placeholder="@ IG"
              title="Pegá el @ o buscalo con 🔎, y Enter para guardar"
              onKeyDown={e => { if (e.key === 'Enter') guardarInstagram(igInput) }}
              onBlur={() => { if (igInput.trim()) guardarInstagram(igInput) }}
              style={{ width: 84, background: 'var(--bg)', border: '1px solid #DD2A7B55', borderRadius: 6, padding: '5px 8px', color: 'var(--text)', fontSize: '0.75rem' }}
            />
            <button onClick={buscarIg} disabled={buscandoIg} title="Buscar Instagram en Google (Serper)"
              style={{ padding: '5px 7px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>
              {buscandoIg ? '⏳' : '🔎'}
            </button>
          </div>
        )}
        {client.phone && (
          <>
            <button onClick={() => setWaOpen(true)} className="btn btn-ghost" style={{ padding: '6px 10px' }} title="Enviar WhatsApp">
              📱
            </button>
            {waOpen && <WhatsAppModal clientId={client.id} onClose={() => setWaOpen(false)} />}
          </>
        )}
        <button onClick={registrarPedido} className="btn btn-ghost" style={{ padding: '6px 10px', color: '#22c55e' }} title="Registrar pedido">
          💵
        </button>
        <button onClick={handleDelete} className="btn btn-ghost" style={{ padding: '6px 10px', color: '#ef4444', opacity: 0.6 }} title="Eliminar">
          🗑️
        </button>
        <Link href={`/admin/clients/${client.id}`} className="btn btn-ghost" style={{ padding: '6px 10px' }}>→</Link>
      </div>
    </div>
  )
}
