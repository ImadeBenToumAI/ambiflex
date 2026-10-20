# Changelog

Each version reaches you when Claude Code updates the plugin: turn on auto-update (`/plugin` → **Marketplaces** → `ambiflex` → **Enable auto-update**) or run `claude plugin marketplace update ambiflex && claude plugin update ambiflex@ambiflex`, then restart the session.

## 0.5.0

- **Live activity on the page.** While Claude or a subagent works on a node, the node shows a pulsing halo and Claude Code's ✻ spinner. It also shows what the loop is doing right now: a verb while it thinks (*Pondering…*, *Nudging…*) or the tool call under way (`Bash: npm test`).
- **Subagent forks.** Each subagent appears as a fork under its node, with its own spinner and its branch. A "working N" counter sits in the header.
- **Panel.** The node's second line shows the same activity.
- **Push to the page.** The plugin pushes the activity to the page itself, at most every 2 seconds. Allow the `ArtifactData` tool once so the pushes run without a prompt.
- **What's new.** After an update, the panel says once per project what changed.
- Run `/ambiflex page` once to republish your page with the new version.

## 0.4.0

- **Interactive page for every project.** `/ambiflex page`, or the *Interactive page* button, publishes a private claude.ai page for the project. It shows the full-width tree, clickable nodes, the action sheet, and the List and Git tabs. Your taps reach Claude as comments.

## 0.3.3

- **Clickable nodes.** A clickable grid of nodes sits under the graph.
- **Themed graph.** The graph follows the light or dark theme.

## 0.3.2

- **Start times.** Nodes that skip *exploring* get a start time, so calibration counts them.
- **Turn counter.** Auto mode counts a turn when the hand-over starts it, not when the hand-over is queued.

## 0.3.1

- **Big trees stay readable.** Wide rows wrap and finished leaves fold into a chip.

## 0.3.0

- **Tree search.** Parallel explorers, one per competing track, are each scored by the judge the track declares. `tree_prune` keeps the best.
- **Branch per node.** A node given to an agent gets its own worktree branch.
- **Calibrated estimates.** Estimates take three-point values and give an expected end date.
- **Conflict-free history.** History is an append-only event log, so two sessions never conflict.

## 0.2.0

- **Auto mode.** Claude runs the plan without asking for approval.
- **ETA and cost.** The panel shows the end-to-end ETA and the cost of what is left.
