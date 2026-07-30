'use client'
import { useState, useRef } from 'react'

interface PreviewRow {
  name: string
  phone?: string
  email?: string
  city?: string
  type: string
  rubro?: string
  notes?: string
  instagram?: string
  valid: boolean
  error?: string
  warn?: string
}

export default function ImportPage() {
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ imported: number; skipped: number; nuevos?: number; error?: string; sample?: unknown[]; existingCount?: number; sampleExisting?: unknown[]; sampleRows?: unknown[]; debug?: {name:string;phone?:string;city?:string;reasons:string[]}[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function splitCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  function parseCSV(text: string): PreviewRow[] {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return []

    const header = splitCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''))

    const colMap: Record<string, number> = {}
    const aliases: Record<string, string[]> = {
      name:      ['nombre', 'name', 'razon', 'empresa', 'negocio', 'cliente'],
      phone:     ['telefono', 'phone', 'cel', 'celular', 'movil', 'tel'],
      whatsapp:  ['whatsapp'],
      email:     ['email', 'mail', 'correo'],
      city:      ['ciudad', 'city', 'zona', 'barrio', 'localidad'],
      type:      ['tipo', 'type', 'segmento'],
      rubro:     ['rubro', 'categoria', 'giro'],
      notes:     ['notas', 'notes', 'observaciones', 'comentarios'],
      instagram: ['instagram', 'ig', 'arroba', 'usuario'],
      address:   ['direccion', 'domicilio', 'address', 'calle', 'ubicacion'],
      web:       ['web', 'sitio', 'pagina', 'url'],
    }
    for (const [key, aliasList] of Object.entries(aliases)) {
      for (const alias of aliasList) {
        const idx = header.findIndex(h => h.includes(alias))
        if (idx >= 0 && colMap[key] === undefined) { colMap[key] = idx; break }
      }
    }

    return lines.slice(1).map(line => {
      const cols = splitCSVLine(line)
      const PLACEHOLDERS = ['no disponible', 'sin datos', 'n/a', 'nd', '-', '—', 'none', 'null']
      const clean = (v?: string) => {
        const t = v?.trim()
        return (!t || PLACEHOLDERS.includes(t.toLowerCase())) ? undefined : t
      }
      const rawName = clean(colMap.name !== undefined ? cols[colMap.name] : cols[0])
      const phone = clean(colMap.phone !== undefined ? cols[colMap.phone] : undefined)
               || clean(colMap.whatsapp !== undefined ? cols[colMap.whatsapp] : undefined)
      const email = clean(colMap.email !== undefined ? cols[colMap.email] : undefined)
      const city = clean(colMap.city !== undefined ? cols[colMap.city] : undefined)
      const typeRaw = colMap.type !== undefined ? cols[colMap.type]?.toLowerCase() : ''
      const type = typeRaw?.includes('b2b') || typeRaw?.includes('negocio') || typeRaw?.includes('empresa') ? 'b2b' : 'b2c'
      const rubro = clean(colMap.rubro !== undefined ? cols[colMap.rubro] : undefined)
      const instagram = clean(colMap.instagram !== undefined ? cols[colMap.instagram] : undefined)
      const webVal = clean(colMap.web !== undefined ? cols[colMap.web] : undefined)
      const addressVal = clean(colMap.address !== undefined ? cols[colMap.address] : undefined)
      const notesBase = clean(colMap.notes !== undefined ? cols[colMap.notes] : undefined)
      const notes = [notesBase, addressVal ? `Dir: ${addressVal}` : '', webVal ? `Web: ${webVal}` : '']
        .filter(Boolean).join(' | ') || undefined

      // Importar con CUALQUIER dato: si no hay nombre, se deriva. Solo se descarta
      // la fila completamente vacía (sin nombre, tel, email ni instagram).
      const tieneAlgo = !!(rawName || phone || email || instagram)
      const name = rawName || instagram || phone || email || ''
      const warn = tieneAlgo && !phone && !email && !instagram ? 'Solo nombre (sin forma de contacto)' : undefined

      return {
        name: name.trim(),
        phone, email, city, type, rubro, instagram,
        notes: notes?.trim(),
        valid: tieneAlgo,
        error: tieneAlgo ? undefined : 'Fila vacía',
        warn,
      }
    }).filter(r => r.valid)
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setRows(parseCSV(text))
      setDone(null)
    }
    // Intentar UTF-8, si hay caracteres raros reintentar con latin1
    reader.readAsText(file, 'UTF-8')
    reader.onerror = () => {
      const r2 = new FileReader()
      r2.onload = e => { setRows(parseCSV(e.target?.result as string)); setDone(null) }
      r2.readAsText(file, 'ISO-8859-1')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function importAll() {
    const toImport = rows.filter(r => r.valid)
    if (!toImport.length) return
    setImporting(true)
    const res = await fetch('/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: toImport }),
    })
    const data = await res.json()
    setDone(data)
    setImporting(false)
  }

  const validCount = rows.filter(r => r.valid).length
  const warnCount = rows.filter(r => r.valid && r.warn).length

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>Importar contactos</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        Subí un archivo CSV o Excel exportado como CSV. Las columnas se detectan automáticamente.
      </p>

      {/* Zona de drop */}
      {rows.length === 0 && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="card"
            style={{ border: '2px dashed var(--border)', textAlign: 'center', padding: 48, cursor: 'pointer', marginBottom: 20 }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📥</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Arrastrá tu archivo acá o hacé clic para seleccionar</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>CSV o Excel exportado como CSV · Codificación UTF-8</div>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          <div className="card" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Columnas reconocidas automáticamente:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <span>• <strong>nombre</strong> / name / empresa / cliente</span>
              <span>• <strong>telefono</strong> / phone / cel / whatsapp</span>
              <span>• <strong>email</strong> / mail / correo</span>
              <span>• <strong>instagram</strong> / ig / usuario</span>
              <span>• <strong>ciudad</strong> / zona / barrio / localidad</span>
              <span>• <strong>direccion</strong> / domicilio → a notas</span>
              <span>• <strong>tipo</strong> → b2b o b2c</span>
              <span>• <strong>rubro</strong> / categoria</span>
            </div>
            <div style={{ marginTop: 8, color: 'var(--text)' }}>Se importa cualquier fila con <strong>al menos un dato</strong> (nombre, teléfono, email o Instagram). Si no hay nombre, se usa el @ o el teléfono.</div>
          </div>
        </>
      )}

      {/* Preview */}
      {rows.length > 0 && !done && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ background: '#22c55e20', color: '#22c55e', borderRadius: 8, padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}>
              ✅ {validCount} listos para importar
            </div>
            {warnCount > 0 && (
              <div style={{ background: '#f59e0b20', color: '#f59e0b', borderRadius: 8, padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}>
                ⚠️ {warnCount} sin forma de contacto
              </div>
            )}
            <button onClick={() => { setRows([]); setDone(null) }} className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: '0.78rem' }}>
              🔄 Cambiar archivo
            </button>
          </div>

          <div className="card" style={{ marginBottom: 16, maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Nombre', 'Teléfono', 'Email', 'Instagram', 'Ciudad', 'Tipo', 'Rubro', ''].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: r.valid ? 1 : 0.4 }}>
                    <td style={{ padding: '6px 8px', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{r.phone || '—'}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{r.email || '—'}</td>
                    <td style={{ padding: '6px 8px', color: '#DD2A7B' }}>{r.instagram || '—'}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{r.city || '—'}</td>
                    <td style={{ padding: '6px 8px' }}><span className={`badge badge-${r.type}`}>{r.type}</span></td>
                    <td style={{ padding: '6px 8px', color: 'var(--muted)' }}>{r.rubro || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      {r.error && <span style={{ color: '#ef4444', fontSize: '0.68rem' }}>❌ {r.error}</span>}
                      {!r.error && r.warn && <span style={{ color: '#f59e0b', fontSize: '0.68rem' }}>⚠️ {r.warn}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={importAll} disabled={importing || validCount === 0} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: '0.95rem' }}>
            {importing ? '⏳ Importando...' : `📥 Importar ${validCount} contactos al CRM`}
          </button>
        </>
      )}

      {done && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{done.error ? '⚠️' : '✅'}</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>{done.imported} contactos importados</div>
          {done.skipped > 0 && <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 8 }}>{done.skipped} ya existían y fueron omitidos</div>}
          {done.nuevos !== undefined && done.imported === 0 && !done.error && (
            <div style={{ color: '#f59e0b', fontSize: '0.82rem', background: '#f59e0b15', border: '1px solid #f59e0b30', borderRadius: 8, padding: '8px 14px', marginBottom: 8 }}>
              {done.nuevos} pasaron el filtro pero no se insertaron (sin error de DB)
            </div>
          )}
          {done.error && <div style={{ color: '#ef4444', fontSize: '0.82rem', background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '8px 14px', marginBottom: 16 }}>Error: {done.error}</div>}
          {(done.debug || done.sampleRows || done.sampleExisting) && (
            <div style={{ textAlign: 'left', fontSize: '0.72rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--muted)' }}>Debug ({done.existingCount} contactos en DB):</div>
              {done.sampleRows && <div style={{ marginBottom: 8 }}><strong>Rows recibidas:</strong> <pre style={{ margin: 0, fontSize: '0.65rem', whiteSpace: 'pre-wrap' }}>{JSON.stringify(done.sampleRows, null, 2)}</pre></div>}
              {done.debug && done.debug.map((d, i) => (
                <div key={i} style={{ marginBottom: 4, color: 'var(--text)' }}>
                  <strong>{d.name}</strong>{d.city ? ` · ${d.city}` : ''}{d.phone ? ` · ${d.phone}` : ''} — <span style={{ color: '#f59e0b' }}>{d.reasons.join(', ') || 'sin razón detectada'}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/admin/clients"><button className="btn btn-primary">Ver contactos →</button></a>
            <button onClick={() => { setRows([]); setDone(null) }} className="btn btn-ghost">Importar otro archivo</button>
          </div>
        </div>
      )}
    </div>
  )
}
