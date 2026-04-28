import { Database, Terminal, Table, LogOut } from 'lucide-react'
import './Header.css'

export default function Header({ filename, view, setView, onDisconnect }) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <Database size={16} />
        </div>
        <span className="header-brand">DB Reader</span>
        <span className="header-sep">/</span>
        <span className="header-file">{filename}</span>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-tab ${view === 'table' ? 'active' : ''}`}
          onClick={() => setView('table')}
        >
          <Table size={14} />
          Browser
        </button>
        <button
          className={`nav-tab ${view === 'query' ? 'active' : ''}`}
          onClick={() => setView('query')}
        >
          <Terminal size={14} />
          SQL Editor
        </button>
      </nav>

      <div className="header-right">
        <button className="btn-disconnect" onClick={onDisconnect}>
          <LogOut size={13} />
          Disconnect
        </button>
      </div>
    </header>
  )
}
