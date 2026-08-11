from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from db import get_db

bp = Blueprint("weekly", __name__, url_prefix="/api/weekly-todos")

DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]


def current_week_start():
    today = date.today()
    days_since_sunday = (today.isoweekday()) % 7  # Sunday -> 0, Monday -> 1, ... Saturday -> 6
    return (today - timedelta(days=days_since_sunday)).isoformat()


def sweep_expired(db, week_start):
    db.execute(
        "DELETE FROM weekly_tasks WHERE day != 'horizon' AND week_start != ?",
        (week_start,),
    )
    db.commit()


def _row_to_dict(row):
    return {
        "id": row["id"],
        "day": row["day"],
        "title": row["title"],
        "done": bool(row["done"]),
    }


@bp.get("")
def list_weekly_todos():
    week_start = current_week_start()
    db = get_db()
    sweep_expired(db, week_start)
    rows = db.execute("SELECT * FROM weekly_tasks ORDER BY created_at").fetchall()
    return jsonify(
        {
            "week_start": week_start,
            "days": DAYS,
            "items": [_row_to_dict(r) for r in rows],
        }
    )


@bp.post("")
def create_weekly_todo():
    body = request.get_json(force=True) or {}
    day = (body.get("day") or "").strip().lower()
    title = (body.get("title") or "").strip()
    if day not in DAYS and day != "horizon":
        return jsonify({"error": "day must be one of sunday-friday or horizon"}), 400
    if not title:
        return jsonify({"error": "title is required"}), 400

    week_start = current_week_start()
    db = get_db()
    sweep_expired(db, week_start)

    cur = db.execute(
        "INSERT INTO weekly_tasks (day, title, done, week_start) VALUES (?, ?, 0, ?)",
        (day, title, None if day == "horizon" else week_start),
    )
    db.commit()
    row = db.execute("SELECT * FROM weekly_tasks WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(_row_to_dict(row)), 201


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
        db.commit()

    row = db.execute("SELECT * FROM weekly_tasks WHERE id = ?", (task_id,)).fetchone()
    return jsonify(_row_to_dict(row))


@bp.delete("/<int:task_id>")
def delete_weekly_todo(task_id):
    db = get_db()
    db.execute("DELETE FROM weekly_tasks WHERE id = ?", (task_id,))
    db.commit()
    return "", 204
