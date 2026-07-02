'use client'
import { useEffect, useState } from 'react'

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
    title: '💬 Telegram',
    keys: [
      { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', placeholder: '123456:ABC...' },
      { key: 'TELEGRAM_CHAT_ID', label: 'Chat ID', placeholder: '-100...' },
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
      { key: 'COMPANY_NAME', label: 'Nombre del sistema', placeholder: 'Intelligent Sales System' },
      { key: 'COMPANY_WHATSAPP', label: 'WhatsApp del negocio', placeholder: '5491100000000' },
    ],
  },
]

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setValues(Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value])))
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

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Configuración</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 28 }}>
        Tus claves se guardan en la base de datos. Nunca se muestran en el código.
      </p>

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
