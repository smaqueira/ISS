'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', rubro: '', phone: '', email: '', city: '', website: '', instagram: '', notes: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(r => r.json())
      .then(c => {
        setForm({
          name: c.name || '',
          rubro: c.rubro || '',
          phone: c.phone || '',
          email: c.email || '',
          city: c.city || '',
          website: c.website || '',
          instagram: c.instagram || '',
          notes: c.notes || '',
        })
        setLoading(false)
      })
  }, [id])

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      router.push(`/admin/clients/${id}`)
    } else {
      setError('Error al guardar. Intentá de nuevo.')
      setSaving(false)
    }
  }

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>{label}</label>
      <input type={type} value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }} />
    </div>
  )

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem' }}>← Volver</button>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Editar cliente</h1>
      </div>
      <div className="card">
        <form onSubmit={submit}>
          {field('Nombre *', 'name', 'text', 'Nombre del negocio')}
          {field('Rubro', 'rubro', 'text', 'restaurante, hotel, retail...')}
          {field('Teléfono / WhatsApp', 'phone', 'text', '5491100000000')}
          {field('Email', 'email', 'email', 'contacto@negocio.com')}
          {field('Ciudad', 'city', 'text', 'Buenos Aires')}
          {field('Sitio web', 'website', 'text', 'https://...')}
          {field('Instagram', 'instagram', 'text', '@usuario')}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>Notas / Dirección</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Dirección, info adicional..."
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem', resize: 'vertical' }} />
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
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
