import { Table2, Eye } from 'lucide-react'
import '../styles/Sidebar.css'

export default function Sidebar({ tables, activeTable, setActiveTable }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Tables</span>
        <span className="sidebar-count">{tables.length}</span>
      </div>
      <ul className="sidebar-list">
        {tables.map(t => (
          <li key={t.name}>
            <button
              className={`sidebar-item ${activeTable === t.name ? 'active' : ''}`}
              onClick={() => setActiveTable(t.name)}
            >
              {t.type === 'view'
                ? <Eye size={13} className="sidebar-icon view" />
                : <Table2 size={13} className="sidebar-icon" />
              }
              <span className="sidebar-name">{t.name}</span>
              {t.type === 'view' && <span className="sidebar-badge">view</span>}
            </button>
          </li>
        ))}
        {tables.length === 0 && (
          <li className="sidebar-empty">No tables found</li>
        )}
      </ul>
    </aside>
  )
}
