'use client'
import Link from 'next/link'

const MODULES = [
  {
    group: '📥 Comunicación',
    items: [
      { href: '/admin/inbox', icon: '📥', title: 'Inbox unificado', desc: 'Todos tus mensajes de WhatsApp, Email e Instagram en un solo lugar. Respuesta con IA.' },
      { href: '/admin/vender', icon: '💰', title: 'Vender', desc: 'Generá propuestas y cotizaciones con IA para enviar por WhatsApp o email.' },
      { href: '/admin/cotizaciones', icon: '📄', title: 'Cotizaciones', desc: 'Historial de cotizaciones enviadas a clientes.' },
      { href: '/admin/broadcast', icon: '📣', title: 'Broadcast', desc: 'Enviá mensajes masivos a grupos de clientes por WhatsApp o email.' },
      { href: '/admin/seguimiento', icon: '🔔', title: 'Seguimiento', desc: 'Clientes que necesitan seguimiento hoy según días sin contacto.' },
    ],
  },
  {
    group: '👥 Clientes',
    items: [
      { href: '/admin/clients', icon: '👥', title: 'Contactos', desc: 'Base de datos de clientes B2B y B2C con score, estado y canal de origen.' },
      { href: '/admin/clients/new', icon: '➕', title: 'Nuevo cliente', desc: 'Agregá un cliente manualmente.' },
      { href: '/admin/clients/import', icon: '📂', title: 'Importar clientes', desc: 'Importá clientes desde un archivo CSV.' },
      { href: '/admin/agente', icon: '🤖', title: 'Agente prospector IA', desc: 'El agente busca nuevos prospectos B2B automáticamente y los agrega a tu pipeline.' },
      { href: '/admin/prospecting', icon: '🔍', title: 'Prospección manual', desc: 'Buscá negocios por rubro y zona para agregar como prospectos.' },
    ],
  },
  {
    group: '📦 Pedidos y Catálogo',
    items: [
      { href: '/admin/orders', icon: '📦', title: 'Pedidos', desc: 'Gestión de pedidos: nuevo, en preparación, entregado.' },
      { href: '/admin/productos', icon: '🛍️', title: 'Catálogo', desc: 'Productos del catálogo desde BlueMarket — stock, precios y disponibilidad en tiempo real.' },
      { href: '/admin/productos/lista-precios', icon: '💰', title: 'Lista de precios', desc: 'Lista automática del catálogo con stock. Compartible como link, PDF o imagen para WhatsApp.' },
    ],
  },
  {
    group: '📣 Marketing',
    items: [
      { href: '/admin/calendario', icon: '📅', title: 'Calendario de contenido', desc: 'Plan semanal de publicaciones generado con IA según catálogo y estacionalidad.' },
      { href: '/admin/marketing', icon: '✨', title: 'Marketing IA', desc: 'Generá textos para posts, stories, emails y WhatsApp con IA.' },
      { href: '/admin/images', icon: '🎨', title: 'Imágenes IA', desc: 'Generá imágenes para posts con Ideogram IA.' },
      { href: '/admin/content', icon: '📱', title: 'Contenido', desc: 'Biblioteca de contenido generado listo para publicar.' },
      { href: '/admin/instagram-dm', icon: '📸', title: 'Instagram DMs', desc: 'Gestión de mensajes directos de Instagram (requiere cuenta profesional).' },
    ],
  },
  {
    group: '🌐 Comunidades y Grupos',
    items: [
      { href: '/admin/grupos', icon: '👥', title: 'Grupos B2C', desc: 'Grupos de WhatsApp de consumidores finales para broadcast.' },
      { href: '/admin/comunidades', icon: '🌐', title: 'Comunidades', desc: 'Directorio de comunidades públicas en Argentina para prospectar.' },
      { href: '/admin/telegram', icon: '✈️', title: 'Telegram', desc: 'Bot de Telegram para alertas, resumen del día y gestión desde el celular.' },
    ],
  },
  {
    group: '⚙️ Sistema',
    items: [
      { href: '/admin', icon: '⚡', title: 'Dashboard Hoy', desc: 'Resumen del día: tareas, métricas, leads calientes y próximas acciones.' },
      { href: '/admin/settings', icon: '⚙️', title: 'Configuración', desc: 'API keys, datos de la empresa, Gmail, Telegram, Resend, Groq, Instagram.' },
      { href: '/lista-precios', icon: '🔗', title: 'Link público de precios', desc: 'URL pública del catálogo: app.vittomare.com/lista-precios', external: true },
    ],
  },
]

export default function AyudaPage() {
  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>¿Qué puedo hacer?</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Todo lo que tiene el sistema — hacé click en cualquier módulo para ir directo.
        </p>
      </div>

      {MODULES.map(group => (
        <div key={group.group} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
            {group.group}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card"
                  style={{ cursor: 'pointer', transition: 'border-color 0.15s', height: '100%' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{item.title}</span>
                    {item.external && <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginLeft: 'auto' }}>↗</span>}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
