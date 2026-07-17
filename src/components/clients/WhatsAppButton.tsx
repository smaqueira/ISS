'use client'
import { useState } from 'react'
import WhatsAppModal from './WhatsAppModal'

export default function WhatsAppButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        📱 WhatsApp con IA
      </button>
      {open && <WhatsAppModal clientId={clientId} onClose={() => setOpen(false)} />}
    </>
  )
}
