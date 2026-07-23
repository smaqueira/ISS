'use client'
import { useEffect, useState } from 'react'

// Plan conservador: 100 follows/día repartidos en 5 bloques de 20.
const LIMITE_DIA = 100
const POR_BLOQUE = 20
const BLOQUES = [
  { label: '09:00', min: 9 * 60 },
  { label: '11:30', min: 11 * 60 + 30 },
  { label: '14:00', min: 14 * 60 },
  { label: '16:30', min: 16 * 60 + 30 },
  { label: '19:00', min: 19 * 60 },
]

export default function SeguimientosHoy() {
  const [hoy, setHoy] = useState<number | null>(null)

  useEffect(() => {
    const cargar = () => fetch('/api/whatsapp/estado-envio')
      .then(r => r.json())
      .then(d => setHoy(d?.seguidos?.hoy ?? 0))
      .catch(() => {})
    cargar()
    const t = setInterval(cargar, 60000) // refresca cada minuto
    return () => clearInterval(t)
  }, [])

  if (hoy === null) return null

  // Hora actual en Argentina (UTC-3)
  const ar = new Date(Date.now() - 3 * 3600 * 1000)
  const nowMin = ar.getUTCHours() * 60 + ar.getUTCMinutes()
  const bloquesIniciados = BLOQUES.filter(b => nowMin >= b.min).length
  const permitidoAhora = Math.min(bloquesIniciados * POR_BLOQUE, LIMITE_DIA)
  const restanteDia = Math.max(0, LIMITE_DIA - hoy)
  const proximo = BLOQUES.find(b => nowMin < b.min)

  let nivel: 'verde' | 'amarillo' | 'rojo'
  let mensaje: string
  if (hoy >= LIMITE_DIA) {
    nivel = 'rojo'
    mensaje = '🔴 Límite diario alcanzado (100). Pará por hoy — seguí mañana a las 09:00.'
  } else if (bloquesIniciados === 0) {
    nivel = 'amarillo'
    mensaje = '🟡 El primer bloque es a las 09:00. Mejor esperá para arrancar.'
  } else if (hoy < permitidoAhora) {
    nivel = 'verde'
    mensaje = `🟢 Podés seguir: te faltan ${permitidoAhora - hoy} en este bloque${proximo ? ` (hasta las ${proximo.label})` : ''}.`
  } else {
    nivel = 'amarillo'
    mensaje = proximo
      ? `✋ Frená — ya cubriste este bloque (${permitidoAhora}). Próximo bloque: ${proximo.label}.`
      : '✋ Cubriste todos los bloques por hoy. Podés parar.'
  }

  const COLOR = { verde: '#22c55e', amarillo: '#f59e0b', rojo: '#ef4444' }[nivel]
  const pct = Math.min(100, Math.round((hoy / LIMITE_DIA) * 100))

  return (
    <div style={{ background: `${COLOR}12`, border: `1px solid ${COLOR}55`, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>👣 Seguimientos de hoy</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--text)' }}>{hoy}</strong>/{LIMITE_DIA} · quedan {restanteDia}
        </span>
      </div>

      {/* Barra de progreso */}
      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: COLOR, transition: 'width .3s' }} />
      </div>

      <div style={{ fontSize: '0.78rem', color: COLOR, fontWeight: 600 }}>{mensaje}</div>

      {/* Bloques del día */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {BLOQUES.map((b, i) => {
          const meta = (i + 1) * POR_BLOQUE
          const cumplido = hoy >= meta
          const actual = nowMin >= b.min && (i === BLOQUES.length - 1 || nowMin < BLOQUES[i + 1].min)
          return (
            <span key={b.label} style={{
              fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12,
              border: `1px solid ${cumplido ? '#22c55e66' : actual ? `${COLOR}88` : 'var(--border)'}`,
              background: cumplido ? '#22c55e18' : actual ? `${COLOR}18` : 'transparent',
              color: cumplido ? '#22c55e' : actual ? COLOR : 'var(--muted)',
              fontWeight: actual ? 700 : 400,
            }}>
              {cumplido ? '✅ ' : actual ? '⏳ ' : ''}{b.label} ({meta})
            </span>
          )
        })}
      </div>
    </div>
  )
}
