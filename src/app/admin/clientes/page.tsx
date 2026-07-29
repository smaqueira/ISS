import ClientesReactivar from '@/components/clients/ClientesReactivar'

export const dynamic = 'force-dynamic'

export default function ClientesReactivarPage() {
  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 2 }}>💰 Reactivar clientes</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Clientes que compraron y dejaron de comprar. Por cada uno decidí: le escribís hoy, o lo posponés. En mayorista, la recompra es la facturación.
        </p>
      </div>
      <ClientesReactivar />
    </div>
  )
}
