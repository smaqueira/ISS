interface Props {
  label: string
  value: string | number
  icon: string
  color?: string
  sub?: string
}

export default function MetricCard({ label, value, icon, color = 'var(--accent)', sub }: Props) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
          {sub && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      </div>
    </div>
  )
}
