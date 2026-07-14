'use client'
import { useRouter } from 'next/navigation'

export default function BackButton({ fallback = '/admin/clients', label = '← Clientes' }: { fallback?: string; label?: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
    >
      {label}
    </button>
  )
}
