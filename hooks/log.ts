import type { Tree } from '../types'
import { DEFAULT_AUTO, DEFAULT_COST, emptyTree, merge, upsert } from './tree'
import type { NodeInput } from './tree'

/**
 * The event log: one JSON line per change, append-only, so Git merges two sessions'
 * logs with `merge=union` and never conflicts. The tree is replayed from it.
 */
export type Event =
  | { t: string; s: string; kind: 'goal'; goal: string }
  | { t: string; s: string; kind: 'upsert'; input: NodeInput; isNew?: boolean }
  | { t: string; s: string; kind: 'merge'; sources: string[]; into: string }
  | { t: string; s: string; kind: 'auto'; on: boolean; maxTurns?: number; turns?: number }

export const LOG_FILE = '.ambiflex/log.jsonl'

export function serialize(events: Event[]): string {
  return events.map(e => JSON.stringify(e)).join('\n') + (events.length ? '\n' : '')
}

export function parseLog(text: string | undefined): Event[] {
  if (!text) return []
  const out: Event[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const e = JSON.parse(trimmed) as Event
      if (e && typeof e === 'object' && typeof e.kind === 'string' && typeof e.t === 'string') out.push(e)
    } catch {
      // A damaged line (a merge marker, a cut write) is skipped; the rest replays.
    }
  }
  return out
}

/**
 * Replays events in time order. Two sessions that each created "n7" offline get distinct
 * nodes: the later session's node is renamed (n7-b, n7-c…) and that session's later
 * references to it follow the rename.
 */
export function replay(events: Event[]): Tree {
  const ordered = [...events].sort((a, b) => a.t.localeCompare(b.t) || a.s.localeCompare(b.s))
  let tree = emptyTree()
  const alias = new Map<string, string>() // `${session}:${id}` → actual id
  const resolve = (s: string, id: string | undefined) => (id ? alias.get(`${s}:${id}`) ?? id : id)
  const owner = new Map<string, string>() // id → session that created it

  for (const e of ordered) {
    switch (e.kind) {
      case 'goal':
        tree = { ...tree, goal: e.goal }
        break
      case 'upsert': {
        const input = { ...e.input }
        if (e.isNew && input.id) {
          const exists = tree.nodes.some(n => n.id === input.id)
          if (exists && owner.get(input.id) !== e.s) {
            let candidate = `${input.id}-b`
            for (let c = 99; tree.nodes.some(n => n.id === candidate) && c > 0; c--) candidate = `${input.id}-${String.fromCharCode(candidate.charCodeAt(candidate.length - 1) + 1)}`
            alias.set(`${e.s}:${input.id}`, candidate)
            input.id = candidate
          }
        } else {
          input.id = resolve(e.s, input.id)
        }
        if (input.parents) input.parents = input.parents.map(p => resolve(e.s, p) ?? p)
        const { tree: next, node } = upsert(tree, input, e.t)
        if (!owner.has(node.id)) owner.set(node.id, e.s)
        tree = next
        break
      }
      case 'merge':
        tree = merge(tree, e.sources.map(id => resolve(e.s, id) ?? id), resolve(e.s, e.into) ?? e.into, e.t)
        break
      case 'auto':
        tree = {
          ...tree,
          auto: {
            ...tree.auto,
            on: e.on,
            startedAt: e.on && (e.turns === undefined || !tree.auto.startedAt) ? e.t : tree.auto.startedAt,
            maxTurns: e.maxTurns ?? tree.auto.maxTurns,
            turns: e.turns ?? (e.on && e.turns === undefined ? 0 : tree.auto.turns),
          },
        }
        break
    }
  }
  return { ...tree, cost: { ...DEFAULT_COST }, auto: { ...DEFAULT_AUTO, ...tree.auto } }
}

/** Turns a whole-file snapshot (the v0.1/v0.2 tree.json) into events, once, for migration. */
export function eventsFromSnapshot(tree: Tree, session: string): Event[] {
  const events: Event[] = []
  const t0 = tree.nodes.map(n => n.createdAt).sort()[0] ?? new Date(0).toISOString()
  if (tree.goal) events.push({ t: t0, s: session, kind: 'goal', goal: tree.goal })
  for (const n of [...tree.nodes].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const { createdAt, updatedAt, ...rest } = n
    // A node finished before the verification rule existed keeps its status, labelled as such.
    const verification = rest.status === 'done' && !rest.verification ? 'migrated from snapshot (unverified)' : rest.verification
    events.push({ t: createdAt, s: session, kind: 'upsert', isNew: true, input: { ...rest, verification, parents: [] } })
    if (n.parents.length || updatedAt !== createdAt) {
      events.push({ t: updatedAt, s: session, kind: 'upsert', input: { id: n.id, parents: n.parents, status: n.status, verification: n.verification } })
    }
  }
  if (tree.auto.on) events.push({ t: tree.auto.startedAt ?? t0, s: session, kind: 'auto', on: true, maxTurns: tree.auto.maxTurns, turns: tree.auto.turns })
  return events
}
