import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Search, RefreshCw, ChevronLeft, ChevronRight, Check, X, Key, Link } from 'lucide-react'
import '../styles/TableView.css'

const NULL_SENTINEL = '__NULL__'

function Cell({ value }) {
  if (value === null || value === undefined) return <span className="cell-null">NULL</span>
  if (typeof value === 'number') return <span className="cell-num">{value}</span>
  const str = String(value)
  if (str.length > 120) return <span className="cell-text" title={str}>{str.slice(0, 120)}…</span>
  return <span className="cell-text">{str}</span>
}

export default function TableView({ table, onRefreshTables }) {
  const [rows, setRows] = useState([])
  const [columns, setColumns] = useState([])
  const [schema, setSchema] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingRow, setEditingRow] = useState(null) // {original, draft}
  const [addingRow, setAddingRow] = useState(false)
  const [newRowData, setNewRowData] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [toast, setToast] = useState(null)
  const LIMIT = 50

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const fetchSchema = useCallback(async () => {
    const res = await fetch(`/api/tables/${encodeURIComponent(table)}/schema`)
    const d = await res.json()
    setSchema(d.columns || [])
  }, [table])

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, search })
      const res = await fetch(`/api/tables/${encodeURIComponent(table)}/rows?${params}`)
      const d = await res.json()
      setRows(d.rows || [])
      setColumns(d.columns || [])
      setTotal(d.total || 0)
    } finally {
      setLoading(false)
    }
  }, [table, page, search])

  useEffect(() => { fetchSchema() }, [fetchSchema])
  useEffect(() => { fetchRows() }, [fetchRows])

  const pkCols = schema.filter(c => c.pk).map(c => c.name)
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const rowKey = (row) => {
    if (pkCols.length > 0) {
      return Object.fromEntries(pkCols.map(k => [k, row[k]]))
    }
    return row // fallback: use all cols
  }

  // ── INSERT ────────────────────────────────────────────────────────────────
  const startAdd = () => {
    const init = {}
    schema.forEach(c => { init[c.name] = '' })
    setNewRowData(init)
    setAddingRow(true)
  }

  const submitAdd = async () => {
    const data = {}
    Object.entries(newRowData).forEach(([k, v]) => {
      data[k] = v === '' ? null : v
    })
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(table)}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.detail)
      showToast('Row inserted')
      setAddingRow(false)
      fetchRows()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────
  const startEdit = (row) => {
    setEditingRow({ original: row, draft: { ...row } })
  }

  const submitEdit = async () => {
    const { original, draft } = editingRow
    const where = rowKey(original)
    const data = {}
    Object.entries(draft).forEach(([k, v]) => {
      data[k] = v === NULL_SENTINEL ? null : (v === '' ? null : v)
    })
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(table)}/rows`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, where })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.detail)
      showToast('Row updated')
      setEditingRow(null)
      fetchRows()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  const confirmDelete = (row) => setDeleteConfirm(row)

  const submitDelete = async () => {
    const where = rowKey(deleteConfirm)
    try {
      const res = await fetch(`/api/tables/${encodeURIComponent(table)}/rows`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(where)
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.detail)
      showToast('Row deleted', 'success')
      setDeleteConfirm(null)
      fetchRows()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const isEditing = (row) => editingRow?.original === row || JSON.stringify(editingRow?.original) === JSON.stringify(row)

  return (
    <div className="table-view">
      {/* Toolbar */}
      <div className="tv-toolbar">
        <div className="tv-title">
          <span className="tv-table-name">{table}</span>
          <span className="tv-count">{total.toLocaleString()} rows</span>
        </div>
        <form className="tv-search" onSubmit={handleSearch}>
          <Search size={13} />
          <input
            placeholder="Search all columns…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {search && <button type="button" className="tv-clear" onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}><X size={12} /></button>}
        </form>
        <div className="tv-actions">
          <button className="tv-btn" onClick={fetchRows} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button className="tv-btn primary" onClick={startAdd}>
            <Plus size={13} />
            New Row
          </button>
        </div>
      </div>

      {/* Schema pills */}
      <div className="tv-schema-bar">
        {schema.map(col => (
          <span key={col.name} className={`schema-pill ${col.pk ? 'pk' : ''}`}>
            {col.pk && <Key size={10} />}
            {col.name}
            <span className="schema-type">{col.type || 'any'}</span>
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="tv-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}>
                  {schema.find(s => s.name === col)?.pk && <Key size={10} className="col-pk" />}
                  {col}
                </th>
              ))}
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Add row */}
            {addingRow && (
              <tr className="row-adding fade-in">
                {schema.map(col => (
                  <td key={col.name}>
                    <input
                      className="cell-input"
                      placeholder={col.type || 'value'}
                      value={newRowData[col.name] ?? ''}
                      onChange={e => setNewRowData(p => ({ ...p, [col.name]: e.target.value }))}
                    />
                  </td>
                ))}
                <td className="actions-cell">
                  <button className="action-btn confirm" onClick={submitAdd} title="Save"><Check size={13} /></button>
                  <button className="action-btn cancel" onClick={() => setAddingRow(false)} title="Cancel"><X size={13} /></button>
                </td>
              </tr>
            )}
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="loading-cell">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="empty-cell">No rows found</td></tr>
            ) : rows.map((row, i) => {
              const editing = editingRow && JSON.stringify(editingRow.original) === JSON.stringify(row)
              return (
                <tr key={i} className={editing ? 'row-editing' : ''}>
                  {columns.map(col => (
                    <td key={col}>
                      {editing ? (
                        <input
                          className="cell-input"
                          value={editingRow.draft[col] ?? ''}
                          onChange={e => setEditingRow(p => ({ ...p, draft: { ...p.draft, [col]: e.target.value } }))}
                        />
                      ) : <Cell value={row[col]} />}
                    </td>
                  ))}
                  <td className="actions-cell">
                    {editing ? (
                      <>
                        <button className="action-btn confirm" onClick={submitEdit} title="Save"><Check size={13} /></button>
                        <button className="action-btn cancel" onClick={() => setEditingRow(null)} title="Cancel"><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button className="action-btn edit" onClick={() => startEdit(row)} title="Edit"><Pencil size={12} /></button>
                        <button className="action-btn delete" onClick={() => confirmDelete(row)} title="Delete"><Trash2 size={12} /></button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="tv-pagination">
        <span className="pag-info">
          Page {page} of {totalPages} · {total.toLocaleString()} total rows
        </span>
        <div className="pag-btns">
          <button className="tv-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={14} />
          </button>
          <button className="tv-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal fade-in" onClick={e => e.stopPropagation()}>
            <h3>Delete row?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="tv-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="tv-btn danger" onClick={submitDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast fade-in ${toast.type}`}>
          {toast.type === 'success' ? <Check size={13} /> : <X size={13} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
