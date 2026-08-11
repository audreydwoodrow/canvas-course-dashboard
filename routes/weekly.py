from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from db import get_db

bp = Blueprint("weekly", __name__, url_prefix="/api/weekly-todos")

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]
BUCKETS = DAYS + ["horizon"]


def current_week_start():
    today = date.today()
    days_since_sunday = today.isoweekday() % 7  # Sunday -> 0, Monday -> 1, ... Saturday -> 6
    return (today - timedelta(days=days_since_sunday)).isoformat()


def sweep_expired(db, week_start):
    db.execute(
        "DELETE FROM weekly_tasks WHERE day != 'horizon' AND week_start != ?",
        (week_start,),
    )
    db.commit()


def _task_dict(row, subtasks=None):
    return {
        "id": row["id"],
        "title": row["title"],
        "done": bool(row["done"]),
        "subtasks": subtasks or [],
    }


def _next_position(db, day, parent_id):
    row = db.execute(
        "SELECT MAX(position) AS m FROM weekly_tasks WHERE day = ? AND parent_id IS ?",
        (day, parent_id),
    ).fetchone()
    return (row["m"] + 1) if row["m"] is not None else 0


@bp.get("")
def list_weekly_todos():
    week_start = current_week_start()
    db = get_db()
    sweep_expired(db, week_start)
    rows = db.execute("SELECT * FROM weekly_tasks ORDER BY position, id").fetchall()

    children_by_parent = {}
    for r in rows:
        if r["parent_id"] is not None:
            children_by_parent.setdefault(r["parent_id"], []).append(r)

    items = {b: [] for b in BUCKETS}
    for r in rows:
        if r["parent_id"] is not None:
            continue
        subtasks = [_task_dict(c) for c in children_by_parent.get(r["id"], [])]
        items[r["day"]].append(_task_dict(r, subtasks))

    return jsonify({"week_start": week_start, "days": DAYS, "items": items})


@bp.post("")
def create_weekly_todo():
    body = request.get_json(force=True) or {}
    title = (body.get("title") or "").strip()
    parent_id = body.get("parent_id")
    if not title:
        return jsonify({"error": "title is required"}), 400

    db = get_db()
    current = current_week_start()
    sweep_expired(db, current)

    if parent_id:
        parent = db.execute("SELECT * FROM weekly_tasks WHERE id = ?", (parent_id,)).fetchone()
        if parent is None:
            return jsonify({"error": "parent task not found"}), 404
        day = parent["day"]
        task_week_start = parent["week_start"]
    else:
        day = (body.get("day") or "").strip().lower()
        if day not in BUCKETS:
            return jsonify({"error": "day must be one of sunday-friday or horizon"}), 400
        task_week_start = None if day == "horizon" else current
        parent_id = None

    position = _next_position(db, day, parent_id)

    cur = db.execute(
        """INSERT INTO weekly_tasks (day, title, done, week_start, parent_id, position)
           VALUES (?, ?, 0, ?, ?, ?)""",
        (day, title, task_week_start, parent_id, position),
    )
    db.commit()
    row = db.execute("SELECT * FROM weekly_tasks WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(_task_dict(row)), 201


@bp.put("/reorder")
def reorder_weekly_todos():
    body = request.get_json(force=True) or {}
    ids = body.get("ids") or []
    db = get_db()
    for i, task_id in enumerate(ids):
        db.execute("UPDATE weekly_tasks SET position = ? WHERE id = ?", (i, task_id))
    db.commit()
    return jsonify({"ok": True})


@bp.put("/<int:task_id>")
def update_weekly_todo(task_id):
    body = request.get_json(force=True) or {}
    db = get_db()
    row = db.execute("SELECT * FROM weekly_tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404

    updates = {}
    if "title" in body:
        updates["title"] = body["title"].strip()
    if "done" in body:
        updates["done"] = 1 if body["done"] else 0

    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        db.execute(f"UPDATE weekly_tasks SET {set_clause} WHERE id = ?", (*updates.values(), task_id))
        if updates.get("done") == 1:
            db.execute("UPDATE weekly_tasks SET done = 1 WHERE parent_id = ?", (task_id,))
        db.commit()

    row = db.execute("SELECT * FROM weekly_tasks WHERE id = ?", (task_id,)).fetchone()
    return jsonify(_task_dict(row))


@bp.delete("/<int:task_id>")
def delete_weekly_todo(task_id):
    db = get_db()
    db.execute("DELETE FROM weekly_tasks WHERE parent_id = ?", (task_id,))
    db.execute("DELETE FROM weekly_tasks WHERE id = ?", (task_id,))
    db.commit()
    return "", 204
