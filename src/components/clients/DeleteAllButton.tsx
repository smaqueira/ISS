"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function DeleteAllButton({ total }: { total: number }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'loading'>('idle')
  const router = useRouter()

  async function handleDelete() {
    setStep('loading')
    await fetch('/api/clients/delete-all', { method: 'DELETE' })
    router.refresh()
    setStep('idle')
  }

  if (step === 'confirm') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>¿Borrar {total} contactos?</span>
        <button onClick={handleDelete} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}>
          Sí, borrar todo
        </button>
        <button onClick={() => setStep('idle')} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setStep('confirm')}
      disabled={total === 0}
      style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', opacity: total === 0 ? 0.4 : 1 }}
    >
      🗑 Borrar todo
    </button>
  )
}
