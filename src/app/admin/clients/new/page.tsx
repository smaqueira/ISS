'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useIsAdmin } from '@/hooks/useRole'

export default function NewClientPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', rubro: '', phone: '', email: '', city: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const isAdmin = useIsAdmin()
  useEffect(() => { if (isAdmin === false) router.replace('/admin/clients') }, [isAdmin, router])
  if (isAdmin === false) return null

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, auto_classify: true }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.id) router.push(`/admin/clients/${data.id}`)
  }

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>{label}</label>
      <input type={type} value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 20 }}>Nuevo cliente</h1>
      <div className="card">
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 20 }}>
          🤖 La IA va a clasificar automáticamente si es B2B o B2C y calcular el score.
        </p>
        <form onSubmit={submit}>
          {field('Nombre *', 'name', 'text', 'Ej: Restaurante El Puerto')}
          {field('Rubro', 'rubro', 'text', 'Ej: restaurante, hotel, retail, mayorista...')}
          {field('Teléfono / WhatsApp', 'phone', 'text', '5491100000000')}
          {field('Email', 'email', 'email', 'contacto@negocio.com')}
          {field('Ciudad', 'city', 'text', 'Buenos Aires')}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Info adicional..."
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.9rem', resize: 'vertical' }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
            {loading ? '🤖 Clasificando con IA...' : 'Guardar cliente'}
          </button>
        </form>
      </div>
    </div>
  )
}
