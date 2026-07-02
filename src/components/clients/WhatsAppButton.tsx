'use client'
import { useState } from 'react'

export default function WhatsAppButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false)

  async function open() {
    setLoading(true)
    const res = await fetch(`/api/clients/${clientId}/whatsapp`)
    const data = await res.json()
    setLoading(false)
    if (data.url) window.open(data.url, '_blank')
  }

  return (
    <button onClick={open} disabled={loading} className="btn btn-primary">
      {loading ? '✍️ Generando mensaje...' : '📱 WhatsApp con IA'}
    </button>
  )
}
