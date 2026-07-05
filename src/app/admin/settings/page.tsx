'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const GROUPS = [
  {
    title: '🤖 Inteligencia Artificial (Groq)',
    keys: [
      { key: 'GROQ_API_KEY_1', label: 'Groq API Key 1', placeholder: 'gsk_...' },
      { key: 'GROQ_API_KEY_2', label: 'Groq API Key 2', placeholder: 'gsk_...' },
      { key: 'GROQ_API_KEY_3', label: 'Groq API Key 3', placeholder: 'gsk_...' },
      { key: 'GROQ_API_KEY_4', label: 'Groq API Key 4', placeholder: 'gsk_...' },
    ],
  },
  {
    title: '📧 Emails',
    keys: [
      { key: 'RESEND_API_KEY', label: 'Resend API Key', placeholder: 're_...' },
      { key: 'RESEND_FROM_EMAIL', label: 'Email de envío', placeholder: 'ventas@tudominio.com' },
      { key: 'ADMIN_EMAIL', label: 'Tu email (alertas)', placeholder: 'vos@email.com' },
    ],
  },
  {
    title: '📸 Instagram DMs',
    keys: [
      { key: 'INSTAGRAM_ACCESS_TOKEN', label: 'Access Token (Page)', placeholder: 'EAABsbCS...' },
      { key: 'INSTAGRAM_PAGE_ID', label: 'Page ID', placeholder: '123456789' },
      { key: 'INSTAGRAM_VERIFY_TOKEN', label: 'Verify Token (lo elegís vos)', placeholder: 'mi_token_secreto_123' },
    ],
  },
  {
    title: '💬 Telegram',
    keys: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', placeholder: '123456:ABC...' },
      { key: 'TELEGRAM_CHAT_ID', label: 'Chat ID', placeholder: '-100...' },
    ],
  },
  {
    title: '🎨 Imágenes IA',
    keys: [
      { key: 'IDEOGRAM_API_KEY', label: 'Ideogram API Key', placeholder: 'wR59...' },
      { key: 'IDEOGRAM_API_KEY_2', label: 'Ideogram API Key 2', placeholder: 'wR59...' },
    ],
  },
  {
    title: '🔍 Prospección',
    keys: [
      { key: 'SERPER_API_KEY_1', label: 'Serper API Key 1', placeholder: '0eb2...' },
      { key: 'SERPER_API_KEY_2', label: 'Serper API Key 2', placeholder: '0eb2...' },
      { key: 'SERPER_API_KEY_3', label: 'Serper API Key 3', placeholder: '0eb2...' },
    ],
  },
  {
    title: '🏢 Empresa',
    keys: [
      { key: 'COMPANY_NAME', label: 'Nombre del negocio', placeholder: 'MariscoVittomare' },
      { key: 'COMPANY_WHATSAPP', label: 'WhatsApp del negocio', placeholder: '5491100000000' },
      { key: 'COMPANY_DESCRIPTION', label: 'Qué vendés (para mensajes IA)', placeholder: 'Proveemos mariscos y pescados frescos a restaurantes y hoteles de Buenos Aires' },
    ],
  },
]

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const map = Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]))
          setValues(map)
          if (map.COMPANY_LOGO_URL) setLogoUrl(map.COMPANY_LOGO_URL)
        }
      })
  }, [])

  async function save() {
    setSaving(true)
    const updates = Object.entries(values).map(([key, value]) => ({ key, value }))
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const db = createClient()
    const ext = file.name.split('.').pop()
    const { data, error } = await db.storage.from('assets').upload(`logo.${ext}`, file, { upsert: true })
    if (error) { setUploadingLogo(false); return }
    const { data: { publicUrl } } = db.storage.from('assets').getPublicUrl(data.path)
    setLogoUrl(publicUrl)
    setValues(prev => ({ ...prev, COMPANY_LOGO_URL: publicUrl }))
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ key: 'COMPANY_LOGO_URL', value: publicUrl }]) })
    setUploadingLogo(false)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Configuración</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 28 }}>
        Tus claves se guardan en la base de datos. Nunca se muestran en el código.
      </p>

      {/* Logo */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.95rem' }}>🖼️ Logo de la empresa</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {logoUrl
            ? <img src={logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', padding: 8 }} />
            : <div style={{ width: 80, height: 80, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '1.5rem' }}>🏢</div>
          }
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
              Se superpondrá en todas las imágenes generadas por IA
            </label>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: 'none' }} />
              <span className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
                {uploadingLogo ? '⏳ Subiendo...' : logoUrl ? '🔄 Cambiar logo' : '⬆️ Subir logo'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {GROUPS.map(group => (
        <div key={group.title} className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.95rem' }}>{group.title}</div>
          {group.keys.map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 5 }}>{label}</label>
              <input
                type={key.includes('KEY') || key.includes('TOKEN') ? 'password' : 'text'}
                value={values[key] || ''}
                onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.85rem' }}
              />
            </div>
          ))}
        </div>
      ))}

      <button onClick={save} disabled={saving} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: '0.95rem' }}>
        {saving ? 'Guardando...' : saved ? '✅ Guardado!' : 'Guardar configuración'}
      </button>
    </div>
  )
}
