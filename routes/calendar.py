from flask import Blueprint, jsonify

from config import load_config
from db import get_db
from integrations.canvas import CanvasError, client_from_config
from recurrence import expand_occurrences, parse_days

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

    user_events = db.execute("SELECT * FROM events").fetchall()
    for ev in user_events:
        all_day = bool(ev["all_day"]) or not ev["start_time"]
        for occ in expand_occurrences(ev):
            start = occ.isoformat() if all_day else f"{occ.isoformat()}T{ev['start_time']}"
            end = None if all_day or not ev["end_time"] else f"{occ.isoformat()}T{ev['end_time']}"
            events.append(
                {
                    "id": f"event-{ev['id']}-{occ.isoformat()}",
                    "title": ev["title"],
                    "start": start,
                    "end": end,
                    "allDay": all_day,
                    "source": "event",
                    "seriesId": ev["id"],
                    "occurrenceDate": occ.isoformat(),
                    "location": ev["location"],
                    "notes": ev["notes"],
                    "repeatFreq": ev["repeat_freq"],
                    "repeatUntil": ev["repeat_until"],
                    "repeatDays": parse_days(ev["repeat_days"]),
                    "seriesDate": ev["date"],
                    "startTime": ev["start_time"],
                    "endTime": ev["end_time"],
                }
            )

    return jsonify(events)
