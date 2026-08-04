'use client'
import { useEffect } from 'react'

export default function PrintButton({ auto }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return
    const t = setTimeout(() => window.print(), 700) // esperar a que rendericen fuentes/logo
    return () => clearTimeout(t)
  }, [auto])

  return (
    <button
      className="no-print"
      onClick={() => window.print()}
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 100,
        background: '#0D1326', color: '#fff', border: 'none',
        padding: '10px 22px', borderRadius: 24, fontWeight: 700, fontSize: 13,
        cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontFamily: 'system-ui, sans-serif',
      }}
    >
      🖨️ Guardar / enviar como PDF
    </button>
  )
}
