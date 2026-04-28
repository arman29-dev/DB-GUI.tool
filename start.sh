#!/bin/bash
set -e

echo ""
echo "  🗄️  DB Reader — Dev Startup"
echo "  ─────────────────────────────────────"
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
echo "  [1/2] Setting up Python backend..."
cd backend

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo "        Created virtual environment"
fi

source .venv/bin/activate
pip install -r requirements.txt -q
echo "        Dependencies installed ✓"

# Start backend in background
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "        Backend running at http://localhost:8000 (PID: $BACKEND_PID)"

cd ..

# ── Frontend ──────────────────────────────────────────────────────────────────
echo ""
echo "  [2/2] Setting up React frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
  npm install -q
  echo "        npm install complete ✓"
fi

echo "        Frontend running at http://localhost:5173"
echo ""
echo "  ─────────────────────────────────────"
echo "  Open http://localhost:5173 in your browser"
echo "  Press Ctrl+C to stop both servers"
echo "  ─────────────────────────────────────"
echo ""

# Trap Ctrl+C to kill both
trap "kill $BACKEND_PID 2>/dev/null; exit" INT TERM

npm run dev
