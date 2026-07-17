'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  STATUS_OPTIONS, ACCION_OPTIONS, MOTIVO_PERDIDA_OPTIONS,
  PRIORIDAD_OPTIONS, TEMPERATURA_OPTIONS,
} from '@/lib/crm'

const INIT = {
  name: '', rubro: '', phone: '', email: '', city: '',
  website: '', instagram: '', notes: '', observaciones: '',
  status: '', proxima_accion: '', prioridad: '', temperatura: '',
  probabilidad_cierre: '', productos_interes: '', proveedor_actual: '',
  presupuesto_estimado: '', motivo_perdida: '',
  fecha_primer_contacto: '', last_contact: '', next_followup: '',
}

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState(INIT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(c => {
        setForm({
          name:                 c.name || '',
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
        setLoading(false)
      })
  }, [id])

  function set(key: string, value: string) { setForm(p => ({ ...p, [key]: value })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload: Record<string, unknown> = { ...form }
    // coerce numbers, nullify empty strings
    payload.probabilidad_cierre = form.probabilidad_cierre !== '' ? Number(form.probabilidad_cierre) : null
    payload.presupuesto_estimado = form.presupuesto_estimado !== '' ? Number(form.presupuesto_estimado) : null
    if (!form.fecha_primer_contacto) payload.fecha_primer_contacto = null
    if (!form.last_contact) payload.last_contact = null
    if (!form.next_followup) payload.next_followup = null
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    if (res.ok) router.push(`/admin/clients/${id}`)
    else { setError('Error al guardar. Intentá de nuevo.'); setSaving(false) }
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
          {inp('Nombre *', 'name', 'text', 'Nombre del negocio')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
