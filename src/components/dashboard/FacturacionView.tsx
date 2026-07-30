'use client'
import { useEffect, useState } from 'react'

interface Periodo { total: number; pedidos: number }
interface Data {
  hoy: Periodo; semana: Periodo; mes: Periodo
  topClientes: { nombre: string; total: number; pedidos: number }[]
  metaMes: number; metaDia: number; pctMes: number | null; pctHoy: number | null
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

function Card({ label, p, color }: { label: string; p: Periodo; color: string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, color }}>{fmt(p.total)}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{p.pedidos} {p.pedidos === 1 ? 'pedido' : 'pedidos'}</div>
    </div>
  )
}

export default function FacturacionView() {
  const [data, setData] = useState<Data | null>(null)
  const [metaInput, setMetaInput] = useState('')
  const [editandoMeta, setEditandoMeta] = useState(false)

  const cargar = () => fetch('/api/facturacion').then(r => r.json()).then(setData).catch(() => {})
  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 60000)
    return () => clearInterval(t)
  }, [])

  async function guardarMeta() {
    const v = Math.max(0, Math.round(Number(metaInput.replace(/[^0-9.]/g, '')) || 0))
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ key: 'META_FACTURACION_MES', value: String(v) }]) })
    setEditandoMeta(false)
    cargar()
  }

  if (!data) return <div style={{ color: 'var(--muted)', padding: 20 }}>⏳ Cargando facturación…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Card label="Hoy" p={data.hoy} color="#22c55e" />
        <Card label="Últimos 7 días" p={data.semana} color="#7EC8C8" />
        <Card label="Este mes" p={data.mes} color="#C9A96E" />
      </div>

      {/* Meta del mes */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>🎯 Meta del mes</span>
          {editandoMeta ? (
            <span style={{ display: 'flex', gap: 6 }}>
              <input value={metaInput} onChange={e => setMetaInput(e.target.value)} placeholder="$ meta mensual" onKeyDown={e => { if (e.key === 'Enter') guardarMeta() }}
                style={{ width: 140, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text)', fontSize: '0.82rem' }} />
              <button onClick={guardarMeta} className="btn btn-primary" style={{ fontSize: '0.78rem' }}>Guardar</button>
            </span>
          ) : (
            <button onClick={() => { setMetaInput(String(data.metaMes || '')); setEditandoMeta(true) }} className="btn btn-ghost" style={{ fontSize: '0.78rem' }}>
              {data.metaMes ? `${fmt(data.metaMes)} · editar` : '+ Definir meta'}
            </button>
          )}
        </div>
        {data.metaMes > 0 ? (
          <>
            <div style={{ height: 10, borderRadius: 5, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ width: `${data.pctMes || 0}%`, height: '100%', background: (data.pctMes || 0) >= 90 ? '#22c55e' : (data.pctMes || 0) >= 50 ? '#f59e0b' : '#ef4444', transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{fmt(data.mes.total)}</strong> de {fmt(data.metaMes)} · <strong>{data.pctMes}%</strong> del mes
              {data.metaDia ? <> · meta diaria {fmt(data.metaDia)} (hoy {data.pctHoy ?? 0}%)</> : null}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Definí tu meta mensual en $ para ver el % de avance y que cuente en el score del día.</div>
        )}
      </div>

      <div className="card">
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          🏆 Top clientes del mes
        </div>
        {data.topClientes.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Todavía no hay pedidos este mes. Registralos con el botón 💵 en cada contacto.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.topClientes.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', borderTop: i ? '1px solid var(--border)' : 'none', paddingTop: i ? 6 : 0 }}>
                <span style={{ color: 'var(--muted)', width: 20 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{c.nombre}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{c.pedidos} ped.</span>
                <span style={{ fontWeight: 800, color: '#22c55e' }}>{fmt(c.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
        Registrá cada venta con el botón <strong style={{ color: '#22c55e' }}>💵</strong> en la fila del contacto (en Contactos o Contactar hoy). Al registrar un pedido, el contacto pasa a <strong>cliente</strong> (o <strong>recurrente</strong> si ya compró).
      </div>
    </div>
  )
}
