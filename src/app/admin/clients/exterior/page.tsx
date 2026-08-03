import ClientesExterior from '@/components/clients/ClientesExterior'

export const dynamic = 'force-dynamic'

export default function ExteriorPage() {
  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 2 }}>🌎 Contactos del exterior</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Contactos ya cargados cuya dirección es de otro país (entraron antes del filtro de Argentina). Revisá y borrá los que correspondan. Detecta solo los que tienen un país extranjero en la dirección y ningún dato de Argentina.
        </p>
      </div>
      <ClientesExterior />
    </div>
  )
}
