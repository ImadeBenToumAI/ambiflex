import { expect, test } from 'claude-code/testing'

import { planRoute, route, tierOf } from '../hooks/routing'
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
