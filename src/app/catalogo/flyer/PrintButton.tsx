'use client'
import { useState } from 'react'

export default function FlyerControls() {
  const [loading, setLoading] = useState(false)

  async function descargarJPG() {
    setLoading(true)
    try {
      const { toJpeg } = await import('html-to-image')
      const el = document.getElementById('flyer-root')!

      // Esperar a que las fuentes terminen de cargar para que el texto no
      // se capture con la tipografía de fallback.
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready } catch {}
      }

      // Capturamos con el tamaño exacto del flyer y a 2x para nitidez.
      // Fijar width/height evita que un layout a medio asentar recorte la
      // imagen (el clásico "sale cortado" abajo o a la derecha).
      const dataUrl = await toJpeg(el, {
        quality: 0.95,
        pixelRatio: 2,
        width: el.offsetWidth,
        height: el.offsetHeight,
        backgroundColor: '#0D1326',
        fetchRequestInit: { mode: 'cors' },
        style: {
          // Neutralizar cualquier transform de escalado en pantalla.
          transform: 'none',
          margin: '0',
        },
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

  function imprimirPDF() {
    const el = document.getElementById('flyer-root')
    if (!el) { window.print(); return }
    // El flyer es más ancho (900px) que una hoja A4, por eso al imprimir se
    // cortaba a la derecha y las tarjetas se partían entre páginas. Definimos
    // una página del tamaño EXACTO del flyer: se imprime como una sola página
    // continua, sin cortes.
    const w = el.offsetWidth
    const h = el.offsetHeight
    const prev = document.getElementById('print-page-size')
    if (prev) prev.remove()
    const style = document.createElement('style')
    style.id = 'print-page-size'
    style.textContent = `@media print { @page { size: ${w}px ${h}px; margin: 0; } html, body { margin: 0 !important; padding: 0 !important; } #flyer-root { margin: 0 !important; } }`
    document.head.appendChild(style)
    const cleanup = () => { style.remove(); window.removeEventListener('afterprint', cleanup) }
    window.addEventListener('afterprint', cleanup)
    setTimeout(cleanup, 3000)
    window.print()
  }

  return (
    <div data-no-print style={{ position: 'fixed', top: 20, right: 20, zIndex: 100, display: 'flex', gap: 10 }}>
      <button onClick={descargarJPG} disabled={loading} style={btnStyle('#1a2540', '#7EC8C8')}>
        {loading ? '⏳ Generando...' : '🖼️ Descargar imagen'}
      </button>
      <button onClick={imprimirPDF} style={btnStyle('#7EC8C8', '#0D1326')}>
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
