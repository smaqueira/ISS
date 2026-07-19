'use client'

export default function CatalogoPage() {
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Catálogo WhatsApp</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Generá el flyer premium para compartir por WhatsApp</p>
      </div>

      {/* Cards de acción */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* PNG */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
          <div style={{ fontSize: '2rem' }}>🖼️</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Imagen PNG</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Ideal para mandar por WhatsApp directo. Abre el flyer y hacé clic en <strong>PNG</strong>.
            </div>
          </div>
          <a
            href="/catalogo/flyer"
            target="_blank"
            className="btn btn-primary"
            style={{ marginTop: 'auto', justifyContent: 'center', textAlign: 'center' }}
          >
            🖼️ Abrir flyer → PNG
          </a>
        </div>

        {/* PDF */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24 }}>
          <div style={{ fontSize: '2rem' }}>📄</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Flyer PDF</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Para imprimir o compartir como archivo. Abre el flyer y hacé clic en <strong>PDF</strong>.
            </div>
          </div>
          <a
            href="/catalogo/flyer"
            target="_blank"
            className="btn btn-ghost"
            style={{ marginTop: 'auto', justifyContent: 'center', textAlign: 'center' }}
          >
            📄 Abrir flyer → PDF
          </a>
        </div>
      </div>

      {/* Preview iframe sin botones */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#0D1326' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Preview — /catalogo/flyer</span>
          <a href="/catalogo/flyer" target="_blank" style={{ fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none' }}>Abrir ↗</a>
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
