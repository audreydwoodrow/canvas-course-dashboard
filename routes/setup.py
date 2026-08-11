from flask import Blueprint, jsonify, request

from config import load_config, save_config, is_configured
from integrations.canvas import CanvasClient, CanvasError

bp = Blueprint("setup", __name__, url_prefix="/api/setup")


@bp.get("")
def get_status():
    cfg = load_config()
    return jsonify(
        {
            "configured": is_configured(),
            "canvas_domain": cfg.get("canvas_domain", ""),
        }
    )


@bp.post("")
def save_setup():
    body = request.get_json(force=True) or {}
    domain = (body.get("canvas_domain") or "").strip()
    token = (body.get("canvas_token") or "").strip()
    if not domain or not token:
        return jsonify({"error": "canvas_domain and canvas_token are both required"}), 400

    client = CanvasClient(domain, token)
    try:
        client.get_active_courses()
    except CanvasError as e:
        return jsonify({"error": str(e)}), 400
    except Exception:
        return jsonify({"error": "Could not reach that Canvas domain. Double-check it and try again."}), 400

    save_config({"canvas_domain": domain, "canvas_token": token})
    return jsonify({"ok": True})
