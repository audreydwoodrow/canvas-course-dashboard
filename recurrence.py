from datetime import date, timedelta

WEEKDAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]

MAX_OCCURRENCES = 780  # ~10 years of a 1-2x/week class, a generous safety cap


def parse_days(value):
    if not value:
        return []
    return [v for v in value.split(",") if v in WEEKDAY_CODES]


def format_days(days):
    return ",".join(d for d in (days or []) if d in WEEKDAY_CODES)


def parse_dates(value):
    if not value:
        return set()
    return {v for v in value.split(",") if v}


def format_dates(dates):
    return ",".join(sorted(dates))


def expand_occurrences(ev):
    """Yield each occurrence date for an event row: the series' weekly repeat
    (on whichever weekdays were chosen) up to its stop date, skipping any
    single dates the user removed from the series."""
    start = date.fromisoformat(ev["date"])
    excluded = parse_dates(ev["excluded_dates"])

    if ev["repeat_freq"] != "weekly" or not ev["repeat_until"]:
        if start.isoformat() not in excluded:
            yield start
        return

    until = date.fromisoformat(ev["repeat_until"])
    days = parse_days(ev["repeat_days"]) or [WEEKDAY_CODES[start.weekday()]]
    day_indices = {WEEKDAY_CODES.index(d) for d in days}

    cur = start
    yielded = 0
    while cur <= until and yielded < MAX_OCCURRENCES:
        if cur.weekday() in day_indices:
            if cur.isoformat() not in excluded:
                yield cur
            yielded += 1
        cur += timedelta(days=1)
