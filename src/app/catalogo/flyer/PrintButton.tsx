'use client'
import { useState } from 'react'

export default function FlyerControls() {
  const [loading, setLoading] = useState(false)

  async function descargarPNG() {
    setLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = document.getElementById('flyer-root')!

      // Reemplazar todas las imgs externas por versiones proxeadas (mismo origen = sin CORS)
      const imgs = el.querySelectorAll<HTMLImageElement>('img')
      const origSrcs: string[] = []
      await Promise.all(Array.from(imgs).map(async (img, i) => {
        origSrcs[i] = img.src
        if (img.src && img.src.startsWith('http')) {
          try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.src)}`
            const res = await fetch(proxyUrl)
            const blob = await res.blob()
            img.src = URL.createObjectURL(blob)
            await new Promise(r => { img.onload = r; img.onerror = r })
          } catch {
            img.style.visibility = 'hidden'
          }
        }
      }))

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        backgroundColor: '#0D1326',
        logging: false,
      })

      // Restaurar srcs originales
      imgs.forEach((img, i) => { img.src = origSrcs[i] })

      const link = document.createElement('a')
      link.download = `catalogo-vittomare-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('Error generando PNG:', e)
      alert('Error al generar la imagen. Intentá de nuevo.')
    }
    setLoading(false)
  }

  function descargarPDF() {
    window.print()
  }

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, display: 'flex', gap: 10 }}>
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
