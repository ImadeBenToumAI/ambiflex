import { expect, test } from 'claude-code/testing'

import { buildUsage, parseSamples } from '../hooks/usage'

const R = '2026-10-23T12:00:00.000Z'
const line = (o: object) => JSON.stringify(o)

test('usage: windows, rate, projection, the project share and the sessions', () => {
  const samples = parseSamples([
    line({ t: '2026-10-21T08:00:00.000Z', s: 'a', w: 40, wr: R, h: 10, usd: 0, node: 'n1' }),
    line({ t: '2026-10-21T10:00:00.000Z', s: 'a', w: 50, wr: R, h: 30, usd: 20, node: 'n2' }),
    line({ t: '2026-10-21T11:00:00.000Z', s: 'b', w: 52, wr: R, usd: 0 }),
    line({ t: '2026-10-21T12:00:00.000Z', s: 'b', w: 60, wr: R, h: 45, hr: '2026-10-21T15:00:00.000Z', usd: 16, node: 'n2' }),
    'not json',
  ].join('\n'))
  const doc = buildUsage({ at: '2026-10-21T12:00:00.000Z', samples, planUsd: 200, remainingUsd: 30 })
  expect(doc.week).toEqual({ pct: 60, resetsAt: R })
  expect(doc.fiveHour?.pct).toBe(45)
  // 40 -> 60 over 4 hours: 5 points an hour, so 100% in 8 hours, before the reset in 48.
  expect(doc.ratePerHour).toBe(5)
  expect(doc.hitsAt).toBe('2026-10-21T20:00:00.000Z')
  expect(doc.endPct).toBe(300)
  // 10 + 8 = 18 points measured inside this project's sessions (the 2 points between them were elsewhere).
  expect(doc.projectPoints).toBe(18)
  expect(doc.projectPointsWeek).toBe(18)
  expect(doc.monthUsd).toBe(36)
  expect(doc.usdPerPoint).toBe(2)
  expect(doc.planPoints).toBe(15)
  expect(doc.nodes).toEqual([{ id: 'n1', usd: 20 }])
  expect(doc.sessions.map(x => [x.s, x.minutes, x.usd, x.points])).toEqual([['b', 60, 16, 8], ['a', 120, 20, 10]])
})

test('usage: a slow week ends below 100% and no hit time is given; a reset starts the count over', () => {
  const samples = parseSamples([
    line({ t: '2026-10-21T00:00:00.000Z', s: 'a', w: 90, wr: '2026-10-20T00:00:00.000Z', usd: 0 }),
    line({ t: '2026-10-21T01:00:00.000Z', s: 'a', w: 2, wr: R, usd: 1 }),
    line({ t: '2026-10-21T03:00:00.000Z', s: 'a', w: 4, wr: R, usd: 3 }),
  ].join('\n'))
  const doc = buildUsage({ at: '2026-10-21T03:00:00.000Z', samples, planUsd: 200 })
  expect(doc.hitsAt).toBeUndefined()
  expect(doc.ratePerHour).toBe(1)
  expect(doc.endPct).toBe(61)
  expect(doc.projectPoints).toBe(2)
})
