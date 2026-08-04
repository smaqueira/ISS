'use client'
import { useState, useEffect } from 'react'
import { calcMayorista } from '@/lib/precios'

const BASE_URL = 'https://app.vittomare.com/lista-precios'
const urlDe = (tipo: 'mayorista' | 'minorista') => `${BASE_URL}?tipo=${tipo}`

export default function ListaPreciosAdminPage() {
  const [vista, setVista] = useState<'mayorista' | 'minorista'>('minorista')
  const [copied, setCopied] = useState(false)
  const [generatingImg, setGeneratingImg] = useState(false)

  // Config de precios
  const [descuento, setDescuento] = useState('')
  const [minMayor, setMinMayor] = useState('')
  const [minMinor, setMinMinor] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Por producto: precio mayorista por kilo + kilos por caja + on/off
  const [prods, setProds] = useState<{ id: string; name: string; price: number; category: string }[]>([])
  const [precioKgProd, setPrecioKgProd] = useState<Record<string, string>>({})
  const [kilosCajaProd, setKilosCajaProd] = useState<Record<string, string>>({})
  const [offProd, setOffProd] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((arr) => {
      if (!Array.isArray(arr)) return
      const s = Object.fromEntries(arr.map((r: { key: string; value: string }) => [r.key, r.value]))
      setDescuento(s.DESCUENTO_MAYORISTA || '')
      setMinMayor(s.COMPRA_MINIMA || '')
      setMinMinor(s.COMPRA_MINIMA_MINORISTA || '')
      try {
        const m = JSON.parse(s.DESCUENTOS_MAYORISTA_POR_PRODUCTO || '{}')
        if (m && typeof m === 'object') {
          const pk: Record<string, string> = {}, kc: Record<string, string> = {}, off: Record<string, boolean> = {}
          for (const [k, v] of Object.entries(m as Record<string, { precioKg?: number; kilosCaja?: number; off?: boolean }>)) {
            if (v && typeof v.precioKg === 'number') pk[k] = String(v.precioKg)
            if (v && typeof v.kilosCaja === 'number') kc[k] = String(v.kilosCaja)
            if (v && v.off) off[k] = true
          }
          setPrecioKgProd(pk); setKilosCajaProd(kc); setOffProd(off)
        }
      } catch { /* ignore */ }
    }).catch(() => {})

    fetch('/api/catalog?all=1').then(r => r.json()).then((arr) => {
      if (Array.isArray(arr)) setProds(arr.map((p: { id: string; name: string; price: number; category?: string }) => ({
        id: String(p.id), name: p.name, price: Number(p.price) || 0, category: p.category || 'General',
      })))
    }).catch(() => {})
  }, [])

  const num = (v: string, max = 1e12) => Math.min(max, Math.max(0, Number((v || '').replace(/[^0-9.]/g, '')) || 0))
  const descGeneralNum = Math.min(90, num(descuento))

  // Cálculo mayorista en vivo (precio/kg × kilos de caja; fallback al descuento general)
  function mayDe(p: { id: string; price: number }) {
    const pk = precioKgProd[p.id]?.trim(), kc = kilosCajaProd[p.id]?.trim()
    return calcMayorista(p.price, {
      precioKg: pk ? num(pk) : undefined,
      kilosCaja: kc ? num(kc) : undefined,
    }, descGeneralNum)
  }

  async function guardar() {
    setSaving(true)
    const mapa: Record<string, { precioKg?: number; kilosCaja?: number; off?: boolean }> = {}
    for (const p of prods) {
      const o: { precioKg?: number; kilosCaja?: number; off?: boolean } = {}
      const pk = precioKgProd[p.id]?.trim(), kc = kilosCajaProd[p.id]?.trim()
      if (pk) o.precioKg = Math.round(num(pk))
      if (kc) o.kilosCaja = num(kc)
      if (offProd[p.id]) o.off = true
      if (o.precioKg !== undefined || o.kilosCaja !== undefined || o.off) mapa[p.id] = o
    }
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { key: 'DESCUENTO_MAYORISTA', value: String(descGeneralNum) },
        { key: 'COMPRA_MINIMA', value: minMayor.trim() },
        { key: 'COMPRA_MINIMA_MINORISTA', value: minMinor.trim() },
        { key: 'DESCUENTOS_MAYORISTA_POR_PRODUCTO', value: JSON.stringify(mapa) },
      ]),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')
  const categorias = [...new Set(prods.map(p => p.category))].sort()

  function copyLink() {
    navigator.clipboard.writeText(urlDe(vista))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Descarga confiable: abre la página lista para imprimir → "Guardar como PDF".
  // Sale idéntica a la página (sin html2canvas), en A4 limpio.
  function descargarPDF() {
    window.open(urlDe(vista) + '&print=1', '_blank')
  }

  async function downloadImage() {
    setGeneratingImg(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.left = '-9999px'
      iframe.style.width = '680px'
      iframe.style.height = '1px'
      iframe.src = urlDe(vista)
      document.body.appendChild(iframe)

      await new Promise(resolve => { iframe.onload = resolve })
      await new Promise(resolve => setTimeout(resolve, 1000))

      const doc = iframe.contentDocument?.body
      if (!doc) throw new Error('No se pudo cargar la página')
      iframe.style.height = doc.scrollHeight + 'px'
      await new Promise(resolve => setTimeout(resolve, 300))

      const canvas = await html2canvas(doc, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      document.body.removeChild(iframe)

      const link = document.createElement('a')
      link.download = `lista-precios-${vista}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2] })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
      pdf.save(`lista-precios-${vista}.pdf`)
    } catch (e) {
      alert('Error al generar imagen: ' + String(e))
    }
    setGeneratingImg(false)
  }

  const tab = (t: 'mayorista' | 'minorista', label: string, sub: string, color: string) => (
    <button onClick={() => setVista(t)} style={{
      flex: 1, minWidth: 180, textAlign: 'left', padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
      border: `1px solid ${vista === t ? color : 'var(--border)'}`,
      background: vista === t ? color + '18' : 'transparent',
    }}>
      <div style={{ fontWeight: 800, color: vista === t ? color : 'var(--text)' }}>{label}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{sub}</div>
    </button>
  )

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Listas de Precios</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          <strong>Minorista</strong> (precio de BlueMarket, <span style={{ color: '#22c55e' }}>pública</span>, para particulares) y <strong>Mayorista</strong> (precio con descuento, <span style={{ color: '#ef4444' }}>privada</span> — solo la ves vos, se manda como imagen/PDF).
        </p>
      </div>

      {/* Catálogo con fotos (formato PDF presentable) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>🖼️ Catálogo con fotos (formato presentable)</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 12 }}>
          El catálogo lindo con fotos por producto, en sus dos versiones. Abrí y usá “Descargar imagen / PDF” para enviarlo.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="https://app.vittomare.com/catalogo/pdf?tipo=minorista" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            🛒 Catálogo minorista <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>(público)</span>
          </a>
          <a href="https://app.vittomare.com/catalogo/pdf?tipo=mayorista" target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            🏢 Catálogo mayorista <span style={{ fontSize: '0.68rem', color: '#ef4444' }}>(privado)</span>
          </a>
        </div>
      </div>

      {/* Config de precios */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>⚙️ Configuración</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label style={{ fontSize: '0.8rem' }}>
            <div style={{ color: 'var(--muted)', marginBottom: 4 }}>Descuento mayorista (%)</div>
            <input value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="ej: 20"
              style={inp} />
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 3 }}>Se resta al precio público (BlueMarket)</div>
          </label>
          <label style={{ fontSize: '0.8rem' }}>
            <div style={{ color: 'var(--muted)', marginBottom: 4 }}>Compra mínima minorista (pública)</div>
            <input value={minMinor} onChange={e => setMinMinor(e.target.value)} placeholder="ej: $15.000" style={inp} />
          </label>
          <label style={{ fontSize: '0.8rem' }}>
            <div style={{ color: 'var(--muted)', marginBottom: 4 }}>Compra mínima mayorista</div>
            <input value={minMayor} onChange={e => setMinMayor(e.target.value)} placeholder="ej: $50.000" style={inp} />
          </label>
        </div>
        <button onClick={guardar} disabled={saving} className="btn btn-primary" style={{ marginTop: 12, fontSize: '0.82rem' }}>
          {saving ? 'Guardando…' : saved ? '✅ Guardado' : 'Guardar configuración'}
        </button>
      </div>

      {/* Descuento / precio por producto (para la lista mayorista) */}
      {prods.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>🏷️ Precio mayorista por producto</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 12 }}>
            Por producto: <strong>precio mayorista por kilo</strong> × <strong>kilos de la caja</strong> = precio de la caja. Si dejás el $/kg vacío, usa el descuento general ({descGeneralNum}%) sobre el público. Destildá <strong>“Mayor”</strong> para que un producto no salga en la lista mayorista.
          </div>
          <div style={{ maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 8, padding: '0 0 4px', position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface)', fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <span style={{ flex: 1, minWidth: 140 }}>Producto</span>
              <span style={{ width: 44, textAlign: 'center' }}>Mayor</span>
              <span style={{ width: 84, textAlign: 'center' }}>$ / kg</span>
              <span style={{ width: 64, textAlign: 'center' }}>kg caja</span>
              <span style={{ width: 110, textAlign: 'right' }}>Precio caja</span>
            </div>
            {categorias.map(cat => (
              <div key={cat}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#C9A96E', textTransform: 'uppercase', letterSpacing: 0.5, margin: '10px 0 4px' }}>{cat}</div>
                {prods.filter(p => p.category === cat).map(p => {
                  const off = !!offProd[p.id]
                  const may = mayDe(p)
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', opacity: off ? 0.5 : 1 }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>público {fmt(p.price)}</div>
                      </div>
                      <label style={{ width: 44, display: 'flex', justifyContent: 'center', cursor: 'pointer' }} title="Se ofrece por mayorista">
                        <input type="checkbox" checked={!off} onChange={e => setOffProd(m => ({ ...m, [p.id]: !e.target.checked }))} />
                      </label>
                      <input value={precioKgProd[p.id] || ''} onChange={e => setPrecioKgProd(m => ({ ...m, [p.id]: e.target.value }))}
                        placeholder="$/kg" title="Precio mayorista por kilo" disabled={off}
                        style={{ ...inp, width: 84, padding: '6px 8px' }} />
                      <input value={kilosCajaProd[p.id] || ''} onChange={e => setKilosCajaProd(m => ({ ...m, [p.id]: e.target.value }))}
                        placeholder="kg" title="Kilos por caja" disabled={off}
                        style={{ ...inp, width: 64, padding: '6px 8px' }} />
                      <div style={{ width: 110, textAlign: 'right' }}>
                        {off ? <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>—</span> : (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#22c55e' }}>{fmt(may.boxTotal)}</div>
                            {may.porCaja && <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>caja {may.kilosCaja}kg</div>}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <button onClick={guardar} disabled={saving} className="btn btn-primary" style={{ marginTop: 12, fontSize: '0.82rem' }}>
            {saving ? 'Guardando…' : saved ? '✅ Guardado' : 'Guardar todo'}
          </button>
        </div>
      )}

      {/* Selector de lista */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {tab('minorista', '🛒 Minorista', 'Pública · para particulares', '#C9A96E')}
        {tab('mayorista', '🏢 Mayorista', 'Privada · para negocios', '#0D1326')}
      </div>

      {vista === 'mayorista' && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#ef444412', border: '1px solid #ef444455', borderRadius: 8, fontSize: '0.78rem', color: '#ef4444' }}>
          🔒 Lista <strong>privada</strong>: el link solo abre estando logueado como admin. Para mandarla a un negocio, usá <strong>Descargar imagen + PDF</strong> y enviá el archivo (no el link).
        </div>
      )}

      {/* Botones de acción (según lista elegida) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {vista === 'minorista' && (
          <button onClick={copyLink} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {copied ? '✅ Link copiado' : '🔗 Copiar link público'}
          </button>
        )}
        <a href={urlDe(vista)} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          👁️ {vista === 'mayorista' ? 'Ver (solo vos)' : 'Ver página pública'}
        </a>
        <button onClick={descargarPDF} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          📄 PDF para enviar
        </button>
        <button onClick={downloadImage} disabled={generatingImg} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generatingImg ? '⏳ Generando...' : '🖼️ Imagen'}
        </button>
      </div>

      {/* Preview iframe */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 8 }}>{urlDe(vista)}</span>
        </div>
        <iframe
          key={vista}
          src={urlDe(vista)}
          style={{ width: '100%', height: 700, border: 'none', background: '#fff' }}
          title={`Preview lista ${vista}`}
        />
      </div>
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem', boxSizing: 'border-box',
}
