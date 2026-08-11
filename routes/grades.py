from flask import Blueprint, jsonify, request

from db import get_db

bp = Blueprint("grades", __name__, url_prefix="/api/grades")


def _row_to_dict(row):
    return {
        "id": row["id"],
        "course": row["course"],
        "item_name": row["item_name"],
        "item_type": row["item_type"],
        "score": row["score"],
        "median": row["median"],
        "comment": row["comment"],
        "hidden": bool(row["hidden"]),
    }


@bp.get("")
def list_grades():
    db = get_db()
    rows = db.execute("SELECT * FROM grades ORDER BY course, created_at").fetchall()
    return jsonify([_row_to_dict(r) for r in rows])


@bp.post("")
def create_grade():
    body = request.get_json(force=True) or {}
    course = (body.get("course") or "").strip()
    item_name = (body.get("item_name") or "").strip()
    if not course or not item_name:
        return jsonify({"error": "course and item_name are required"}), 400

    db = get_db()
    cur = db.execute(
        """INSERT INTO grades (course, item_name, item_type, score, median, comment, hidden)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            course,
            item_name,
            body.get("item_type") or "assignment",
            body.get("score"),
            body.get("median"),
            body.get("comment"),
            1 if body.get("hidden") else 0,
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM grades WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(_row_to_dict(row)), 201


@bp.put("/<int:grade_id>")
def update_grade(grade_id):
    body = request.get_json(force=True) or {}
    db = get_db()
    row = db.execute("SELECT * FROM grades WHERE id = ?", (grade_id,)).fetchone()
    if row is None:
        return jsonify({"error": "not found"}), 404

    fields = ["course", "item_name", "item_type", "score", "median", "comment"]
    updates = {f: body[f] for f in fields if f in body}
    if "hidden" in body:
        updates["hidden"] = 1 if body["hidden"] else 0

    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        db.execute(
            f"UPDATE grades SET {set_clause}, updated_at = datetime('now') WHERE id = ?",
            (*updates.values(), grade_id),
        )
        db.commit()

    row = db.execute("SELECT * FROM grades WHERE id = ?", (grade_id,)).fetchone()
    return jsonify(_row_to_dict(row))


@bp.delete("/<int:grade_id>")
def delete_grade(grade_id):
    db = get_db()
    db.execute("DELETE FROM grades WHERE id = ?", (grade_id,))
    db.commit()
    return "", 204
