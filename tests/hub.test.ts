import { expect, test } from 'claude-code/testing'
import { hubFromJson, hubFromListing, navItems, projectCard, slug, type Card } from '../hooks/hub'
import { emptyTree, upsert } from '../hooks/tree'

const T0 = '2026-10-24T10:00:00.000Z'

test('hub: a project card carries progress, live work and the alerts that need the person', () => {
  let t = { ...emptyTree(), goal: 'Ship it' }
  t = upsert(t, { title: 'Build', lens: 'depth', status: 'exploring' }, T0).tree
  t = upsert(t, { title: 'Sign-off', lens: 'step', status: 'blocked', blockedOn: 'Imade: rate 4 samples' }, T0).tree
  const c = projectCard(t, { main: { node: 'n1', who: 'Claude', phase: 'tool', label: 'Bash', at: T0 }, 'bg:x1': { node: 'n1', who: 'background task', phase: 'tool', label: 'Monitor', at: T0, bg: true } },
    { name: 'stt-tashelhit', url: 'https://claude.ai/artifact/abc', session: { kind: 'cloud', url: 'https://claude.ai/code/session_1', label: 'Cloud session' }, now: T0, busy: true, plugin: '0.23.0' })
  expect(c.bg).toBe(1)
  expect(c.working.map(w => w.id)).toEqual(['n1', 'n1'])
  expect(c.alerts.map(a => a.key)).toEqual(['blocked:n2'])
  expect(c.alerts[0]!.why).toContain('Imade')
  expect(slug('New Toum Pay Platform')).toBe('new-toum-pay-platform')
})

test('hub: the switcher lists alerts first, acknowledged alerts no longer count, old projects are stopped', () => {
  const base = { goal: '', session: { kind: 'local', label: 'mac' }, busy: false, bg: 0, auto: { on: false, turns: 0, maxTurns: 40 }, proven: 0, done: 0, total: 0, etaMin: 0, spentUsd: 0, working: [], background: [], plugin: '' } as const
  const cards: Card[] = [
    { ...base, name: 'a', pct: 10, at: '2026-10-24T09:58:00.000Z', alerts: [] },
    { ...base, name: 'b', pct: 20, at: '2026-10-24T09:00:00.000Z', alerts: [{ key: 'blocked:n2', kind: 'blocked', title: 'x', why: 'y', level: 'red' }, { key: 'failing:n3', kind: 'failing', title: 'x', why: 'y', level: 'amber' }] },
    { ...base, name: 'c', pct: 100, at: '2026-10-10T09:00:00.000Z', alerts: [] },
  ]
  const items = navItems(cards, new Set(['b:failing:n3']), T0)
  expect(items.map(i => [i.name, i.state, i.alerts])).toEqual([['b', 'alert', 1], ['a', 'active', 0], ['c', 'stopped', 0]])
})

test('hub: its URL from a record or from the artifact listing', () => {
  expect(hubFromJson('{"url":"https://claude.ai/artifact/xyz"}')).toBe('https://claude.ai/artifact/xyz')
  expect(hubFromJson('{"url":"http://evil"}')).toBeUndefined()
  expect(hubFromListing('- Ambiflex · stt https://claude.ai/artifact/aaa\n- Ambiflex Hub · https://claude.ai/artifact/bbb-1 updated today')).toBe('https://claude.ai/artifact/bbb-1')
  expect(hubFromListing('nothing')).toBeUndefined()
})
