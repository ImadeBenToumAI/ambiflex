# Ambiflex auto run, 18 October 2026: end-to-end report

Written by the plugin's request when auto mode ended ("no open node left"). Times are commit timestamps on the auto-run branch; the plugin's own per-node timing missed nodes that never passed through *exploring* (a fix is queued).

**Run:** started 21:55 UTC, 20 hand-over turns, ended 23:00 with nothing left that Claude could do alone. Elapsed 1.1 h. Session cost at the end: **$57** (three parallel explorer agents included); 5-hour window at 2 %.

## What was done, and how each was verified

| Node | What | Estimate (human) | Actual (wall clock) | Verified by |
|---|---|---|---|---|
| n4 Event log | `.ambiflex/log.jsonl`, append-only, `merge=union`, replay with renamed collisions, migration of the old snapshot | 2d | 21:55 → 21:59, **4 min** | 25 tests; migration round trip on the real tree exact |
| n5 Calibrated estimates | three-point `1h/2h/4h`, expected end date, calibration from real timings only | 2d | 22:02 → 22:04, **~3 min** (+ a 6-min detour fixing a `cd` bug) | 28 tests |
| n6 Nodes ↔ branches | worktree branch per agent node, commits and PR in the panel, Validate proposes the merge | 2d | 22:04 → 22:06, **2 min** | 29 tests; worktree commands on a real temp repo |
| n7 Tree search | `tree_explore` / `tree_prune`, scores from agent reports, ranking in the panel | 3d | 22:06 → 22:13, **7 min** of build + 3 agents × ~5 min in parallel | 31 tests; **real run**: 3 agents, scores 3.15 / 6.66 / 7.3 reported, 2.95 / 4.41 / 7.24 measured independently, winner merged at 7.38× (334 → 44 ms) |
| n8 Publish | profile-repo marketplace, fresh-environment install, submission notes, MIT licence | 1d | 22:26 → 22:33, **7 min** | `claude plugin install ambiflex@imade` from an empty HOME shows v0.3.0 |
| n13 Retention loop | satisfied by n4 + n5 | 3w | — | the calibration line in `tree_get` |
| n16 Demo | the tree-search run itself | 1h/2h/4h | **~20 min** end to end | independent benchmark on the merged code |
| n11 Articles (drafts) | 4 articles from the session's data | 4w | ~10 min | none: needs the user |
| n10, n12 (drafts) | video script, launch texts | 2w, 2w | ~8 min | none: needs the user |

Also fixed during the run, found by the run itself: hand-overs queued by the cloud host (fallback added), a `cd` moving the plugin's state (paths anchored at the project root), goal nodes blocking their children (umbrellas), a calibration filter rejecting real measurements.

## Estimate vs actual

Technical nodes were estimated in human days: 11 days likely on the critical path. They took about **35 minutes of build time** plus ~20 minutes of agent exploration, with a human reading each result. Ratio of the order of **0.01**, consistent with the calibration the plugin now reports (×0.03 over the nodes it managed to time). The unit was the problem, not the estimates: a "day" measured a calendar, not the work.

The strategy nodes (video, articles, posting) will have a very different factor: their critical path is the user's time.

## What still needs the user's review

- **n10** Proof: record the 60-second video with the script in `docs/launch-kit.md`.
- **n11** Articles: edit and sign `docs/articles/01` to `04`.
- **n12** Distribution: review the texts in `docs/launch-kit.md` (reply to Felix, Show HN, lists, posts).
- **n15** Launch day: create the public `ambiflex` repository that morning; the prepared repository is pushed on request.
- **n14** Measure: starts on launch day.

## Two things the plugin should do better (queued)

1. Stamp `startedAt` when a node goes straight to `done` or `review` without `exploring` (n5, n6, n16 lost their timing).
2. Count hand-over turns only when the turn actually starts: 20 turns were counted for 8 nodes because queued hand-overs on the cloud host were delivered in batches.
