"""Optional local static file server for index.html (submissions go to Supabase)."""

import os
from pathlib import Path

from flask import Flask, send_from_directory

ROOT = Path(__file__).parent
PORT = int(os.environ.get("PORT", 3000))

app = Flask(__name__, static_folder=str(ROOT), static_url_path="")


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


if __name__ == "__main__":
    print(f"Serving lesson at http://localhost:{PORT}/")
    print("Submissions are saved to Supabase (see config.js).")
    app.run(host="0.0.0.0", port=PORT, debug=False)
