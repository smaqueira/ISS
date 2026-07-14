'use client'
import { useEffect } from 'react'

interface Props {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open, title = 'Confirmar borrado', message,
  confirmLabel = 'Sí, borrar', loading = false,
  onConfirm, onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '28px 28px 24px',
          maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.18s ease',
        }}
      >
        {/* Icono */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, marginBottom: 16,
          background: '#ef444418', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem',
        }}>
          🗑️
        </div>

        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 24, lineHeight: 1.5 }}>
          {message}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: loading ? '#ef444470' : '#ef4444',
              color: '#fff', cursor: loading ? 'default' : 'pointer',
              fontSize: '0.85rem', fontWeight: 600,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Borrando...' : confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}
