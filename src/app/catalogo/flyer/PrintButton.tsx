'use client'
import { useState } from 'react'

export default function FlyerControls() {
  const [loading, setLoading] = useState(false)

  async function descargarPNG() {
    setLoading(true)
    const html2canvas = (await import('html2canvas')).default
    const el = document.getElementById('flyer-root')!
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#0D1326' })
    const link = document.createElement('a')
    link.download = `catalogo-vittomare-${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setLoading(false)
  }

  async function descargarPDF() {
    setLoading(true)
    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')
    const el = document.getElementById('flyer-root')!
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#0D1326' })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
    pdf.save(`catalogo-vittomare-${new Date().toISOString().split('T')[0]}.pdf`)
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 100,
      display: 'flex', gap: 10,
    }}>
      <button onClick={descargarPNG} disabled={loading} style={btnStyle('#1a2540', '#7EC8C8')}>
        {loading ? '⏳' : '🖼️ PNG'}
      </button>
      <button onClick={descargarPDF} disabled={loading} style={btnStyle('#7EC8C8', '#0D1326')}>
        {loading ? '⏳ Generando...' : '📄 PDF'}
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
