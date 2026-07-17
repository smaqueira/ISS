'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function DeleteClientButton({ id, name }: { id: string; name?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    router.push('/admin/clients')
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-ghost" style={{ color: '#ef4444', borderColor: '#ef444440' }}>
        🗑 Borrar
      </button>
      <ConfirmModal
        open={open}
        message={name ? `¿Borrar a "${name}"? Esta acción no se puede deshacer.` : '¿Borrar este registro? Esta acción no se puede deshacer.'}
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
