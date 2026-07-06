'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const GROUPS = [
  {
    label: 'Diario',
    items: [
      { href: '/admin',            label: 'Hoy',         icon: '⚡' },
      { href: '/admin/inbox',      label: 'Inbox',       icon: '📥' },
      { href: '/admin/vender',     label: 'Vender',      icon: '💰' },
      { href: '/admin/orders',     label: 'Pedidos',     icon: '📦' },
      { href: '/admin/seguimiento',label: 'Seguimiento', icon: '🔔' },
      { href: '/admin/clients',    label: 'Clientes',    icon: '👥' },
      { href: '/admin/cotizaciones',label: 'Cotizaciones',icon: '📄' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/agente',      label: 'Agente IA',     icon: '🤖' },
      { href: '/admin/broadcast',   label: 'Broadcast',     icon: '📣' },
      { href: '/admin/calendario',  label: 'Calendario',    icon: '📅' },
      { href: '/admin/marketing',   label: 'Marketing IA',  icon: '✨' },
      { href: '/admin/images',      label: 'Imágenes IA',   icon: '🎨' },
      { href: '/admin/instagram-dm',label: 'Instagram DMs', icon: '📸' },
      { href: '/admin/content',     label: 'Contenido',     icon: '📱' },
    ],
  },
  {
    label: 'Config',
    items: [
      { href: '/admin/productos',   label: 'Catálogo',    icon: '🛍️' },
      { href: '/admin/prospecting', label: 'Prospección', icon: '🔍' },
      { href: '/admin/grupos',      label: 'Grupos B2C',  icon: '👥' },
      { href: '/admin/comunidades', label: 'Comunidades', icon: '🌐' },
      { href: '/admin/telegram',    label: 'Telegram',    icon: '✈️' },
      { href: '/admin/ayuda',       label: 'Ayuda',       icon: '📖' },
      { href: '/admin/settings',    label: 'Configuración',icon: '⚙️' },
    ],
  },
]

export default function Sidebar() {
  const path = usePathname()

  // Grupo activo por defecto: el que contiene la ruta actual
  const activeGroupIndex = GROUPS.findIndex(g => g.items.some(i => i.href === path || (i.href !== '/admin' && path.startsWith(i.href))))
  const [open, setOpen] = useState<number>(activeGroupIndex >= 0 ? activeGroupIndex : 0)

  return (
    <aside style={{
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      width: 220, minHeight: '100vh', padding: '24px 12px',
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      <div style={{ padding: '0 12px 24px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Intelligent</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>Sales System</div>
      </div>

      {GROUPS.map((group, gi) => {
        const isOpen = open === gi
        const hasActive = group.items.some(i => i.href === path || (i.href !== '/admin' && path.startsWith(i.href)))

        return (
          <div key={group.label} style={{ marginBottom: 4 }}>
            {/* Header del acordeón */}
            <button
              onClick={() => setOpen(isOpen ? -1 : gi)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: hasActive ? '#f9731610' : 'transparent',
                color: hasActive ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {group.label}
              </span>
              <span style={{
                fontSize: '0.7rem', transition: 'transform 0.2s',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                display: 'inline-block',
              }}>
                ▾
              </span>
            </button>

            {/* Items */}
            {isOpen && (
              <div style={{ paddingBottom: 4 }}>
                {group.items.map(item => {
                  const active = item.href === '/admin' ? path === '/admin' : path === item.href || path.startsWith(item.href + '/')
                  return (
                    <Link key={item.href} href={item.href} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 8,
                      background: active ? '#f9731620' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--muted)',
                      fontWeight: active ? 600 : 400, fontSize: '0.88rem',
                      textDecoration: 'none', transition: 'all 0.15s',
                    }}>
                      <span>{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </aside>
  )
}
