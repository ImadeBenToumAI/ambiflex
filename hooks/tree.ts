import type { Proposal, Review, Auto, Cost, Lens, Status, Tree, TreeNode } from '../types'

export const LENSES: Lens[] = ['goal', 'altitude', 'depth', 'range', 'step']
export const STATUSES: Status[] = ['proposed', 'exploring', 'review', 'blocked', 'done', 'validated', 'merged', 'abandoned', 'moved']
/** Out of the plan: dropped because wrong (abandoned) or living elsewhere (moved). Neither counts in progress or ETA. */
export const CLOSED: Status[] = ['abandoned', 'moved']
export const FINISHED: Status[] = ['done', 'validated', 'merged']

export const LENS_LABEL: Record<Lens, string> = {
  goal: 'Goal',
  altitude: 'Altitude',
  depth: 'Depth',
  range: 'Range',
  step: 'Step',
}

export const STATUS_LABEL: Record<Status, string> = {
  proposed: 'proposed',
  exploring: 'exploring',
  review: 'needs review',
  blocked: 'blocked',
  done: 'done',
  validated: 'validated',
  merged: 'merged',
  abandoned: 'abandoned',
  moved: 'moved',
}

const LENS_COLOR: Record<Lens, string> = {
  goal: '#7c5cff',
  altitude: '#0ea5e9',
  depth: '#16a34a',
  range: '#f59e0b',
  step: '#64748b',
}

export const DEFAULT_AUTO: Auto = { on: false, turns: 0, maxTurns: 40 }
export const DEFAULT_COST: Cost = { spentUsd: 0, sessionUsd: 0, ratePerHour: 0, assumedRate: true, estimateUsd: 0, model: '', rateLimits: [] }

/** Assumed $/hour of agentic work per model family, used until the session has measured its own rate. */
export const ASSUMED_RATE_PER_HOUR: Record<string, number> = { fable: 30, mythos: 30, opus: 12, sonnet: 6, haiku: 0.6 }

export function assumedRate(model: string): number {
  const key = Object.keys(ASSUMED_RATE_PER_HOUR).find(k => model.toLowerCase().includes(k))
  return key ? ASSUMED_RATE_PER_HOUR[key]! : 10
}

/** Projects the cost of what is left: critical-path hours × the measured (or assumed) hourly rate, scaled by calibration. */
export function costEstimate(tree: Tree, ratePerHour: number): number {
  const e = eta(tree)
  const c = calibration(tree)
  return +((e.remaining / 60) * ratePerHour * c.factor).toFixed(2)
}

export const emptyTree = (): Tree => ({ version: 1, goal: '', nodes: [], auto: { ...DEFAULT_AUTO }, cost: { ...DEFAULT_COST } })

export function parseTree(text: string | undefined): Tree {
  if (!text) return emptyTree()
  try {
    const raw = JSON.parse(text) as Partial<Tree>
    return {
      version: 1,
      goal: typeof raw.goal === 'string' ? raw.goal : '',
      nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
      auto: { ...DEFAULT_AUTO, ...(raw.auto ?? {}) },
      cost: { ...DEFAULT_COST, ...(raw.cost ?? {}) },
      ...(Array.isArray(raw.reviews) && raw.reviews.length ? { reviews: raw.reviews } : {}),
    }
  } catch {
    return emptyTree()
  }
}

export type NodeInput = Partial<Omit<TreeNode, 'createdAt' | 'updatedAt'>> & { id?: string }

export function nextId(tree: Tree): string {
  let n = tree.nodes.length + 1
  while (tree.nodes.some(node => node.id === `n${n}`)) n++
  return `n${n}`
}

/** Creates or updates a node. `done` without `verification` is downgraded to `review`. */
export function upsert(tree: Tree, input: NodeInput, now: string): { tree: Tree; node: TreeNode } {
  const existing = input.id ? tree.nodes.find(node => node.id === input.id) : undefined
  const known = new Set(tree.nodes.map(node => node.id))
  const parents = (input.parents ?? existing?.parents ?? []).filter(id => known.has(id) && id !== input.id)
  const lens = input.lens && LENSES.includes(input.lens) ? input.lens : existing?.lens ?? 'step'
  let status = input.status && STATUSES.includes(input.status) ? input.status : existing?.status ?? 'proposed'
  const verification = input.verification ?? existing?.verification
  if (status === 'done' && !verification) status = 'review'
  // A wait or a move without its reason says nothing: keep the previous status.
  if (status === 'blocked' && !(input.blockedOn ?? existing?.blockedOn)) status = existing?.status ?? 'proposed'
  if (status === 'moved' && !(input.movedTo ?? existing?.movedTo)) status = existing?.status ?? 'proposed'
  // A node with an acceptance criterion is done only when its last iteration met it.
  const acceptance = input.acceptance ?? existing?.acceptance
  const tries = input.iterations ?? existing?.iterations ?? []
  if (status === 'done' && acceptance && !tries[tries.length - 1]?.passed) status = 'review'
  // A reviewer's table that finds a claim wrong or unproven keeps the node in review until the claim is fixed.
  const evidence = input.evidence ?? existing?.evidence
  if (status === 'done' && evidence?.some(x => x.verdict !== 'confirmed')) status = 'review'
  // A run merges with the one stored: a heartbeat or a state change need not repeat the resource.
  const run = input.run ? { ...existing?.run, ...stripUndefined(input.run as never) } as TreeNode['run'] : existing?.run
  if (run && input.run) {
    run.heartbeatAt = input.run.heartbeatAt ?? now
    if (run.state === 'running' && !run.startedAt) run.startedAt = now
    if (run.state !== 'running' && !run.endedAt) run.endedAt = now
    if (run.state === 'running') delete run.endedAt
  }
  const node: TreeNode = {
    ...existing,
    ...stripUndefined(input),
    ...(run ? { run } : {}),
    id: existing?.id ?? input.id ?? nextId(tree),
    title: clip(input.title ?? existing?.title ?? 'Untitled', 80),
    lens,
    status,
    parents,
    ...(input.weight !== undefined || existing?.weight !== undefined ? { weight: Math.min(5, Math.max(1, Math.round(Number(input.weight ?? existing?.weight) || 1))) } : {}),
    ...(input.seq !== undefined || existing?.seq !== undefined ? { seq: Math.max(1, Math.round(Number(input.seq ?? existing?.seq) || 1)) } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  if (status === 'exploring' && !node.startedAt) node.startedAt = now
  // A node set straight to review/done without passing through `exploring` still did work: it
  // started when it was last touched before this change (or when it was created).
  if ((status === 'review' || FINISHED.includes(status)) && !node.startedAt) node.startedAt = existing?.updatedAt ?? node.createdAt
  if (FINISHED.includes(status) && !node.finishedAt) node.finishedAt = now
  const nodes = existing
    ? tree.nodes.map(one => (one.id === node.id ? node : one))
    : [...tree.nodes, node]
  return { tree: { ...tree, nodes }, node }
}

/**
 * Records one attempt at a node's acceptance criterion. A passing attempt makes the node done, with
 * the attempt as its verification; a failing one keeps it exploring for the next iteration.
 */
export function iterate(tree: Tree, id: string, attempt: { result: string; value?: number; passed: boolean }, now: string): { tree: Tree; node?: TreeNode } {
  const node = tree.nodes.find(n => n.id === id)
  if (!node) return { tree }
  const iterations = [...(node.iterations ?? []), { n: (node.iterations?.length ?? 0) + 1, result: clip(attempt.result, 200), ...(typeof attempt.value === 'number' ? { value: attempt.value } : {}), passed: !!attempt.passed, at: now }]
  const last = iterations[iterations.length - 1]
  return upsert(tree, {
    id,
    iterations,
    status: last.passed ? 'done' : 'exploring',
    ...(last.passed ? { verification: `Acceptance met${node.acceptance ? ` (${clip(node.acceptance, 80)})` : ''} at iteration ${last.n}: ${last.result}` } : {}),
  }, now)
}

/** Siblings in step order: by first parent, then step number, then as written. */
export function bySeq(a: TreeNode, b: TreeNode): number {
  const pa = a.parents[0] ?? '', pb = b.parents[0] ?? ''
  if (pa !== pb) return 0
  return (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER)
}

/** Merges branches: sources become `merged` and parents of the target node. */
export function merge(tree: Tree, sources: string[], into: string, now: string): Tree {
  const target = tree.nodes.find(node => node.id === into)
  if (!target) return tree
  const valid = sources.filter(id => id !== into && tree.nodes.some(node => node.id === id))
  return {
    ...tree,
    nodes: tree.nodes.map(node => {
      if (node.id === into) {
        return { ...node, parents: [...new Set([...node.parents, ...valid])], updatedAt: now }
      }
      if (valid.includes(node.id)) return { ...node, status: 'merged', finishedAt: node.finishedAt ?? now, updatedAt: now }
      return node
    }),
  }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** Depth = longest path from a root. */
export function depths(tree: Tree): Map<string, number> {
  const byId = new Map(tree.nodes.map(node => [node.id, node]))
  const memo = new Map<string, number>()
  const visit = (id: string, seen: Set<string>): number => {
    const hit = memo.get(id)
    if (hit !== undefined) return hit
    const node = byId.get(id)
    if (!node || seen.has(id)) return 0
    seen.add(id)
    const parents = node.parents.filter(p => byId.has(p))
    const d = parents.length === 0 ? 0 : 1 + Math.max(...parents.map(p => visit(p, seen)))
    memo.set(id, d)
    return d
  }
  for (const node of tree.nodes) visit(node.id, new Set())
  return memo
}

export function progress(tree: Tree): { total: number; finished: number; exploring: number; review: number; blocked: number; closed: number; pct: number } {
  const live = tree.nodes.filter(node => !CLOSED.includes(node.status))
  const finished = live.filter(node => FINISHED.includes(node.status)).length
  const exploring = live.filter(node => node.status === 'exploring').length
  const review = live.filter(node => node.status === 'review').length
  // Weighted by importance: a critical node counts five times a minor one.
  const w = (n: TreeNode) => n.weight ?? 1
  const all = live.reduce((sum, n) => sum + w(n), 0)
  const done = live.filter(node => FINISHED.includes(node.status)).reduce((sum, n) => sum + w(n), 0)
  const blocked = live.filter(node => node.status === 'blocked').length
  const closed = tree.nodes.length - live.length
  return { total: live.length, finished, exploring, review, blocked, closed, pct: all ? Math.round((done / all) * 100) : 0 }
}

/** Current node: needs review first, then the latest exploring one, then the next proposed one. */
export function current(tree: Tree): TreeNode | undefined {
  const byTime = [...tree.nodes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return byTime.find(n => n.status === 'review') ?? byTime.find(n => n.status === 'exploring') ?? nextOpen(tree)
}

/**
 * Next node to work on in auto mode: a proposed node whose parents are all settled. A goal node is
 * an umbrella: its children are workable while it is open. Oldest first, so a plan runs in the
 * order it was written, then shallowest.
 */
export function nextOpen(tree: Tree): TreeNode | undefined {
  return readyOpen(tree)[0]
}

/** Every open node that can start now (parents settled, earlier numbered steps finished), in nextOpen's order. */
export function readyOpen(tree: Tree): TreeNode[] {
  const byId = new Map(tree.nodes.map(n => [n.id, n]))
  const settled = (id: string) => {
    const p = byId.get(id)
    return !p || FINISHED.includes(p.status) || CLOSED.includes(p.status) || p.lens === 'goal'
  }
  // A numbered step waits for the earlier steps under the same parent.
  const stepsBefore = (n: TreeNode) => n.seq === undefined ? [] : tree.nodes.filter(o => o.id !== n.id && o.seq !== undefined && o.seq < n.seq! && (o.parents[0] ?? '') === (n.parents[0] ?? ''))
  const candidates = tree.nodes.filter(n => n.status === 'proposed' && n.lens !== 'goal' && n.parents.every(settled) && stepsBefore(n).every(o => settled(o.id)))
  const d = depths(tree)
  return candidates.sort((a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER) || a.createdAt.localeCompare(b.createdAt) || (d.get(a.id) ?? 0) - (d.get(b.id) ?? 0))
}

/** What auto mode works on next: a non-goal node already being explored (resume it), else the next open one. */
export function autoTarget(tree: Tree): TreeNode | undefined {
  return tree.nodes.find(n => n.status === 'exploring' && n.lens !== 'goal') ?? nextOpen(tree)
}

/**
 * What auto mode can run at once: nodes being explored by no subagent (resume them), then open nodes ready now.
 * Ready nodes never depend on each other: a child waits for its parents and a numbered step for the earlier ones,
 * so none of them is ready before the other is settled. Nodes already held by a subagent are left to it.
 */
export function autoBatch(tree: Tree, max: number): TreeNode[] {
  const resume = tree.nodes.filter(n => n.status === 'exploring' && n.lens !== 'goal' && !n.agent)
  const batch = [...resume, ...readyOpen(tree)]
  return batch.slice(0, Math.max(1, max))
}

/** "30min" | "2h" | "3d" | "1w" (also "2 h", "1.5d") → minutes; 0 when absent. A day is 8 h, a week 5 days. */
export function minutes(estimate: string | undefined): number {
  if (!estimate) return 0
  // Three-point "1h/2h/4h" (optimistic / likely / pessimistic): PERT expected value (o + 4p + pess) / 6.
  const parts = estimate.split('/').map(one)
  if (parts.length === 3 && parts.every(v => v > 0)) return Math.round((parts[0]! + 4 * parts[1]! + parts[2]!) / 6)
  return one(estimate)
}

function one(text: string): number {
  // m and mo are months (2w/2m/4m reads as weeks to months); minutes are min or mn.
  const m = text.match(/([\d.,]+)\s*(min|mn|mo|mois|m|h|d|j|w|sem)\b/i)
  if (!m) return 0
  const n = parseFloat(m[1]!.replace(',', '.'))
  const unit = m[2]!.toLowerCase()
  const factor = unit === 'min' || unit === 'mn' ? 1 : unit === 'h' ? 60 : unit === 'd' || unit === 'j' ? 480 : unit === 'w' || unit === 'sem' ? 2400 : 10400
  return Math.round(n * factor)
}

/** Spread of a three-point estimate, in minutes (pessimistic − optimistic) / 6: the PERT standard deviation. */
export function spread(estimate: string | undefined): number {
  if (!estimate) return 0
  const parts = estimate.split('/').map(one)
  return parts.length === 3 && parts.every(v => v > 0) ? Math.round((parts[2]! - parts[0]!) / 6) : 0
}

/**
 * Turns working minutes into a calendar date: 8 working hours a day, Monday to Friday, from `from`.
 * A run in auto mode works around the clock, so pass `continuous` to count every hour.
 */
export function arrival(from: Date, workingMinutes: number, continuous = false): Date {
  if (workingMinutes <= 0) return from
  if (continuous) return new Date(from.getTime() + workingMinutes * 60000)
  const d = new Date(from.getTime())
  let left = workingMinutes
  while (left > 0) {
    const day = d.getUTCDay()
    if (day === 0 || day === 6) { d.setUTCDate(d.getUTCDate() + 1); d.setUTCHours(9, 0, 0, 0); continue }
    const hour = d.getUTCHours() + d.getUTCMinutes() / 60
    if (hour >= 17) { d.setUTCDate(d.getUTCDate() + 1); d.setUTCHours(9, 0, 0, 0); continue }
    if (hour < 9) d.setUTCHours(9, 0, 0, 0)
    const roomToday = (17 - Math.max(9, d.getUTCHours() + d.getUTCMinutes() / 60)) * 60
    const step = Math.min(roomToday, left)
    d.setTime(d.getTime() + step * 60000)
    left -= step
  }
  return d
}

export function human(min: number): string {
  if (min <= 0) return '—'
  if (min < 60) return `${Math.round(min)}min`
  if (min < 480) return `${+(min / 60).toFixed(1)}h`
  if (min < 2400) return `${+(min / 480).toFixed(1)}d`
  return `${+(min / 2400).toFixed(1)}w`
}

/** End-to-end estimate: the critical path (longest chain of remaining estimates) and the remaining sum. */
export function eta(tree: Tree): { critical: number; remaining: number; path: string[] } {
  const byId = new Map(tree.nodes.map(n => [n.id, n]))
  const open = (n: TreeNode) => !FINISHED.includes(n.status) && !CLOSED.includes(n.status) && n.status !== 'blocked'
  const memo = new Map<string, { min: number; path: string[] }>()
  const visit = (id: string, seen: Set<string>): { min: number; path: string[] } => {
    const hit = memo.get(id)
    if (hit) return hit
    const n = byId.get(id)
    if (!n || seen.has(id)) return { min: 0, path: [] }
    seen.add(id)
    let best = { min: 0, path: [] as string[] }
    for (const p of n.parents) {
      const r = visit(p, seen)
      if (r.min > best.min) best = r
    }
    const own = open(n) ? minutes(n.estimate) : 0
    const out = { min: best.min + own, path: own ? [...best.path, n.id] : best.path }
    memo.set(id, out)
    return out
  }
  let critical = { min: 0, path: [] as string[] }
  for (const n of tree.nodes) {
    const r = visit(n.id, new Set())
    if (r.min > critical.min) critical = r
  }
  const remaining = tree.nodes.filter(open).reduce((a, n) => a + minutes(n.estimate), 0)
  return { critical: critical.min, remaining, path: critical.path }
}

/** Actual minutes spent on finished nodes vs. their estimates: a calibration factor (1 = on time, 2 = twice as long). */
/**
 * Median of actual / estimated over finished nodes. Only nodes the plugin timed count: at least 2
 * minutes of work on an estimate of at least 30 minutes, and a ratio within [0.002, 20]. Estimates
 * are usually written in human effort while an agent finishes a "2d" node in minutes, so very low
 * ratios are real; what the floor rejects is a timestamp set by hand seconds apart.
 */
export function calibration(tree: Tree): { factor: number; samples: number } {
  const pairs = tree.nodes
    .filter(n => n.startedAt && n.finishedAt && minutes(n.estimate) >= 30)
    .map(n => ({ actual: (Date.parse(n.finishedAt!) - Date.parse(n.startedAt!)) / 60000, est: minutes(n.estimate) }))
    .filter(p => Number.isFinite(p.actual) && p.actual >= 2)
    .map(p => p.actual / p.est)
    // Start and end are calendar times: nights, weekends and waits on the owner are in them. A node that took more
    // than 4× its estimate in calendar time measures waiting, not effort, and does not calibrate anything.
    .filter(r => r >= 0.002 && r <= 4)
    .sort((a, b) => a - b)
  if (pairs.length === 0) return { factor: 1, samples: 0 }
  // Capped at 2×: above that the calendar measures waiting, and the cost and the end date would run away. Agents
  // finishing far faster than estimated is real pace and stays.
  const median = pairs[Math.floor(pairs.length / 2)]!
  return { factor: +Math.min(2, median).toFixed(2), samples: pairs.length }
}

/** When the plan should land: the calibrated critical path from now, with the three-point spread as ±. */
export function expectedEnd(tree: Tree, now: Date): { at: Date; plusMinus: number; minutes: number } {
  const e = eta(tree)
  const c = calibration(tree)
  const min = Math.round(e.critical * c.factor)
  const plusMinus = Math.round(Math.sqrt(e.path.reduce((a, id) => a + spread(tree.nodes.find(n => n.id === id)?.estimate) ** 2, 0)) * c.factor)
  return { at: arrival(now, min, tree.auto.on), plusMinus, minutes: min }
}

const esc = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** Draws the DAG as SVG, top-down like a Git graph: rows = depth, colour = lens, style = status; branches descend and merge. */
export interface RenderOptions {
  /** Hide finished leaves (done, validated, merged, abandoned) behind one chip per parent; default when the tree has more than 16 nodes. */
  compact?: boolean
  /** Nodes per line before a row wraps (default 6): keeps a wide tree readable in a narrow pane. */
  columns?: number
  /** What a running loop is doing on a node, by node id: replaces the node's meta line with "✻ <activity>". */
  live?: Record<string, string>
}

/** Should the pane fold finished leaves by default? Wide trees stay readable that way. */
export function compactByDefault(tree: Tree): boolean { return tree.nodes.length > 16 }

/** The nodes as the picture lays them out: one array per drawn line, folded leaves left out. */
export function layoutRows(tree: Tree, selected: string | undefined, opts: RenderOptions = {}): { rows: TreeNode[][]; folded: number } {
  const MAXC = Math.max(1, opts.columns ?? 6)
  const compact = opts.compact ?? compactByDefault(tree)
  const cur = current(tree)?.id
  const hasChildren = new Set(tree.nodes.flatMap(n => n.parents))
  let folded = 0
  const shown = tree.nodes.filter(node => {
    const fold = compact && FINISHED.includes(node.status) && !hasChildren.has(node.id) && node.id !== selected && node.id !== cur && node.parents.length > 0
    if (fold) folded++
    return !fold
  })
  const d = depths(tree)
  const byDepth = new Map<number, TreeNode[]>()
  for (const node of shown) byDepth.set(d.get(node.id) ?? 0, [...(byDepth.get(d.get(node.id) ?? 0) ?? []), node])
  const rows: TreeNode[][] = []
  for (const k of [...byDepth.keys()].sort((a, b) => a - b)) {
    const row = [...byDepth.get(k)!].sort(bySeq)
    for (let i = 0; i < row.length; i += MAXC) rows.push(row.slice(i, i + MAXC))
  }
  return { rows, folded }
}

export function renderSvg(tree: Tree, selected: string | undefined, opts: RenderOptions = {}): { source: string; width: number; height: number } {
  const W = 150, H = 48, GX = 18, GY = 40, PAD = 16, TOP = 30
  const MAXC = Math.max(1, opts.columns ?? 6)
  const compact = opts.compact ?? compactByDefault(tree)
  const cur = current(tree)?.id
  const hasChildren = new Set(tree.nodes.flatMap(n => n.parents))
  // In compact mode a finished leaf is folded into a chip under its first parent, unless it is selected or current.
  const folded = new Map<string, TreeNode[]>()
  const shown: TreeNode[] = []
  for (const node of tree.nodes) {
    const fold = compact && FINISHED.includes(node.status) && !hasChildren.has(node.id) && node.id !== selected && node.id !== cur && node.parents.length > 0
    if (fold) folded.set(node.parents[0], [...(folded.get(node.parents[0]) ?? []), node])
    else shown.push(node)
  }
  const d = depths(tree)
  const rows = new Map<number, TreeNode[]>()
  for (const node of shown) {
    const row = d.get(node.id) ?? 0
    rows.set(row, [...(rows.get(row) ?? []), node])
  }
  const pos = new Map<string, { x: number; y: number }>()
  const chipPos = new Map<string, { x: number; y: number; count: number }>()
  let maxCols = 1
  let line = 0
  for (const row of [...rows.keys()].sort((a, b) => a - b)) {
    const nodes = rows.get(row)!
    // Barycentre of the parents keeps branches straight and crossings rare.
    const bary = (n: TreeNode) => {
      const ps = n.parents.map(p => pos.get(p)).filter((p): p is { x: number; y: number } => !!p)
      return ps.length ? ps.reduce((sum, p) => sum + p.x, 0) / ps.length : 0
    }
    if (row > 0) nodes.sort((a, b) => bary(a) - bary(b) || bySeq(a, b))
    maxCols = Math.max(maxCols, Math.min(nodes.length, MAXC))
    // A row wider than MAXC wraps onto further lines instead of shrinking the whole picture.
    nodes.forEach((node, i) => pos.set(node.id, { x: PAD + (i % MAXC) * (W + GX), y: PAD + TOP + (line + Math.floor(i / MAXC)) * (H + GY) }))
    line += Math.ceil(nodes.length / MAXC)
  }
  // Folded chips sit under their parent, on the line below it.
  for (const [parent, kids] of folded) {
    const p = pos.get(parent)
    if (!p) continue
    chipPos.set(parent, { x: p.x, y: p.y + H + 14, count: kids.length })
  }
  const width = PAD * 2 + maxCols * W + (maxCols - 1) * GX
  const height = PAD * 2 + TOP + line * H + Math.max(0, line - 1) * GY + 22 + (chipPos.size ? 10 : 0)

  const edges = shown.flatMap(node =>
    node.parents.map(parent => {
      const a = pos.get(parent), b = pos.get(node.id)
      if (!a || !b) return ''
      const x1 = a.x + W / 2, y1 = a.y + H, x2 = b.x + W / 2, y2 = b.y, my = (y1 + y2) / 2
      const dashed = node.status === 'proposed' ? ' stroke-dasharray="5 4"' : ''
      return `<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" fill="none" stroke="#94a3b8" stroke-width="1.6"${dashed}/>`
    }),
  )

  const boxes = shown.map(node => {
    const p = pos.get(node.id)!
    const color = LENS_COLOR[node.lens]
    const faded = node.status === 'abandoned' ? ' opacity="0.35"' : node.status === 'merged' ? ' opacity="0.6"' : ''
    const dash = node.status === 'proposed' ? ' stroke-dasharray="5 4"' : ''
    const strokeW = node.id === selected ? 3.5 : node.id === cur || (node.weight ?? 1) >= 4 ? 2.5 : 1.5
    const fill = FINISHED.includes(node.status) ? `${color}22` : 'var(--card)'
    const badge = node.status === 'validated' ? '✓ ' : node.status === 'merged' ? '⤵ ' : node.status === 'review' ? '◆ ' : node.status === 'exploring' ? '● ' : ''
    const step = node.seq !== undefined ? `${node.seq}. ` : ''
    const loops = node.iterations?.length ? `↻${node.iterations.length}${node.iterations[node.iterations.length - 1].passed ? '✓' : ''}` : ''
    const meta = [node.id, STATUS_LABEL[node.status], loops, node.weight && node.weight > 1 ? `w${node.weight}` : '', node.estimate].filter(Boolean).join(' · ')
    return `<g${faded}><title>${esc(`${node.title}\n${node.summary ?? ''}`)}</title>`
      + `<rect x="${p.x}" y="${p.y}" width="${W}" height="${H}" rx="9" fill="${fill}" stroke="${color}" stroke-width="${strokeW}"${dash}/>`
      + `<rect x="${p.x}" y="${p.y}" width="${W}" height="5" rx="2.5" fill="${color}"/>`
      + `<text x="${p.x + 10}" y="${p.y + 22}" font-size="12" font-weight="600" class="t1" font-family="system-ui,sans-serif">${esc(badge + step + cut(node.title, 20 - step.length))}</text>`
      + (opts.live?.[node.id]
        ? `<text x="${p.x + 10}" y="${p.y + 38}" font-size="10" font-weight="600" fill="#d97706" font-family="system-ui,sans-serif">${esc(cut(`✻ ${opts.live[node.id]}`, 28))}</text>`
        : `<text x="${p.x + 10}" y="${p.y + 38}" font-size="10" class="t2" font-family="system-ui,sans-serif">${esc(cut(meta, 28))}</text>`)
      + (node.agent ? `<circle cx="${p.x + W - 9}" cy="${p.y + 14}" r="4" fill="#ef4444"><animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite"/></circle>` : '')
      + '</g>'
  })

  const chips = [...chipPos.entries()].map(([parent, c]) => {
    const names = folded.get(parent)!.map(k => `${k.id} ${k.title} (${STATUS_LABEL[k.status]})`).join('\n')
    return `<g><title>${esc(names)}</title>`
      + `<rect x="${c.x}" y="${c.y}" width="${W}" height="18" rx="9" fill="var(--chip)" stroke="var(--chipline)"/>`
      + `<text x="${c.x + 10}" y="${c.y + 13}" font-size="10" class="t2" font-family="system-ui,sans-serif">${esc(`+${c.count} finished under ${parent}`)}</text></g>`
  })

  const legend = LENSES.map((lens, i) =>
    `<rect x="${PAD + i * 72}" y="${height - 18}" width="10" height="10" rx="2" fill="${LENS_COLOR[lens]}"/>`
    + `<text x="${PAD + i * 72 + 14}" y="${height - 9}" font-size="10" class="t2" font-family="system-ui,sans-serif">${LENS_LABEL[lens]}</text>`,
  ).join('')

  const title = `<text x="${PAD}" y="${PAD + 8}" font-size="13" font-weight="700" class="t1" font-family="system-ui,sans-serif">${esc(cut(tree.goal || 'No goal yet', 60))}</text>`
  const w = Math.max(width, PAD * 2 + LENSES.length * 72)
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">`
    // Colours follow the viewer's theme: light by default, dark when the app is dark.
    + `<style>:root{--bg:#f8fafc;--card:#ffffff;--t1:#0f172a;--t2:#475569;--chip:#e2e8f0;--chipline:#cbd5e1}`
    + `@media (prefers-color-scheme: dark){:root{--bg:#0f1420;--card:#171d2b;--t1:#e8ecf4;--t2:#94a3b8;--chip:#232b3d;--chipline:#334155}}`
    + `.t1{fill:var(--t1)}.t2{fill:var(--t2)}</style>`
    + `<rect width="100%" height="100%" fill="var(--bg)" rx="10"/>${title}${edges.join('')}${boxes.join('')}${chips.join('')}${legend}</svg>`
  return { source, width: w, height }
}

/** Text outline of the tree, for the model. Field values are clipped so the file cannot smuggle long instructions. */
export function outline(tree: Tree): string {
  if (tree.nodes.length === 0) return '(empty tree)'
  const p = progress(tree)
  const e = eta(tree)
  const c = calibration(tree)
  const lines = tree.nodes.map(n =>
    `- ${n.id} [${LENS_LABEL[n.lens]} · ${STATUS_LABEL[n.status]}${n.estimate ? ` · ${n.estimate}` : ''}] ${cut(n.title, 80)}`
    + (n.parents.length ? ` ← ${n.parents.join(', ')}` : '')
    + (n.agent ? ` (agent: ${cut(n.agent, 40)})` : '')
    + (typeof n.score === 'number' ? ` score ${n.score}` : '')
    + (n.judge ? ` judge: ${cut(n.judge, 60)}` : '')
    + (n.seq !== undefined ? ` step ${n.seq}` : '')
    + (n.headline ? ` — ${cut(n.headline, 80)}` : '')
    + (typeof n.score === 'number' && (n.unit || n.direction === 'lower') ? `${n.unit ?? ''} (${n.direction === 'lower' ? 'lower' : 'higher'} is better)` : '')
    + (n.blockedOn ? ` blocked on: ${cut(n.blockedOn, 80)}` : '')
    + (n.movedTo ? ` moved to: ${cut(n.movedTo, 80)}` : '')
    + (n.verifyCmd ? ` verify: ${n.verifyOk === undefined ? 'not re-run yet' : n.verifyOk ? `passes (${n.verifiedAt})` : `FAILS since ${n.verifiedAt}`}` : '')
    + (n.weight !== undefined && n.weight !== 1 ? ` weight ${n.weight}/5` : '')
    + (n.acceptance ? ` accept: ${cut(n.acceptance, 80)}` : '')
    + (n.iterations?.length ? ` ↻${n.iterations.length} (last: ${n.iterations[n.iterations.length - 1].passed ? 'passed' : 'not yet'}, ${cut(n.iterations[n.iterations.length - 1].result, 60)})` : '')
    + (n.scope?.length ? ` scope: ${n.scope.slice(0, 4).join(', ')}` : '')
    + (n.evidence?.length ? ` evidence: ${n.evidence.filter(x => x.verdict === 'confirmed').length}/${n.evidence.length} confirmed` : '')
    + (n.summary ? `\n    ${cut(n.summary, 200)}` : '')
    + (n.handoff && !['done', 'validated', 'merged', 'abandoned', 'moved'].includes(n.status) ? `\n    handoff (${n.handoff.at ?? '?'}): ${handoffLine(n.handoff)}` : ''),
  )
  const auto = tree.auto.on ? `Auto mode: ON (turn ${tree.auto.turns}/${tree.auto.maxTurns}, started ${tree.auto.startedAt ?? '?'})` : 'Auto mode: off'
  return `Goal: ${cut(tree.goal || '(not set)', 200)}\nProgress: ${p.finished}/${p.total} live nodes (${p.pct}% weighted by importance), ${p.exploring} exploring, ${p.review} need review, ${p.blocked} blocked${p.closed ? `; ${p.closed} abandoned or moved, not counted` : ''}\n`
    + `ETA: critical path ${human(e.critical)} (${e.path.join(' → ') || 'none'}), remaining effort ${human(e.remaining)}`
    + (c.samples ? `, calibration ×${c.factor} over ${c.samples} nodes` : '')
    + `\nExpected end: ${endLabel(tree, new Date(tree.nodes.reduce((m, n) => (n.updatedAt > m ? n.updatedAt : m), '') || Date.now()))}`
    + `\nCost: $${tree.cost.spentUsd.toFixed(2)} spent on this plan ($${tree.cost.sessionUsd.toFixed(2)} this session), est. $${tree.cost.estimateUsd.toFixed(2)} to finish at $${tree.cost.ratePerHour.toFixed(2)}/h${tree.cost.assumedRate ? ' (assumed for ' + (tree.cost.model || 'this model') + ', measured after the first turns)' : ' (measured)'}`
    + (tree.cost.rateLimits.length ? `; limits: ${tree.cost.rateLimits.map(r => `${r.kind} ${r.percentUsed}%`).join(', ')}` : '')
    + `\n${auto}\n${lines.join('\n')}`
}

export function endLabel(tree: Tree, now: Date): string {
  const end = expectedEnd(tree, now)
  if (end.minutes <= 0) return 'nothing left'
  const day = end.at.toISOString().slice(0, 10)
  return `${day}${end.plusMinus ? ` ± ${human(end.plusMinus)}` : ''} (${human(end.minutes)} of work${tree.auto.on ? ', around the clock' : ', 8h days'})`
}

/** A parent's tracks ranked by score (unscored last), abandoned ones left out. */
export function rankChildren(tree: Tree, parent: string): TreeNode[] {
  return tree.nodes
    .filter(n => n.parents.includes(parent) && !CLOSED.includes(n.status))
    .sort((a, b) => {
      // A judge that reads lower-is-better (WER, loss, latency, cost) ranks the smallest score first.
      const lower = (a.direction ?? b.direction ?? tree.nodes.find(n => n.id === parent)?.direction) === 'lower'
      const none = lower ? Infinity : -Infinity
      const d = lower ? (a.score ?? none) - (b.score ?? none) : (b.score ?? none) - (a.score ?? none)
      return d || a.createdAt.localeCompare(b.createdAt)
    })
}

/** Abandons every scored track under `parent` but the best; unscored tracks are kept. */
export function prune(tree: Tree, parent: string, now: string): { tree: Tree; kept?: TreeNode; dropped: TreeNode[] } {
  const ranked = rankChildren(tree, parent).filter(n => typeof n.score === 'number')
  const [kept, ...rest] = ranked
  let next = tree
  for (const n of rest) next = upsert(next, { id: n.id, status: 'abandoned', summary: `${n.summary ?? ''} Pruned: scored ${n.score} against ${kept!.score} for ${kept!.id}.`.trim() }, now).tree
  return { tree: next, kept, dropped: rest }
}

/** Reads a score and a verdict line out of an agent's report: "SCORE: 0.82" and "RESULT: …". */
export function parseReport(answer: string): { score?: number; result?: string; node?: string } {
  const score = answer.match(/SCORE:\s*(-?[\d.]+)/i)
  const result = answer.match(/RESULT:\s*(.+)/i)
  const node = answer.match(/NODE:\s*([A-Za-z0-9_-]+)/i)
  return { score: score ? parseFloat(score[1]!) : undefined, result: result ? result[1]!.trim().slice(0, 300) : undefined, node: node ? node[1] : undefined }
}

/** Finds `#n12` in an agent description to attach the agent to a node. */
export function nodeRef(text: string, tree: Tree): string | undefined {
  const ids = [...text.matchAll(/#([A-Za-z0-9_-]+)/g)].map(m => m[1]!)
  return ids.find(id => tree.nodes.some(node => node.id === id))
}

/** Hours a run has been going (to its end, or to now), and what it cost at its rate. */
export function runCost(run: NonNullable<TreeNode['run']>, now: string): { hours: number; usd?: number } {
  const start = Date.parse(run.startedAt ?? ''), end = Date.parse(run.state === 'running' ? now : run.endedAt ?? now)
  const hours = isNaN(start) || isNaN(end) ? 0 : Math.max(0, (end - start) / 3600e3)
  return { hours, ...(run.ratePerHour !== undefined ? { usd: +(hours * run.ratePerHour).toFixed(2) } : {}) }
}

/** Runs still marked running with no sign of life for `minutes`: dead, stuck or forgotten. */
export function silentRuns(tree: Tree, now: string, minutes = 15): TreeNode[] {
  return tree.nodes.filter(n => n.run?.state === 'running' && Date.parse(now) - Date.parse(n.run.heartbeatAt ?? n.run.startedAt ?? now) > minutes * 60e3)
}

// ---------- Proof: how much of the goal is shown, not how much work is done ----------
// Progress counts finished nodes; proof counts what each node proves, by the strength of that proof,
// weighted by how much the goal depends on the node. A project can be 70 % done and 30 % proven.

export type ProofLevel = 'validated' | 'replays' | 'verified' | 'review' | 'failing' | 'none'
export const PROOF_VALUE: Record<ProofLevel, number> = { validated: 1, replays: 0.9, verified: 0.6, review: 0.3, failing: 0, none: 0 }
export const PROOF_LABEL: Record<ProofLevel, string> = { validated: 'validated by you', replays: 'criterion met, proof replays', verified: 'verified (text)', review: 'in review', failing: 'proof no longer passes', none: 'not proven yet' }

const counted = (n: TreeNode) => n.lens !== 'goal' && n.status !== 'abandoned' && n.status !== 'moved'

/** The strength of what one node proves. */
export function proofLevel(n: TreeNode): ProofLevel {
  if (n.verifyOk === false) return 'failing'
  if (n.status === 'validated') return 'validated'
  if (n.status === 'done' || n.status === 'merged') {
    const tries = n.iterations ?? []
    const met = n.acceptance ? !!tries[tries.length - 1]?.passed : true
    if (met && n.verifyCmd && n.verifyOk !== false) return 'replays'
    return n.verification ? 'verified' : 'review'
  }
  return n.status === 'review' ? 'review' : 'none'
}

export type Proof = { pct: number; progressPct: number; items: { id: string; title: string; weight: number; level: ProofLevel }[] }

export function proofScore(tree: Tree): Proof {
  const live = tree.nodes.filter(counted)
  const w = (n: TreeNode) => n.weight ?? 1
  const all = live.reduce((k, n) => k + w(n), 0)
  const items = live.map(n => ({ id: n.id, title: n.title, weight: w(n), level: proofLevel(n) }))
  const pct = all ? Math.round(items.reduce((k, x) => k + x.weight * PROOF_VALUE[x.level], 0) / all * 100) : 0
  const progressPct = all ? Math.round(live.filter(n => FINISHED.includes(n.status)).reduce((k, n) => k + w(n), 0) / all * 100) : 0
  return { pct, progressPct, items }
}

export type Blocker = { id: string; title: string; kind: 'blocked' | 'missed' | 'failing' | 'silent' | 'unmeasurable'; why: string; points: number }

/** What stands between the tree and its goal, largest first: points are the proof each would add if cleared. */
export function blockers(tree: Tree, now: string): Blocker[] {
  const live = tree.nodes.filter(counted)
  const all = live.reduce((k, n) => k + (n.weight ?? 1), 0) || 1
  const pts = (n: TreeNode) => Math.round((n.weight ?? 1) * (1 - PROOF_VALUE[proofLevel(n)]) / all * 1000) / 10
  const out: Blocker[] = []
  const children = (id: string) => live.filter(n => n.parents.includes(id))
  const measured = (n: TreeNode, seen = new Set<string>()): boolean => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return !!(n.acceptance || n.judge || n.verifyCmd) || children(n.id).some(c => measured(c, seen))
  }
  for (const n of live) {
    if (FINISHED.includes(n.status) && n.verifyOk !== false) continue
    const tries = n.iterations ?? []
    if (n.status === 'blocked') out.push({ id: n.id, title: n.title, kind: 'blocked', why: `waits on ${n.blockedOn ?? 'something outside'}`, points: pts(n) })
    else if (n.verifyOk === false) out.push({ id: n.id, title: n.title, kind: 'failing', why: 'its replayed proof no longer passes', points: pts(n) })
    else if ((n.weight ?? 1) >= 4 && tries.length && !tries[tries.length - 1].passed) out.push({ id: n.id, title: n.title, kind: 'missed', why: `${tries.filter(t => !t.passed).length} attempt(s) short of "${n.acceptance ?? 'its criterion'}"; last: ${tries[tries.length - 1].result}`, points: pts(n) })
    if (n.lens === 'altitude' && !measured(n)) out.push({ id: n.id, title: n.title, kind: 'unmeasurable', why: 'no acceptance criterion, judge or replayable proof on this track or below it: the goal cannot be shown here', points: pts(n) })
  }
  for (const n of silentRuns(tree, now)) out.push({ id: n.id, title: n.title, kind: 'silent', why: `${n.run!.resource} marked running with no sign of life for over 15 minutes`, points: pts(n) })
  return out.sort((a, b) => b.points - a.points)
}

// ---------- Taking altitude: a strategy review proposes changes; the user decides each one ----------

/** Records a review; its proposals wait for the user. */
export function addReview(tree: Tree, review: Review): Tree {
  return { ...tree, reviews: [...(tree.reviews ?? []), review].slice(-10) }
}

/** Accepts or refuses proposals of a review ("all" for every undecided one); accepted ones become tree changes. */
export function decide(tree: Tree, reviewId: string, ids: string[], accept: boolean, now: string): Tree {
  const r = (tree.reviews ?? []).find(x => x.id === reviewId)
  if (!r) return tree
  const pick = (p: Proposal) => !p.decided && (ids.includes('all') || ids.includes(p.id))
  let t = tree
  const made = new Map<string, string>()   // proposal id → node id it created, so later proposals may name it as a parent
  for (const p of r.proposals) {
    if (!pick(p) || !accept) continue
    const f = { ...(p.fields as NodeInput) }
    if (f.parents) f.parents = f.parents.map(x => made.get(x) ?? x)
    if (p.kind === 'add') { delete f.id; const res = upsert(t, f, now); t = res.tree; made.set(p.id, res.node.id) }
    else if (p.node && t.nodes.some(n => n.id === p.node)) t = upsert(t, p.kind === 'abandon' ? { id: p.node, status: 'abandoned', summary: f.summary ?? p.why } : { ...f, id: p.node }, now).tree
  }
  const reviews = (t.reviews ?? []).map(x => x.id !== reviewId ? x : { ...x, proposals: x.proposals.map(p => pick(p) ? { ...p, decided: accept ? 'accepted' as const : 'refused' as const } : p) })
  return { ...t, reviews }
}

/** The brief for the reviewer: the method, the whole tree with its results, the proof and what blocks it. */
export function altitudeBrief(tree: Tree, now: string): string {
  const p = proofScore(tree), b = blockers(tree, now)
  const results = tree.nodes.filter(n => n.lens !== 'goal').map(n => {
    const parts = [`${n.id} [${n.lens} · ${n.status} · weight ${n.weight ?? 1}${n.seq ? ` · seq ${n.seq}` : ''}] ${n.title}`]
    if (n.headline) parts.push(`  finding: ${n.headline}`)
    if (n.acceptance) parts.push(`  acceptance: ${n.acceptance}`)
    if (n.judge) parts.push(`  judge: ${n.judge}${n.score !== undefined ? ` · score ${n.score}${n.unit ?? ''} (${n.direction ?? 'higher'} is better)` : ''}`)
    for (const it of (n.iterations ?? []).slice(-4)) parts.push(`  try ${it.n}: ${it.passed ? 'passed' : 'missed'}: ${it.result}`)
    if (n.verification) parts.push(`  proof: ${n.verification}`)
    if (n.blockedOn) parts.push(`  blocked on: ${n.blockedOn}`)
    if (n.summary) parts.push(`  summary: ${n.summary.slice(0, 300)}`)
    if (n.estimate) parts.push(`  estimate ${n.estimate}${n.startedAt ? `, started ${n.startedAt.slice(0, 10)}` : ''}${n.finishedAt ? `, finished ${n.finishedAt.slice(0, 10)}` : ''}`)
    return parts.join('\n')
  }).join('\n')
  return [
    `GOAL: ${tree.goal || '(none set)'}`,
    `PROOF: ${p.pct} % of the goal is shown (progress ${p.progressPct} % of the work is done). Proof weighs each node by importance and by the strength of its proof: validated by the user 100 %, criterion met with a replayable proof 90 %, verified in text 60 %, in review 30 %, otherwise 0.`,
    `BLOCKERS (proof points each would add):\n${b.map(x => `- ${x.id} ${x.title} [${x.kind}, ${x.points} pts]: ${x.why}`).join('\n') || '- none detected'}`,
    `NODES AND RESULTS:\n${results || '(no nodes)'}`,
  ].join('\n\n')
}

/** A handoff in one line: next action first, then open questions, checks done and files. */
export function handoffLine(h: NonNullable<TreeNode['handoff']>): string {
  return [h.next ? `next: ${cut(h.next, 160)}` : '', h.open?.length ? `open: ${h.open.slice(0, 4).map(x => cut(x, 80)).join('; ')}` : '',
    h.checks?.length ? `checks: ${h.checks.slice(0, 4).map(x => cut(x, 80)).join('; ')}` : '', h.files?.length ? `files: ${h.files.slice(0, 8).join(', ')}` : ''].filter(Boolean).join(' · ') || '(empty)'
}

/** A glob from the project root ("drafts/**", "src/*.ts") as a regular expression. */
export function globRe(glob: string): RegExp {
  const g = glob.replace(/^\.\//, '').replace(/\/$/, '/**')
  let re = ''
  for (let i = 0; i < g.length; i++) {
    const ch = g[i]!
    if (ch === '*' && g[i + 1] === '*') { re += g[i + 2] === '/' ? '(?:.*/)?' : '.*'; i += g[i + 2] === '/' ? 2 : 1 }
    else if (ch === '*') re += '[^/]*'
    else if (ch === '?') re += '[^/]'
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

/**
 * Whether a write to `file` stays inside a node's scope. The path is taken relative to the project root;
 * a node's worktree (.ambiflex/worktrees/<id>/) counts as the root. No scope: anything goes.
 */
export function inScope(scope: string[] | undefined, file: string, root: string): boolean {
  if (!scope?.length) return true
  let rel = file.startsWith(root) ? file.slice(root.length) : file
  rel = rel.replace(/^\/+/, '').replace(/^\.ambiflex\/worktrees\/[^/]+\//, '')
  if (rel.startsWith('/') || rel.startsWith('..')) return false
  return scope.some(g => globRe(g).test(rel))
}
