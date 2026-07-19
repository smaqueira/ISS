'use client'
import { useEffect, useState } from 'react'

interface Props {
  clientId: string
  onClose: () => void
}

export default function WhatsAppModal({ clientId, onClose }: Props) {
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [compraMinima, setCompraMinima] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [copiedCat, setCopiedCat] = useState<'flyer'|'lista'|null>(null)

  const CATALOGO_PNG = 'https://app.vittomare.com/catalogo/flyer'
  const LISTA_PRECIOS = 'https://app.vittomare.com/lista-precios'

  function copyCatalogo(tipo: 'flyer'|'lista') {
    const url = tipo === 'flyer' ? CATALOGO_PNG : LISTA_PRECIOS
    navigator.clipboard.writeText(url)
    setCopiedCat(tipo)
    setTimeout(() => setCopiedCat(null), 2000)
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients/${clientId}/whatsapp`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([data, settings]) => {
      if (data.url) {
        const url = new URL(data.url)
        setPhone(url.pathname.replace('/', ''))
        setMessage(data.message || '')
      }
      setCompraMinima(settings.COMPRA_MINIMA || '')
      setLoading(false)
    })
  }, [clientId])

  function copy() {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openWhatsApp() {
    navigator.clipboard.writeText(message)
    window.open(`https://wa.me/${phone}`, '_blank')
    // Log en historial
    fetch(`/api/clients/${clientId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _accion: 'whatsapp_enviado' }),
    })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 16, padding: 24,
          width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>💬 Mensaje de primer contacto</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem' }}>✕</button>
        </div>

        {loading
          ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>✍️ Generando mensaje...</div>
          : <>
              {compraMinima && (
                <div style={{ background: '#22c55e12', border: '1px solid #22c55e44', borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>
                  🛒 Compra mínima: {compraMinima}
                </div>
              )}
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={10}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: '0.85rem', resize: 'vertical',
                  fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
                }}
              />
              {/* Catálogo rápido */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  📲 Enviar catálogo
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => copyCatalogo('flyer')} style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${copiedCat === 'flyer' ? '#22c55e' : 'var(--border)'}`,
                    background: copiedCat === 'flyer' ? '#22c55e18' : 'transparent',
                    color: copiedCat === 'flyer' ? '#22c55e' : 'var(--text)',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  }}>
                    {copiedCat === 'flyer' ? '✓ Copiado' : '🖼️ Flyer catálogo'}
                  </button>
                  <button onClick={() => copyCatalogo('lista')} style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${copiedCat === 'lista' ? '#22c55e' : 'var(--border)'}`,
                    background: copiedCat === 'lista' ? '#22c55e18' : 'transparent',
                    color: copiedCat === 'lista' ? '#22c55e' : 'var(--text)',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  }}>
                    {copiedCat === 'lista' ? '✓ Copiado' : '📋 Lista de precios'}
                  </button>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 6 }}>
                  Copiá el link y pegalo en WhatsApp con Ctrl+V
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                Podés editar el mensaje. Al abrir WhatsApp se copia solo — solo pegá con Ctrl+V.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={copy}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)',
                    cursor: 'pointer', background: 'var(--bg)',
                    color: copied ? '#22c55e' : 'var(--text)', fontWeight: 600, fontSize: '0.85rem',
                  }}
                >
                  {copied ? '✓ Copiado' : '📋 Copiar mensaje'}
                </button>
                <button
                  onClick={openWhatsApp}
                  style={{
                    flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                    cursor: 'pointer', background: '#25D366',
                    color: 'white', fontWeight: 700, fontSize: '0.85rem',
                  }}
                >
                  💬 Abrir WhatsApp
                </button>
              </div>
            </>
        }
      </div>
    </div>
  )
}
