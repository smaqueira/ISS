'use client'
import { useEffect, useState } from 'react'

// Plan conservador: hasta 100 follows/día, PERO nunca en ráfaga.
// El límite real que cuida la cuenta es el RITMO: pocos por hora, espaciados.
const LIMITE_DIA = 100
const MAX_HORA = 20        // no más de ~20 por hora (anti-ráfaga)
const TANDA_SUGERIDA = 8   // hacé de a ~8 y una pausa
const BLOQUES = [
  { label: '09:00', min: 9 * 60 },
  { label: '11:30', min: 11 * 60 + 30 },
  { label: '14:00', min: 14 * 60 },
  { label: '16:30', min: 16 * 60 + 30 },
  { label: '19:00', min: 19 * 60 },
]

export default function SeguimientosHoy() {
  const [hoy, setHoy] = useState<number | null>(null)
  const [ultimaHora, setUltimaHora] = useState(0)

  useEffect(() => {
    const cargar = () => fetch('/api/whatsapp/estado-envio')
      .then(r => r.json())
      .then(d => { setHoy(d?.seguidos?.hoy ?? 0); setUltimaHora(d?.seguidos?.ultimaHora ?? 0) })
      .catch(() => {})
    cargar()
    const t = setInterval(cargar, 60000)
    // Al marcar "Seguido" en una tarjeta, subir los contadores al instante
    const onSeguido = () => { setHoy(h => (h ?? 0) + 1); setUltimaHora(x => x + 1) }
    window.addEventListener('ig-seguido', onSeguido)
    return () => { clearInterval(t); window.removeEventListener('ig-seguido', onSeguido) }
  }, [])

  if (hoy === null) return null

  const ar = new Date(Date.now() - 3 * 3600 * 1000)
  const nowMin = ar.getUTCHours() * 60 + ar.getUTCMinutes()
  const restanteDia = Math.max(0, LIMITE_DIA - hoy)
  // Cuántos más podés hacer YA sin ráfaga (por hora), respetando el tope diario
  const puedeAhora = Math.max(0, Math.min(MAX_HORA - ultimaHora, restanteDia))

  let nivel: 'verde' | 'amarillo' | 'rojo'
  let mensaje: string
  if (hoy >= LIMITE_DIA) {
    nivel = 'rojo'
    mensaje = '🔴 Llegaste a 100 por hoy. Pará — seguí mañana.'
  } else if (ultimaHora >= MAX_HORA) {
    nivel = 'amarillo'
    mensaje = `✋ Frená ~1 hora: ya hiciste ${ultimaHora} en la última hora. Nada de ráfagas.`
  } else {
    nivel = 'verde'
    mensaje = `🟢 Podés seguir ~${puedeAhora} ahora, de a poco (unos ${TANDA_SUGERIDA} y una pausa). No los hagas todos juntos.`
  }

  const COLOR = { verde: '#22c55e', amarillo: '#f59e0b', rojo: '#ef4444' }[nivel]
  const pct = Math.min(100, Math.round((hoy / LIMITE_DIA) * 100))

  return (
    <div style={{ background: `${COLOR}12`, border: `1px solid ${COLOR}55`, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>👣 Seguimientos de hoy</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--text)' }}>{hoy}</strong>/{LIMITE_DIA} · última hora: {ultimaHora}
        </span>
      </div>

      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: COLOR, transition: 'width .3s' }} />
      </div>

      <div style={{ fontSize: '0.78rem', color: COLOR, fontWeight: 600 }}>{mensaje}</div>

      {/* Bloques sugeridos del día (~20 c/u, espaciados) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Tandas (~20 c/u):</span>
        {BLOQUES.map((b, i) => {
          const actual = nowMin >= b.min && (i === BLOQUES.length - 1 || nowMin < BLOQUES[i + 1].min)
          const pasado = nowMin >= b.min
          return (
            <span key={b.label} style={{
              fontSize: '0.7rem', padding: '2px 8px', borderRadius: 12,
              border: `1px solid ${actual ? `${COLOR}88` : 'var(--border)'}`,
              background: actual ? `${COLOR}18` : 'transparent',
              color: actual ? COLOR : pasado ? 'var(--text)' : 'var(--muted)',
              fontWeight: actual ? 700 : 400,
            }}>
              {actual ? '⏳ ' : ''}{b.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
