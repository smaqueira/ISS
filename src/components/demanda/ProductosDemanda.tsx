'use client'
import { useEffect, useState } from 'react'

interface Prod {
  id?: string; nombre: string; categoria: string; descripcion: string
  marcas: string; variantes: string; keywords: string; sinonimos: string
  precio: string; disponible: boolean; zona: string; activo: boolean
}
const VACIO: Prod = {
  nombre: '', categoria: '', descripcion: '', marcas: '', variantes: '',
  keywords: '', sinonimos: '', precio: '', disponible: true, zona: '', activo: true,
}
const arr = (v: unknown): string => Array.isArray(v) ? v.join(', ') : (v ? String(v) : '')

export default function ProductosDemanda() {
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState<Prod>(VACIO)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  function cargar() {
    fetch('/api/demanda/productos').then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {})
  }
  useEffect(cargar, [])

  async function guardar() {
    if (!form.nombre.trim()) { alert('Poné un nombre.'); return }
    setGuardando(true)
    try {
      const r = await fetch('/api/demanda/productos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (!r.ok) { const d = await r.json(); alert(d.error || 'No se pudo guardar'); return }
      setForm(VACIO); setAbierto(false); cargar()
    } finally { setGuardando(false) }
  }

  async function borrar(id: string, nombre: string) {
    if (!confirm(`¿Borrar "${nombre}"?`)) return
    await fetch(`/api/demanda/productos?id=${id}`, { method: 'DELETE' })
    cargar()
  }

  function editar(p: Record<string, unknown>) {
    setForm({
      id: p.id as string, nombre: (p.nombre as string) || '', categoria: (p.categoria as string) || '',
      descripcion: (p.descripcion as string) || '', marcas: arr(p.marcas), variantes: arr(p.variantes),
      keywords: arr(p.keywords), sinonimos: arr(p.sinonimos), precio: p.precio ? String(p.precio) : '',
      disponible: p.disponible !== false, zona: (p.zona as string) || '', activo: p.activo !== false,
    })
    setAbierto(true)
  }

  const campo = (label: string, key: keyof Prod, ph = '', hint = '') => (
    <label style={{ fontSize: '0.8rem', display: 'block' }}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <input value={String(form[key] ?? '')} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={ph} style={inp} />
      {hint && <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 3 }}>{hint}</div>}
    </label>
  )

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>📦 Qué vendo</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            Las <strong>palabras clave</strong> son lo que el radar usa para buscar. Cuantas más pongas, más señales encuentra.
          </p>
        </div>
        <button onClick={() => { setForm(VACIO); setAbierto(v => !v) }} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          {abierto ? 'Cerrar' : '+ Agregar producto'}
        </button>
      </div>

      {abierto && (
        <div className="card" style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {campo('Nombre *', 'nombre', 'Langostino')}
            {campo('Categoría', 'categoria', 'Mariscos')}
            {campo('Precio (opcional)', 'precio', '12000')}
            {campo('Zona donde se comercializa', 'zona', 'CABA y GBA')}
          </div>
          {campo('Descripción', 'descripcion', 'Langostino entero, caja de 10 kg')}
          {campo('Palabras clave *', 'keywords', 'langostino, langostinos, camarón, camarones, shrimp', 'Separadas por coma. Son las que se buscan en las fuentes.')}
          {campo('Sinónimos', 'sinonimos', 'gamba, gambas')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {campo('Marcas', 'marcas', 'Marca A, Marca B')}
            {campo('Variantes', 'variantes', 'entero, pelado, L1, L2')}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.disponible} onChange={e => setForm(f => ({ ...f, disponible: e.target.checked }))} /> Disponible
            </label>
            <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} /> Buscar en el radar
            </label>
          </div>
          <button onClick={guardar} disabled={guardando} className="btn btn-primary" style={{ justifyContent: 'center', fontSize: '0.85rem' }}>
            {guardando ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Agregar producto'}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          Todavía no cargaste productos. Agregá el primero para que el radar sepa qué buscar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(p => (
            <div key={p.id as string} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: p.activo === false ? 0.5 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {p.nombre as string}
                  {p.categoria ? <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.8rem' }}> · {p.categoria as string}</span> : null}
                  {p.activo === false && <span style={{ marginLeft: 8, fontSize: '0.65rem', color: '#f59e0b' }}>pausado</span>}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>🔑 {arr(p.keywords) || 'sin palabras clave'}</div>
              </div>
              <button onClick={() => editar(p)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>✏️</button>
              <button onClick={() => borrar(p.id as string, p.nombre as string)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#ef4444' }}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem', boxSizing: 'border-box',
}
