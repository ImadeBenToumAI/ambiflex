// /ambiflex backfill: fill the Usage, Agent OS and Growth views from the sessions this project already had.
// Claude Code keeps every local session as ~/.claude/projects/<project path with every non-alphanumeric
// character turned into "-">/<session>.jsonl. A transcript can be far larger than a plugin may read at once,
// so a short Python script reads them and prints one compact summary per session; the plugin merges those.
// Nothing leaves the machine: the summaries go into this project's .ambiflex logs, then to its own page.

/** The folder Claude Code keeps this project's transcripts in. */
export function transcriptDir(home: string, root: string): string {
  const path = root.replace(/[\\/]+$/, '')
  return `${home.replace(/[\\/]+$/, '')}/.claude/projects/${path.replace(/[^a-zA-Z0-9]/g, '-')}`
}

/** What the summary script prints for each session, one JSON per line. */
export type SessionSummary = {
  s: string
  start: string
  end: string
  /** The session's cost at API prices, from its cost record, when it has one. */
  usd?: number
  models: Record<string, number>
  skills: { skill: string; t: string }[]
  edits: { file: string; t: string }[]
  tools: number
}

/** Reads every *.jsonl under argv[1] and prints one summary line per session; skips files listed in argv[2] (comma-separated). */
export const SUMMARY_SCRIPT = `
import json, os, sys
d = sys.argv[1]; skip = set(filter(None, (sys.argv[2] if len(sys.argv) > 2 else '').split(',')))
for name in sorted(os.listdir(d)) if os.path.isdir(d) else []:
    if not name.endswith('.jsonl') or name[:-6] in skip: continue
    s = {'s': name[:-6], 'start': '', 'end': '', 'models': {}, 'skills': [], 'edits': [], 'tools': 0}
    try:
        f = open(os.path.join(d, name), encoding='utf-8', errors='replace')
    except OSError:
        continue
    for line in f:
        try: e = json.loads(line)
        except Exception: continue
        t = e.get('timestamp') or ''
        if t:
            if not s['start'] or t < s['start']: s['start'] = t
            if t > s['end']: s['end'] = t
        if e.get('type') == 'cost-state' and isinstance(e.get('totalCostUSD'), (int, float)):
            s['usd'] = e['totalCostUSD']
        if e.get('type') != 'assistant': continue
        m = e.get('message') or {}
        model = m.get('model') or e.get('requestedModel')
        if model and not str(model).startswith('<'): s['models'][model] = s['models'].get(model, 0) + 1
        for b in m.get('content') or []:
            if not isinstance(b, dict) or b.get('type') != 'tool_use': continue
            s['tools'] += 1
            i = b.get('input') or {}
            if b.get('name') == 'Skill' and i.get('skill'): s['skills'].append({'skill': str(i['skill']).lstrip('/'), 't': t})
            p = i.get('file_path') or i.get('notebook_path')
            if b.get('name') in ('Edit', 'Write', 'NotebookEdit', 'MultiEdit') and p: s['edits'].append({'file': p, 't': t})
    if s['start']: print(json.dumps(s))
`

export function parseSummaries(out: string): SessionSummary[] {
  return out.split('\n').filter(Boolean).flatMap(l => { try { const s = JSON.parse(l); return s?.s && s.start ? [s as SessionSummary] : [] } catch { return [] } })
}

// The same short id live readings use (the session id's last six characters), so a session never counts twice.
const short = (id: string) => id.slice(-6)

/** The lines to append to the project's logs: usage readings (cost only: past sessions keep no window readings), skill uses and changes, brain touches. */
export function backfillLines(sessions: SessionSummary[], elementOf: (path: string) => string | undefined): { usage: string[]; skills: string[]; brain: string[] } {
  const usage: string[] = [], skills: string[] = [], brain: string[] = []
  for (const x of sessions) {
    const s = short(x.s)
    const model = Object.entries(x.models).sort((a, b) => b[1] - a[1])[0]?.[0]
    usage.push(JSON.stringify({ t: x.start, s, usd: 0, ...(model ? { m: model } : {}), backfill: true }))
    usage.push(JSON.stringify({ t: x.end, s, usd: +(x.usd ?? 0).toFixed(4), ...(model ? { m: model } : {}), backfill: true }))
    for (const u of x.skills) {
      skills.push(JSON.stringify({ t: u.t, s, skill: u.skill, kind: 'use', backfill: true }))
      const el = elementOf(`.claude/skills/${u.skill}/SKILL.md`)
      if (el) brain.push(JSON.stringify({ t: u.t, s, element: el, node: '', backfill: true }))
    }
    for (const e of x.edits) {
      const m = e.file.replace(/\\/g, '/').match(/(?:^|\/)\.claude\/skills\/([^/]+)\//)
      if (m) skills.push(JSON.stringify({ t: e.t, s, skill: m[1], kind: 'develop', file: e.file.replace(/^.*\/\.claude\/skills\//, ''), backfill: true }))
      const el = elementOf(e.file)
      if (el) brain.push(JSON.stringify({ t: e.t, s, element: el, node: '', backfill: true }))
    }
  }
  return { usage, skills, brain }
}
