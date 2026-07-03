import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'
import { notFound } from 'next/navigation'

type Params = Promise<{ id: string }>

export default async function CotizacionPage({ params }: { params: Params }) {
  const { id } = await params
  const db = await createClient()
  const { data: cot } = await db.from('cotizaciones').select('*').eq('id', id).single()
  if (!cot) notFound()

  const [companyName, logoUrl, companyPhone, companyEmail] = await Promise.all([
    getSetting('COMPANY_NAME'),
    getSetting('COMPANY_LOGO_URL'),
    getSetting('COMPANY_WHATSAPP'),
    getSetting('COMPANY_EMAIL'),
  ])

  const expiryDate = new Date(cot.created_at)
  expiryDate.setDate(expiryDate.getDate() + (cot.validity_days || 7))
  const total = (cot.items || []).reduce((s: number, i: { qty: number; unit_price: number }) => s + i.qty * i.unit_price, 0)
  const cotNumber = cot.id.slice(0, 8).toUpperCase()

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Cotización {cotNumber} — {cot.client_name}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; }
          .page { max-width: 780px; margin: 0 auto; background: white; min-height: 100vh; }
          @media print {
            body { background: white; }
            .page { margin: 0; box-shadow: none; }
            .no-print { display: none !important; }
            @page { margin: 1.5cm; }
          }
          @media screen {
            body { padding: 32px 16px; }
            .page { box-shadow: 0 4px 32px rgba(0,0,0,0.10); border-radius: 12px; overflow: hidden; }
          }
        `}</style>
      </head>
      <body>
        {/* Botones de acción — solo pantalla */}
        <div className="no-print" style={{ maxWidth: 780, margin: '0 auto 20px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <a href="/admin/cotizaciones" style={{ background: '#f1f5f9', color: '#475569', borderRadius: 8, padding: '8px 16px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>← Volver</a>
          <button onClick={() => window.print()} style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>⬇️ Descargar PDF</button>
          {cot.client_phone && (
            <a href={`https://wa.me/${cot.client_phone.replace(/\D/g, '')}?text=Hola ${cot.client_name}, te comparto la cotización N° ${cotNumber}: ${typeof window !== 'undefined' ? window.location.href : ''}`}
              target="_blank" rel="noreferrer"
              style={{ background: '#25D366', color: 'white', borderRadius: 8, padding: '8px 16px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}>
              💬 Enviar por WhatsApp
            </a>
          )}
        </div>

        <div className="page">
          {/* Header */}
          <div style={{ background: '#1e293b', color: 'white', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {logoUrl
                ? <img src={logoUrl} alt="Logo" style={{ height: 52, objectFit: 'contain', marginBottom: 12, filter: 'brightness(0) invert(1)' }} />
                : <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12, color: '#f97316' }}>{companyName || 'Empresa'}</div>
              }
              <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>{companyPhone && `📱 ${companyPhone}`}</div>
              <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>{companyEmail && `✉️ ${companyEmail}`}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.6, marginBottom: 6 }}>Cotización</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f97316' }}>N° {cotNumber}</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: 6 }}>
                Fecha: {new Date(cot.created_at).toLocaleDateString('es-AR')}<br />
                Válida hasta: {expiryDate.toLocaleDateString('es-AR')}
              </div>
            </div>
          </div>

          <div style={{ padding: '36px 40px' }}>
            {/* Cliente */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 2, color: '#94a3b8', marginBottom: 8 }}>Dirigida a</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{cot.client_name}</div>
            </div>

            {/* Intro */}
            {cot.intro && (
              <div style={{ marginBottom: 28, padding: '16px 20px', background: '#f8fafc', borderLeft: '4px solid #f97316', borderRadius: '0 8px 8px 0', fontSize: '0.88rem', lineHeight: 1.6, color: '#475569' }}>
                {cot.intro}
              </div>
            )}

            {/* Tabla de items */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 2, color: '#94a3b8', marginBottom: 12 }}>Detalle</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Producto</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Cant.</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Precio unit.</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(cot.items || []).map((item: { name: string; qty: number; unit: string; unit_price: number }, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b' }}>{item.qty} {item.unit}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b' }}>${item.unit_price.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>${(item.qty * item.unit_price).toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div style={{ background: '#1e293b', color: 'white', borderRadius: '0 0 10px 10px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>TOTAL</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f97316' }}>${total.toLocaleString('es-AR')}</div>
              </div>
            </div>

            {/* Nota de cierre */}
            {cot.notes && (
              <div style={{ marginBottom: 32, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                {cot.notes}
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {companyName} · Cotización válida hasta el {expiryDate.toLocaleDateString('es-AR')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 700 }}>
                {companyPhone}
              </div>
            </div>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelectorAll('.no-print button[onclick]').forEach(btn => {
            btn.onclick = () => window.print();
          });
        `}} />
      </body>
    </html>
  )
}
