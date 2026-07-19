'use client'
import { useState } from 'react'

async function toDataURL(src: string): Promise<string> {
  const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(src)}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function FlyerControls() {
  const [loading, setLoading] = useState(false)

  async function descargarPNG() {
    setLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = document.getElementById('flyer-root')!

      // Convertir todas las imgs externas a base64 data URLs (mismo origen para html2canvas)
      const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'))
      const origSrcs = imgs.map(img => img.src)
      await Promise.all(imgs.map(async (img) => {
        if (img.src && img.src.startsWith('http')) {
          try {
            img.src = await toDataURL(img.src)
          } catch {
            img.style.visibility = 'hidden'
          }
        }
      }))

      const canvas = await html2canvas(el, {
        scale: 1.5,
        useCORS: false,
        allowTaint: false,
        backgroundColor: '#0D1326',
        logging: false,
      })

      // Restaurar
      imgs.forEach((img, i) => { img.src = origSrcs[i] })

      const link = document.createElement('a')
      link.download = `catalogo-vittomare-${new Date().toISOString().split('T')[0]}.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.92)
      link.click()
    } catch (e) {
      console.error('Error generando imagen:', e)
      alert('Error: ' + (e instanceof Error ? e.message : String(e)))
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, display: 'flex', gap: 10 }}>
      <button onClick={descargarPNG} disabled={loading} style={btnStyle('#1a2540', '#7EC8C8')}>
        {loading ? '⏳ Generando...' : '🖼️ PNG'}
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
