from flask import Blueprint, jsonify

from config import load_config
from integrations.canvas import CanvasError, client_from_config

bp = Blueprint("announcements", __name__, url_prefix="/api/announcements")


@bp.get("")
def get_announcements():
    client = client_from_config(load_config())
    if client is None:
        return jsonify([])

    try:
        courses = client.get_active_courses()
        course_names = {c["id"]: c.get("name") or c.get("course_code") for c in courses}
        raw = client.get_announcements(list(course_names.keys()))
    except CanvasError as e:
        return jsonify({"error": str(e)}), 502

    items = []
    for a in raw:
        context_code = a.get("context_code", "")
        course_id = int(context_code.replace("course_", "")) if context_code.startswith("course_") else None
        items.append(
            {
                "id": a.get("id"),
                "title": a.get("title"),
                "message": a.get("message"),
                "course": course_names.get(course_id, "Course"),
                "posted_at": a.get("posted_at"),
                "url": a.get("html_url"),
            }
        )

    items.sort(key=lambda x: x["posted_at"] or "", reverse=True)
    return jsonify(items)
