'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/admin', label: 'Hoy', icon: '⚡' },
  { href: '/admin/vender', label: 'Vender', icon: '💰' },
  { href: '/admin/agente', label: 'Agente IA', icon: '🤖' },
  { href: '/admin/marketing', label: 'Marketing IA', icon: '📣' },
  { href: '/admin/calendario', label: 'Calendario', icon: '📅' },
  { href: '/admin/instagram-dm', label: 'Instagram DMs', icon: '📸' },
  { href: '/admin/clients', label: 'Clientes', icon: '👥' },
  { href: '/admin/orders', label: 'Pedidos', icon: '📦' },
  { href: '/admin/productos', label: 'Catálogo', icon: '🛍️' },
  { href: '/admin/content', label: 'Contenido', icon: '📱' },
  { href: '/admin/images', label: 'Imágenes IA', icon: '🎨' },
  { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: '📄' },
  { href: '/admin/broadcast', label: 'Broadcast', icon: '📣' },
  { href: '/admin/prospecting', label: 'Prospección', icon: '🔍' },
  { href: '/admin/grupos', label: 'Grupos B2C', icon: '👥' },
  { href: '/admin/comunidades', label: 'Comunidades', icon: '🌐' },
  { href: '/admin/telegram', label: 'Telegram', icon: '✈️' },
  { href: '/admin/ayuda', label: 'Ayuda', icon: '📖' },
  { href: '/admin/settings', label: 'Configuración', icon: '⚙️' },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', width: 220, minHeight: '100vh', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ padding: '0 12px 24px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Intelligent</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>Sales System</div>
      </div>
      {nav.map(item => {
        const active = path === item.href
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
            background: active ? '#f9731620' : 'transparent',
            color: active ? 'var(--accent)' : 'var(--muted)',
            fontWeight: active ? 600 : 400, fontSize: '0.9rem',
            textDecoration: 'none', transition: 'all 0.15s',
          }}>
            <span>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </aside>
  )
}
