// What Ambiflex itself adds to a session's bill: only the delta, never the task's own tokens.
// Three parts, each priced from what the plugin can see:
//   fixed  the method section and the loaded tree_* tool schemas, re-read (from cache) on every request;
//   tools  each tree_* call: its arguments (output), its result (input, then carried in context and re-read
//          on every later request), and the extra model round trip it may cost (one more read of the context);
//   turns  turns the plugin itself starts (page publish, [tree] asks, Take altitude), measured from the
//          session's own cost ledger between their start and end.
// Not counted: the task's work, including auto-mode turns (the user's work, shown apart), and routing
// savings (shown apart, never subtracted). Token counts are estimates (4 characters ≈ 1 token unless the host
// counted them), so the result is a range, low to high, with a middle value.
import { tierOf, TIERS } from './routing'

/** Dollars per million tokens: input and output. Cache reads cost a tenth of input, cache writes 1.25×. */
/**
 * The A/B measure the estimate is calibrated on: the same task, 3 runs without Ambiflex and 3 with the plugin
 * and a CLAUDE.md asking for the tree (Sonnet, 2026-10-22). With the tree in use, Ambiflex added 29 % to the
 * task's own cost; an extra round trip cost about 0.2 of a full context re-read, not more.
 */
export const CALIBRATION = { date: '2026-10-22', model: 'sonnet', runs: 3, share: 0.29, roundTrip: 0.2 }

export const PRICES: Record<string, { in: number; out: number }> = {
  haiku: { in: 0.1, out: 0.5 }, sonnet: { in: 2, out: 10 }, opus: { in: 4, out: 20 }, fable: { in: 10, out: 50 },
}

export type Ledger = {
  /** Model requests in the main loop: one per tool call plus one per turn's final answer. */
  requests: number
  /** tree_* calls, their argument and result tokens. */
  calls: number; argTok: number; resultTok: number
  /** Ambiflex tokens still in context (arguments and results since the last compaction). */
  carriedTok: number
  /** Sum over requests of carriedTok at that request: tokens re-read because Ambiflex put them there. */
  carriedReadTok: number
  /** Sum over tree_* calls of the context size at that call: what one extra round trip re-reads. */
  roundTripTok: number
  /** Plugin-started turns, measured in dollars; mixed: a hand-over that rode a user's turn (counted high only). */
  turns: number; turnUsd: number; mixedUsd: number
  /** Auto-mode turns: the user's work, shown apart. */
  autoUsd: number
}

export const emptyLedger = (): Ledger => ({ requests: 0, calls: 0, argTok: 0, resultTok: 0, carriedTok: 0, carriedReadTok: 0, roundTripTok: 0, turns: 0, turnUsd: 0, mixedUsd: 0, autoUsd: 0 })

export const estTokens = (s: string) => Math.ceil(s.length / 4)

/** One main-loop request: Ambiflex tokens already in context are read once more. */
export function noteRequest(l: Ledger): Ledger {
  return { ...l, requests: l.requests + 1, carriedReadTok: l.carriedReadTok + l.carriedTok }
}

/** One tree_* call: its own tokens, which then stay in context, and the context a round trip re-reads. */
export function noteCall(l: Ledger, args: string, result: string, contextTok: number): Ledger {
  const a = estTokens(args), r = estTokens(result)
  return { ...l, calls: l.calls + 1, argTok: l.argTok + a, resultTok: l.resultTok + r, carriedTok: l.carriedTok + a + r, roundTripTok: l.roundTripTok + Math.max(0, contextTok) }
}

/** A compaction drops the carried tokens from context. */
export const noteCompact = (l: Ledger): Ledger => ({ ...l, carriedTok: 0 })

export type Part = { low: number; mid: number; high: number }
export type Overhead = {
  usd: Part; pct: Part | null; sessionUsd: number; model: string
  parts: { fixed: Part; tools: Part; turns: Part }
  /** Ambiflex's cost as a share of the task's own cost (the session less Ambiflex): what scales a cost-unit estimate. */
  share: Part | null
  calibration: typeof CALIBRATION
  fixedTok: number; calls: number; turns: number; autoUsd: number; requests: number
}

const r4 = (x: number) => +x.toFixed(4)
const part = (low: number, mid: number, high: number): Part => ({ low: r4(low), mid: r4(mid), high: r4(high) })

/**
 * The delta in dollars, as a range. `fixedTok` is the method plus the loaded tool schemas; `sessionUsd` what
 * the session spent since Ambiflex started counting (the base of the percentage).
 */
export function overhead(l: Ledger, fixedTok: number, model: string | undefined, sessionUsd: number): Overhead {
  const tier = tierOf(model)
  const name = tier >= 0 ? TIERS[tier] : 'opus'
  const p = PRICES[name]
  const M = 1e6
  const read = p.in * 0.1 / M, write = p.in * 1.25 / M, out = p.out / M
  // Fixed: read from cache on each request; written to cache once (low) or once per 20 requests, as a
  // cache entry expires or the prefix changes (high).
  const fixedRead = l.requests * fixedTok * read
  const fixed = part(fixedRead + fixedTok * write, fixedRead + fixedTok * write * Math.max(1, l.requests / 40), fixedRead + fixedTok * write * Math.max(1, l.requests / 20))
  // Tools: arguments are written by the model; results enter the context (cache write) and are re-read later.
  // The round trip costs nothing when the call rides alongside other tool calls (low), a full re-read when alone (high).
  const own = l.argTok * out + l.resultTok * write + l.carriedReadTok * read
  const trip = l.roundTripTok * read
  const tools = part(own, own + trip * CALIBRATION.roundTrip, own + trip * 0.6 + l.calls * 40 * out)
  const turns = part(l.turnUsd, l.turnUsd + l.mixedUsd * 0.5, l.turnUsd + l.mixedUsd)
  const usd = part(fixed.low + tools.low + turns.low, fixed.mid + tools.mid + turns.mid, fixed.high + tools.high + turns.high)
  const pct = sessionUsd > 0 ? part(Math.min(100, usd.low / sessionUsd * 100), Math.min(100, usd.mid / sessionUsd * 100), Math.min(100, usd.high / sessionUsd * 100)) : null
  const task = (x: number) => sessionUsd - x > 0 ? x / (sessionUsd - x) : 0
  const share = sessionUsd > 0 ? part(task(usd.low), task(usd.mid), task(usd.high)) : null
  return { share, calibration: CALIBRATION, usd, pct, sessionUsd: r4(sessionUsd), model: name, parts: { fixed, tools, turns }, fixedTok, calls: l.calls, turns: l.turns, autoUsd: r4(l.autoUsd), requests: l.requests }
}

/** One line for /ambiflex doctor: shares, never dollars (the page's cost units and the plan's are relative too). */
export function overheadLine(o: Overhead): string {
  const pct = (x: number) => `${x.toFixed(1)} %`
  const of = (x: number) => o.sessionUsd > 0 ? pct(x / o.sessionUsd * 100) : '—'
  const head = o.pct ? `≈ ${pct(o.pct.mid)} of this session (${pct(o.pct.low)}–${pct(o.pct.high)})` : 'no session spend yet'
  return `Ambiflex overhead: ${head}. Method and tools ${of(o.parts.fixed.mid)} (${o.fixedTok} tokens × ${o.requests} requests, cached), ${o.calls} tree calls ${of(o.parts.tools.mid)}, ${o.turns} plugin turns ${of(o.parts.turns.mid)}. Calibrated on an A/B run (${o.calibration.date}: +${Math.round(o.calibration.share * 100)} % with the tree in use). Auto-mode work and routing savings are not counted here.`
}
