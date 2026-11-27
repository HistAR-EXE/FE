"""Local-only QA preview of an existing build, with the existing API forwarded unchanged."""
import http.client
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(sys.argv[1]).resolve()
PORT = int(sys.argv[2])
API_PORT = int(sys.argv[3])
HOP = {'connection', 'keep-alive', 'transfer-encoding', 'proxy-connection', 'host', 'content-length'}
TYPES = {'.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.html':'text/html', '.json':'application/json', '.glb':'model/gltf-binary', '.wasm':'application/wasm', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2'}

class Preview(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Never log auth headers or request bodies.

    def do_HEAD(self): self.handle_request(False)
    def do_GET(self): self.handle_request()
    def do_POST(self): self.handle_request()
    def do_PUT(self): self.handle_request()
    def do_DELETE(self): self.handle_request()

    def handle_request(self, body=True):
        path = urlsplit(self.path).path
        if path.startswith('/api/'):
            size = int(self.headers.get('Content-Length', '0'))
            if size > 2 * 1024 * 1024:
                self.send_error(413); return
            payload = self.rfile.read(size) if size else None
            connection = http.client.HTTPConnection('127.0.0.1', API_PORT, timeout=60)
            try:
                headers = {k:v for k,v in self.headers.items() if k.lower() not in HOP}
                connection.request(self.command, self.path, body=payload, headers=headers)
                response = connection.getresponse(); data = response.read()
                self.send_response(response.status)
                for k,v in response.getheaders():
                    if k.lower() not in HOP: self.send_header(k,v)
                self.send_header('Content-Length', str(len(data))); self.end_headers()
                if body: self.wfile.write(data)
            except (OSError, http.client.HTTPException):
                self.send_error(502, 'Local QA API unavailable')
            finally:
                connection.close()
            return
        file = (ROOT / unquote(path).lstrip('/')).resolve()
        if not file.is_relative_to(ROOT): self.send_error(403); return
        if file.is_dir(): file = file / 'index.html'
        if not file.is_file() and not file.suffix: file = ROOT / 'index.html'
        if not file.is_file(): self.send_error(404); return
        data = file.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', TYPES.get(file.suffix, mimetypes.guess_type(str(file))[0] or 'application/octet-stream'))
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if body:
            try: self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError): pass

class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

print(f'Local QA preview on 127.0.0.1:{PORT}; root={ROOT}', flush=True)
Server(('127.0.0.1', PORT), Preview).serve_forever()
