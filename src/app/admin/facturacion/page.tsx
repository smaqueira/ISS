import FacturacionView from '@/components/dashboard/FacturacionView'

export const dynamic = 'force-dynamic'

export default function FacturacionPage() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 2 }}>💰 Facturación</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Lo único que importa: cuánto vendés. Hoy, la semana, el mes, y tus mejores clientes.
        </p>
      </div>
      <FacturacionView />
    </div>
  )
}
