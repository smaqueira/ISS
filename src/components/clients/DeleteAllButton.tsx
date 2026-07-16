'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useIsAdmin } from '@/hooks/useRole'

export default function DeleteAllButton({ total }: { total: number }) {
  const isAdmin = useIsAdmin()
  if (!isAdmin) return null
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    await fetch('/api/clients/delete-all', { method: 'DELETE' })
    router.refresh()
    setLoading(false)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={total === 0}
        style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 8, padding: '6px 14px', fontSize: '0.8rem', cursor: 'pointer', opacity: total === 0 ? 0.4 : 1 }}
      >
        🗑 Borrar todo
      </button>
      <ConfirmModal
        open={open}
        title="Borrar todos los contactos"
        message={`¿Borrar los ${total} contactos? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, borrar todo"
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
