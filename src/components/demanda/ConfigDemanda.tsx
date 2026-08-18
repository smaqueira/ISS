'use client'
import { useEffect, useState } from 'react'

const CLIENTES = [
  'consumidor final', 'restaurante', 'hotel', 'supermercado', 'pescadería',
  'distribuidor', 'mayorista', 'comercio', 'empresa', 'profesional',
]

export default function ConfigDemanda() {
  const [v, setV] = useState<Record<string, string>>({})
  const [clientes, setClientes] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((arr) => {
      if (!Array.isArray(arr)) return
      const s = Object.fromEntries(arr.map((r: { key: string; value: string }) => [r.key, r.value]))
      setV(s)
      setClientes((s.DEM_CLIENTES || '').split('\n').map((x: string) => x.trim()).filter(Boolean))
    }).catch(() => {})
  }, [])

  const set = (k: string, val: string) => setV(p => ({ ...p, [k]: val }))
  const toggle = (c: string) => setClientes(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])

  async function guardar() {
    setGuardando(true)
    try {
      await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'DEM_NEGOCIO', value: v.DEM_NEGOCIO || '' },
          { key: 'DEM_RUBRO', value: v.DEM_RUBRO || '' },
          { key: 'DEM_DESCRIPCION', value: v.DEM_DESCRIPCION || '' },
          { key: 'DEM_UBICACION', value: v.DEM_UBICACION || '' },
          { key: 'DEM_ZONA', value: v.DEM_ZONA || '' },
          { key: 'DEM_RADIO_KM', value: v.DEM_RADIO_KM || '' },
          { key: 'DEM_CLIENTES', value: clientes.join('\n') },
          { key: 'DEM_RSS', value: v.DEM_RSS || '' },
        ]),
      })
      setOk(true); setTimeout(() => setOk(false), 2000)
    } finally { setGuardando(false) }
  }

  const campo = (label: string, key: string, ph = '', hint = '') => (
    <label style={{ fontSize: '0.8rem', display: 'block' }}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <input value={v[key] || ''} onChange={e => set(key, e.target.value)} placeholder={ph} style={inp} />
      {hint && <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 3 }}>{hint}</div>}
    </label>
  )

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>⚙️ Configuración del radar</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Con esto la IA sabe qué buscar, dónde y para quién.</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Mi negocio</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {campo('Nombre', 'DEM_NEGOCIO', 'Vitto Mare')}
          {campo('Rubro', 'DEM_RUBRO', 'Distribución de pescados y mariscos')}
          {campo('Ubicación', 'DEM_UBICACION', 'Buenos Aires')}
          {campo('Radio de atención (km)', 'DEM_RADIO_KM', '50')}
        </div>
        {campo('Descripción', 'DEM_DESCRIPCION', 'Venta mayorista a gastronomía')}
        {campo('Zona de cobertura', 'DEM_ZONA', 'CABA y GBA', 'Se usa para buscar y para puntuar si la oportunidad te queda cerca.')}
      </div>

      <div className="card">
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Cliente objetivo</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>¿A quién le querés vender? Suma puntos cuando la oportunidad coincide.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CLIENTES.map(c => {
            const on = clientes.includes(c)
            return (
              <button key={c} onClick={() => toggle(c)} style={{
                padding: '6px 12px', borderRadius: 16, cursor: 'pointer', fontSize: '0.8rem',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                background: on ? 'var(--accent)' : 'transparent',
                color: on ? '#fff' : 'var(--muted)', fontWeight: on ? 700 : 400,
              }}>{c}</button>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Fuentes</div>
        <div style={{ fontSize: '0.8rem', marginBottom: 10 }}>
          🔍 <strong>Buscador (Google vía Serper)</strong> — activo. Requiere <code>SERPER_API_KEY_1</code> en Configuración.
        </div>
        <label style={{ fontSize: '0.8rem', display: 'block' }}>
          <div style={{ color: 'var(--muted)', marginBottom: 4 }}>Feeds RSS propios (uno por línea, opcional)</div>
          <textarea value={v.DEM_RSS || ''} onChange={e => set('DEM_RSS', e.target.value)} rows={3}
            placeholder={'https://ejemplo.com/feed\nhttps://otro.com/rss'} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
        </label>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
          🔒 Solo se usan fuentes públicas y APIs autorizadas. No se accede a grupos privados, mensajes ni cuentas personales.
        </div>
      </div>

      <button onClick={guardar} disabled={guardando} className="btn btn-primary" style={{ justifyContent: 'center', padding: 12, fontSize: '0.9rem' }}>
        {guardando ? 'Guardando…' : ok ? '✅ Guardado' : 'Guardar configuración'}
      </button>
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem', boxSizing: 'border-box',
}
