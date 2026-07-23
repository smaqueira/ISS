'use client'
import { useState } from 'react'

interface Props {
  id: string
  name: string
  rubro: string | null
  city: string | null
  handle: string
  message: string
  seguidoInicial?: boolean
  likeInicial?: boolean
  onDone?: (id: string) => void
}

const IG_GRADIENT = 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)'

export default function InstagramCard({ id, name, rubro, city, handle, message, seguidoInicial = false, likeInicial = false, onDone }: Props) {
  const [seguido, setSeguido] = useState(seguidoInicial)
  const [like, setLike] = useState(likeInicial)
  const [copied, setCopied] = useState(false)

  function logAccion(accion: string) {
    fetch(`/api/clients/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _accion: accion }),
    })
  }

  function saltar() {
    logAccion('instagram_salteado')
    onDone?.(id)
  }

  function marcarSeguido(v: boolean) {
    setSeguido(v)
    if (v && !seguidoInicial) {
      logAccion('instagram_seguido')
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ig-seguido'))
    }
  }

  function marcarLike(v: boolean) {
    setLike(v)
    if (v && !likeInicial) logAccion('instagram_like')
  }

  function abrirPerfil() {
    window.open(`https://instagram.com/${handle}`, '_blank')
  }

  function copiar() {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function abrirDM() {
    navigator.clipboard.writeText(message)
    window.open(`https://ig.me/m/${handle}`, '_blank')
    fetch(`/api/clients/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _accion: 'instagram_enviado', _mensaje: message }),
    })
    onDone?.(id)
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{name}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
            {rubro || '—'} · {city || '—'} · <span style={{ color: '#DD2A7B', fontWeight: 600 }}>@{handle}</span>
          </div>
        </div>
        <button onClick={saltar} title="Saltar por ahora (no vuelve a aparecer)" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: 8,
          padding: '4px 10px', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', whiteSpace: 'nowrap',
        }}>
          ⏭️ Saltar
        </button>
      </div>

      {/* Paso 1: perfil + seguir + like */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={abrirPerfil} style={{
          padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: IG_GRADIENT, color: 'white', fontWeight: 700, fontSize: '0.8rem',
        }}>
          1️⃣ Abrir perfil (seguir + like)
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', cursor: seguido ? 'default' : 'pointer', color: seguido ? '#22c55e' : 'var(--muted)' }}>
          <input type="checkbox" checked={seguido} disabled={seguido} onChange={e => marcarSeguido(e.target.checked)} /> Seguido
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', cursor: like ? 'default' : 'pointer', color: like ? '#22c55e' : 'var(--muted)' }}>
          <input type="checkbox" checked={like} disabled={like} onChange={e => marcarLike(e.target.checked)} /> Like
        </label>
      </div>

      {/* Mensaje */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '8px 12px', fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--text)',
      }}>
        {message}
      </div>

      {/* Paso 2: copiar + abrir DM */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={copiar} style={{
          flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)',
          cursor: 'pointer', background: 'var(--bg)', color: copied ? '#22c55e' : 'var(--text)',
          fontWeight: 600, fontSize: '0.82rem',
        }}>
          {copied ? '✓ Copiado' : '📋 Copiar mensaje'}
        </button>
        <button
          onClick={abrirDM}
          disabled={!seguido || !like}
          title={!seguido || !like ? 'Primero seguí y dale like al perfil' : ''}
          style={{
            flex: 2, padding: '9px', borderRadius: 8, border: 'none',
            cursor: !seguido || !like ? 'not-allowed' : 'pointer',
            background: !seguido || !like ? 'var(--border)' : IG_GRADIENT,
            color: 'white', fontWeight: 700, fontSize: '0.82rem', opacity: !seguido || !like ? 0.6 : 1,
          }}
        >
          2️⃣ Abrir DM y marcar enviado
        </button>
      </div>
    </div>
  )
}
