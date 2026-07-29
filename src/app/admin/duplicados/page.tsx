import DuplicadosView from '@/components/clients/DuplicadosView'

export const dynamic = 'force-dynamic'

export default function DuplicadosPage() {
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 2 }}>🔁 Duplicados</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Contactos que comparten teléfono, Instagram, email o nombre+ciudad. Revisá cada grupo y eliminá los repetidos (dejá el más completo).
        </p>
      </div>
      <DuplicadosView />
    </div>
  )
}
