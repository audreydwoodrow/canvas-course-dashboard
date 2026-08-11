import threading
import webbrowser

from flask import Flask

from db import init_db
from routes import announcements, calendar, grades, setup, todos

HOST = "127.0.0.1"
PORT = 5050


def create_app():
    app = Flask(__name__, static_folder="static", static_url_path="")
    init_db(app)

    app.register_blueprint(setup.bp)
    app.register_blueprint(calendar.bp)
    app.register_blueprint(announcements.bp)
    app.register_blueprint(grades.bp)
    app.register_blueprint(todos.bp)

    @app.route("/")
    def index():
        return app.send_static_file("index.html")

    return app


app = create_app()

if __name__ == "__main__":
    url = f"http://{HOST}:{PORT}"
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    print(f"Dashboard running at {url}")
    app.run(host=HOST, port=PORT, debug=False)
