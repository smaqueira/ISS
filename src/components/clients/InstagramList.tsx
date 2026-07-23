'use client'
import { useState } from 'react'
import InstagramCard from './InstagramCard'

export interface IgItem {
  id: string
  name: string
  rubro: string | null
  city: string | null
  handle: string
  message: string
  seguidoInicial: boolean
  likeInicial: boolean
  teSigueInicial: boolean
}

const VISIBLE = 10  // cuántos mostrar a la vez (el resto es reserva)

export default function InstagramList({ items }: { items: IgItem[] }) {
  const [done, setDone] = useState<Set<string>>(new Set())

  const pendientes = items.filter(i => !done.has(i.id))
  const visibles = pendientes.slice(0, VISIBLE)
  const reserva = pendientes.length - visibles.length

  function marcarDone(id: string) {
    setDone(prev => new Set(prev).add(id))
  }

  if (pendientes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: '0.85rem' }}>
        ¡Listo por hoy! No quedan contactos pendientes en la lista. 🎉
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
        Mostrando {visibles.length} · {reserva} en reserva
      </div>
      {visibles.map(c => (
        <InstagramCard
          key={c.id}
          id={c.id}
          name={c.name}
          rubro={c.rubro}
          city={c.city}
          handle={c.handle}
          message={c.message}
          seguidoInicial={c.seguidoInicial}
          likeInicial={c.likeInicial}
          teSigueInicial={c.teSigueInicial}
          onDone={marcarDone}
        />
      ))}
    </div>
  )
}
