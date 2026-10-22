// The local page: the same Ambiflex page, served from this machine by a small server the plugin starts. It reads
// the documents the session writes in .ambiflex/docs/ (pull), so it shows the session's state with no claude.ai
// sync in between; its buttons append to .ambiflex/actions.jsonl, which the session reads at its next step.
// The server listens on 127.0.0.1 only and answers only requests that carry its key.

/** Python 3 standard library only: python3 serve.py <port> <key>, run from the project's .ambiflex folder. */
export const SERVER_PY = `
import http.server, json, os, sys, urllib.parse
PORT, KEY = int(sys.argv[1]), sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def ok(self, q): return urllib.parse.parse_qs(q).get('k', [''])[0] == KEY
    def send(self, code, body, kind='application/json'):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code); self.send_header('Content-Type', kind + '; charset=utf-8'); self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if not self.ok(u.query): return self.send(403, '{"error":"key"}')
        if u.path in ('/', '/index.html'):
            try: return self.send(200, open(os.path.join(HERE, 'local.html'), 'rb').read(), 'text/html')
            except OSError: return self.send(404, 'no page yet: /ambiflex local', 'text/plain')
        if u.path.startswith('/doc/'):
            name = os.path.basename(u.path[5:])
            try: return self.send(200, open(os.path.join(HERE, 'docs', name + '.json'), 'rb').read())
            except OSError: return self.send(200, 'null')
        self.send(404, '{}')
    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if not self.ok(u.query) or u.path != '/action': return self.send(403, '{"error":"key"}')
        n = int(self.headers.get('Content-Length') or 0)
        if n > 65536: return self.send(413, '{}')
        body = json.loads(self.rfile.read(n) or b'{}')
        with open(os.path.join(HERE, 'actions.jsonl'), 'a') as f: f.write(json.dumps(body) + '\\n')
        self.send(200, '{"ok":true}')
http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
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

/** Reads and empties the queue of page actions; returns their texts in order, without repeats. */
export function parseActions(text: string): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try { const a = JSON.parse(line) as { text?: string }; if (a.text && !out.includes(a.text)) out.push(String(a.text).slice(0, 2000)) } catch { /* a torn line */ }
  }
  return out
}
