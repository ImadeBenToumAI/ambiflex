// The account's hub: one page that lists every Ambiflex project of the account and raises their alerts.
// Each session writes its project's card into the hub's store (collection "projects", one doc per project);
// the hub reads them all. Each project page gets back the list (doc "nav/current") for its project switcher.
import type { LiveActivity, Tree } from '../types'
import { blockers, eta, progress, proofScore } from './tree'

export const HUB_TITLE = 'Ambiflex Hub'
export const HUB_FILE = '.claude/ambiflex-hub.json'

export type Alert = { key: string; kind: 'blocked' | 'failing' | 'silent' | 'budget' | 'infra'; node?: string; title: string; why: string; level: 'red' | 'amber' }

export type Card = {
  name: string
  goal: string
  /** The project's own page. */
  url?: string
  /** Where to resume the work: a cloud session's link, or a local session's machine and folder. */
  session: { kind: 'cloud' | 'local'; url?: string; label: string }
  at: string
  busy: boolean
  bg: number
  auto: { on: boolean; turns: number; maxTurns: number }
  pct: number
  proven: number
  done: number
  total: number
  etaMin: number
  spentUsd: number
  working: { id: string; title: string; who: string }[]
  /** Background tasks: what runs after the turn, since when, and when its result should land. */
  background: { node: string; label: string; startedAt?: string; eta?: string }[]
  alerts: Alert[]
  plugin: string
}

/** A project's id in the hub's store: its folder name, kept to the characters a doc id accepts. */
export const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'project'

/** What the hub shows of one project, from its tree and its live activity. */
export function projectCard(t: Tree, live: Record<string, LiveActivity>, o: {
  name: string; url?: string; session: Card['session']; now: string; busy: boolean; plugin: string; budgetUsd?: number
}): Card {
  const p = progress(t)
  const proof = proofScore(t)
  const byId = new Map(t.nodes.map(n => [n.id, n]))
  const working = Object.entries(live)
    .filter(([, a]) => byId.has(a.node))
    .map(([k, a]) => ({ id: a.node, title: byId.get(a.node)!.title, who: k === 'main' ? 'Claude' : a.who }))
  const alerts: Alert[] = blockers(t, o.now)
    .filter(b => b.kind === 'blocked' || b.kind === 'failing' || b.kind === 'silent')
    .map(b => ({ key: `${b.kind}:${b.id}`, kind: b.kind as Alert['kind'], node: b.id, title: b.title, why: b.why, level: b.kind === 'failing' ? 'amber' : 'red' }))
  const spent = t.cost?.spentUsd ?? 0
  if (o.budgetUsd && o.budgetUsd > 0 && spent >= o.budgetUsd) alerts.push({ key: 'budget', kind: 'budget', title: 'Budget', why: `$${spent.toFixed(2)} spent of a $${o.budgetUsd} budget`, level: 'red' })
  return {
    name: o.name, goal: t.goal, ...(o.url ? { url: o.url } : {}), session: o.session, at: o.now, busy: o.busy,
    bg: Object.values(live).filter(a => a.bg).length,
    auto: { on: t.auto.on, turns: t.auto.turns, maxTurns: t.auto.maxTurns },
    pct: proof.progressPct, proven: proof.pct, done: p.finished, total: p.total, etaMin: eta(t).critical,
    spentUsd: Math.round(spent * 100) / 100, working: working.slice(0, 6), alerts, plugin: o.plugin,
    background: Object.values(live).filter(a => a.bg).map(a => ({ node: a.node, label: a.label, ...(a.startedAt ? { startedAt: a.startedAt } : {}), ...(a.eta ? { eta: a.eta } : {}) }))
      .sort((x, y) => (x.eta ?? '9').localeCompare(y.eta ?? '9')),
  }
}

export type NavItem = { name: string; url?: string; state: 'alert' | 'active' | 'idle' | 'stopped'; pct: number; alerts: number; at: string }

/** The project switcher's list: every card of the hub, alerts first, then the most recently active. */
export function navItems(cards: Card[], acked: Set<string>, now: string): NavItem[] {
  const ms = (c: Card) => Date.parse(now) - Date.parse(c.at || 0)
  return cards.map(c => {
    const open = (c.alerts ?? []).filter(a => !acked.has(`${slug(c.name)}:${a.key}`)).length
    const state: NavItem['state'] = open ? 'alert' : ms(c) > 7 * 86400e3 ? 'stopped' : c.busy || c.bg || c.auto?.on || ms(c) < 15 * 60e3 ? 'active' : 'idle'
    return { name: c.name, ...(c.url ? { url: c.url } : {}), state, pct: c.pct ?? 0, alerts: open, at: c.at }
  }).sort((a, b) => (b.alerts ? 1 : 0) - (a.alerts ? 1 : 0) || (a.state === 'stopped' ? 1 : 0) - (b.state === 'stopped' ? 1 : 0) || b.at.localeCompare(a.at))
}

/** The hub's URL as a file holds it ({"url": "..."}), or undefined. */
export function hubFromJson(raw: string): string | undefined {
  try { const u = (JSON.parse(raw || '{}') as { url?: string }).url; return u && u.startsWith('https://claude.ai/') ? u : undefined } catch { return undefined }
}

/** The hub's URL in an Artifact listing: the line titled "Ambiflex Hub". */
export function hubFromListing(text: string): string | undefined {
  for (const line of text.split('\n')) {
    if (!line.includes(HUB_TITLE)) continue
    const m = /https:\/\/claude\.ai\/(?:code\/)?artifact\/[A-Za-z0-9-]+/.exec(line)
    if (m) return m[0]
  }
  return undefined
}
