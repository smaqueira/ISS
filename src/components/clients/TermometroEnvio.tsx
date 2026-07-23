'use client'
import { useEffect, useState } from 'react'

// Umbrales conservadores para cuidar la cuenta (editables acá).
const LIMITES = {
  diaVerde: 20,      // 🟢 hasta acá
  diaAmarillo: 35,   // 🟡 hasta acá, más = 🔴
  horaAmarillo: 6,   // 🟡 si supera esto en la última hora
  horaRojo: 10,      // 🔴 si supera esto en la última hora
  espaciadoSeg: 90,  // conviene esperar al menos esto entre envíos
}

type Canal = 'whatsapp' | 'instagram'
type Nivel = 'verde' | 'amarillo' | 'rojo'
interface Estado { hoy: number; ultimaHora: number; ultimoEnvio: string | null }

const COLOR: Record<Nivel, string> = { verde: '#22c55e', amarillo: '#f59e0b', rojo: '#ef4444' }
const EMOJI: Record<Nivel, string> = { verde: '🟢', amarillo: '🟡', rojo: '🔴' }
const TITULO: Record<Nivel, string> = {
  verde: 'Ritmo seguro',
  amarillo: 'Ir más despacio',
  rojo: 'Frená los envíos por hoy',
}
const NOMBRE: Record<Canal, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram' }

function calcularNivel(e: Estado): { nivel: Nivel; segs: number | null } {
  const segs = e.ultimoEnvio ? Math.floor((Date.now() - new Date(e.ultimoEnvio).getTime()) / 1000) : null
  let nivel: Nivel = 'verde'
  if (e.hoy > LIMITES.diaAmarillo || e.ultimaHora > LIMITES.horaRojo) nivel = 'rojo'
  else if (e.hoy > LIMITES.diaVerde || e.ultimaHora > LIMITES.horaAmarillo) nivel = 'amarillo'
  if (nivel === 'verde' && segs !== null && segs < LIMITES.espaciadoSeg) nivel = 'amarillo'
  return { nivel, segs }
}

function haceCuanto(segs: number | null): string {
  if (segs === null) return 'sin envíos hoy'
  if (segs < 60) return `hace ${segs}s`
  if (segs < 3600) return `hace ${Math.floor(segs / 60)}m`
  return `hace ${Math.floor(segs / 3600)}h`
}

export default function TermometroEnvio({ compact = false, canal = 'whatsapp' }: { compact?: boolean; canal?: Canal }) {
  const [estado, setEstado] = useState<Estado | null>(null)

  useEffect(() => {
    fetch('/api/whatsapp/estado-envio')
      .then(r => r.json())
      .then(d => setEstado(d?.[canal] ?? null))
      .catch(() => {})
  }, [canal])

  if (!estado) return null

  const { nivel, segs } = calcularNivel(estado)
  const color = COLOR[nivel]
  const debeEsperar = segs !== null && segs < LIMITES.espaciadoSeg

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--muted)' }}>
        <span>{EMOJI[nivel]}</span>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{NOMBRE[canal]} hoy: {estado.hoy}</span>
        <span>· última hora: {estado.ultimaHora}</span>
        <span>· {haceCuanto(segs)}</span>
      </div>
    )
  }

  return (
    <div style={{
      background: `${color}12`, border: `1px solid ${color}55`, borderRadius: 10,
      padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, color }}>
        <span>{EMOJI[nivel]}</span>
        <span>{TITULO[nivel]} · {NOMBRE[canal]}</span>
      </div>
      <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
        Enviados hoy: <strong style={{ color: 'var(--text)' }}>{estado.hoy}</strong>
        {' · '}última hora: <strong style={{ color: 'var(--text)' }}>{estado.ultimaHora}</strong>
        {' · '}último {haceCuanto(segs)}
      </div>

      {debeEsperar && (
        <div style={{ fontSize: '0.76rem', color }}>
          ⏳ Esperá ~{LIMITES.espaciadoSeg - (segs ?? 0)}s antes del próximo para no mandar en ráfaga.
        </div>
      )}

      {nivel !== 'verde' && (
        <div style={{ fontSize: '0.76rem', color: 'var(--muted)', borderTop: `1px solid ${color}33`, paddingTop: 6, marginTop: 2 }}>
          {canal === 'whatsapp' ? (
            <>💡 Para no arriesgar la cuenta, contactá a los próximos por{' '}
              <a href="/admin/instagram-hoy" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Instagram</a>
              {' '}o email.</>
          ) : (
            <>💡 Frená por hoy. Para los próximos, probá email o una visita/llamada — y seguí mañana.</>
          )}
        </div>
      )}
    </div>
  )
}
