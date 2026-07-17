'use client'
import { useState } from 'react'

export default function WhatsAppButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await fetch(`/api/clients/${clientId}/whatsapp`)
    const data = await res.json()
    setLoading(false)
    if (data.url) {
      const url = new URL(data.url)
      setPhone(url.pathname.replace('/', ''))
      setMessage(data.message || '')
      setOpen(true)
    }
  }

  function copy() {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openWhatsApp() {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <>
      <button onClick={generate} disabled={loading} className="btn btn-primary">
        {loading ? '✍️ Generando...' : '📱 WhatsApp con IA'}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
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
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.2rem' }}>✕</button>
            </div>

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

            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Podés editar el mensaje antes de enviarlo. Copialo y pegalo en WhatsApp.
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
          </div>
        </div>
      )}
    </>
  )
}
