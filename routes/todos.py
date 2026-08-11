from flask import Blueprint, jsonify, request

from db import get_db

bp = Blueprint("todos", __name__, url_prefix="/api/todos")


def _row_to_dict(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "date": row["date"],
        "done": bool(row["done"]),
    }


@bp.get("")
def list_todos():
    db = get_db()
    rows = db.execute("SELECT * FROM todos ORDER BY (date IS NULL), date, created_at").fetchall()
    return jsonify([_row_to_dict(r) for r in rows])


@bp.post("")
def create_todo():
    body = request.get_json(force=True) or {}
    title = (body.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400

    db = get_db()
    cur = db.execute(
        "INSERT INTO todos (title, date, done) VALUES (?, ?, ?)",
        (title, body.get("date"), 1 if body.get("done") else 0),
    )
    db.commit()
    row = db.execute("SELECT * FROM todos WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(_row_to_dict(row)), 201


@bp.put("/<int:todo_id>")
def update_todo(todo_id):
    body = request.get_json(force=True) or {}
    db = get_db()
    row = db.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404

    fields = ["title", "date"]
    updates = {f: body[f] for f in fields if f in body}
    if "done" in body:
        updates["done"] = 1 if body["done"] else 0

    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        db.execute(f"UPDATE todos SET {set_clause} WHERE id = ?", (*updates.values(), todo_id))
        db.commit()

    row = db.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    return jsonify(_row_to_dict(row))


@bp.delete("/<int:todo_id>")
def delete_todo(todo_id):
    db = get_db()
    db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    db.commit()
    return "", 204
