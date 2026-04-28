import { useState } from 'react'
import { Play, Copy, Check, AlertCircle, Terminal } from 'lucide-react'
import '../styles/QueryEditor.css'

const EXAMPLES = [
  'SELECT * FROM sqlite_master WHERE type="table"',
  'SELECT name, sql FROM sqlite_master',
  'PRAGMA table_info("your_table")',
]

export default function QueryEditor() {
  const [sql, setSql] = useState('SELECT * FROM sqlite_master WHERE type = "table";')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const run = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.detail || 'Query failed')
      setResult(d)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copyResult = () => {
    if (!result) return
    const text = [result.columns.join('\t'), ...result.rows.map(r => result.columns.map(c => r[c] ?? '').join('\t'))].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run()
  }

  return (
    <div className="query-editor">
      {/* Editor panel */}
      <div className="qe-editor-panel">
        <div className="qe-editor-header">
          <Terminal size={13} />
          <span>SQL Editor</span>
          <span className="qe-hint">Ctrl+Enter to run</span>
        </div>
        <textarea
          className="qe-textarea"
          value={sql}
          onChange={e => setSql(e.target.value)}
          onKeyDown={handleKey}
          spellCheck={false}
          placeholder="SELECT * FROM ..."
        />
        <div className="qe-editor-footer">
          <div className="qe-examples">
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="qe-example-btn" onClick={() => setSql(ex)}>
                {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
              </button>
            ))}
          </div>
          <button className="qe-run-btn" onClick={run} disabled={loading}>
            <Play size={13} />
            {loading ? 'Running…' : 'Run Query'}
          </button>
        </div>
      </div>

      {/* Results panel */}
      <div className="qe-results-panel">
        {error && (
          <div className="qe-error fade-in">
            <AlertCircle size={14} />
            <pre>{error}</pre>
          </div>
        )}

        {result && result.type === 'mutation' && (
          <div className="qe-mutation-result fade-in">
            <Check size={16} />
            Query executed — {result.affected} row(s) affected
          </div>
        )}

        {result && result.type === 'select' && (
          <div className="qe-table-wrap fade-in">
            <div className="qe-result-header">
              <span>{result.rows.length} rows returned</span>
              <button className="qe-copy-btn" onClick={copyResult}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy TSV'}
              </button>
            </div>
            <div className="qe-scroll">
              <table className="qe-table">
                <thead>
                  <tr>
                    {result.columns.map(col => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {result.columns.map(col => (
                        <td key={col}>
                          {row[col] === null ? <span className="cell-null">NULL</span> : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {result.rows.length === 0 && (
                    <tr><td colSpan={result.columns.length} className="empty-cell">No rows returned</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="qe-placeholder">
            <Terminal size={28} />
            <p>Run a query to see results</p>
            <span>Supports SELECT, INSERT, UPDATE, DELETE, PRAGMA, and more</span>
          </div>
        )}
      </div>
    </div>
  )
}
