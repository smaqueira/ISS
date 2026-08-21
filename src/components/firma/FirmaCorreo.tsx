'use client'
import { useEffect, useRef, useState } from 'react'

/** Datos personales de quien firma (se guardan en settings). */
interface Datos {
  nombre: string
  cargo: string
  telefono: string
  email: string
}

const AZUL = '#0D1326'
const AGUA = '#7EC8C8'
const ORO  = '#C9A96E'

export default function FirmaCorreo() {
  const [d, setD] = useState<Datos>({ nombre: '', cargo: '', telefono: '', email: '' })
  const [emp, setEmp] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [copiado, setCopiado] = useState<'html' | 'texto' | null>(null)
  const firmaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((arr) => {
      if (!Array.isArray(arr)) return
      const s = Object.fromEntries(arr.map((r: { key: string; value: string }) => [r.key, r.value]))
      setEmp(s)
      setD({
        nombre: s.FIRMA_NOMBRE || '',
        cargo: s.FIRMA_CARGO || '',
        telefono: s.FIRMA_TELEFONO || s.COMPANY_WHATSAPP || '',
        email: s.FIRMA_EMAIL || '',
      })
    }).catch(() => {})
  }, [])

  async function guardar() {
    setGuardando(true)
    try {
      await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'FIRMA_NOMBRE', value: d.nombre },
          { key: 'FIRMA_CARGO', value: d.cargo },
          { key: 'FIRMA_TELEFONO', value: d.telefono },
          { key: 'FIRMA_EMAIL', value: d.email },
        ]),
      })
      setOk(true); setTimeout(() => setOk(false), 2000)
    } finally { setGuardando(false) }
  }

  // Datos de la empresa
  const negocio = emp.COMPANY_NAME || 'Vitto Mare'
  const logo = emp.COMPANY_LOGO_URL || ''
  const wsp = (emp.COMPANY_WHATSAPP || '').replace(/^\++/, '')
  const ig = (emp.COMPANY_INSTAGRAM || '').replace(/^@/, '')
  const web = emp.WEB_URL || 'vittomare.com'
  const tel = d.telefono.replace(/^\++/, '')

  /** HTML con tablas: es lo único que respetan Gmail y Outlook. */
  function html(): string {
    const link = (t: string, h: string) =>
      `<a href="${h}" style="color:${AGUA};text-decoration:none">${t}</a>`
    return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${AZUL};line-height:1.5">
  <tr>
    ${logo ? `<td style="padding-right:16px;border-right:2px solid ${AGUA};vertical-align:middle">
      <img src="${logo}" alt="${negocio}" width="72" style="display:block;width:72px;height:auto" />
    </td>` : ''}
    <td style="padding-left:${logo ? '16px' : '0'};vertical-align:middle">
      <div style="font-size:15px;font-weight:bold;color:${AZUL}">${d.nombre || 'Nombre Apellido'}</div>
      ${d.cargo ? `<div style="font-size:12px;color:#64748b;padding-bottom:6px">${d.cargo}</div>` : ''}
      <div style="font-size:14px;font-weight:bold;color:${AZUL};letter-spacing:0.5px">${negocio.toUpperCase()}</div>
      <div style="font-size:11px;color:${ORO};letter-spacing:2px;padding-bottom:8px">PESCADOS &middot; MARISCOS</div>
      <div style="font-size:12px;color:#334155">
        ${tel ? `📞 ${link(d.telefono, `https://wa.me/${tel.replace(/\D/g, '')}`)}<br/>` : ''}
        ${d.email ? `✉️ ${link(d.email, `mailto:${d.email}`)}<br/>` : ''}
        ${ig ? `📸 ${link('@' + ig, `https://instagram.com/${ig}`)}<br/>` : ''}
        🌐 ${link(web.replace(/^https?:\/\//, ''), web.startsWith('http') ? web : `https://${web}`)}
      </div>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top:10px">
      <div style="border-top:1px solid #e2e8f0;padding-top:8px;font-size:10px;color:#94a3b8">
        Distribución mayorista de pescados y mariscos &middot; Entrega a domicilio &middot; Cadena de frío cuidada
      </div>
    </td>
  </tr>
</table>`.trim()
  }

  function texto(): string {
    return [
      d.nombre, d.cargo, '', negocio.toUpperCase(), 'Pescados · Mariscos', '',
      d.telefono && `Tel: ${d.telefono}`,
      d.email && `Email: ${d.email}`,
      ig && `Instagram: @${ig}`,
      `Web: ${web}`,
    ].filter(Boolean).join('\n')
  }

  /** Copia con formato para que Gmail/Outlook la peguen tal cual. */
  async function copiarHtml() {
    try {
      const blob = new Blob([html()], { type: 'text/html' })
      const plano = new Blob([texto()], { type: 'text/plain' })
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob, 'text/plain': plano })])
      setCopiado('html'); setTimeout(() => setCopiado(null), 2500)
    } catch {
      // Fallback: seleccionar el bloque para copiar a mano
      if (firmaRef.current) {
        const r = document.createRange(); r.selectNodeContents(firmaRef.current)
        const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r)
        alert('Seleccioné la firma: copiala con Ctrl+C y pegala en Gmail.')
      }
    }
  }

  const campo = (label: string, k: keyof Datos, ph: string) => (
    <label style={{ fontSize: '0.8rem', display: 'block' }}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <input value={d[k]} onChange={e => setD(p => ({ ...p, [k]: e.target.value }))} placeholder={ph}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
    </label>
  )

  return (
    <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>✍️ Firma de correo</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          Completá tus datos y copiala. Los datos de la empresa salen de <strong>Configuración</strong>.
        </p>
      </div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {campo('Nombre y apellido', 'nombre', 'Sebastián Maqueira')}
        {campo('Cargo', 'cargo', 'Ventas mayoristas')}
        {campo('Teléfono / WhatsApp', 'telefono', '+54 9 11 6047-4554')}
        {campo('Email', 'email', 'ventas@vittomare.com')}
      </div>

      {/* Vista previa: así se va a ver en el correo */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Vista previa
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid var(--border)' }}>
          <div ref={firmaRef} dangerouslySetInnerHTML={{ __html: html() }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={copiarHtml} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          {copiado === 'html' ? '✅ Copiada con formato' : '📋 Copiar firma'}
        </button>
        <button onClick={() => { navigator.clipboard.writeText(html()); setCopiado('texto'); setTimeout(() => setCopiado(null), 2500) }}
          className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
          {copiado === 'texto' ? '✅ HTML copiado' : '</> Copiar código HTML'}
        </button>
        <button onClick={guardar} disabled={guardando} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
          {guardando ? 'Guardando…' : ok ? '✅ Guardado' : '💾 Guardar mis datos'}
        </button>
      </div>

      <div className="card" style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text)' }}>Cómo ponerla en Gmail:</strong><br />
        1. Tocá <strong>📋 Copiar firma</strong> (copia con formato, no como código).<br />
        2. En Gmail: <strong>⚙️ Configuración → Ver toda la configuración → Firma → Crear nueva</strong>.<br />
        3. Pegá con <strong>Ctrl+V</strong> y guardá los cambios abajo de todo.<br />
        <br />
        <strong style={{ color: 'var(--text)' }}>En Outlook:</strong> Archivo → Opciones → Correo → Firmas → Nueva → pegar.<br />
        <br />
        💡 Si el logo no se ve, es porque la imagen tiene que estar en una URL pública — cargala en <strong>Configuración → Logo</strong>.
      </div>
    </div>
  )
}
