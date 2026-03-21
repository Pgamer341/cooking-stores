"""
C.O.O.King Stores — Python Web Server
Run:   python server.py
Open:  http://localhost:8000
Admin: http://localhost:8000/admin
"""

import http.server, socketserver, os, sys, json
from urllib.parse import urlparse

PORT      = 8000
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
TEMPLATES = os.path.join(BASE_DIR, "templates")
DATA_DIR  = os.path.join(BASE_DIR, "data")
MENU_FILE = os.path.join(DATA_DIR, "menu.json")
PHONE_FILE= os.path.join(DATA_DIR, "phones.json")

os.makedirs(DATA_DIR, exist_ok=True)

# ─── DATA HELPERS ─────────────────────────────────────────
def load_menu():
    if not os.path.exists(MENU_FILE):
        default = [
            {"id":1,"name":"Egg Fried Rice",     "price":300,"cat":"Fried Rice","desc":"Wok-tossed egg fried rice with vegetables & soy sauce","img":""},
            {"id":2,"name":"Chicken Fried Rice",  "price":350,"cat":"Fried Rice","desc":"Fragrant fried rice with tender chicken pieces","img":""},
            {"id":3,"name":"Vegetable Kottu",     "price":280,"cat":"Kottu",     "desc":"Classic Sri Lankan kottu with fresh vegetables & spices","img":""},
            {"id":4,"name":"Chicken Kottu",       "price":350,"cat":"Kottu",     "desc":"Crispy roti kottu with spiced chicken","img":""},
            {"id":5,"name":"Mango Smoothie",      "price":250,"cat":"Others",    "desc":"Fresh mango blended with yoghurt & a hint of honey","img":""},
            {"id":6,"name":"Chocolate Lava Cake", "price":420,"cat":"Others",    "desc":"Warm chocolate cake, molten centre, vanilla ice cream","img":""},
        ]
        save_menu(default)
        return default
    with open(MENU_FILE, encoding="utf-8") as f:
        return json.load(f)

def save_menu(data):
    with open(MENU_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_phones():
    if not os.path.exists(PHONE_FILE):
        return {"phone1": "", "phone2": ""}
    with open(PHONE_FILE, encoding="utf-8") as f:
        return json.load(f)

def save_phones(data):
    with open(PHONE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ─── REQUEST HANDLER ──────────────────────────────────────
class Handler(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        path = urlparse(self.path).path.rstrip("/")

        if path.startswith("/static/"):
            self._file(os.path.join(BASE_DIR, path.lstrip("/")))
        elif path == "/api/menu":
            self._json(200, load_menu())
        elif path == "/api/phones":
            self._json(200, load_phones())
        elif path in ("", "/", "/admin"):
            self._file(os.path.join(TEMPLATES, "index.html"))
        else:
            self._text(404, "Not found")

    def do_POST(self):
        path   = urlparse(self.path).path.rstrip("/")
        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length)

        try:
            data = json.loads(body)
        except Exception:
            self._json(400, {"error": "Invalid JSON"}); return

        # ── Add menu item ──────────────────────────────
        if path == "/api/menu":
            name  = str(data.get("name",  "") or "").strip()
            price = str(data.get("price", "") or "").strip()
            cat   = str(data.get("cat",   "") or "").strip()
            desc  = str(data.get("desc",  "") or "").strip()
            img   = str(data.get("img",   "") or "").strip()

            if not name:  self._json(400, {"error": "Name required"});     return
            if not price: self._json(400, {"error": "Price required"});    return
            if not cat:   self._json(400, {"error": "Category required"}); return
            try:
                price_val = float(price)
            except ValueError:
                self._json(400, {"error": "Invalid price"}); return

            menu   = load_menu()
            new_id = max((i["id"] for i in menu), default=0) + 1
            item   = {"id": new_id, "name": name, "price": price_val,
                      "cat": cat, "desc": desc, "img": img}
            menu.append(item)
            save_menu(menu)
            self._json(201, item)

        # ── Save phones ───────────────────────────────
        elif path == "/api/phones":
            phones = {
                "phone1": str(data.get("phone1", "") or "").strip(),
                "phone2": str(data.get("phone2", "") or "").strip(),
            }
            save_phones(phones)
            self._json(200, phones)

        # ── Delete menu item ──────────────────────────
        elif path == "/api/menu/delete":
            try:
                del_id = int(data["id"])
            except (KeyError, ValueError):
                self._json(400, {"error": "Invalid id"}); return

            menu = load_menu()
            if not any(i["id"] == del_id for i in menu):
                self._json(404, {"error": "Item not found"}); return

            save_menu([i for i in menu if i["id"] != del_id])
            self._json(200, {"ok": True})

        else:
            self._text(404, "Not found")

    # ── helpers ───────────────────────────────────────
    def _file(self, path):
        if not os.path.isfile(path):
            self._text(404, "Not found"); return
        with open(path, "rb") as f:
            data = f.read()
        ext   = os.path.splitext(path)[1].lower()
        ctype = {
            ".html": "text/html; charset=utf-8",
            ".css":  "text/css; charset=utf-8",
            ".js":   "application/javascript; charset=utf-8",
            ".json": "application/json",
            ".png":  "image/png", ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg", ".webp": "image/webp",
            ".svg":  "image/svg+xml", ".ico": "image/x-icon",
        }.get(ext, "application/octet-stream")
        self.send_response(200)
        self.send_header("Content-Type",   ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type",   "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _text(self, code, msg):
        body = msg.encode()
        self.send_response(code)
        self.send_header("Content-Type",   "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} → {args[0]}")

# ─── MAIN ─────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else PORT))
    os.chdir(BASE_DIR)
    with socketserver.TCPServer(("", port), Handler) as httpd:
        httpd.allow_reuse_address = True
        print("=" * 48)
        print("  C.O.O.King Stores — Server Running")
        print("=" * 48)
        print(f"  Site   →  http://localhost:{port}")
        print(f"  Admin  →  http://localhost:{port}/admin")
        print("  Press Ctrl+C to stop.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server stopped.")
