'use client'
import { useState } from 'react'

export default function FlyerControls() {
  const [loading, setLoading] = useState(false)

  async function descargarJPG() {
    setLoading(true)
    try {
      const { toJpeg } = await import('html-to-image')
      const el = document.getElementById('flyer-root')!

      const dataUrl = await toJpeg(el, {
        quality: 0.92,
        backgroundColor: '#0D1326',
        fetchRequestInit: { mode: 'cors' },
        filter: (node) => {
          // Excluir los botones de descarga del capture
          if (node instanceof HTMLElement && node.dataset.noPrint) return false
          return true
        },
      })

      const link = document.createElement('a')
      link.download = `catalogo-vittomare-${new Date().toISOString().split('T')[0]}.jpg`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('Error:', e)
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    }
    setLoading(false)
  }

  return (
    <div data-no-print style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, display: 'flex', gap: 10 }}>
      <button onClick={descargarJPG} disabled={loading} style={btnStyle('#1a2540', '#7EC8C8')}>
        {loading ? '⏳ Generando...' : '🖼️ Descargar imagen'}
      </button>
      <button onClick={() => window.print()} style={btnStyle('#7EC8C8', '#0D1326')}>
        📄 PDF
      </button>
    </div>
  )
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg, color, border: `1px solid #7EC8C855`,
    padding: '10px 22px', borderRadius: 30,
    fontWeight: 700, fontSize: 14, cursor: 'pointer',
    fontFamily: 'Montserrat, sans-serif',
    boxShadow: '0 4px 16px #0006',
  }
}
