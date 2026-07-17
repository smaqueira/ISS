'use client'
import { useState, useEffect, useRef } from 'react'

interface ClientFile {
  id: string
  client_id: string
  nombre: string
  path: string
  tipo: string
  size: number
  created_at: string
  url: string | null
}

interface Props { clientId: string }

const ICON: Record<string, string> = {
  pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️',
  doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', txt: '📃',
}

function fileIcon(tipo: string) { return ICON[tipo.toLowerCase()] || '📎' }

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ClientFiles({ clientId }: Props) {
  const [files, setFiles]       = useState<ClientFile[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/files`)
      .then(r => r.json())
      .then(data => { setFiles(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [clientId])

  async function upload(file: File) {
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/clients/${clientId}/files`, { method: 'POST', body: fd })
    const data = await res.json()
    if (data.id) {
      setFiles(prev => [data, ...prev])
    } else {
      setError(data.error || 'Error al subir el archivo')
    }
    setUploading(false)
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    for (const f of Array.from(fileList)) await upload(f)
  }

  async function deleteFile(id: string) {
    if (!confirm('¿Eliminar este archivo?')) return
    setFiles(prev => prev.filter(f => f.id !== id))
    await fetch(`/api/files/${id}`, { method: 'DELETE' })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={sectionTitle}>
          Archivos
          {files.length > 0 && <span style={{ background: '#6366f122', color: '#6366f1', borderRadius: 10, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700, marginLeft: 6 }}>{files.length}</span>}
        </div>
        <button onClick={() => inputRef.current?.click()} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '4px 10px' }} disabled={uploading}>
          {uploading ? '⏳ Subiendo...' : '+ Archivo'}
        </button>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Drop zone — solo si no hay archivos */}
      {files.length === 0 && !loading && (
        <div
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
            background: dragging ? 'var(--accent)08' : 'transparent',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>📎</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Arrastrá archivos acá o hacé clic para seleccionar<br />
            <span style={{ fontSize: '0.72rem' }}>PDF, fotos, Excel · Máx. 10 MB por archivo</span>
          </div>
        </div>
      )}

      {/* Drop overlay cuando hay archivos */}
      {files.length > 0 && (
        <div
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          style={{ position: 'relative' }}
        >
          {dragging && (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--accent)15', border: '2px dashed var(--accent)', borderRadius: 8, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>
              Soltá para subir
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {files.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{fileIcon(f.tipo)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                    {fmtSize(f.size)} · {new Date(f.created_at).toLocaleDateString('es-AR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {f.url && (
                    <a href={f.url} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--muted)', textDecoration: 'none' }}
                      title="Descargar">
                      ⬇️
                    </a>
                  )}
                  <button onClick={() => deleteFile(f.id)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: '#ef4444', opacity: 0.7 }}
                    title="Eliminar">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Cargando...</div>}
      {error && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 6 }}>{error}</div>}
    </div>
  )
}

const sectionTitle: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)' }
