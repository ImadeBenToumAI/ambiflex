// The local page: the same Ambiflex page, served from this machine by a small server the plugin starts. It reads
// the documents the session writes in the project's .ambiflex/docs/ (pull), so it shows the session's state with no
// claude.ai sync in between. The server, its page, its key and its button queue live in the user's runtime folder
// (~/.claude/ambiflex-runtime/<project id>/), never in the repository; each queued action carries the key, and the
// session reads the queue only while it runs its own local page. The server listens on 127.0.0.1 only, answers only
// requests that carry its key and name 127.0.0.1 or localhost as their host, and sends no referrer.

/** Python 3 standard library only: python3 serve.py <port> <key> <docs folder>, run from the runtime folder. */
export const SERVER_PY = `
import hmac, http.server, json, os, sys, urllib.parse
PORT, KEY, DOCS = int(sys.argv[1]), sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
HOSTS = ('127.0.0.1:%d' % PORT, 'localhost:%d' % PORT)
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def ok(self, q):
        if self.headers.get('Host', '') not in HOSTS: return False
        return hmac.compare_digest(urllib.parse.parse_qs(q).get('k', [''])[0], KEY)
    def send(self, code, body, kind='application/json'):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code); self.send_header('Content-Type', kind + '; charset=utf-8'); self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'no-referrer'); self.send_header('X-Content-Type-Options', 'nosniff'); self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if not self.ok(u.query): return self.send(403, '{"error":"key"}')
        if u.path in ('/', '/index.html'):
            try: return self.send(200, open(os.path.join(HERE, 'local.html'), 'rb').read(), 'text/html')
            except OSError: return self.send(404, 'no page yet: /ambiflex local', 'text/plain')
        if u.path.startswith('/doc/'):
            name = os.path.basename(u.path[5:])
            try: return self.send(200, open(os.path.join(DOCS, name + '.json'), 'rb').read())
            except OSError: return self.send(200, 'null')
        self.send(404, '{}')
    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if not self.ok(u.query) or u.path != '/action': return self.send(403, '{"error":"key"}')
        n = int(self.headers.get('Content-Length') or 0)
        if n > 65536: return self.send(413, '{}')
        body = json.loads(self.rfile.read(n) or b'{}')
        body['k'] = KEY
        fd = os.open(os.path.join(HERE, 'actions.jsonl'), os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
        with os.fdopen(fd, 'a') as f: f.write(json.dumps(body) + '\\n')
        self.send(200, '{"ok":true}')
s = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H)
print('ready', flush=True)
s.serve_forever()
`

/**
 * Replaces the page's claude.ai runtime with this machine: documents are polled from the local server every second,
 * actions and messages to Claude go to the session's queue. Injected before the page's own script.
 */
export function localShim(key: string): string {
  return `<script>(() => {
  const k = ${JSON.stringify(key)}, q = '?k=' + encodeURIComponent(k);
  const doc = path => ({ onSnapshot(cb, err) { const name = path.split('/')[0]; let last = '';
    const tick = () => fetch('/doc/' + name + q, { cache: 'no-store' }).then(r => r.text()).then(t => { if (t !== last) { last = t; let d = null; try { d = JSON.parse(t); } catch (e) {} cb({ data: () => d }); } }).catch(e => err && err(e));
    tick(); setInterval(tick, 1000); return () => {}; } });
  const post = body => fetch('/action' + q, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const db = { doc, collection: () => ({ add: async d => { if (d && d.via === 'queue') await post(d); return { id: String(Date.now()) }; } }) };
  const comments = { canSendToClaude: async () => 'available', anchorFor: async () => ({}), sendToClaude: async ({ text }) => { await post({ text, via: 'local', at: new Date().toISOString() }); } };
  window.claude = { use: async name => name === 'db' ? db : name === 'comments' ? comments : null };
  document.addEventListener('DOMContentLoaded', () => { const t = document.querySelector('title'); if (t) t.textContent = 'Ambiflex · local'; });
})();</script>`
}

/** The queue's texts in order, without repeats, keeping only the lines this session's own local page wrote (its key). */
export function parseActions(text: string, key: string): string[] {
  const out: string[] = []
  if (!key) return out
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      const a = JSON.parse(line) as { text?: string; k?: string }
      if (a.k !== key) continue
      if (a.text && !out.includes(a.text)) out.push(String(a.text).slice(0, 2000))
    } catch { /* a torn line */ }
  }
  return out
}
