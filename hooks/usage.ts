// Usage monitor: a subscription has no credit balance, it has usage windows (five_hour, seven_day) that the
// API reports as a percentage and a reset time. Each sample below is one reading taken by a session of this
// project; the windows are account-wide, so the rise of the weekly window during this project's sessions is
// this project's share of the week. Pure functions; register.tsx takes the samples.

/** One line of `.ambiflex/usage.jsonl`. */
export type UsageSample = {
  t: string
  /** Session (short id). */
  s: string
  /** Weekly and 5-hour windows, % used and reset time, when the last API response reported them. */
  w?: number; wr?: string
  h?: number; hr?: string
  /** The session's cost so far, at API prices (what /cost shows). */
  usd: number
  /** The node being worked on when the sample was taken. */
  node?: string
}

export type UsageWindow = { pct: number; resetsAt?: string }

export type UsageSession = { s: string; start: string; end: string; minutes: number; usd: number; points: number; nodes: string[] }

export type UsageDoc = {
  at: string
  week?: UsageWindow
  fiveHour?: UsageWindow
  /** % points per hour of the weekly window over the last 24 hours of samples, all sessions of the project. */
  ratePerHour?: number
  /** When the weekly window reaches 100% at that rate, if before its reset. */
  hitsAt?: string
  /** Where the weekly window ends at its reset at that rate. */
  endPct?: number
  /** The pace that ends the week at exactly 100%: where the window would be now. */
  pacePct?: number
  /** Weekly points this project used since its first sample in the current window, and in all. */
  projectPointsWeek: number
  projectPoints: number
  /** API-price value of this project's sessions this calendar month, against the subscription price. */
  monthUsd: number
  planUsd: number
  /** Dollars per weekly point, from this project's history; what the rest of the plan needs, in points. */
  usdPerPoint?: number
  planPoints?: number
  /** Cost per node, from the cost each session spent while that node was being worked on. */
  nodes: { id: string; usd: number }[]
  sessions: UsageSession[]
}

export function parseSamples(text: string): UsageSample[] {
  return text.split('\n').filter(Boolean).flatMap(l => {
    try { const e = JSON.parse(l); return e && typeof e.t === 'string' && typeof e.s === 'string' ? [e as UsageSample] : [] } catch { return [] }
  }).sort((a, b) => a.t.localeCompare(b.t))
}

const ms = (iso?: string) => (iso ? Date.parse(iso) : NaN)
const round1 = (n: number) => Math.round(n * 10) / 10

/** Rises of the weekly window between consecutive samples of one session, within one window (same reset). */
function rises(list: UsageSample[]): { wr?: string; points: number }[] {
  const out: { wr?: string; points: number }[] = []
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i]
    if (a.w === undefined || b.w === undefined || a.wr !== b.wr) continue
    if (b.w > a.w) out.push({ wr: b.wr, points: b.w - a.w })
  }
  return out
}

export function buildUsage(input: { at: string; samples: UsageSample[]; planUsd: number; remainingUsd?: number }): UsageDoc {
  const { at, samples, planUsd } = input
  const now = ms(at)
  const bySession = new Map<string, UsageSample[]>()
  for (const x of samples) bySession.set(x.s, [...(bySession.get(x.s) ?? []), x])

  const lastW = [...samples].reverse().find(x => x.w !== undefined)
  const lastH = [...samples].reverse().find(x => x.h !== undefined)
  const week = lastW ? { pct: lastW.w!, resetsAt: lastW.wr } : undefined
  const fiveHour = lastH ? { pct: lastH.h!, resetsAt: lastH.hr } : undefined

  // Rate: weekly points per hour over the last 24 hours, from the first to the last reading of the same window.
  let ratePerHour: number | undefined, hitsAt: string | undefined, endPct: number | undefined, pacePct: number | undefined
  if (lastW) {
    const recent = samples.filter(x => x.w !== undefined && x.wr === lastW.wr && now - ms(x.t) <= 24 * 3600e3)
    if (recent.length >= 2) {
      const first = recent[0], hours = (ms(lastW.t) - ms(first.t)) / 3600e3
      if (hours >= 0.25) ratePerHour = Math.max(0, (lastW.w! - first.w!) / hours)
    }
    const reset = ms(lastW.wr)
    if (ratePerHour !== undefined && !isNaN(reset)) {
      const hoursLeft = Math.max(0, (reset - now) / 3600e3)
      endPct = round1(Math.min(999, lastW.w! + ratePerHour * hoursLeft))
      if (ratePerHour > 0) {
        const hit = now + ((100 - lastW.w!) / ratePerHour) * 3600e3
        if (lastW.w! < 100 && hit < reset) hitsAt = new Date(hit).toISOString()
      }
      ratePerHour = round1(ratePerHour)
    }
    if (!isNaN(reset)) pacePct = round1(Math.min(100, Math.max(0, 100 * (1 - (reset - now) / (7 * 24 * 3600e3)))))
  }

  const sessions: UsageSession[] = []
  let projectPoints = 0, projectPointsWeek = 0, monthUsd = 0, usdForPoints = 0
  const month = at.slice(0, 7)
  const nodeUsd = new Map<string, number>()
  for (const [s, list] of bySession) {
    const r = rises(list)
    const points = r.reduce((k, x) => k + x.points, 0)
    // What the session spent between its first and last reading: the span its window rises were measured on.
    const usd = Math.max(0, list[list.length - 1].usd - list[0].usd)
    // A session's cost counts from zero, so its highest reading is what it cost in all.
    const spent = Math.max(...list.map(x => x.usd))
    projectPoints += points
    projectPointsWeek += r.filter(x => lastW && x.wr === lastW.wr).reduce((k, x) => k + x.points, 0)
    if (list[list.length - 1].t.slice(0, 7) === month) monthUsd += spent
    if (points > 0) usdForPoints += usd
    for (let i = 1; i < list.length; i++) {
      const node = list[i - 1].node
      const d = list[i].usd - list[i - 1].usd
      if (node && d > 0) nodeUsd.set(node, (nodeUsd.get(node) ?? 0) + d)
    }
    const start = list[0].t, end = list[list.length - 1].t
    sessions.push({ s, start, end, minutes: Math.round((ms(end) - ms(start)) / 60e3), usd: +spent.toFixed(2), points: round1(points), nodes: [...new Set(list.map(x => x.node).filter((n): n is string => !!n))] })
  }
  sessions.sort((a, b) => b.start.localeCompare(a.start))
  const usdPerPoint = projectPoints > 0 && usdForPoints > 0 ? +(usdForPoints / projectPoints).toFixed(2) : undefined
  const planPoints = usdPerPoint && input.remainingUsd !== undefined ? round1(input.remainingUsd / usdPerPoint) : undefined
  return {
    at, week, fiveHour, ratePerHour, hitsAt, endPct, pacePct,
    projectPointsWeek: round1(projectPointsWeek), projectPoints: round1(projectPoints),
    monthUsd: +monthUsd.toFixed(2), planUsd, usdPerPoint, planPoints,
    nodes: [...nodeUsd].map(([id, usd]) => ({ id, usd: +usd.toFixed(2) })).sort((a, b) => b.usd - a.usd),
    sessions,
  }
}

/** True when auto mode should pause: the weekly window would run out before it resets. */
export function weekRunsOut(doc: UsageDoc): boolean {
  return !!doc.hitsAt
}
