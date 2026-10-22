// Model routing: the plan is drawn with the strongest model at full effort; each node then runs on the model
// and effort it needs, and no more. Safeguards: a critical or risky node never goes below the strong tier, a
// failed proof moves the next attempt up, a node the user pinned keeps its model, and nothing is ever routed
// above the cap (the session's own model unless a top model is set), so a plan without a model is never asked for it.
import type { Tree, TreeNode } from '../types'

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type Route = { model: string; effort: Effort; why: string }

export const TIERS = ['haiku', 'sonnet', 'opus', 'fable'] as const
/** Full ids for a model request, which takes an id where an agent takes an alias. */
export const MODEL_IDS: Record<string, string> = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5', fable: 'claude-fable-5-1' }
const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

/** The tier of a model name or id (claude-sonnet-5-5 → 1), or -1 when unknown. */
export function tierOf(model: string | undefined): number {
  const m = (model ?? '').toLowerCase()
  return TIERS.findIndex(t => m.includes(t))
}

const RISKY = /\b(secur\w*|auth\w*|password|secret|token|credential|migrat\w*|prod(uction)?|payment|billing|delete|drop|data loss|rollback|privacy|gdpr)\b/i
const MECHANICAL = /\b(rename|format\w*|typo|lint|bump|changelog|readme|docs?|comment|log|screenshot|sync|copy|move)\b/i

/** How many attempts at this node failed: iterations that did not pass, and a replayed proof that failed. */
export function failures(n: TreeNode): number {
  return (n.iterations ?? []).filter(i => !i.passed).length + (n.verifyOk === false ? 1 : 0)
}

const up = (e: Effort, by: number): Effort => EFFORTS[Math.min(EFFORTS.length - 1, EFFORTS.indexOf(e) + by)]

/**
 * The model and effort for one node. `cap` is the highest tier allowed (from tierOf).
 * The node's own `model` / `effort` fields are a pin and win.
 */
export function route(n: TreeNode, cap: number): Route {
  const top = Math.max(0, Math.min(cap < 0 ? TIERS.length - 1 : cap, TIERS.length - 1))
  if (n.model) {
    const t = tierOf(n.model)
    return { model: t >= 0 ? TIERS[Math.min(t, top)] : n.model, effort: (n.effort as Effort) ?? 'medium', why: 'pinned' }
  }
  const text = `${n.title} ${n.summary ?? ''} ${n.detail ?? ''}`
  const weight = n.weight ?? 1
  let tier: number, effort: Effort, why: string
  // The durable outcome deserves the strongest model at full effort, like the plan itself.
  if (n.lens === 'altitude' || n.lens === 'goal') { tier = TIERS.length - 1; effort = 'max'; why = `${n.lens}: the strongest model, full effort` }
  else if (n.lens !== 'step') { tier = 2; effort = 'high'; why = `${n.lens} track: reasoning` }
  else if (weight >= 4) { tier = 2; effort = 'high'; why = `importance ${weight}` }
  else if ((n.kind ? n.kind === 'mechanical' : MECHANICAL.test(text)) && weight <= 2) { tier = 0; effort = 'low'; why = 'mechanical step' }
  else if (weight === 3) { tier = 1; effort = 'medium'; why = 'standard step' }
  else { tier = 1; effort = 'low'; why = 'minor step' }
  if (weight >= 5 || n.kind === 'risky' || RISKY.test(text)) {
    if (tier < 2) { tier = 2; effort = 'high' }
    why = weight >= 5 ? 'critical: never below the strong tier' : 'risky (security, data, production): never below the strong tier'
  }
  const f = failures(n)
  if (f > 0) { tier += f; effort = up(effort, f); why += `, ${f} failed attempt${f > 1 ? 's' : ''}: moved up` }
  if (tier > top) tier = top
  return { model: TIERS[tier], effort, why }
}

/** The plan itself (goal and tracks being drawn, no node being worked on): the strongest allowed model, full effort. */
export function planRoute(cap: number): Route {
  const top = cap < 0 ? TIERS.length - 1 : Math.min(cap, TIERS.length - 1)
  return { model: TIERS[top], effort: 'max', why: 'planning: strongest model, full effort' }
}

/** The routes of every open node, for the page and the outline. */
export function routes(t: Tree, cap: number): Record<string, Route> {
  const out: Record<string, Route> = {}
  for (const n of t.nodes) if (n.lens !== 'goal' && !['done', 'validated', 'merged', 'abandoned', 'moved'].includes(n.status)) out[n.id] = route(n, cap)
  return out
}

/** The question a light model answers to sort a node, and how its one-word answer is read. */
export function kindPrompt(n: TreeNode): string {
  return `Classify this task for choosing a model. Answer with one word: mechanical (renaming, formatting, docs, copying, running a known command), risky (security, auth, secrets, data loss, migrations, production, payments), or standard (anything else).\n\nTask: ${n.title}\n${n.summary ?? ''}\n${(n.detail ?? '').slice(0, 1500)}`
}
export function parseKind(text: string | undefined): TreeNode['kind'] | undefined {
  const m = (text ?? '').toLowerCase().match(/\b(mechanical|standard|risky)\b/)
  return m ? (m[1] as TreeNode['kind']) : undefined
}

/** The status line: what is left of the week, the node in hand, the model it runs on. */
export function statusLine(p: { weekLeft?: number; node?: string; route?: Route; auto?: string }): string | undefined {
  const parts = [p.auto, p.weekLeft !== undefined ? `${Math.round(p.weekLeft)}% week left` : undefined, p.node, p.route ? `${p.route.model} ${p.route.effort}` : undefined].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}
