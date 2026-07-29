import DiaComercial from '@/components/dashboard/DiaComercial'

export const dynamic = 'force-dynamic'

export default function DiaPage() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 2 }}>🌅 Iniciar día — Vitto Mare</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Tu día comercial arranca en 0% y se resetea cada noche a las 00:00. Sin excusas de ayer: lo que importa es hoy.
        </p>
      </div>
      <DiaComercial />
    </div>
  )
}
