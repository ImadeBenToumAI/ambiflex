# Ambiflex: strategy and plan, v0.2 → v1.0

Written to be executed phase by phase. Every phase ends with an **external judge** (a test or a command): a phase is not finished until its judge is green. The same plan is recorded in the plugin's tree (`.ambiflex/tree.json`, nodes n1 to n8).

Status: v0.2 (this repository) already carries the Phase 1 fixes D1, D2, D3, D5, D7 and D10 below, plus auto mode and the end-to-end ETA.

## 1. The goal behind the goal (Altitude)

The goal is not "a pretty tree". It is to **keep a human in control of ambitious work carried out by several agents**, and to **estimate better with every project**. Two consequences:

- The tree must be the **shared source of truth** between you, Claude and the subagents: what was decided, tried, proven or abandoned, and why. Not an illustration produced afterwards.
- Every finished node must teach the system something: estimated versus actual time, which track won, and why.

## 2. What the best expert would do (Depth)

Disciplines whose real methods are borrowed, not just their vocabulary:

| Verb | Discipline | Method borrowed |
|---|---|---|
| Keep history and merge tracks | Git, event sourcing | Append-only event log. State is replayed from the log. Merging branches creates no conflicts. |
| Estimate and hold a date | Project management (PERT, critical path) | Three-point estimates (optimistic, likely, pessimistic), critical path, arrival date with an uncertainty |
| Prove a result is right | Experimental science | Each node carries a hypothesis, an experiment and a result. "Done" requires proof. |
| Explore wide, then prune | Chess engines (MCTS) | Several agents in parallel, a score per external judge, pruning of weak tracks. Budget flows to promising tracks. |
| Decide under uncertainty | Engineering (ADR) | Every validation or abandonment records its reason. Decisions stay readable. |

## 3. Critical review of v0.1

| # | Defect | Severity | Fix | Status |
|---|---|---|---|---|
| D1 | **Prompt injection.** The content of `tree.json` (titles, summaries) was copied into the **system prompt**. A booby-trapped repository could give Claude orders. | High | The system prompt carries only the method. The tree reaches the model through `tree_get`, as data; long fields are clipped. | Fixed in v0.2 |
| D2 | **"Done" without proof.** A node became `done` when an agent finished: no external judge. | High | New status `review`. An agent finishing sets its node to `review`. `done` requires a `verification`; the tool downgrades otherwise. | Fixed in v0.2 |
| D3 | **Homonymous agents.** Agents were tracked by their `description`; two with the same text got confused. | Medium | Tracked by `tool_use_id`. | Fixed in v0.2 |
| D4 | **Git conflicts.** One JSON file rewritten whole; two sessions or branches conflict, last write wins. | Medium | Event log (Phase 2). | Fixed in v0.3 |
| D5 | **Prompt cache.** The system section changed with every tree edit, invalidating the cache each turn. | Medium | Fixed by D1: the system section is constant. | Fixed in v0.2 |
| D6 | **Free-text estimates** could not be summed or compared with reality. | Medium | Parsed estimates (`30min`, `2h`, `3d`, `1w`), real time measured between `exploring` and `done`, calibration factor. Three-point estimates remain for Phase 3. | Partly fixed |
| D7 | **The panel opened at every session**, task or not. | Low | Opens on the first `tree_set_goal`, when the tree already has nodes, or with `/ambiflex`. | Fixed in v0.2 |
| D8 | **The graph overflows on mobile**: no zoom, one column per level. | Low | The claude.ai page has pan, pinch zoom and barycentric ordering. The inline drawing still shows the full graph. | Partly fixed |
| D9 | **Location.** The plugin lives in the GitHub **profile** repository, unfit for an official submission; `.claude/settings.json` only enables it there. | Medium | Dedicated repository `ImadeBenToumAI/ambiflex`; user-scope install on every machine. | Open |
| D10 | **Incomplete tests**: nothing on agent hooks, merges from the panel, Git tab, or security (D1). | Medium | One test per fix above, written before the fix. | Fixed in v0.2 (17 tests) |

## 4. Execution plan

Estimates are in working days with Claude: optimistic / likely / pessimistic.

### Phase 1: fixes (n2, n3): 0.5 / 1 / 2 d. Done in v0.2
See the table above. Judge: `claude plugin validate` and `claude plugin test` green, including the injection test (a title containing "ignore all previous instructions" never appears in the system sections).

### Phase 2: event log (n4): 1 / 2 / 3 d. Done in v0.3 (log.jsonl, replay, union merge, migration); the multi-goal history view is left for Phase 3.
1. `.ambiflex/log.jsonl`: one line per event `{t, session, kind: goal|upsert|status|merge|decision|auto, payload}`. Append only. `.gitattributes` with `merge=union` so a Git merge never conflicts.
2. `tree.ts`: a pure `replay(events) → Tree`.
3. Migration: an old `tree.json` is converted into events.
4. Several goals: each `tree_set_goal` opens a new tree. A "History" view lists past trees with estimated and actual time.
5. **Judge:** a test merges two divergent logs (two sessions) and recovers both subtrees. A replay test: replaying the log gives exactly the current state.

### Phase 3: calibrated estimates (n5): 1 / 2 / 3 d. Done in v0.3 (three-point estimates, expected end date, calibration that ignores artefacts).
1. Three-point estimates, E = (o + 4p + pess) / 6.
2. Critical path on the graph (already computed) and an arrival date in the header ("expected end: Thursday ± 1 d").
3. Calibration: the median ratio actual / estimated over history (already computed) applied to new estimates by the method ("your estimates run ×1.6 optimistic").
4. **Judge:** tests on a known graph (critical path and E computed by hand). The calibration factor is recovered from a synthetic history.

### Phase 4: reasoning ↔ code (n6): 1 / 2 / 4 d. Done in v0.3 (worktree branch per agent node, commits and PR in the panel, Validate proposes the merge).
1. "Spawn agent" creates a branch `ambiflex/<id>-<title>` (or a worktree) and the agent works there.
2. The Git tab colours branches by node. A node shows its commits and its PR, through the GitHub tool or `gh` when available.
3. "Validate" on a node with a PR: Claude proposes the merge; it merges only with your confirmation.
4. **Judge:** a test with a temporary Git repository: branch creation, commit, the view links the node to the commit.

### Phase 5: tree search (n7): 2 / 3 / 5 d. Done in v0.3: a real run on demo/parse.js (3 agents, scores 3× / 4-7× / 7×, winner merged at 7.4×).
1. "Explore N tracks": the plugin spawns N subagents in parallel (`$.agent.spawn`), one per track, each in its branch.
2. Each track gets a score, measured by the judge the track declared (test, benchmark, metric).
3. The panel ranks the tracks. "Prune" abandons the weakest and records the reason. "Merge the best" brings the winner back.
4. Guard rail: a budget (agents, duration) is shown and confirmed before launch.
5. **Judge:** an end-to-end scenario on a small real problem, e.g. speeding up a slow function with 3 tracks. The winner's score is really better, measured by a benchmark.

### Phase 6: publication (n8): 0.5 / 1 / 2 d
1. Dedicated repository `ambiflex`, with its own `marketplace.json`, an MIT licence, an English README, screenshots of the panel on mobile and desktop.
2. User-scope install on every machine (one line). Clean the profile repository.
3. Submission file for the official plugin directory: description, security (no network, local data only), tests, limits. The API is in early access: check the criteria in force when submitting.
4. **Judge:** the install works from a fresh environment (empty container) with the README command.

**Total: 6 / 11 / 19 d.** The critical path is n2 → n4 → n6 → n8; Phase 5 can run in parallel with Phase 4.

## 5. What stays with you

- Validate each node in the panel: you are the final judge; the plugin never validates on its own.
- Phase 4: decide whether "Validate" merges the PR automatically or only proposes it. The plan defaults to proposing.
- Phase 6: decide whether the dedicated repository is public or private. An official submission requires public.

## 6. Running it

In a session: "Execute Phase 2 of `docs/ambiflex-plan.md`". One phase per session: each ends on a green judge and a PR. To run several phases without approval, once you have reviewed the plan: `/ambiflex auto`.
