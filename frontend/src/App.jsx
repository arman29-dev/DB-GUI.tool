import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TableView from './components/TableView.jsx'
import QueryEditor from './components/QueryEditor.jsx'
import LoadScreen from './components/LoadScreen.jsx'
import Header from './components/Header.jsx'
import './App.css'

const API = ''

export default function App() {
  const [dbLoaded, setDbLoaded] = useState(false)
  const [dbPath, setDbPath] = useState(null)
  const [dbFilename, setDbFilename] = useState(null)
  const [tables, setTables] = useState([])
  const [activeTable, setActiveTable] = useState(null)
  const [view, setView] = useState('table') // 'table' | 'query'
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if backend already has a DB loaded (e.g., after page refresh)
    fetch(`${API}/api/status`).then(r => r.json()).then(d => {
      if (d.loaded) {
        setDbPath(d.path)
        setDbFilename(d.path.split(/[\\/]/).pop())
        setDbLoaded(true)
        loadTables()
      }
    }).catch(() => {})
  }, [])

  const loadTables = async () => {
    const res = await fetch(`${API}/api/tables`)
    const d = await res.json()
    setTables(d.tables || [])
    if (d.tables?.length > 0 && !activeTable) {
      setActiveTable(d.tables[0].name)
    }
  }

  const handleLoad = async (path, filename) => {
    setDbPath(path)
    setDbFilename(filename)
    setDbLoaded(true)
    setActiveTable(null)
    setView('table')
    await loadTables()
  }

  const handleDisconnect = async () => {
    await fetch(`${API}/api/disconnect`, { method: 'POST' })
    setDbLoaded(false)
    setDbPath(null)
    setDbFilename(null)
    setTables([])
    setActiveTable(null)
  }

  if (!dbLoaded) {
    return <LoadScreen onLoad={handleLoad} />
  }

  return (
    <div className="app-shell">
      <Header
        filename={dbFilename}
        view={view}
        setView={setView}
        onDisconnect={handleDisconnect}
      />
      <div className="app-body">
        <Sidebar
          tables={tables}
          activeTable={activeTable}
          setActiveTable={(t) => { setActiveTable(t); setView('table') }}
        />
        <main className="main-area">
          {view === 'query' ? (
            <QueryEditor key="query" />
          ) : activeTable ? (
            <TableView key={activeTable} table={activeTable} onRefreshTables={loadTables} />
          ) : (
            <div className="empty-state">
              <p>Select a table from the sidebar</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
