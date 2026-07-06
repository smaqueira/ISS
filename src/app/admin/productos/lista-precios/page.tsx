'use client'
import { useState } from 'react'

const PUBLIC_URL = 'https://app.vittomare.com/lista-precios'

export default function ListaPreciosAdminPage() {
  const [copied, setCopied] = useState(false)
  const [generatingImg, setGeneratingImg] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(PUBLIC_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadPDF() {
    const win = window.open(PUBLIC_URL + '?print=1', '_blank')
    if (!win) return
    win.onload = () => {
      setTimeout(() => { win.print() }, 800)
    }
  }

  async function downloadImage() {
    setGeneratingImg(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      // Abre la página pública en un iframe oculto para capturarla
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.left = '-9999px'
      iframe.style.width = '680px'
      iframe.style.height = '1px'
      iframe.src = PUBLIC_URL
      document.body.appendChild(iframe)

      await new Promise(resolve => { iframe.onload = resolve })
      await new Promise(resolve => setTimeout(resolve, 1000))

      const doc = iframe.contentDocument?.body
      if (!doc) throw new Error('No se pudo cargar la página')

      iframe.style.height = doc.scrollHeight + 'px'
      await new Promise(resolve => setTimeout(resolve, 300))

      const canvas = await html2canvas(doc, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      document.body.removeChild(iframe)

      // Guardar como imagen PNG
      const link = document.createElement('a')
      link.download = 'lista-precios.png'
      link.href = canvas.toDataURL('image/png')
      link.click()

      // También generar PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save('lista-precios.pdf')

    } catch (e) {
      alert('Error al generar imagen: ' + String(e))
    }
    setGeneratingImg(false)
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Lista de Precios</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Generada automáticamente del catálogo · Solo productos con stock disponible
        </p>
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={copyLink} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {copied ? '✅ Link copiado' : '🔗 Copiar link'}
        </button>
        <a href={PUBLIC_URL} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          👁️ Ver página pública
        </a>
        <button onClick={downloadPDF} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          📄 Descargar PDF
        </button>
        <button onClick={downloadImage} disabled={generatingImg} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generatingImg ? '⏳ Generando...' : '🖼️ Descargar imagen'}
        </button>
      </div>

      {/* Tip de WhatsApp */}
      <div className="card" style={{ marginBottom: 20, background: '#25D36610', borderColor: '#25D366', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.3rem' }}>💬</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Compartir por WhatsApp</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Copiá el link y pegalo en un mensaje, o descargá la imagen y enviala directamente.
          </div>
        </div>
      </div>

      {/* Preview iframe */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 8 }}>{PUBLIC_URL}</span>
        </div>
        <iframe
          src={PUBLIC_URL}
          style={{ width: '100%', height: 700, border: 'none', background: '#fff' }}
          title="Preview lista de precios"
        />
      </div>
    </div>
  )
}
