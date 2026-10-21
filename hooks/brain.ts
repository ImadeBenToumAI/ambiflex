// Agent OS: the brain of a project. CLAUDE.md at the centre, then four rings, each with a meaning in Ambiflex:
//   skills        what the agent knows how to do          (.claude/skills/<name>/SKILL.md)
//   memory        what the agent has learned               (CLAUDE.md files, learnings, memory notes, and proven nodes of the tree)
//   routines      what runs by itself                      (.claude/commands, hooks, os/routines)
//   applications  where the agent acts                     (the project's folders and MCP servers)
// Every edge is something a file actually says: a file that names another element links to it.
// Pure functions; register.tsx reads the files.

export type Ring = 'core' | 'skills' | 'memory' | 'routines' | 'applications'

/** A file or element register.tsx found, with its text when it is a file (cut to a few KB). */
export type BrainSource = { id: string; ring: Ring; label: string; path?: string; text?: string; detail?: string; at?: string }

export type BrainNode = { id: string; ring: Ring; label: string; path?: string; detail?: string; degree: number; at?: string; tree?: string[] }

export type BrainDoc = {
  at: string
  nodes: BrainNode[]
  edges: [string, string][]
  /** Elements used or changed lately, newest first: the brain pulses there. */
  recent: { id: string; at: string; by?: string }[]
  counts: Record<Ring, number>
}

const MAX_NODES = 400
const MAX_EDGES = 2500

/** The words a file can use to name an element: its label, and for a file its name without extension. */
function names(s: BrainSource): string[] {
  const out = new Set<string>()
  const add = (w?: string) => { if (w && w.length >= 4) out.add(w.toLowerCase()) }
  add(s.label)
  if (s.path) { const base = s.path.split('/').pop() ?? ''; add(base); add(base.replace(/\.[a-z0-9]+$/i, '')) }
  return [...out]
}

const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function buildBrain(input: {
  at: string
  sources: BrainSource[]
  /** Proven nodes of the tree (done with a verification): what the project learned. */
  proven: { id: string; title: string; verification: string; at: string }[]
  /** Which tree nodes touched which element (a skill used while a node was in hand, a file edited for it). */
  links: { element: string; node: string; at: string; by?: string }[]
}): BrainDoc {
  const sources = [...input.sources]
  for (const p of input.proven) sources.push({ id: `learned:${p.id}`, ring: 'memory', label: p.title, detail: `Proven: ${p.verification}`, text: `${p.title} ${p.verification}`, at: p.at })
  const kept = sources.slice(0, MAX_NODES)
  const byId = new Map(kept.map(s => [s.id, s]))

  // An edge where a file's text names another element; the core links to every element it names, and to
  // every skill and routine, since CLAUDE.md is what loads them.
  const edges = new Set<string>()
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const patterns = kept.map(s => ({ id: s.id, re: names(s).length ? new RegExp(`(^|[^a-z0-9_-])(${names(s).map(escape).join('|')})($|[^a-z0-9_-])`, 'i') : undefined }))
  for (const s of kept) {
    if (!s.text) continue
    const text = s.text.slice(0, 20000)
    for (const p of patterns) {
      if (p.id === s.id || !p.re) continue
      if (p.re.test(text)) edges.add(key(s.id, p.id))
      if (edges.size >= MAX_EDGES) break
    }
  }
  const core = kept.find(s => s.ring === 'core')
  if (core) for (const s of kept) if (s.ring === 'skills' || s.ring === 'routines') edges.add(key(core.id, s.id))

  const degree = new Map<string, number>()
  const pairs = [...edges].map(e => e.split('|') as [string, string]).filter(([a, b]) => byId.has(a) && byId.has(b))
  for (const [a, b] of pairs) { degree.set(a, (degree.get(a) ?? 0) + 1); degree.set(b, (degree.get(b) ?? 0) + 1) }

  const treeOf = new Map<string, Set<string>>()
  for (const l of input.links) if (byId.has(l.element)) treeOf.set(l.element, (treeOf.get(l.element) ?? new Set()).add(l.node))

  const nodes: BrainNode[] = kept.map(s => ({
    id: s.id, ring: s.ring, label: s.label, ...(s.path ? { path: s.path } : {}), ...(s.detail ? { detail: s.detail.slice(0, 300) } : {}),
    degree: degree.get(s.id) ?? 0, ...(s.at ? { at: s.at } : {}), ...(treeOf.has(s.id) ? { tree: [...treeOf.get(s.id)!] } : {}),
  }))
  const recent = input.links.filter(l => byId.has(l.element)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30).map(l => ({ id: l.element, at: l.at, ...(l.by ? { by: l.by } : {}) }))
  const counts = { core: 0, skills: 0, memory: 0, routines: 0, applications: 0 } as Record<Ring, number>
  for (const n of nodes) counts[n.ring]++
  return { at: input.at, nodes, edges: pairs, recent, counts }
}

/** The element a written or read path belongs to, among the brain's sources. */
export function elementOf(path: string, sources: { id: string; path?: string }[]): string | undefined {
  const p = path.replace(/\\/g, '/')
  let best: { id: string; len: number } | undefined
  for (const s of sources) {
    if (!s.path) continue
    const dir = s.path.endsWith('/SKILL.md') ? s.path.slice(0, -'SKILL.md'.length) : s.path
    if ((p === s.path || p.endsWith(`/${s.path}`) || p.includes(`/${dir}`) || p.startsWith(dir)) && (!best || dir.length > best.len)) best = { id: s.id, len: dir.length }
  }
  return best?.id
}

/** A one-line description from a markdown file: its frontmatter description, else its first heading or line. */
export function describe(md: string): string {
  const fm = md.match(/^---\n([\s\S]*?)\n---/)?.[1]
  const d = fm?.match(/^description:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, '').trim()
  if (d) return d
  const body = fm ? md.slice(md.indexOf('---', 3) + 3) : md
  return (body.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(Boolean) ?? '').slice(0, 200)
}
