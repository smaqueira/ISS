'use client'
import type { DailyTask } from '@/lib/types'

const ICON = { urgente: '🔴', importante: '🟡', rutina: '🟢' }

interface Props {
  task: DailyTask
  onDone: (id: string) => void
}

export default function TaskCard({ task, onDone }: Props) {
  return (
    <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', opacity: task.done ? 0.4 : 1 }}>
      <span style={{ fontSize: '1.2rem', marginTop: 2 }}>{ICON[task.priority]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{task.title}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{task.description}</div>
        {task.client_name && (
          <div style={{ marginTop: 6 }}>
            <span className="badge badge-b2b">{task.client_name}</span>
          </div>
        )}
      </div>
      {!task.done && (
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', padding: '6px 12px' }} onClick={() => onDone(task.id)}>
          ✅ Hecho
        </button>
      )}
    </div>
  )
}
