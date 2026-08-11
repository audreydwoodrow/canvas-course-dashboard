import requests


class CanvasError(Exception):
    pass


def client_from_config(cfg):
    domain = cfg.get("canvas_domain")
    token = cfg.get("canvas_token")
    if not domain or not token:
        return None
    return CanvasClient(domain, token)


class CanvasClient:
    def __init__(self, domain, token):
        domain = domain.strip()
        if domain.startswith("http://") or domain.startswith("https://"):
            domain = domain.split("://", 1)[1]
        domain = domain.rstrip("/")
        self.base_url = f"https://{domain}/api/v1"
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def _get_paginated(self, path, params=None):
        results = []
        url = f"{self.base_url}{path}"
        params = dict(params or {})
        params.setdefault("per_page", 100)
        while url:
            resp = self.session.get(url, params=params, timeout=15)
            if resp.status_code == 401:
                raise CanvasError("Canvas rejected the access token (401). Check it in Settings.")
            if not resp.ok:
                raise CanvasError(f"Canvas API error {resp.status_code} on {path}")
            results.extend(resp.json())
            url = resp.links.get("next", {}).get("url")
            params = None  # next url already has query params baked in
        return results

    def get_active_courses(self):
        courses = self._get_paginated(
            "/courses",
            {"enrollment_state": "active", "include[]": "term"},
        )
        return [c for c in courses if not c.get("access_restricted_by_date")]

    def get_assignments(self, course_id):
        return self._get_paginated(f"/courses/{course_id}/assignments")

    def get_announcements(self, course_ids, per_page=50):
        if not course_ids:
            return []
        context_codes = [f"course_{cid}" for cid in course_ids]
        params = [("context_codes[]", code) for code in context_codes]
        params.append(("per_page", per_page))
        url = f"{self.base_url}/announcements"
        resp = self.session.get(url, params=params, timeout=15)
        if resp.status_code == 401:
            raise CanvasError("Canvas rejected the access token (401). Check it in Settings.")
        if not resp.ok:
            raise CanvasError(f"Canvas API error {resp.status_code} on /announcements")
        return resp.json()
