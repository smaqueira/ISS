export const dynamic = 'force-dynamic'

export default function BackupPage() {
  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 2 }}>💾 Backup de datos</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          Descargá una copia de tus datos (clientes, pedidos, configuración e historial). Es lo que NO está en GitHub — GitHub guarda el código, esto guarda tu información.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
          El archivo incluye:
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <li>👥 <strong>Clientes</strong> (toda la cartera)</li>
            <li>📦 <strong>Pedidos</strong> e ítems</li>
            <li>⚙️ <strong>Configuración</strong> (settings, incluidos precios mayoristas)</li>
            <li>🕒 <strong>Historial</strong> de contactos e interacciones</li>
          </ul>
        </div>

        <a href="/api/backup" download className="btn btn-primary" style={{ justifyContent: 'center', padding: 14, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⬇️ Descargar backup (.json)
        </a>

        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          Se baja un archivo <code>backup-vittomare-FECHA.json</code>. Guardalo en tu compu o Drive.
          <br />
          <strong style={{ color: 'var(--text)' }}>Recomendación:</strong> bajá un backup <strong>una vez por semana</strong> (o antes de una limpieza grande de contactos). Con eso, si algo le pasa a la base, tenés tus clientes y config a salvo.
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: '0.76rem', color: 'var(--muted)', background: '#f59e0b12', border: '1px solid #f59e0b40', borderRadius: 10, padding: '10px 14px' }}>
        ⚠️ Este archivo contiene datos sensibles (tu cartera completa de clientes). Guardalo en un lugar seguro y no lo compartas.
      </div>
    </div>
  )
}
