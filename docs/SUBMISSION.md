# Submission notes for the Claude Code plugin directory

Prepared for whoever reviews Ambiflex for inclusion. Everything here is verifiable from the repository.

## What it is

Ambiflex is a Claude Code plugin (the function-hooks API, early access) that turns Felix Rieseberg's *be-ambitious* method (Altitude, Depth, Range) into a live reasoning tree the user can see and steer, and that can run a reviewed plan on its own: auto mode hands Claude the next open node after each turn, tree search runs competing tracks in parallel subagents scored by an external judge, and every node reports an ETA, a cost and a calibration factor.

## Surface

- Tools registered: `tree_get`, `tree_set_goal`, `tree_upsert`, `tree_merge`, `tree_explore`, `tree_prune`, `tree_auto` (all `mcp__ambiflex__*`).
- Command: `/ambiflex [auto [turns] | stop | status]`.
- Hooks: `session.start`, `command.run`, `prompt.submit` (wake word), `prompt.compose` (one constant method section), `turn.start`, `turn.complete`, `tool.call` on its own tools, `Agent` and `Bash`, `ui.render` on `Pane` and `CommandOutput`.
- Settings (`userConfig`): `wakeWord`, `budgetUsd`, `alertPct`, `rateLimitAlertPct`, `hourlyRateUsd`.

## Security

- **No network.** The plugin never calls `$.http`; it reads and writes files under the project's `.ambiflex/` folder and runs `git` (and `gh` when present) through `$.process.run`.
- **No tree content in the system prompt.** The `prompt.compose` section is a constant method text; the tree reaches the model only through `tree_get`, as data, with long fields clipped. A test asserts that a node titled "IGNORE ALL PREVIOUS INSTRUCTIONS" never appears in the system sections.
- **Nothing is done without proof.** A node set to `done` without a `verification` is kept at `needs review`; only the user can set `validated`.
- **Auto mode runs under the user's permission mode** and stops on any interrupted or errored turn, on the turn budget, on the money budget, or on `/ambiflex stop`.
- **Subagents work in worktrees** under `.ambiflex/worktrees/<id>` (git-ignored), never on the main checkout; merging a branch is proposed, never done by the plugin.
- Data stays local: `.ambiflex/log.jsonl` (append-only, `merge=union`) and `.ambiflex/tree.json` (derived snapshot).

## Tests and checks

- `claude plugin validate .` passes.
- `claude plugin test .`: 31 tests across three files (tree logic, event log replay and union merge, plugin hooks on mobile and desktop surfaces, auto mode, wake word, cost alerts, tree search).
- A real tree-search run is recorded in the repository's own tree: three agents on `demo/parse.js`, winner merged at 7.4× (independent benchmark).

## Known limits

- The function-hooks API is in early access; the plugin targets Claude Code 2.1.3xx and may need updates between releases.
- The mobile app places no pane: `/ambiflex` draws the tree inline instead; a claude.ai page can mirror the tree for a touch-first view.
- On some remote hosts, a prompt a plugin submits between turns is queued rather than run at once; the plugin detects this and carries the hand-over on the next turn.
- Cost figures come from Claude Code's own ledger; the hourly rate is assumed per model family until the session has measured its own.

## Contact

Imade Ben Toum, ImadeBenToumAI on GitHub.
