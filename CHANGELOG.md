# Changelog

Each version reaches you when Claude Code updates the plugin: turn on auto-update (`/plugin` → **Marketplaces** → `ambiflex` → **Enable auto-update**) or run `claude plugin marketplace update ambiflex && claude plugin update ambiflex@ambiflex`, then `/reload-plugins` in the session (no restart). From 0.6.8 on, `/ambiflex update` does the first part for you.

## 0.9.0

Fixes from a field report on a real research project (Tashelhit STT: 18 nodes, two GPU runs).

- **Writes are echoed and read back.** `tree_upsert` returns the node as stored and reads it back from disk. A field that did not land is an error, never a silent success.
- **Goals are guarded.** An existing goal is replaced only with `replace: true`.
- **Long jobs without a node are flagged.** When a long or billable job starts while no node is exploring, Ambiflex says so at that moment. This covers cloud GPU, docker, kubectl, training runs, `nohup` and background jobs.
- **Titles name the finding.** Titles can be up to 40 characters, and a `headline` field shows under the title.
- **Scores have a direction and a unit.** `direction` (lower is better for WER, loss, latency, cost) and `unit` are new; ranking and pruning follow the direction.
- **Blocked status.** `blocked` takes a required `blockedOn`. Blocked nodes are left out of the ETA and listed at the top of the page as questions for you.
- **Moved status.** `moved` takes a required `movedTo` and is left out of progress. `abandoned` now only means a track was wrong.
- **Replayable proofs.** `verifyCmd` stores a proof command, and `tree_verify` re-runs it through the Bash tool, under your permissions.
- **The page syncs itself.** The tree is pushed to the page after every change, and only to this project's page.
- Run `/ambiflex page` once to republish your page.

## 0.8.2

- **Version in use, everywhere.**
  - The page footer shows `Ambiflex v<version>`. It turns amber when the page is older than the plugin that feeds it, with the command that updates it.
  - The panel shows the version under its header.
  - `/ambiflex status` starts with it.

## 0.8.1

- **Monochrome identity.** The branching symbol, in black and white only, replaces the coloured mark in the page header. It is never tinted: graph colours stay for meaning. The app icon is now the plugin's icon, and the logo heads the README.

## 0.8.0

- **Ordered steps.** Children that must run in order carry a step number (1, 2, 3). The graph shows them in that order, with an arrow to the next step, and auto mode never starts a step before the earlier ones are finished.
- **Importance.** Each node can carry a weight from 1 (minor) to 5 (critical), independent of its time estimate. It shows as bars on the node, and critical nodes are outlined in red. Progress is weighted by importance, and *Critical only* filters the page.
- **Iterations towards an acceptance criterion.** A node can declare a measurable target. Each attempt is recorded with the new `tree_iterate` tool (result, value, passed).
  - The node shows ↻n.
  - Its sheet shows the criterion, the history and a small chart of the values.
  - The node is done only when an attempt passes.
- Run `/ambiflex page` once to republish your page.

## 0.7.0

- **Fix: workspace folders are refused.** A session opened on a folder that holds several projects (not a Git repository, with two or more inside) is warned and keeps no tree there. Before, it used whatever tree sat there, written by another project. A toast and Claude both tell you to open the session in the project's own folder, and nothing is written or published from such a folder.
- **Chosen sub-folder named.** When a session opened above several projects uses the only sub-folder that has a tree, it says which one.

## 0.6.9

- **Fix: each page belongs to its project.** `.ambiflex/artifact.json` now records the project with the page URL. A page recorded for another project, for example while sessions were mixed before 0.6.7, is never reused or updated: `/ambiflex page` publishes a new page for this project.
- **Older records are checked first.** For a record written before this version, Claude compares the page's tree with this project's tree before republishing.
- **Project name in the header.** The page header shows the project's name.

## 0.6.8

- **`/ambiflex update`.** Updates the plugin from its marketplace (ambiflex or imade) without leaving the session. Then `/reload-plugins` loads the new version in the same session, with no restart.

## 0.6.7

- **Fix: sessions are isolated.** With several sessions open at once (several projects in the desktop app), one session could write its nodes into another project's tree and push its Git history and activity to another project's page. Each session now keeps its own project root, history and page state, and runs git in its own folder.
- After updating, run `/ambiflex page` in each project to resync its page.

## 0.6.6

- **Fix: tree found from a parent folder.** A session rooted above the repository now finds the project's tree. This happens when a cloud session holds several repositories side by side. Before, it started a second, empty tree in the parent folder.

## 0.6.5

- **Working now strip.** Under the progress bar, each running node gets a blinking chip with its id and title and what it is doing.
- **Fly to the node.** Tap a chip and the graph glides to that node at a readable zoom, opens its sheet and flashes the node. The strip stays visible in Present mode.
- Run `/ambiflex page` once to republish your page.

## 0.6.4

- **Legend.** A folding *Legend* on the page explains each sign. The bar colour is the track type (Goal, Altitude, Depth, Range, Step). The ring is the status (proposed, exploring, needs review, done, abandoned). The activity signs are the red dot, the spinner and the subagent pills. Only you can validate a node.
- Run `/ambiflex page` once to republish your page.

## 0.6.3

- **Second screen.** Once the page exists, the panel links to it (*Open the live page ↗*) and `/ambiflex page` prints its URL. Open it in its own browser window on another display.
- **Present mode.** *Present* (or the F key) shows only the tree and its live activity, full screen and scaled up for a large display. Esc or *Exit* leaves it.
- Run `/ambiflex page` once to republish your page.

## 0.6.2

- **Squash-merged branches stay connected.** In the Git graph, a branch merged by squash gets a "✓ merged in #N" pill and a dashed link to the commit on main that carries its work. Before, it showed as a line that stopped short.
- Run `/ambiflex page` once to republish your page.

## 0.6.1

- **Monochrome page.** The page drops its indigo accent. Buttons, the progress bar, the node selection and the main Git lane use the text colour. Colour is kept for meaning only: lens, status and branch lanes.
- **New mark.** The Ambiflex mark is a black or white square with the tree cut out.
- **Scrolling fixed.** The List and Git tabs scroll again, on mobile and desktop.
- Run `/ambiflex page` once to republish your page.

## 0.6.0

- **New look for the interactive page.** The page has a calm, dense product style: Inter, hairline borders, one indigo accent and the Ambiflex mark. Each node shows a status ring: dashed when proposed, half-filled when exploring, three quarters in review, a check when done.
- **Visual Git graph.** The Git tab draws the history as lanes. Main runs down the first lane, and each branch forks and merges back in its own colour. Refs appear as pills, and a branch serving a tree node carries that node's chip. The plugin pushes the history to the page after each git command.
- Run `/ambiflex page` once to republish your page with the new version.

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
