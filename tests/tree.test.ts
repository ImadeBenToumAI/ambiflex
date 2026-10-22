import { expect, test } from 'claude-code/testing'
import { emptyLedger, noteCall, noteCompact, noteRequest, overhead, overheadLine } from '../hooks/overhead'

import { parseActions } from '../hooks/local'
import { iterate, runCost, silentRuns, parseTree, proofScore, blockers, addReview, decide, altitudeBrief, arrival, assumedRate, compactByDefault, autoTarget, calibration, expectedEnd, parseReport, prune, rankChildren, spread, costEstimate, current, depths, emptyTree, eta, merge, minutes, nextOpen, nodeRef, outline, progress, renderSvg, upsert } from '../hooks/tree'

const T0 = '2026-10-18T00:00:00.000Z'

function sample() {
  let t = { ...emptyTree(), goal: 'Keep the apps crash-free' }
  t = upsert(t, { title: 'Goal', lens: 'goal', status: 'done', verification: 'n/a' }, T0).tree
  t = upsert(t, { title: 'Altitude', lens: 'altitude', parents: ['n1'], estimate: '2h' }, T0).tree
  t = upsert(t, { title: 'Depth', lens: 'depth', parents: ['n1'], status: 'exploring', estimate: '3h' }, T0).tree
  t = upsert(t, { title: 'Synthesis', lens: 'step', parents: ['n2', 'n3'], estimate: '1h' }, T0).tree
  return t
}

test('creates nodes with stable ids and drops unknown parents', () => {
  const t = upsert(sample(), { title: 'X', parents: ['n1', 'zzz'] }, T0).tree
  expect(t.nodes.map(n => n.id)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5'])
  expect(t.nodes[4]!.parents).toEqual(['n1'])
})

test('updates a node without losing its fields', () => {
  const t = upsert(sample(), { id: 'n2', status: 'exploring' }, '2026-10-19T00:00:00.000Z').tree
  const n2 = t.nodes.find(n => n.id === 'n2')!
  expect(n2.status).toBe('exploring')
  expect(n2.estimate).toBe('2h')
  expect(n2.createdAt).toBe(T0)
  expect(n2.startedAt).toBe('2026-10-19T00:00:00.000Z')
})

test('done without verification is kept at review', () => {
  const t = upsert(sample(), { id: 'n3', status: 'done' }, T0).tree
  expect(t.nodes.find(n => n.id === 'n3')!.status).toBe('review')
  const ok = upsert(t, { id: 'n3', status: 'done', verification: 'npm test green' }, T0).tree
  expect(ok.nodes.find(n => n.id === 'n3')!.status).toBe('done')
})

test('computes depth on a converging graph', () => {
  const d = depths(sample())
  expect(d.get('n1')).toBe(0)
  expect(d.get('n4')).toBe(2)
})

test('merges branches into a target node', () => {
  let t = upsert(sample(), { title: 'Range', lens: 'range', parents: ['n1'] }, T0).tree
  t = merge(t, ['n5'], 'n4', T0)
  expect(t.nodes.find(n => n.id === 'n5')!.status).toBe('merged')
  expect(t.nodes.find(n => n.id === 'n4')!.parents).toEqual(['n2', 'n3', 'n5'])
})

test('reports progress and the current node', () => {
  const t = sample()
  expect(progress(t)).toEqual({ total: 4, finished: 1, exploring: 1, review: 0, blocked: 0, closed: 0, pct: 25 })
  expect(current(t)!.id).toBe('n3')
})

test('parses estimates and finds the critical path', () => {
  expect(minutes('30min')).toBe(30)
  expect(minutes('2 h')).toBe(120)
  expect(minutes('1.5d')).toBe(720)
  expect(minutes('1w')).toBe(2400)
  const e = eta(sample())
  expect(e.critical).toBe(240) // n3 (3h) → n4 (1h)
  expect(e.path).toEqual(['n3', 'n4'])
  expect(e.remaining).toBe(360)
})

test('picks the next open node whose parents are settled; a goal node never blocks its children', () => {
  expect(nextOpen(sample())!.id).toBe('n2')
  const g = upsert(upsert(emptyTree(), { title: 'Umbrella', lens: 'goal', status: 'exploring' }, T0).tree, { title: 'Child', lens: 'depth', parents: ['n1'] }, T0).tree
  expect(nextOpen(g)!.id).toBe('n2')
  expect(autoTarget(g)!.id).toBe('n2')
  const t = upsert(upsert(sample(), { id: 'n2', status: 'done', verification: 'x' }, T0).tree, { id: 'n3', status: 'done', verification: 'x' }, T0).tree
  expect(nextOpen(t)!.id).toBe('n4')
})

test('a node set done without exploring takes its last touch as startedAt', () => {
  const T1 = '2026-10-19T10:00:00.000Z', T2 = '2026-10-19T14:00:00.000Z'
  let t = upsert(emptyTree(), { title: 'Straight to done', lens: 'step', estimate: '2h' }, T0).tree
  t = upsert(t, { id: 'n1', summary: 'touched' }, T1).tree
  t = upsert(t, { id: 'n1', status: 'done', verification: 'tests green' }, T2).tree
  const n1 = t.nodes.find(n => n.id === 'n1')!
  expect(n1.startedAt).toBe(T1)
  expect(n1.finishedAt).toBe(T2)
  expect(calibration(t)).toEqual({ factor: 2, samples: 1 }) // 4h for a 2h estimate
  const fresh = upsert(emptyTree(), { title: 'Never touched', status: 'review' }, T1).tree
  expect(fresh.nodes[0]!.startedAt).toBe(T1) // falls back to createdAt
})

test('calibrates estimates against actual time', () => {
  let t = sample()
  t = upsert(t, { id: 'n2', status: 'exploring' }, '2026-10-19T10:00:00.000Z').tree
  t = upsert(t, { id: 'n2', status: 'done', verification: 'x' }, '2026-10-19T14:00:00.000Z').tree // 4h for a 2h estimate
  expect(calibration(t)).toEqual({ factor: 2, samples: 1 })
})

test('attaches an agent to the node cited by #id', () => {
  expect(nodeRef('Explore the perf track #n3', sample())).toBe('n3')
  expect(nodeRef('Nothing #n99', sample())).toBe(undefined)
})

test('draws a valid SVG, escapes text, and clips long fields in the outline', () => {
  const t = upsert(sample(), { title: '<script>', summary: 'x'.repeat(500) }, T0).tree
  const { source } = renderSvg(t, 'n2')
  expect(source.startsWith('<svg')).toBe(true)
  expect(source.includes('<script>')).toBe(false)
  expect(source.length < 131072).toBe(true)
  expect(outline(t).includes('x'.repeat(201))).toBe(false)
})

test('draws top-down: children sit below their parents', () => {
  const { source } = renderSvg(sample(), undefined)
  const y = (id: string) => {
    const m = source.match(new RegExp(`<text x="[\\d.]+" y="([\\d.]+)"[^>]*>[^<]*</text><text x="[\\d.]+" y="[\\d.]+"[^>]*>${id} `))
    return m ? parseFloat(m[1]!) : NaN
  }
  expect(y('n1') < y('n2')).toBe(true)
  expect(y('n2') < y('n4')).toBe(true)
  expect(y('n2')).toBe(y('n3'))
})

test('wraps a wide row and folds finished leaves so a big tree stays readable', () => {
  // 24 children under one goal: 22 done steps and 2 open ones.
  let t = upsert(emptyTree(), { id: 'g', title: 'Goal', lens: 'goal' }, T0).tree
  for (let i = 1; i <= 24; i++) {
    const done = i <= 22
    t = upsert(t, { id: `s${i}`, title: `Step ${i}`, lens: 'step', parents: ['g'], ...(done ? { status: 'done', verification: 'test' } : {}) }, T0).tree
  }
  expect(compactByDefault(t)).toBe(true)
  const all = renderSvg(t, undefined, { compact: false })
  expect(all.width).toBeLessThan(1200)            // six columns, not twenty-four
  expect(all.height).toBeGreaterThan(300)          // the row wrapped onto several lines
  const compact = renderSvg(t, undefined)
  expect(compact.source.includes('+22 finished under g')).toBe(true)
  expect(compact.source.includes('Step 23')).toBe(true)
  expect(compact.source.includes('Step 5<')).toBe(false)
  // A folded node comes back when selected.
  expect(renderSvg(t, 's5').source.includes('Step 5<')).toBe(true)
})

test('projects the cost of what is left from the hourly rate', () => {
  // 6h of remaining effort at $12/h, calibration ×1
  expect(costEstimate(sample(), 12)).toBe(72)
  expect(assumedRate('claude-opus-5-5')).toBe(12)
  expect(assumedRate('claude-fable-5-1')).toBe(30)
})

test('three-point estimates give the PERT expected value and spread', () => {
  expect(minutes('1h/2h/4h')).toBe(Math.round((60 + 480 + 240) / 6))
  expect(spread('1h/2h/4h')).toBe(30)
  expect(spread('2h')).toBe(0)
})

test('calibration ignores hand-set timestamps and placeholders', () => {
  let t = sample()
  // 30 seconds on a 1-day estimate: a timestamp set by hand, not a measurement.
  t = upsert(t, { title: 'Fake', lens: 'step', estimate: '1d', status: 'exploring' }, '2026-10-19T10:00:00.000Z').tree
  t = upsert(t, { id: 'n5', status: 'done', verification: 'x' }, '2026-10-19T10:00:30.000Z').tree
  expect(calibration(t)).toEqual({ factor: 1, samples: 0 })
  // 10 minutes on a 2-day estimate (ratio 0.01): an agent's real pace, counted.
  t = upsert(t, { title: 'Fast', lens: 'step', estimate: '2d', status: 'exploring' }, '2026-10-19T10:00:00.000Z').tree
  t = upsert(t, { id: 'n6', status: 'done', verification: 'x' }, '2026-10-19T10:10:00.000Z').tree
  expect(calibration(t)).toEqual({ factor: 0.01, samples: 1 })
  // 3h on a 2h estimate: a measurement.
  t = upsert(t, { id: 'n2', status: 'exploring' }, '2026-10-19T11:00:00.000Z').tree
  t = upsert(t, { id: 'n2', status: 'done', verification: 'x' }, '2026-10-19T14:00:00.000Z').tree
  expect(calibration(t).samples).toBe(2)
})

test('arrival skips nights and weekends unless the run is continuous', () => {
  const fri = new Date('2026-10-16T15:00:00.000Z') // Friday 15:00 UTC
  expect(arrival(fri, 60).toISOString()).toBe('2026-10-16T16:00:00.000Z')
  expect(arrival(fri, 4 * 60).toISOString()).toBe('2026-10-19T11:00:00.000Z') // 2h Friday, 2h Monday
  expect(arrival(fri, 4 * 60, true).toISOString()).toBe('2026-10-16T19:00:00.000Z')
  const end = expectedEnd(sample(), fri)
  expect(end.minutes).toBe(240)
})

test('ranks tracks by score and parses an agent report', () => {
  let t = upsert(emptyTree(), { title: 'P', lens: 'depth' }, T0).tree
  t = upsert(t, { title: 'a', lens: 'step', parents: ['n1'], score: 0.2 }, T0).tree
  t = upsert(t, { title: 'b', lens: 'step', parents: ['n1'], score: 0.8 }, T0).tree
  t = upsert(t, { title: 'c', lens: 'step', parents: ['n1'] }, T0).tree
  expect(rankChildren(t, 'n1').map(n => n.id)).toEqual(['n3', 'n2', 'n4'])
  const p = prune(t, 'n1', T0)
  expect(p.kept!.id).toBe('n3')
  expect(p.dropped.map(n => n.id)).toEqual(['n2'])
  expect(p.tree.nodes.find(n => n.id === 'n4')!.status).toBe('proposed')
  expect(parseReport('blah\nNODE: n2\nRESULT: it works\nSCORE: 0.75')).toEqual({ score: 0.75, result: 'it works', node: 'n2' })
  expect(parseReport('no score')).toEqual({ score: undefined, result: undefined, node: undefined })
})

test('numbered steps run in order, importance weighs progress, acceptance needs a passing iteration', () => {
  const now = '2026-10-21T10:00:00Z'
  let t = emptyTree()
  t = upsert(t, { title: 'TTS model', lens: 'depth' }, now).tree
  t = upsert(t, { title: 'Evaluate', lens: 'step', parents: ['n1'], seq: 3 }, now).tree
  t = upsert(t, { title: 'Data', lens: 'step', parents: ['n1'], seq: 1 }, now).tree
  t = upsert(t, { title: 'Train', lens: 'step', parents: ['n1'], seq: 2, weight: 5, acceptance: 'WER < 8%' }, now).tree
  // A goal is an umbrella: its children are workable while it is open.
  t = upsert(t, { id: 'n1', lens: 'goal' }, now).tree
  expect(nextOpen(t)?.title).toBe('Data')
  t = upsert(t, { id: 'n3', status: 'done', verification: 'rows counted' }, now).tree
  expect(nextOpen(t)?.title).toBe('Train')
  // Done without a passing iteration stays in review.
  expect(upsert(t, { id: 'n4', status: 'done', verification: 'looks good' }, now).node.status).toBe('review')
  t = iterate(t, 'n4', { result: 'WER 9.1%', value: 9.1, passed: false }, now).tree
  expect(t.nodes.find(n => n.id === 'n4')?.status).toBe('exploring')
  t = iterate(t, 'n4', { result: 'WER 7.6%', value: 7.6, passed: true }, now).tree
  const train = t.nodes.find(n => n.id === 'n4')!
  expect(train.status).toBe('done')
  expect(train.iterations?.length).toBe(2)
  expect(train.verification).toContain('iteration 2')
  // Weighted by importance: Data (1) and Train (5) done, out of goal 1 + Data 1 + Train 5 + Evaluate 1.
  expect(progress(t).pct).toBe(Math.round(6 / 8 * 100))
  expect(outline(t)).toContain('↻2')
  expect(outline(t)).toContain('step 2')
})

test('lower-is-better scores rank smallest first; blocked leaves the ETA; moved leaves progress', () => {
  const now = '2026-10-21T10:00:00Z'
  let t = emptyTree()
  t = upsert(t, { title: 'Decoder', lens: 'depth', direction: 'lower' }, now).tree
  t = upsert(t, { title: 'Greedy', lens: 'step', parents: ['n1'], score: 55.9 }, now).tree
  t = upsert(t, { title: 'KenLM', lens: 'step', parents: ['n1'], score: 41.2 }, now).tree
  expect(rankChildren(t, 'n1')[0].title).toBe('KenLM')
  expect(prune(t, 'n1', now).kept?.title).toBe('KenLM')
  t = upsert(t, { title: 'Verdict', lens: 'step', parents: ['n1'], estimate: '3d', status: 'blocked', blockedOn: 'speaker' }, now).tree
  expect(eta(t).remaining).toBe(0)
  expect(upsert(t, { id: 'n4', status: 'moved' }, now).node.status).toBe('blocked')
  t = upsert(t, { id: 'n4', status: 'moved', movedTo: 'tts tree' }, now).tree
  expect(progress(t).closed).toBe(1)
  expect(progress(t).total).toBe(3)
})

test('every field of every lens survives a write and a read back', () => {
  let t = { ...emptyTree(), goal: 'Round trip' }
  const full = { summary: 's', detail: 'd', headline: 'h', estimate: '2h', judge: 'j', score: 55.9, direction: 'lower' as const, unit: '%', weight: 5, seq: 2, acceptance: 'a', verifyCmd: 'true', model: 'opus', effort: 'high' as const }
  for (const lens of ['goal', 'altitude', 'depth', 'range', 'step'] as const) t = upsert(t, { title: `T ${lens}`, lens, status: 'review', ...full }, T0).tree
  t = upsert(t, { id: 'n2', title: 'Moved', status: 'moved', movedTo: 'other tree' }, T0).tree
  t = upsert(t, { id: 'n3', status: 'blocked', blockedOn: 'a verdict' }, T0).tree
  const back = parseTree(JSON.stringify(t))
  expect(back).toEqual(t)
  // A later partial update keeps every other field.
  const after = upsert(back, { id: 'n4', summary: 'new' }, T0).node
  expect(after).toEqual({ ...t.nodes[3], summary: 'new', updatedAt: T0 })
  expect(back.nodes.map(n => n.title)).toEqual(['T goal', 'Moved', 'T depth', 'T range', 'T step'])
  expect(back.nodes[1].lens).toBe('altitude')
})

test('a run tracks elapsed time, cost and silence', () => {
  let t = upsert(emptyTree(), { title: 'Decode', lens: 'step', status: 'exploring', run: { resource: 'VM l4', state: 'running', ratePerHour: 1 } }, T0).tree
  const t1 = '2026-10-18T02:00:00.000Z'
  expect(runCost(t.nodes[0].run!, t1)).toEqual({ hours: 2, usd: 2 })
  expect(silentRuns(t, t1).map(n => n.id)).toEqual(['n1'])
  t = upsert(t, { id: 'n1', run: { state: 'running' } as never }, t1).tree
  expect(t.nodes[0].run!.resource).toBe('VM l4')
  expect(silentRuns(t, '2026-10-18T02:10:00.000Z')).toEqual([])
  t = upsert(t, { id: 'n1', run: { state: 'failed' } as never }, '2026-10-18T03:00:00.000Z').tree
  expect(runCost(t.nodes[0].run!, '2026-10-18T09:00:00.000Z')).toEqual({ hours: 3, usd: 3 })
  expect(silentRuns(t, '2026-10-18T09:00:00.000Z')).toEqual([])
})

test('proof weighs each node by the strength of its proof; blockers say what stands in the way', () => {
  let t = { ...emptyTree(), goal: 'STT under 30 % WER' }
  t = upsert(t, { title: 'Goal', lens: 'goal' }, T0).tree
  t = upsert(t, { title: 'Ship the model', lens: 'altitude', parents: ['n1'], weight: 5 }, T0).tree                               // n2: no criterion anywhere below
  t = upsert(t, { title: 'Corpus', lens: 'step', parents: ['n2'], status: 'validated', verification: 'ok', weight: 2 }, T0).tree   // n3: 100 %
  t = upsert(t, { title: 'Fine-tune', lens: 'step', parents: ['n2'], weight: 4, acceptance: 'WER < 30 %', status: 'exploring', iterations: [{ n: 1, result: 'WER 41 %', passed: false, at: T0 }] }, T0).tree // n4
  t = upsert(t, { title: 'Docs', lens: 'step', parents: ['n2'], status: 'done', verification: 'written', weight: 1 }, T0).tree     // n5: 60 %
  t = upsert(t, { title: 'Speaker verdict', lens: 'step', parents: ['n2'], status: 'blocked', blockedOn: 'native speaker', weight: 3 }, T0).tree // n6
  const p = proofScore(t)
  // weights 5 + 2 + 4 + 1 + 3 = 15; proven 2 × 1 + 1 × 0.6 = 2.6 → 17 %; progress (2 + 1) / 15 = 20 %
  expect(p.pct).toBe(17)
  expect(p.progressPct).toBe(20)
  const b = blockers(t, T0)
  expect(b.map(x => `${x.id}:${x.kind}`)).toEqual(['n4:missed', 'n6:blocked'])
  // n2 is measured through n4's acceptance criterion.
  t = upsert(t, { id: 'n4', acceptance: '' as never }, T0).tree
  expect(blockers(t, T0).some(x => x.kind === 'unmeasurable' && x.id === 'n2')).toBe(true)
  expect(altitudeBrief(t, T0)).toContain('PROOF: 17 %')
})

test('a review waits for the user; accepted proposals become nodes, refused ones change nothing', () => {
  let t = upsert({ ...emptyTree(), goal: 'G' }, { title: 'Track', lens: 'depth' }, T0).tree
  t = addReview(t, { id: 'r1', at: T0, by: 'fable', diagnosis: 'd', proofBefore: 0, proposals: [
    { id: 'p1', kind: 'add', fields: { title: 'New track', lens: 'depth', weight: 4, acceptance: 'x' }, why: 'w' },
    { id: 'p2', kind: 'add', fields: { title: 'Its step', lens: 'step', parents: ['p1'] }, why: 'w' },
    { id: 'p3', kind: 'abandon', node: 'n1', fields: {}, why: 'refuted' },
  ] })
  expect(t.nodes.length).toBe(1)
  t = decide(t, 'r1', ['p3'], false, T0)
  expect(t.nodes[0].status).toBe('proposed')
  t = decide(t, 'r1', ['all'], true, T0)
  expect(t.nodes.map(n => n.title)).toEqual(['Track', 'New track', 'Its step'])
  expect(t.nodes[2].parents).toEqual(['n2'])
  expect(t.reviews![0].proposals.map(p => p.decided)).toEqual(['accepted', 'accepted', 'refused'])
  expect(parseTree(JSON.stringify(t)).reviews).toEqual(t.reviews)
})

test('months are m or mo, minutes are min; waiting does not calibrate and the factor is capped', () => {
  expect(minutes('2m')).toBe(20800)
  expect(minutes('1mo')).toBe(10400)
  expect(minutes('45min')).toBe(45)
  expect(minutes('2w/2m/4m')).toBe(Math.round((4800 + 4 * 20800 + 41600) / 6))
  let t = sample()
  // 44 h of calendar time on a 4h task: waiting, not effort.
  t = upsert(t, { title: 'Waited', lens: 'step', estimate: '4h', status: 'exploring' }, '2026-10-19T10:00:00.000Z').tree
  t = upsert(t, { id: 'n5', status: 'done', verification: 'x' }, '2026-10-21T06:00:00.000Z').tree
  expect(calibration(t)).toEqual({ factor: 1, samples: 0 })
  // 3× on two nodes: real overrun, capped at 2×.
  for (const [id, title] of [['n6', 'A'], ['n7', 'B']]) {
    t = upsert(t, { title, lens: 'step', estimate: '1h', status: 'exploring' }, '2026-10-19T10:00:00.000Z').tree
    t = upsert(t, { id, status: 'done', verification: 'x' }, '2026-10-19T13:00:00.000Z').tree
  }
  expect(calibration(t)).toEqual({ factor: 2, samples: 2 })
})

test('an accepted proposal can close a node, with its verification', () => {
  let t = upsert({ ...emptyTree(), goal: 'G' }, { title: 'Track', lens: 'depth', status: 'review' }, T0).tree
  t = addReview(t, { id: 'r1', at: T0, by: 'fable', diagnosis: 'd', proofBefore: 0, proposals: [
    { id: 'p1', kind: 'update', node: 'n1', fields: { status: 'done', verification: 'n39 measured 51.2 %' }, why: 'evidence in n39' },
  ] })
  t = decide(t, 'r1', ['p1'], true, T0)
  expect(t.nodes[0].status).toBe('done')
  expect(t.nodes[0].verification).toBe('n39 measured 51.2 %')
})

test('local actions: torn lines are skipped and repeats kept once', () => {
  expect(parseActions('{"text":"a"}\n{"tex\n{"text":"a"}\n{"text":"b"}\n')).toEqual(['a', 'b'])
})

test('overhead: only what Ambiflex adds, as a range, with plugin turns measured and auto work apart', () => {
  let l = emptyLedger()
  for (let i = 0; i < 10; i++) l = noteRequest(l)
  l = noteCall(l, '{"title":"x"}', 'ok '.repeat(100), 50000)
  l = noteRequest(l)
  l = { ...l, turns: 1, turnUsd: 0.2, autoUsd: 3 }
  const o = overhead(l, 3000, 'claude-opus-5-5', 10)
  expect(o.model).toBe('opus')
  expect(o.usd.low).toBeLessThanOrEqual(o.usd.mid)
  expect(o.usd.mid).toBeLessThanOrEqual(o.usd.high)
  // Fixed: 11 requests × 3000 cached tokens at $0.40/M, plus one cache write.
  expect(Math.abs(o.parts.fixed.low - (11 * 3000 * 0.4e-6 + 3000 * 5e-6)) < 1e-4).toBe(true)
  // Plugin turns are measured; auto-mode work is never counted as overhead.
  expect(o.parts.turns.low).toBe(0.2)
  expect(o.usd.high).toBeLessThan(1)
  expect(Math.abs(o.pct!.mid - o.usd.mid / 10 * 100) < 0.01).toBe(true)
  expect(overheadLine(o)).toContain('not counted')
  // A compaction drops what Ambiflex carried in context.
  expect(noteCompact(l).carriedTok).toBe(0)
})
