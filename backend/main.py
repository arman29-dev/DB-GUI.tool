from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional
import sqlite3
import os
import json
import uuid

app = FastAPI(title="DB Reader API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store of the currently loaded DB path
state = {"db_path": None}


def get_connection():
    if not state["db_path"]:
        raise HTTPException(status_code=400, detail="No database loaded.")
    if not os.path.exists(state["db_path"]):
        raise HTTPException(status_code=404, detail="Database file not found.")
    return sqlite3.connect(state["db_path"])


def row_to_dict(cursor, row):
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))


# ── Database file management ──────────────────────────────────────────────────

@app.get("/api/status")
def status():
    return {"loaded": state["db_path"] is not None, "path": state["db_path"]}


@app.post("/api/load")
def load_db(payload: dict):
    path = payload.get("path", "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="Path is required.")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    if not path.endswith((".db", ".sqlite", ".sqlite3")):
        raise HTTPException(status_code=400, detail="Only .db / .sqlite / .sqlite3 files are supported.")
    # Quick sanity check
    try:
        conn = sqlite3.connect(path)
        conn.execute("SELECT name FROM sqlite_master LIMIT 1")
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot open database: {e}")
    state["db_path"] = path
    return {"success": True, "path": path}


@app.post("/api/upload")
async def upload_db(file: UploadFile = File(...)):
    if not file.filename.endswith((".db", ".sqlite", ".sqlite3")):
        raise HTTPException(status_code=400, detail="Only .db / .sqlite / .sqlite3 files are supported.")
    upload_dir = "/tmp/db_reader_uploads"
    os.makedirs(upload_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    dest = os.path.join(upload_dir, unique_name)
    contents = await file.read()
    with open(dest, "wb") as f:
        f.write(contents)
    state["db_path"] = dest
    return {"success": True, "path": dest, "filename": file.filename}


@app.post("/api/disconnect")
def disconnect():
    path = state["db_path"]
    if path and path.startswith("/tmp/db_reader_uploads/"):
        try:
            os.remove(path)
        except OSError:
            pass
    state["db_path"] = None
    return {"success": True}


# ── Schema / Table metadata ───────────────────────────────────────────────────

@app.get("/api/tables")
def list_tables():
    conn = get_connection()
    cur = conn.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name")
    tables = [{"name": r[0], "type": r[1]} for r in cur.fetchall()]
    conn.close()
    return {"tables": tables}


@app.get("/api/tables/{table}/schema")
def table_schema(table: str):
    conn = get_connection()
    try:
        cur = conn.execute(f"PRAGMA table_info(\"{table}\")")
        cols = [{"cid": r[0], "name": r[1], "type": r[2], "notnull": bool(r[3]),
                 "default": r[4], "pk": bool(r[5])} for r in cur.fetchall()]
        cur2 = conn.execute(f"PRAGMA foreign_key_list(\"{table}\")")
        fks = [{"id": r[0], "table": r[2], "from": r[3], "to": r[4]} for r in cur2.fetchall()]
        cur3 = conn.execute(f"PRAGMA index_list(\"{table}\")")
        indexes = [{"name": r[1], "unique": bool(r[2])} for r in cur3.fetchall()]
        conn.close()
        return {"columns": cols, "foreign_keys": fks, "indexes": indexes}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/tables/{table}/rows")
def get_rows(table: str, page: int = 1, limit: int = 50, search: str = ""):
    conn = get_connection()
    try:
        offset = (page - 1) * limit
        # Get total count
        count_cur = conn.execute(f"SELECT COUNT(*) FROM \"{table}\"")
        total = count_cur.fetchone()[0]

        if search:
            # Search across all text columns
            col_cur = conn.execute(f"PRAGMA table_info(\"{table}\")")
            cols = [r[1] for r in col_cur.fetchall()]
            text_cols = cols  # search all
            where_clauses = " OR ".join([f"CAST(\"{c}\" AS TEXT) LIKE ?" for c in text_cols])
            params = [f"%{search}%"] * len(text_cols)
            count_cur2 = conn.execute(f"SELECT COUNT(*) FROM \"{table}\" WHERE {where_clauses}", params)
            total = count_cur2.fetchone()[0]
            cur = conn.execute(
                f"SELECT * FROM \"{table}\" WHERE {where_clauses} LIMIT ? OFFSET ?",
                params + [limit, offset]
            )
        else:
            cur = conn.execute(f"SELECT * FROM \"{table}\" LIMIT ? OFFSET ?", (limit, offset))

        rows = [row_to_dict(cur, r) for r in cur.fetchall()]
        cols_info = [d[0] for d in cur.description] if cur.description else []
        conn.close()
        return {"rows": rows, "columns": cols_info, "total": total, "page": page, "limit": limit}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


# ── CRUD ──────────────────────────────────────────────────────────────────────

class RowPayload(BaseModel):
    data: dict[str, Any]

class UpdatePayload(BaseModel):
    data: dict[str, Any]
    where: dict[str, Any]


@app.post("/api/tables/{table}/rows")
def insert_row(table: str, payload: RowPayload):
    conn = get_connection()
    try:
        cols = ", ".join([f'"{k}"' for k in payload.data.keys()])
        placeholders = ", ".join(["?" for _ in payload.data])
        vals = list(payload.data.values())
        conn.execute(f"INSERT INTO \"{table}\" ({cols}) VALUES ({placeholders})", vals)
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/tables/{table}/rows")
def update_row(table: str, payload: UpdatePayload):
    conn = get_connection()
    try:
        set_clause = ", ".join([f'"{k}" = ?' for k in payload.data.keys()])
        where_clause = " AND ".join([f'"{k}" = ?' for k in payload.where.keys()])
        vals = list(payload.data.values()) + list(payload.where.values())
        conn.execute(f"UPDATE \"{table}\" SET {set_clause} WHERE {where_clause}", vals)
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/tables/{table}/rows")
def delete_row(table: str, payload: dict):
    conn = get_connection()
    try:
        where_clause = " AND ".join([f'"{k}" = ?' for k in payload.keys()])
        vals = list(payload.values())
        conn.execute(f"DELETE FROM \"{table}\" WHERE {where_clause}", vals)
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


# ── Raw SQL ───────────────────────────────────────────────────────────────────

class QueryPayload(BaseModel):
    sql: str

@app.post("/api/query")
def run_query(payload: QueryPayload):
    conn = get_connection()
    try:
        cur = conn.execute(payload.sql)
        if cur.description:
            cols = [d[0] for d in cur.description]
            rows = [row_to_dict(cur, r) for r in cur.fetchall()]
            conn.commit()
            conn.close()
            return {"type": "select", "columns": cols, "rows": rows, "affected": len(rows)}
        else:
            conn.commit()
            affected = cur.rowcount
            conn.close()
            return {"type": "mutation", "columns": [], "rows": [], "affected": affected}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))
