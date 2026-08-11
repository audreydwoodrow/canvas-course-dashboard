from flask import Blueprint, jsonify

from config import load_config
from db import get_db
from integrations.canvas import CanvasError, client_from_config

bp = Blueprint("calendar", __name__, url_prefix="/api/calendar")


@bp.get("/events")
def get_events():
    events = []

    client = client_from_config(load_config())
    if client is not None:
        try:
            courses = client.get_active_courses()
            for course in courses:
                course_name = course.get("name") or course.get("course_code") or "Course"
                assignments = client.get_assignments(course["id"])
                for a in assignments:
                    due_at = a.get("due_at")
                    if not due_at:
                        continue
                    events.append(
                        {
                            "id": f"canvas-{a['id']}",
                            "title": a.get("name", "Assignment"),
                            "start": due_at,
                            "allDay": False,
                            "source": "canvas",
                            "course": course_name,
                            "url": a.get("html_url"),
                        }
                    )
        except CanvasError as e:
            return jsonify({"error": str(e)}), 502

    db = get_db()
    todos = db.execute("SELECT * FROM todos WHERE date IS NOT NULL AND date != ''").fetchall()
    for t in todos:
        events.append(
            {
                "id": f"todo-{t['id']}",
                "title": t["title"],
                "start": t["date"],
                "allDay": True,
                "source": "todo",
                "done": bool(t["done"]),
            }
        )

    return jsonify(events)
