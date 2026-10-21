// Agent OS view: the skills of a project (`.claude/skills/<name>/`), how they grew from the first commit,
// and which sessions and agents used or developed them. Pure functions; register.tsx gathers the inputs.

/** One line of `.ambiflex/skills.jsonl`: a skill used (the Skill tool) or developed (a file under it written). */
export type SkillEvent = { t: string; s: string; agent?: string; skill: string; kind: 'use' | 'develop'; file?: string }

export type SkillFiles = { name: string; skillMd?: string; learnings?: string; evals?: string; files: string[] }

export type SkillRow = {
  name: string
  description: string
  created: string
  updated: string
  commits: number
  learnings: { date: string; title: string }[]
  evals: number
  uses: number
  develops: number
  sessions: string[]
}

export type SkillPoint = { date: string; skills: number; learnings: number; commits: number; uses: number }

export type SkillsDoc = { at: string; skills: SkillRow[]; timeline: SkillPoint[]; sessions: { s: string; first: string; uses: number; develops: number; skills: string[] }[] }

const SKILL_PATH = /(?:^|\/)\.claude\/skills\/([^/]+)\//

/** The skill a path belongs to, or undefined. */
export function skillOf(path: string): string | undefined {
  return path.replace(/\\/g, '/').match(SKILL_PATH)?.[1]
}

/** `## 2026-09-19 — title` entries of a learnings.md, oldest first. */
export function parseLearnings(md: string): { date: string; title: string }[] {
  const out: { date: string; title: string }[] = []
  for (const m of md.matchAll(/^#{2,3}\s+(\d{4}-\d{2}-\d{2})\s*(?:[—–:-]\s*)?(.*)$/gm)) out.push({ date: m[1], title: m[2].trim() })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** name and description from a SKILL.md frontmatter. */
export function parseSkillMd(md: string): { name?: string; description?: string } {
  const fm = md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
  const get = (k: string) => fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '').trim()
  return { name: get('name'), description: get('description') }
}

/** Cases in an eval.json: an array, or an object holding one (evals, cases, tests). */
export function countEvals(json: string): number {
  try {
    const v = JSON.parse(json)
    if (Array.isArray(v)) return v.length
    for (const k of ['evals', 'cases', 'tests', 'checks']) if (Array.isArray(v?.[k])) return v[k].length
    return v && typeof v === 'object' ? Object.keys(v).length : 0
  } catch { return 0 }
}

/** `git log --reverse --format=%x1e%aI --name-only -- .claude/skills`: per skill, the date of each commit touching it. */
export function parseSkillLog(out: string): Record<string, string[]> {
  const by: Record<string, string[]> = {}
  for (const rec of out.split('\x1e').filter(r => r.trim())) {
    const [head, ...files] = rec.split('\n')
    const date = head.trim().slice(0, 10)
    const seen = new Set<string>()
    for (const f of files) { const s = skillOf(f.trim()); if (s && !seen.has(s)) { seen.add(s); (by[s] ??= []).push(date) } }
  }
  return by
}

export function parseEvents(text: string): SkillEvent[] {
  return text.split('\n').filter(Boolean).flatMap(l => { try { const e = JSON.parse(l); return e?.skill && e?.t ? [e as SkillEvent] : [] } catch { return [] } })
}

const day = (iso: string) => iso.slice(0, 10)

export function buildSkills(input: { at: string; files: SkillFiles[]; log: Record<string, string[]>; events: SkillEvent[] }): SkillsDoc {
  const { at, files, log, events } = input
  const names = new Set([...files.map(f => f.name), ...Object.keys(log)])
  const skills: SkillRow[] = [...names].map(name => {
    const f = files.find(x => x.name === name)
    const md = parseSkillMd(f?.skillMd ?? '')
    const learnings = parseLearnings(f?.learnings ?? '')
    const evs = events.filter(e => e.skill === name)
    const dates = [...(log[name] ?? []), ...learnings.map(l => l.date), ...evs.map(e => day(e.t))].sort()
    return {
      name,
      description: md.description ?? '',
      created: dates[0] ?? day(at),
      updated: dates[dates.length - 1] ?? day(at),
      commits: log[name]?.length ?? 0,
      learnings,
      evals: countEvals(f?.evals ?? ''),
      uses: evs.filter(e => e.kind === 'use').length,
      develops: evs.filter(e => e.kind === 'develop').length,
      sessions: [...new Set(evs.map(e => e.s))],
    }
  }).sort((a, b) => b.updated.localeCompare(a.updated) || a.name.localeCompare(b.name))

  // One point per day with activity, cumulative for skills and learnings.
  const days = new Set<string>()
  for (const s of skills) { days.add(s.created); s.learnings.forEach(l => days.add(l.date)) }
  for (const d of Object.values(log).flat()) days.add(d)
  for (const e of events) days.add(day(e.t))
  const timeline = [...days].sort().map(date => ({
    date,
    skills: skills.filter(s => s.created <= date).length,
    learnings: skills.reduce((k, s) => k + s.learnings.filter(l => l.date <= date).length, 0),
    commits: Object.values(log).reduce((k, ds) => k + ds.filter(d => d === date).length, 0),
    uses: events.filter(e => e.kind === 'use' && day(e.t) === date).length,
  }))

  const bySession = new Map<string, { s: string; first: string; uses: number; develops: number; skills: Set<string> }>()
  for (const e of events) {
    const r = bySession.get(e.s) ?? { s: e.s, first: e.t, uses: 0, develops: 0, skills: new Set<string>() }
    if (e.t < r.first) r.first = e.t
    r[e.kind === 'use' ? 'uses' : 'develops']++
    r.skills.add(e.skill)
    bySession.set(e.s, r)
  }
  const sessions = [...bySession.values()].sort((a, b) => b.first.localeCompare(a.first)).map(r => ({ ...r, skills: [...r.skills] }))
  return { at, skills, timeline, sessions }
}
