'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

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

interface ServiceStatus {
  name: string
  ok: boolean
  latency?: number
  detail?: string
}

interface StatusData {
  ok: boolean
  services: ServiceStatus[]
  ts: string
}

export default function Sidebar() {
  const path = usePathname()
  const activeGroupIndex = GROUPS.findIndex(g => g.items.some(i => i.href === path || (i.href !== '/admin' && path.startsWith(i.href))))
  const [open, setOpen] = useState<number>(activeGroupIndex >= 0 ? activeGroupIndex : 0)
  const [status, setStatus] = useState<StatusData | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [checking, setChecking] = useState(false)

  const checkStatus = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus(null)
    }
    setChecking(false)
  }, [])

  useEffect(() => {
    checkStatus()
    const iv = setInterval(checkStatus, 5 * 60 * 1000) // cada 5 minutos
    return () => clearInterval(iv)
  }, [checkStatus])

  const failCount = status ? status.services.filter(s => !s.ok).length : 0
  const dot = checking ? '#94a3b8' : status === null ? '#94a3b8' : failCount === 0 ? '#22c55e' : failCount <= 2 ? '#f59e0b' : '#ef4444'
  const label = checking ? 'Verificando...' : status === null ? 'Sin datos' : failCount === 0 ? 'Sistema OK' : `${failCount} servicio${failCount > 1 ? 's' : ''} con fallo`

  return (
    <>
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
                <span style={{ fontSize: '0.7rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                  ▾
                </span>
              </button>

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

        {/* Status indicator — siempre visible abajo */}
        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => { setStatusOpen(true); checkStatus() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', textAlign: 'left',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0,
              boxShadow: failCount === 0 && !checking ? `0 0 6px ${dot}` : 'none',
            }} />
            <span style={{ fontSize: '0.75rem', color: failCount > 0 ? dot : 'var(--muted)', fontWeight: failCount > 0 ? 600 : 400 }}>
              {label}
            </span>
          </button>
        </div>
      </aside>

      {/* Panel de status */}
      {statusOpen && (
        <div
          onClick={() => setStatusOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: '0 16px 0 0',
              width: 320, maxHeight: '80vh', overflow: 'auto',
              padding: 20, borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Estado del sistema</div>
              <button onClick={() => setStatusOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.1rem' }}>✕</button>
            </div>

            {checking && <div style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: 16 }}>Verificando servicios...</div>}

            {!checking && status?.services.map(svc => (
              <div key={svc.name} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: svc.ok ? '#22c55e' : '#ef4444',
                  boxShadow: svc.ok ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{svc.name}</div>
                  <div style={{ fontSize: '0.72rem', color: svc.ok ? 'var(--muted)' : '#ef4444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {svc.ok ? svc.detail : svc.detail || 'Error desconocido'}
                  </div>
                </div>
                {svc.latency !== undefined && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>{svc.latency}ms</span>
                )}
              </div>
            ))}

            <button
              onClick={checkStatus}
              style={{ width: '100%', marginTop: 14, padding: '8px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.8rem' }}
            >
              🔄 Verificar de nuevo
            </button>

            {status?.ts && (
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
                Última verificación: {new Date(status.ts).toLocaleTimeString('es-AR')}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
