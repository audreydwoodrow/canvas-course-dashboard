from datetime import date as date_cls

from flask import Blueprint, jsonify, request

from db import get_db
from recurrence import WEEKDAY_CODES, format_dates, format_days, parse_dates, parse_days

bp = Blueprint("events", __name__, url_prefix="/api/events")


def _row_to_dict(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "date": row["date"],
        "start_time": row["start_time"],
        "end_time": row["end_time"],
        "all_day": bool(row["all_day"]),
        "location": row["location"],
        "notes": row["notes"],
        "repeat_freq": row["repeat_freq"],
        "repeat_until": row["repeat_until"],
        "repeat_days": parse_days(row["repeat_days"]),
        "excluded_dates": sorted(parse_dates(row["excluded_dates"])),
    }


@bp.get("")
def list_events():
    db = get_db()
    rows = db.execute("SELECT * FROM events ORDER BY date, start_time").fetchall()
    return jsonify([_row_to_dict(r) for r in rows])


@bp.post("")
def create_event():
    body = request.get_json(force=True) or {}
    title = (body.get("title") or "").strip()
    date = (body.get("date") or "").strip()
    if not title or not date:
        return jsonify({"error": "title and date are required"}), 400

    repeat_freq = body.get("repeat_freq") or "none"
    if repeat_freq not in ("none", "weekly"):
        return jsonify({"error": "repeat_freq must be 'none' or 'weekly'"}), 400
    repeat_until = body.get("repeat_until") if repeat_freq == "weekly" else None

    repeat_days = None
    if repeat_freq == "weekly":
        days = body.get("repeat_days") or [WEEKDAY_CODES[date_cls.fromisoformat(date).weekday()]]
        repeat_days = format_days(days)

    db = get_db()
    cur = db.execute(
        """INSERT INTO events (title, date, start_time, end_time, all_day, location, notes,
                                repeat_freq, repeat_until, repeat_days)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            title,
            date,
            body.get("start_time") or None,
            body.get("end_time") or None,
            1 if body.get("all_day") else 0,
            body.get("location"),
            body.get("notes"),
            repeat_freq,
            repeat_until,
            repeat_days,
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM events WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(_row_to_dict(row)), 201


@bp.put("/<int:event_id>")
def update_event(event_id):
    body = request.get_json(force=True) or {}
    db = get_db()
    row = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404

    if "repeat_freq" in body and body["repeat_freq"] not in ("none", "weekly"):
        return jsonify({"error": "repeat_freq must be 'none' or 'weekly'"}), 400

    fields = ["title", "date", "start_time", "end_time", "location", "notes", "repeat_freq", "repeat_until"]
    updates = {f: body[f] for f in fields if f in body}
    if "all_day" in body:
        updates["all_day"] = 1 if body["all_day"] else 0
    if "repeat_days" in body:
        updates["repeat_days"] = format_days(body["repeat_days"])
    if updates.get("repeat_freq") == "none":
        updates["repeat_until"] = None
        updates["repeat_days"] = None

    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        db.execute(f"UPDATE events SET {set_clause} WHERE id = ?", (*updates.values(), event_id))
        db.commit()

    row = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    return jsonify(_row_to_dict(row))


@bp.delete("/<int:event_id>")
def delete_event(event_id):
    """Delete the entire series (or the one-off event, which is the same thing)."""
    db = get_db()
    db.execute("DELETE FROM events WHERE id = ?", (event_id,))
    db.commit()
    return "", 204


@bp.delete("/<int:event_id>/occurrences/<occ_date>")
def delete_event_occurrence(event_id, occ_date):
    """Remove a single occurrence from a repeating series without touching the rest."""
    db = get_db()
    row = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404

    if row["repeat_freq"] != "weekly":
        # Not a repeating series — there's only ever one occurrence, so this
        # is the same as deleting the whole event.
        db.execute("DELETE FROM events WHERE id = ?", (event_id,))
        db.commit()
        return "", 204

    excluded = parse_dates(row["excluded_dates"])
    excluded.add(occ_date)
    db.execute(
        "UPDATE events SET excluded_dates = ? WHERE id = ?",
        (format_dates(excluded), event_id),
    )
    db.commit()
    return "", 204
