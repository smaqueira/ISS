'use client'
import { useState } from 'react'
import type { DailyTask } from '@/lib/types'
import TaskCard from '@/components/ui/TaskCard'

export default function DashboardTasks({ tasks: initial }: { tasks: DailyTask[] }) {
  const [tasks, setTasks] = useState(initial)

  async function markDone(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ done: true }), headers: { 'Content-Type': 'application/json' } })
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: true } : t))
  }

  const pending = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  if (pending.length === 0 && done.length === 0) {
    return <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>✅ Sin tareas pendientes hoy</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pending.map(t => <TaskCard key={t.id} task={t} onDone={markDone} />)}
      {done.length > 0 && (
        <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.78rem' }}>
          ✅ {done.length} tarea{done.length > 1 ? 's' : ''} completada{done.length > 1 ? 's' : ''} hoy
        </div>
      )}
    </div>
  )
}
