import { useState, useRef } from 'react'
import { Database, FolderOpen, Upload, AlertCircle } from 'lucide-react'
import '../styles/LoadScreen.css'

export default function LoadScreen({ onLoad }) {
  const [pathInput, setPathInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const loadByPath = async () => {
    if (!pathInput.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathInput.trim() })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.detail || 'Failed to load')
      onLoad(d.path, pathInput.trim().split(/[\\/]/).pop())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (file) => {
    if (!file) return
    setLoading(true); setError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const d = await res.json()
      if (!res.ok) throw new Error(d.detail || 'Upload failed')
      onLoad(d.path, d.filename, true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  return (
    <div className="load-screen">
      <div className="load-bg-grid" />
      <div className="load-card fade-in">
        <div className="load-logo">
          <Database size={28} />
        </div>
        <h1 className="load-title">DB Reader</h1>
        <p className="load-sub">Open and explore your SQLite databases in the browser</p>

        <div className="load-sections">
          {/* Path input */}
          <div className="load-section">
            <label>Load by file path</label>
            <div className="load-path-row">
              <input
                type="text"
                placeholder="/absolute/path/to/your/database.db"
                value={pathInput}
                onChange={e => setPathInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadByPath()}
                style={{ width: '100%' }}
              />
              <button className="btn-primary" onClick={loadByPath} disabled={loading}>
                <FolderOpen size={15} />
                {loading ? 'Loading…' : 'Open'}
              </button>
            </div>
          </div>

          <div className="load-divider"><span>or</span></div>

          {/* Upload */}
          <div
            className={`load-dropzone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current.click()}
          >
            <Upload size={22} />
            <p>Drop a <code>.db</code> / <code>.sqlite</code> file here</p>
            <span>or click to browse</span>
            <input ref={fileRef} type="file" accept=".db,.sqlite,.sqlite3" hidden onChange={e => uploadFile(e.target.files[0])} />
          </div>
        </div>

        {error && (
          <div className="load-error fade-in">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <p className="load-footer">Supports .db · .sqlite · .sqlite3</p>
      </div>
    </div>
  )
}
