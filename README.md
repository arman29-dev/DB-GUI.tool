# DB Reader

A browser-based interface for developers to visualize and perform CRUD operations on local `.db` / `.sqlite` files — no CLI tools needed.

## Tech Stack

| Layer    | Tech                |
|----------|---------------------|
| Frontend | React 18 + Vite     |
| Backend  | Python + FastAPI    |
| Database | SQLite (via stdlib) |

## Features

- **Load databases** by file path or drag-and-drop upload
- **Browse tables** in a clean sidebar
- **View & paginate** rows with 50 rows per page
- **Search** across all columns in any table
- **CRUD** — Insert, Edit, and Delete rows inline in the table
- **SQL Editor** — Run raw SQL with results displayed in a table
- **Schema viewer** — See column types, primary keys, foreign keys, and indexes

## Project Structure

```
db-reader/
├── backend/
│   ├── main.py            # FastAPI app with all API routes
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TableView.jsx   # CRUD table browser
│   │   │   ├── QueryEditor.jsx # Raw SQL editor
│   │   │   └── LoadScreen.jsx  # DB load / upload screen
│   ├── index.html
│   └── vite.config.js
└── start.sh               # One-command startup script
```

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+

### Run the app

```bash
# Clone / download the project, then:
chmod +x start.sh
./start.sh
```

This will:
1. Create a Python virtual environment and install dependencies
2. Start the FastAPI backend on `http://localhost:8000`
3. Install npm packages and start the Vite dev server on `http://localhost:5173`

Open **http://localhost:5173** in your browser.

### Manual startup (alternative)

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend (in a second terminal):**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/load` | Load DB by file path |
| POST | `/api/upload` | Upload a DB file |
| POST | `/api/disconnect` | Unload current DB |
| GET | `/api/tables` | List all tables/views |
| GET | `/api/tables/:name/schema` | Get columns, FK, indexes |
| GET | `/api/tables/:name/rows` | Get rows (paginated, searchable) |
| POST | `/api/tables/:name/rows` | Insert a row |
| PUT | `/api/tables/:name/rows` | Update a row |
| DELETE | `/api/tables/:name/rows` | Delete a row |
| POST | `/api/query` | Run raw SQL |
