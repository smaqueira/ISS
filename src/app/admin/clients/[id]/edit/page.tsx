'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  STATUS_OPTIONS, ACCION_OPTIONS, MOTIVO_PERDIDA_OPTIONS,
  PRIORIDAD_OPTIONS, TEMPERATURA_OPTIONS, TYPE_OPTIONS,
} from '@/lib/crm'

const INIT = {
  name: '', empresa: '', contacto_nombre: '', contacto_cargo: '',
  type: '', rubro: '', phone: '', email: '', city: '',
  website: '', instagram: '', notes: '', observaciones: '',
  status: '', proxima_accion: '', prioridad: '', temperatura: '',
  probabilidad_cierre: '', productos_interes: '', proveedor_actual: '',
  presupuesto_estimado: '', motivo_perdida: '',
  fecha_primer_contacto: '', last_contact: '', next_followup: '',
}

const RESERVED_TAGS = ['listo', 'sin_datos']
const TAG_PRESETS = ['VIP', 'Mayorista', 'Restaurante', 'Hotel', 'Cadena', 'Particular', 'Importador']

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState(INIT)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const tagRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(c => {
        setForm({
          name:                 c.name || '',
          empresa:              c.empresa || '',
          contacto_nombre:      c.contacto_nombre || '',
          contacto_cargo:       c.contacto_cargo || '',
          type:                 c.type || '',
          rubro:                c.rubro || '',
          phone:                c.phone || '',
          email:                c.email || '',
          city:                 c.city || '',
          website:              c.website || '',
          instagram:            c.instagram || '',
          notes:                c.notes || '',
          observaciones:        c.observaciones || '',
          status:               c.status || '',
          proxima_accion:       c.proxima_accion || '',
          prioridad:            c.prioridad || '',
          temperatura:          c.temperatura || '',
          probabilidad_cierre:  c.probabilidad_cierre != null ? String(c.probabilidad_cierre) : '',
          productos_interes:    c.productos_interes || '',
          proveedor_actual:     c.proveedor_actual || '',
          presupuesto_estimado: c.presupuesto_estimado != null ? String(c.presupuesto_estimado) : '',
          motivo_perdida:       c.motivo_perdida || '',
          fecha_primer_contacto: c.fecha_primer_contacto ? c.fecha_primer_contacto.split('T')[0] : '',
          last_contact:         c.last_contact ? c.last_contact.split('T')[0] : '',
          next_followup:        c.next_followup ? c.next_followup.split('T')[0] : '',
        })
        // Cargar solo tags personalizadas (excluir las reservadas gestionadas por los botones rápidos)
        setTags((c.tags || []).filter((t: string) => !RESERVED_TAGS.includes(t)))
        setLoading(false)
      })
  }, [id])

  function addTag(tag: string) {
    const clean = tag.trim()
    if (!clean || tags.includes(clean) || RESERVED_TAGS.includes(clean.toLowerCase())) return
    setTags(prev => [...prev, clean])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  function set(key: string, value: string) { setForm(p => ({ ...p, [key]: value })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload: Record<string, unknown> = { ...form }
    payload.probabilidad_cierre  = form.probabilidad_cierre  !== '' ? Number(form.probabilidad_cierre)  : null
    payload.presupuesto_estimado = form.presupuesto_estimado !== '' ? Number(form.presupuesto_estimado) : null
    if (!form.fecha_primer_contacto) payload.fecha_primer_contacto = null
    if (!form.last_contact)  payload.last_contact  = null
    if (!form.next_followup) payload.next_followup = null
    // Nullificar strings vacíos que tienen CHECK constraints en DB
    if (!form.type)           delete payload.type           // no sobreescribir con ''
    if (!form.empresa)        payload.empresa        = null
    if (!form.contacto_nombre) payload.contacto_nombre = null
    if (!form.contacto_cargo)  payload.contacto_cargo  = null
    if (!form.prioridad)      delete payload.prioridad
    if (!form.temperatura)    delete payload.temperatura
    if (!form.proxima_accion) delete payload.proxima_accion
    if (!form.motivo_perdida) delete payload.motivo_perdida
    // Preservar tags reservadas (listo/sin_datos) que se gestionan aparte
    const res1 = await fetch(`/api/clients/${id}`)
    const current = await res1.json()
    const reservedTags = (current.tags || []).filter((t: string) => RESERVED_TAGS.includes(t))
    payload.tags = [...reservedTags, ...tags]
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    if (res.ok) router.push(`/admin/clients/${id}`)
    else {
      const errData = await res.json().catch(() => ({}))
      setError(`Error al guardar: ${errData.error || res.status}`)
      setSaving(false)
    }
  }

  const inp = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)}
        placeholder={placeholder} style={inputStyle} />
    </div>
  )

  const sel = (label: string, key: string, opts: { value: string; label: string }[], placeholder = '') => (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)} style={inputStyle}>
        <option value="">{placeholder || `— ${label} —`}</option>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  const section = (title: string) => (
    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginTop: 24, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
      {title}
    </div>
  )

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem' }}>← Volver</button>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Editar cliente</h1>
      </div>
      <div className="card">
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {section('Datos de contacto')}
          {inp('Nombre / Nombre de fantasía *', 'name', 'text', 'Ej: Restaurante El Puerto')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {inp('Razón social / Empresa', 'empresa', 'text', 'Ej: El Puerto S.A.')}
            {sel('Tipo', 'type', TYPE_OPTIONS, '— B2B o B2C (IA) —')}
            {inp('Persona de contacto', 'contacto_nombre', 'text', 'Ej: Juan García')}
            {inp('Cargo', 'contacto_cargo', 'text', 'Ej: Encargado, Dueño...')}
            {inp('Rubro', 'rubro', 'text', 'restaurante, hotel...')}
            {inp('Ciudad', 'city', 'text', 'Buenos Aires')}
            {inp('Teléfono / WhatsApp', 'phone', 'text', '5491100000000')}
            {inp('Email', 'email', 'email', 'contacto@negocio.com')}
            {inp('Instagram', 'instagram', 'text', '@usuario')}
            {inp('Sitio web', 'website', 'text', 'https://...')}
          </div>
          <div>
            <label style={labelStyle}>Notas / Dirección</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Dirección, info adicional..."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {section('Seguimiento comercial')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {sel('Estado', 'status', STATUS_OPTIONS)}
            {sel('Próxima acción', 'proxima_accion', ACCION_OPTIONS)}
            {inp('Fecha primer contacto', 'fecha_primer_contacto', 'date')}
            {inp('Fecha último contacto', 'last_contact', 'date')}
            {inp('Próximo seguimiento', 'next_followup', 'date')}
          </div>

          {section('Calificación')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {sel('Prioridad', 'prioridad', PRIORIDAD_OPTIONS)}
            {sel('Temperatura', 'temperatura', TEMPERATURA_OPTIONS)}
            <div>
              <label style={labelStyle}>Probabilidad de cierre %</label>
              <input type="number" min={0} max={100} value={form.probabilidad_cierre}
                onChange={e => set('probabilidad_cierre', e.target.value)} style={inputStyle} placeholder="0-100" />
            </div>
          </div>

          {section('Información comercial')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {inp('Productos de interés', 'productos_interes', 'text', 'ej: merluza, salmón...')}
            {inp('Proveedor actual', 'proveedor_actual', 'text')}
            <div>
              <label style={labelStyle}>Presupuesto estimado $</label>
              <input type="number" min={0} value={form.presupuesto_estimado}
                onChange={e => set('presupuesto_estimado', e.target.value)} style={inputStyle} placeholder="0" />
            </div>
            {sel('Motivo de pérdida', 'motivo_perdida', MOTIVO_PERDIDA_OPTIONS)}
          </div>
          <div>
            <label style={labelStyle}>Observaciones generales</label>
            <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={3}
              placeholder="Observaciones, detalles adicionales..."
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {section('Etiquetas')}
          <div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {tags.map(tag => (
                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--accent)22', color: 'var(--accent)', border: '1px solid var(--accent)55', borderRadius: 20, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.75rem', padding: 0, lineHeight: 1 }}>✕</button>
                </span>
              ))}
              {tags.length === 0 && <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Sin etiquetas personalizadas</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                ref={tagRef}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
                placeholder="Nueva etiqueta..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button type="button" onClick={() => addTag(tagInput)} className="btn btn-ghost" style={{ whiteSpace: 'nowrap' }}>+ Agregar</button>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {TAG_PRESETS.filter(p => !tags.includes(p)).map(p => (
                <button key={p} type="button" onClick={() => addTag(p)}
                  style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.73rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => router.back()} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center', padding: 12 }}>
              {saving ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.88rem', boxSizing: 'border-box' }
