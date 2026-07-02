'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteClientButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    router.push('/admin/clients')
  }

  if (confirm) return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={handleDelete} disabled={loading} className="btn" style={{ background: '#ef4444', color: 'white', padding: '6px 14px' }}>
        {loading ? 'Borrando...' : '¿Confirmás?'}
      </button>
      <button onClick={() => setConfirm(false)} className="btn btn-ghost">Cancelar</button>
    </div>
  )

  return (
    <button onClick={() => setConfirm(true)} className="btn btn-ghost" style={{ color: '#ef4444', borderColor: '#ef444440' }}>
      🗑 Borrar
    </button>
  )
}
