import { expect, test } from 'claude-code/testing'

import { parseKind, planRoute, route, statusLine, tierOf , noteModelCall, callTotals, aliasOf } from '../hooks/routing'
import type { TreeNode } from '../types'

const node = (o: Partial<TreeNode>): TreeNode => ({ id: 'n1', title: 'Step', lens: 'step', status: 'exploring', parents: [], createdAt: '', updatedAt: '', ...o })

test('routing: the plan on the strongest allowed model; each node on what it needs, never above the cap', () => {
  expect(tierOf('claude-opus-5-5')).toBe(2)
  expect(tierOf('claude-fable-5-1')).toBe(3)
  expect(planRoute(3)).toMatchObject({ model: 'fable', effort: 'max' })
  expect(planRoute(2).model).toBe('opus')
  expect(route(node({ title: 'Rename the helper', weight: 1 }), 3)).toMatchObject({ model: 'haiku', effort: 'low' })
  expect(route(node({ title: 'Add the parser', weight: 3 }), 3)).toMatchObject({ model: 'sonnet', effort: 'medium' })
  expect(route(node({ title: 'Depth track', lens: 'depth' }), 3)).toMatchObject({ model: 'opus', effort: 'high' })
  expect(route(node({ title: 'Durable outcome', lens: 'altitude' }), 3)).toMatchObject({ model: 'fable', effort: 'high' })
  expect(route(node({ title: 'Durable outcome', lens: 'altitude' }), 2).model).toBe('opus')
  // Critical or risky never goes below the strong tier, even when it looks mechanical.
  expect(route(node({ title: 'Update docs', weight: 5 }), 3).model).toBe('opus')
  expect(route(node({ title: 'Rotate the auth token', weight: 1 }), 3).model).toBe('opus')
  // A failed proof moves the next attempt up; the cap still holds.
  const failed = node({ title: 'Add the parser', weight: 3, iterations: [{ n: 1, result: 'x', passed: false, at: '' }] })
  expect(route(failed, 3)).toMatchObject({ model: 'opus', effort: 'high' })
  expect(route(node({ title: 'Depth', lens: 'depth', verifyOk: false }), 2).model).toBe('opus')
  expect(route(node({ title: 'Depth', lens: 'depth' }), 1).model).toBe('sonnet')
  // A pin wins.
  expect(route(node({ title: 'Rename', model: 'opus', effort: 'xhigh' }), 3)).toMatchObject({ model: 'opus', effort: 'xhigh', why: 'pinned' })
})

test('routing: a light model\'s word sorts a step; the status line says the week, the node and the route', () => {
  expect(parseKind('Mechanical.')).toBe('mechanical')
  expect(parseKind('I think: risky')).toBe('risky')
  expect(parseKind('???')).toBeUndefined()
  expect(route(node({ title: 'Write the parser', weight: 1, kind: 'mechanical' }), 3).model).toBe('haiku')
  expect(route(node({ title: 'Tidy the module', weight: 1, kind: 'risky' }), 3).model).toBe('opus')
  expect(statusLine({ weekLeft: 38.4, node: 'n4 Parser', route: { model: 'sonnet', effort: 'low', why: '' } })).toBe('38% week left · n4 Parser · sonnet low')
  expect(statusLine({})).toBeUndefined()
})

test('routing: every request is counted by model and effort, across sessions', () => {
  let b = noteModelCall({}, 's1', 'claude-sonnet-5-5', 'medium', { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 500 })
  b = noteModelCall(b, 's1', 'claude-sonnet-5-5', 'medium', { input_tokens: 50, output_tokens: 10 })
  b = noteModelCall(b, 's2', 'claude-fable-5-1', 'max', { input_tokens: 10, output_tokens: 5 })
  b = noteModelCall(b, 's2', 'claude-sonnet-5-5', 'medium', { input_tokens: 1, output_tokens: 1 })
  expect(aliasOf('claude-opus-5-5')).toBe('opus')
  const t = callTotals(b)
  expect(t[0]).toEqual({ model: 'sonnet', effort: 'medium', n: 3, input: 151, output: 31, cacheRead: 500, cacheWrite: 0 })
  expect(t.find(r => r.model === 'fable')?.n).toBe(1)
})
