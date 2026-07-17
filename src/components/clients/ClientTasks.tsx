'use client'
import { useState, useEffect } from 'react'
import { PRIORIDAD_OPTIONS } from '@/lib/crm'

interface Task {
  id: string
  client_id: string
  titulo: string
  fecha_limite?: string
  prioridad: 'alta' | 'media' | 'baja'
  completada: boolean
  created_at: string
}

interface Props { clientId: string }

const prioColor: Record<string, string> = { alta: '#ef4444', media: '#f59e0b', baja: '#94a3b8' }

function isOverdue(date?: string, completada?: boolean) {
  if (!date || completada) return false
  return new Date(date) < new Date(new Date().toDateString())
}

export default function ClientTasks({ clientId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ titulo: '', fecha_limite: '', prioridad: 'media' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/tasks`)
      .then(r => r.json())
      .then(data => { setTasks(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [clientId])

  async function toggle(task: Task) {
    const updated = { ...task, completada: !task.completada }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    await fetch(`/api/client-tasks/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completada: updated.completada }),
    })
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/client-tasks/${id}`, { method: 'DELETE' })
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    setSaving(true)
    const res = await fetch(`/api/clients/${clientId}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.id) {
      setTasks(prev => [...prev, data])
      setForm({ titulo: '', fecha_limite: '', prioridad: 'media' })
      setAdding(false)
    }
    setSaving(false)
  }

  const pending = tasks.filter(t => !t.completada)
  const done    = tasks.filter(t => t.completada)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={sectionTitle}>
          Tareas {pending.length > 0 && <span style={{ background: '#6366f122', color: '#6366f1', borderRadius: 10, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700, marginLeft: 6 }}>{pending.length}</span>}
        </div>
        <button onClick={() => setAdding(v => !v)} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
          {adding ? '✕ Cancelar' : '+ Tarea'}
        </button>
      </div>

      {adding && (
        <form onSubmit={addTask} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            autoFocus
            value={form.titulo}
            onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
            placeholder="Descripción de la tarea..."
            style={inputSt}
            required
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={form.fecha_limite}
              onChange={e => setForm(p => ({ ...p, fecha_limite: e.target.value }))}
              style={{ ...inputSt, flex: 1, minWidth: 140 }}
            />
            <select
              value={form.prioridad}
              onChange={e => setForm(p => ({ ...p, prioridad: e.target.value }))}
              style={{ ...inputSt, flex: 1, minWidth: 120 }}
            >
              {PRIORIDAD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.82rem' }}>
              {saving ? '...' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {loading && <div style={{ color: 'var(--muted)', fontSize: '0.82rem', padding: '8px 0' }}>Cargando...</div>}

      {!loading && tasks.length === 0 && !adding && (
        <div style={{ color: 'var(--muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>Sin tareas. Usá "+ Tarea" para agregar.</div>
      )}

      {pending.map(task => (
        <TaskRow key={task.id} task={task} onToggle={toggle} onDelete={deleteTask} />
      ))}

      {done.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer', userSelect: 'none', marginBottom: 6 }}>
            {done.length} completada{done.length !== 1 ? 's' : ''}
          </summary>
          {done.map(task => (
            <TaskRow key={task.id} task={task} onToggle={toggle} onDelete={deleteTask} />
          ))}
        </details>
      )}
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: (t: Task) => void; onDelete: (id: string) => void }) {
  const overdue = isOverdue(task.fecha_limite, task.completada)
  const color = prioColor[task.prioridad] || '#94a3b8'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 4,
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
      borderLeft: `3px solid ${task.completada ? 'var(--border)' : color}`,
      opacity: task.completada ? 0.55 : 1,
    }}>
      <button
        onClick={() => onToggle(task)}
        style={{
          width: 18, height: 18, borderRadius: 4, border: `2px solid ${task.completada ? '#22c55e' : color}`,
          background: task.completada ? '#22c55e' : 'transparent',
          cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}
        title={task.completada ? 'Marcar pendiente' : 'Marcar completada'}
      >
        {task.completada && <span style={{ color: 'white', fontSize: '0.7rem', lineHeight: 1 }}>✓</span>}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.83rem', textDecoration: task.completada ? 'line-through' : 'none', color: task.completada ? 'var(--muted)' : 'var(--text)' }}>
          {task.titulo}
        </div>
        {task.fecha_limite && (
          <div style={{ fontSize: '0.7rem', color: overdue ? '#ef4444' : 'var(--muted)', marginTop: 1 }}>
            {overdue ? '🔴 ' : ''}{task.fecha_limite}
          </div>
        )}
      </div>

      <span style={{ fontSize: '0.65rem', fontWeight: 700, color, padding: '1px 6px', background: color + '18', borderRadius: 4, flexShrink: 0 }}>
        {task.prioridad}
      </span>

      <button
        onClick={() => onDelete(task.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.75rem', padding: '2px 4px', opacity: 0.5 }}
        title="Eliminar tarea"
      >
        🗑️
      </button>
    </div>
  )
}

const sectionTitle: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }
const inputSt: React.CSSProperties = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: '0.83rem', width: '100%', boxSizing: 'border-box' }
