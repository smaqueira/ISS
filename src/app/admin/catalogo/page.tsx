'use client'
import { useState } from 'react'

export default function CatalogoPage() {
  const [downloading, setDownloading] = useState<'png'|'pdf'|null>(null)

  async function descargarPNG() {
    setDownloading('png')
    // Abre el flyer en un iframe oculto, espera que cargue y captura con html2canvas
    const html2canvas = (await import('html2canvas')).default
    const iframe = document.createElement('iframe')
    iframe.src = '/catalogo/flyer'
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:900px;height:1px;border:none;'
    document.body.appendChild(iframe)
    await new Promise(r => { iframe.onload = r; setTimeout(r, 4000) })
    await new Promise(r => setTimeout(r, 1500)) // esperar fonts/imgs
    const root = iframe.contentDocument?.getElementById('flyer-root')
    if (root) {
      const canvas = await html2canvas(root, { scale: 2, useCORS: true, backgroundColor: '#0D1326' })
      const link = document.createElement('a')
      link.download = `catalogo-vittomare-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    document.body.removeChild(iframe)
    setDownloading(null)
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Catálogo WhatsApp</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Generá el flyer premium para compartir por WhatsApp</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/catalogo/flyer" target="_blank" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
            👁️ Ver flyer
          </a>
          <a href="/catalogo/pdf" target="_blank" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
            🖨️ Ver PDF
          </a>
        </div>
      </div>

      {/* Cards de acción */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* PNG */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
          <div style={{ fontSize: '2rem' }}>🖼️</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Imagen PNG</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Ideal para mandar por WhatsApp directo. Se ve en el chat sin abrir links.
            </div>
          </div>
          <button
            onClick={descargarPNG}
            disabled={!!downloading}
            className="btn btn-primary"
            style={{ marginTop: 'auto', justifyContent: 'center' }}
          >
            {downloading === 'png' ? '⏳ Generando PNG...' : '⬇️ Descargar PNG'}
          </button>
        </div>

        {/* PDF */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
          <div style={{ fontSize: '2rem' }}>📄</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Flyer PDF</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Para imprimir o compartir como archivo. Abre el flyer y descargás el PDF desde ahí.
            </div>
          </div>
          <a
            href="/catalogo/flyer"
            target="_blank"
            className="btn btn-ghost"
            style={{ marginTop: 'auto', justifyContent: 'center', textAlign: 'center' }}
          >
            ✨ Abrir flyer → PDF
          </a>
        </div>
      </div>

      {/* Preview iframe */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#0D1326' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          Preview — /catalogo/flyer
        </div>
        <iframe
          src="/catalogo/flyer"
          style={{ width: '100%', height: 600, border: 'none', display: 'block' }}
          title="Preview catálogo"
        />
      </div>
    </div>
  )
}
