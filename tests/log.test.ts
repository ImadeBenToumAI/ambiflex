import { expect, test } from 'claude-code/testing'

import { eventsFromSnapshot, parseLog, replay, serialize } from '../hooks/log'
import type { Event } from '../hooks/log'
import { emptyTree, upsert } from '../hooks/tree'

const at = (n: number) => `2026-10-18T10:${String(n).padStart(2, '0')}:00.000Z`

const base: Event[] = [
  { t: at(0), s: 'A', kind: 'goal', goal: 'Keep the apps crash-free' },
  { t: at(1), s: 'A', kind: 'upsert', isNew: true, input: { id: 'n1', title: 'Goal', lens: 'goal' } },
  { t: at(2), s: 'A', kind: 'upsert', isNew: true, input: { id: 'n2', title: 'Altitude', lens: 'altitude', parents: ['n1'], estimate: '2h' } },
]

test('the log survives a round trip and a damaged line', () => {
  const text = serialize(base) + '<<<<<<< HEAD\n{"broken":\n'
  expect(parseLog(text)).toEqual(base)
})

test('replaying the log gives exactly the state the events built', () => {
  const t = replay(base)
  expect(t.goal).toBe('Keep the apps crash-free')
  expect(t.nodes.map(n => n.id)).toEqual(['n1', 'n2'])
  expect(t.nodes[1]!.parents).toEqual(['n1'])
  // The same events in a different file order replay to the same tree.
  expect(replay([...base].reverse())).toEqual(t)
})

test('two sessions that diverged merge by union: both subtrees survive, colliding ids are renamed', () => {
  const sessionA: Event[] = [
    ...base,
    { t: at(10), s: 'A', kind: 'upsert', isNew: true, input: { id: 'n3', title: 'Depth A', lens: 'depth', parents: ['n2'] } },
    { t: at(11), s: 'A', kind: 'upsert', input: { id: 'n3', status: 'done', verification: 'tests' } },
  ]
  const sessionB: Event[] = [
    ...base,
    { t: at(10), s: 'B', kind: 'upsert', isNew: true, input: { id: 'n3', title: 'Range B', lens: 'range', parents: ['n2'] } },
    { t: at(12), s: 'B', kind: 'upsert', isNew: true, input: { id: 'n4', title: 'Step B', lens: 'step', parents: ['n3'] } },
    { t: at(13), s: 'B', kind: 'merge', sources: ['n4'], into: 'n3' },
  ]
  // `merge=union` keeps every line of both files; duplicates of the shared prefix are harmless.
  const union = parseLog(serialize(sessionA) + serialize(sessionB))
  const t = replay(union)
  const ids = t.nodes.map(n => n.id)
  expect(ids).toEqual(['n1', 'n2', 'n3', 'n3-b', 'n4'])
  expect(t.nodes.find(n => n.id === 'n3')!.title).toBe('Depth A')
  expect(t.nodes.find(n => n.id === 'n3')!.status).toBe('done')
  expect(t.nodes.find(n => n.id === 'n3-b')!.title).toBe('Range B')
  // Session B's later references to its own "n3" follow the rename.
  expect(t.nodes.find(n => n.id === 'n4')!.parents).toEqual(['n3-b'])
  expect(t.nodes.find(n => n.id === 'n4')!.status).toBe('merged')
  expect(t.nodes.find(n => n.id === 'n3-b')!.parents).toEqual(['n2', 'n4'])
})

test('a whole-file snapshot migrates into events that replay to the same nodes', () => {
  let snap = { ...emptyTree(), goal: 'G' }
  snap = upsert(snap, { title: 'A', lens: 'goal', status: 'done', verification: 'x' }, at(1)).tree
  snap = upsert(snap, { title: 'B', lens: 'depth', parents: ['n1'], estimate: '1d' }, at(2)).tree
  snap = upsert(snap, { id: 'n2', status: 'exploring' }, at(3)).tree
  const t = replay(eventsFromSnapshot(snap, 'M'))
  expect(t.goal).toBe('G')
  expect(t.nodes.map(n => [n.id, n.title, n.status, n.parents])).toEqual([['n1', 'A', 'done', []], ['n2', 'B', 'exploring', ['n1']]])
})
