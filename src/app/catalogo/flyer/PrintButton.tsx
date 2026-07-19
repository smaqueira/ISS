'use client'
import { useState } from 'react'

export default function FlyerControls() {
  const [loading, setLoading] = useState(false)

  async function descargarPNG() {
    setLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = document.getElementById('flyer-root')!

      // Reemplazar imgs con fallo por placeholder antes de capturar
      const imgs = el.querySelectorAll<HTMLImageElement>('img')
      imgs.forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          img.style.visibility = 'hidden'
        }
      })

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0D1326',
        logging: false,
        imageTimeout: 3000,
        onclone: (doc) => {
          // En el clon, ocultar los botones flotantes
          doc.querySelectorAll<HTMLElement>('[data-no-print]').forEach(el => { el.style.display = 'none' })
        },
      })
      const link = document.createElement('a')
      link.download = `catalogo-vittomare-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('html2canvas error', e)
      alert('No se pudo generar la imagen. Usá el botón PDF e imprimí como imagen.')
    }
    setLoading(false)
  }

  function descargarPDF() {
    window.print()
  }

  return (
    <div data-no-print style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, display: 'flex', gap: 10 }}>
      <button onClick={descargarPNG} disabled={loading} style={btnStyle('#1a2540', '#7EC8C8')}>
        {loading ? '⏳ Generando...' : '🖼️ PNG'}
      </button>
      <button onClick={descargarPDF} style={btnStyle('#7EC8C8', '#0D1326')}>
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
