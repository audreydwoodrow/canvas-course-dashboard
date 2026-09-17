# School Dashboard

A self-hosted school dashboard that runs on your own machine. It pulls assignment due dates and announcements from Canvas, and adds the things Canvas doesn't do well: a weekly to-do board, manually tracked grades, and a personal calendar with recurring events.

Built with Flask, SQLite, and vanilla JavaScript. No accounts, no hosting, no data leaving your computer — the only outbound requests are to your own school's Canvas API.

## What it does

**Calendar** — a month and week view (FullCalendar) that merges three sources into one place:
- Canvas assignment due dates, pulled live from your active courses, each linking back to the assignment
- Dated to-dos
- Your own events: click any day to add one, with start/end times, location, and notes

Events can repeat weekly on any combination of weekdays, with an optional stop date. Deleting a single occurrence leaves the rest of the series intact.

**Weekly to-dos** — a Sunday–Friday board plus a "Horizon" panel for anything without a fixed day. Tasks support one level of subtasks, drag-and-drop reordering, and dragging between day columns. Checking off a parent auto-checks its subtasks.

**Grades** — manual entry, because Canvas often hides class statistics. Each item records a score, the class median, and a free-text comment, and can be hidden from the list without being deleted.

**Announcements** — recent announcements across all active courses in one feed.

## Setup

Requires Python 3 and a Canvas account at a school that has the API enabled.

```bash
git clone https://github.com/audreydwoodrow/school-dashboard.git
cd school-dashboard
./start.sh
```

`start.sh` creates a virtual environment, installs dependencies, and starts the server. Then open **http://127.0.0.1:5050**.

To run it manually instead:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Connecting Canvas

On first launch the dashboard asks for two things in Settings:

- **Canvas domain** — the host you log in at, e.g. `canvas.yourschool.edu` (with or without `https://`)
- **Access token** — generate one in Canvas under *Account → Settings → New Access Token*

The token is verified against the Canvas API before it's saved, so a typo fails immediately rather than silently. Both values are written to `data/config.json`, which is gitignored and never leaves your machine.

Canvas is optional. Without it, the calendar, to-dos, grades, and events all still work — you just don't get assignment due dates or announcements.

## Where your data lives

| Path | Contents |
|---|---|
| `data/config.json` | Canvas domain and access token |
| `data/dashboard.db` | SQLite database: grades, to-dos, weekly tasks, events |

Both are gitignored. Back up `data/` to keep your dashboard; delete it to start clean.

## Running it in the background

The app binds to `127.0.0.1` only, so it's not reachable from other machines on your network. On macOS you can keep it running as a background service with a launchd agent pointed at `start.sh` — then the dashboard is always waiting at `localhost:5050` without a terminal window open.

## Project layout

```
app.py              Flask app factory and blueprint registration
config.py           Reads/writes data/config.json
db.py               SQLite schema and connection handling
recurrence.py       Expands repeating events into occurrences
integrations/
  canvas.py         Canvas API client (paginated, token auth)
routes/
  setup.py          Canvas credential setup and validation
  calendar.py       Merged calendar feed
  announcements.py  Course announcements
  grades.py         Manual grade tracking
  todos.py          Dated to-dos
  weekly.py         Weekly task board and subtasks
  events.py         User events and recurrence rules
static/             Front end (vanilla JS, FullCalendar)
```

## Notes

This is a personal project built for my own use, so a few things are shaped around that: grades are entered by hand rather than scraped, and the Canvas integration reads only courses, assignments, and announcements. It's a single-user app with no authentication — which is fine bound to localhost, but don't expose it to a network as-is.
