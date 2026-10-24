# Changelog

Each version reaches you when Claude Code updates the plugin: turn on auto-update (`/plugin` → **Marketplaces** → `ambiflex` → **Enable auto-update**) or run `claude plugin marketplace update ambiflex && claude plugin update ambiflex@ambiflex`, then `/reload-plugins` in the session (no restart). From 0.6.8 on, `/ambiflex update` does the first part for you.

## 0.23.1

- New sounds: a synth with a master compressor and room echo (FM bells, brass, plucks, low thumps), louder, in three families you tell apart by ear: alarms (low, rough, repeated), rewards (bells and brass, rising), ticks (short, soft).
- Sounds for events that had none: proof broken, Claude stopped (your turn), run silent, session lost, limit near, auto mode on and off, Take altitude proposals, agent reports, background task ends.
- The hub rings with the same alarm as the project page for each kind of alert.

## 0.23.0

- **Ambiflex Hub**: one page per account listing every project (progress, proof, ETA, cost, session state, nodes at work) with the alerts that need you (blocked nodes, failing proofs, silent runs, budget): a sound and a note for each new one, a Seen button, links to the project page on the node and to the session. Each session writes its project's card there; `/ambiflex hub [url]` publishes or records the hub, found afterwards from `~/.claude/ambiflex-hub.json`, the project's `.ambiflex/hub.json`, or the account's artifacts.
- Project pages: a Hub link with the alert count, a project switcher on the project name (`G H`, `G P`), a note when another project raises an alert, `#nX` deep links to a node; they stay quiet while the hub is open.

## 0.22.1

- Background tasks show live on their node: a shell run in the background or a Monitor is attached to the node its description cites (else the node in hand) and stays live on the page after the turn ends, until its task notification or TaskStop ends it.
- The page's session chip reads "N background tasks running" instead of "session idle" while they run.

## 0.22.0

- Auto mode runs independent nodes in parallel: each turn it hands over every node that can start now (up to the new `parallel` setting, default 3), one subagent per node, each in its own worktree branch. Nodes waiting on a parent or an earlier numbered step never start together; `parallel: 1` keeps one node per turn.
- `tree_auto` takes a `parallel` parameter.
- Panel: **Run in parallel** starts a proposed node in a background subagent while the current work goes on.

## 0.21.1

- **Routing can only save, and the panel says so honestly.** Routing no longer raises a node's effort on its own: altitude and goal nodes run on the top model at high effort, and only a failed attempt moves effort up.
- **Like-for-like comparison, retries included.** "Without routing" is now the same nodes on the top model at the same effort, and both sides are priced as expected cost over up to four attempts (a failure runs again one tier up with more effort), with assumed first-try failure rates shown in the panel next to the tree's own failed attempts.
- A saving reads "Saved, net of Ambiflex" in green; a loss reads "Extra cost, net of Ambiflex" in red, with the reason (for example, every node is already on the top model).
- `tools/ambiflex-split.py` now refuses to run while git worktrees sit in the root `.ambiflex`.

## 0.21.0

- **One project per session.** `/ambiflex project <folder>` attaches a session to its project folder: its tree, its page and its live activity then live there. The choice is kept per session in `~/.claude/ambiflex-sessions.json`, never in the repository. `/ambiflex project` alone says which folder the session uses; `/ambiflex project clear` detaches it.
- **Nothing at the root of a shared repository.** A session opened on a repository that holds several project trees is asked to attach to one, and writes nothing at the repository root until it does.
- **Split a tree that several sessions shared.** `tools/ambiflex-split.py` (Python, no dependency) shows which sessions wrote to a root `.ambiflex`, plans the split (a dry run), then with `--apply` backs it up to `~/.claude/ambiflex-backups/`, writes each project's tree and page record in its folder, attaches each session, and removes the root folder. Then, in each session: `/reload-plugins` and `/ambiflex page`, so each page is watched by its own session.

## 0.20.4

- **Node buttons say what happened.** After Validate, Deeper, Wider, Higher, Spawn agent, Abandon or Merge, the node's sheet follows the request: sent (or queued), then "Claude got it" as soon as the session starts working on it, then cleared with a "updated by Claude" note when the node changes. After two minutes without a sign, it explains that the page sends to the Claude session that watches it, suggests `/ambiflex page` in the session you work in, and offers the request to paste.

## 0.20.3

- **Text stays in its card.** A node's title and bottom line are cut to the width the font actually takes, with an ellipsis (the full text on hover), and the bottom line stops short of the importance bars. Cards are a little wider.
- **Criticality is violet, not red.** Critical nodes (importance 4-5) use violet for their bars and outline, so red only ever means blocked; lower importance bars are grey.

## 0.20.2

- **A node at work stands out.** In the tree, a node something works on is now a light card with dark ink, in either theme, with its blinking halo around it; the other cards stay as they were.

## 0.20.1

- **Weekly actives.** Beside the once-per-machine install count, Ambiflex now downloads that week's one-byte file (`install-ping/active-2026-W43.txt`, for example) once per machine per ISO week, at the first session of the week. Its download count is how many machines ran Ambiflex that week. Nothing else is sent; the same settings and variables turn it off (see Privacy in the README).
- **The experimental harness is removed.** A comparison on 3 coding tasks × 3 runs (Sonnet, hidden tests as the judge) found it cost 3.2× a plain run and 2.1× Felix's method, for the same results and less proof (67 % against 87 %). `/ambiflex method`, the plan gate and the page's approval band are gone; Felix's method is the only one, and a settings file that still names the harness is ignored.

## 0.20.0

- **An experimental harness method, beside Felix's.** `/ambiflex method ambitious|harness|both` picks the project's method; `ambitious` (Felix Rieseberg's altitude, depth, range) stays the default, unchanged. The harness is inspired by public guidance attributed to Andrej Karpathy; he did not write or endorse it.
- Under `harness` (or `both`: Felix for the tracks, the harness to run each node), the plugin enforces three rules:
  1. **Plan first, then pause.** No node starts until you approve the plan of the current goal: the page's **Approve plan** button or `/ambiflex approve`. A new goal needs a new approval.
  2. **Checks before work.** A node needs its acceptance criterion or its judge before it starts.
  3. **Three attempts, then stop.** The third failure blocks the node, with the reason, for your decision.
- The page shows the method in the header and, until you approve, a band with the plan's size and how many nodes still lack a check.

## 0.19.2

- **Particles flow down the tree.** On every arc into a node at work, bright particles run from the parent to the child; out of a finished parent, softer green ones run to its children. You see at a glance where the work is going. Off when your system asks for reduced motion.

## 0.19.1

- **Overhead calibrated on a real A/B run.** The same task ran 3 times without Ambiflex and 3 times with it (Sonnet). With the plugin loaded but the tree barely used, the difference was within the noise (+5 %, runs vary ±8 %). With a CLAUDE.md asking for the tree, Ambiflex added **+29 %** to the task's own cost. The estimate's middle value was too high and now uses the measured round-trip factor.
- **Shares, not dollars.** The overhead is shown as a share of the session on the page and in `/ambiflex doctor`.
- **Routing savings, net of Ambiflex.** Under Models, a new "Ambiflex itself" tile gives the plugin's cost in the same cost units as routing, and "Saved" is now net of it (the routing-only figure stays beside it).
- **Live event feed.** Every event that plays a sound also appears in a small scrolling column in the header's right corner, with its node and detail (the proof of a done node, an iteration's result, the agent that forked). It fills even with the sound off; a line opens its node.

## 0.19.0

- **What Ambiflex itself costs.** The page shows an "Ambiflex ≈ X %" chip, and `/ambiflex doctor` the same line: only the delta the plugin adds to the session's bill, never the task's own tokens.
  - **Fixed:** the method and the tree tools, re-read from cache on each request (sizes as Claude Code counts them where it can).
  - **Tree calls:** their arguments and results, which stay in context until a compaction, and the extra round trip a call may cost (the live context size is measured).
  - **Turns the plugin started** (page publish, `[tree]` actions, Take altitude): measured from the session's cost ledger.
- Auto-mode turns are your task's work and routing savings are shown under Models: neither is counted or subtracted here.
- Token counts are partly estimated and priced at public list prices, so the figure is a range (low–high) with a middle value. Subagents' requests are not counted yet.

## 0.18.1

- **Parallel sessions share one tree.** A session opened in a Git worktree now uses the tree and the page of the repository's main checkout (found with `git rev-parse --git-common-dir`), so work split across parallel sessions shows on the project's page instead of in an invisible tree of its own. The main checkout and its sub-folders keep their tree as before.
- Each write builds on the shared log on disk, so nodes that other sessions logged are kept.

## 0.18.0

- **Local page** (`/ambiflex local`, `/ambiflex local stop`): the plugin starts a small server on `127.0.0.1` and gives you a private link (`http://127.0.0.1:PORT/?k=KEY`). The page reads the session's tree, live activity, tasks and agents straight from disk every second, with no claude.ai publish and no ArtifactData permission. Install it as a browser app to keep it beside Claude.
- Buttons on the local page (Take altitude, Accept all, node actions) reach the session through `.ambiflex/actions.jsonl`; Claude picks them up within seconds while it works, or at the end of the turn.
- Every doc the plugin pushes to claude.ai is also written to `.ambiflex/docs/`, so the claude.ai page and the local page show the same data. The local files are git-ignored.

## 0.17.0

- **The page follows the session for real.**
  - A heartbeat: the page header says "session working · 9 s ago", "idle", or "no signal for 20 min" with what to do.
  - Each node shows its task list (Claude Code's tasks or todos): "1/3 · current task" in the working strip, the full list with who runs each on the node sheet.
  - Every subagent shows on a node: one that names no `#node` works for the node in hand.
- **Sync that does not give up.** A failed write to the page is retried every 2 minutes with its reason kept, instead of switching live activity off for the whole session; a reply that merely contained the word "error" no longer counts as a failure; pages recorded before 0.14 (no project in `artifact.json`) receive activity again.
- **`/ambiflex doctor`** says whether the page receives this session's activity, since when, and if not why. If it reports a refused permission, add `ArtifactData` to `permissions.allow` in `~/.claude/settings.json`.

## 0.16.4

- **Page clicks reach Claude.** The page asked once, at load, whether a Claude session was listening, before that session was known, and kept "no" for the whole visit; a second click within 3 s was queued silently, and nothing read the queue.
  - It now asks at each click and sends a double click once.
  - When no session listens it says **Not sent** where you clicked, with the reason and Copy; the review and altitude buttons no longer say "Sent" for a click that was not.
  - Queued clicks are no longer lost: the project's session finds them at the end of a turn and runs them.
- **Sane cost and end date.** `m` / `mo` mean months (minutes are `min`); calibration no longer counts nodes whose calendar time is more than 4× their estimate (waiting, not effort) and is capped at 2×.
- **A strategy review can close a node.** A proposal may set its status, with the verification.

## 0.16.3

- **The page says what a click is doing.** Accept / Refuse on a strategy review become "Sent to Claude…" and cannot be pressed twice; a toast says when the decision is applied, and after a minute without an answer the page asks whether the project's session is open, with Send again.
- **Take altitude shows the review is under way** ("Taking altitude…, a few minutes") until it lands on the page, and says so if no answer comes within 5 minutes.

## 0.16.2

- **`/ambiflex page` really publishes.** It used to leave its request in the command's context, which nothing reads until your next message: it said "Claude publishes it now" and the page did not change. The request now goes out as a prompt as soon as the command ends. Same fix for `/ambiflex altitude`.
- **Pages republish themselves after an update.** `artifact.json` records which version published the page; after an update, the project's own session republishes it once (option `autoRepublish`, on by default; off gives a reminder). The page never lags behind the plugin, and its buttons answer the project's session.

## 0.16.1

- **Model routing from the page.** A "Models: Off | Suggest | Auto" selector sets routing for the project (the new `tree_routing` tool does what `/ambiflex routing` does).
  - The ⓘ button explains each mode and estimates the work left without vs with routing: each open node's estimate × the list price of its model × an effort factor, against everything on the top model at high effort. An order of magnitude; the Usage tab has the measured cost.
- **Tools after a reload.** After `/reload-plugins`, the agent now sees the parameters of the new version (`run`, `verifyCmd`, `blocked`…): before, it kept the tool schemas of the version the session started with.

## 0.16.0

- **Proof next to progress.** The page shows two numbers: "done" (the work finished) and "proven" (what is actually shown toward the goal).
  - Each node counts by the strength of its proof: validated by you 100 %, criterion met with a replayable proof 90 %, verified in text 60 %, in review 30 %, otherwise 0; weighted by importance.
- **What blocks the goal.** A band lists the real blockers, ranked by the proof they hold back: nodes waiting on someone, critical nodes missing their criterion, proofs that no longer pass, silent runs, and Altitude tracks with no measurable criterion.
- **Take altitude.** `/ambiflex altitude`, the `tree_altitude` tool or the page button: the strongest model (Fable by default) reviews the whole plan (goal, nodes, results, attempts, proof, blockers) with the Altitude, Depth and Range method.
  - It returns a diagnosis and up to 12 proposals (new nodes with criteria, reordering, re-weighting, corrected criteria, tracks to drop), each with its reason and expected proof gain.
  - Nothing is applied by itself: you accept or refuse each proposal on the page or in the conversation.
  - The plugin suggests a review when proof stays flat for 8 turns while work goes on, or when a critical node misses its criterion twice.

## 0.15.0

- **Agent OS brain in 3D.** Three.js with a glow: each ring is a shell around CLAUDE.md, links are curves that bundle toward the centre, and light runs along the links of what was used this week.
  - Click an element: a panel shows its connections, the tree nodes it served, its last use, and Copy path, Copy open cmd and Fly to.
  - Light and dark themes; without WebGL the flat rings remain.
- **The brain is the project's own.** Your user-level `~/.claude` layer (shared by every project) joins only with the `brainUserLevel` option.
- **Growth as clear charts.** Observable Plot, one question per chart on one time axis: the brain ring by ring, skills and learnings, activity per day.
- **External runs.** A node can carry `run` (resource, rate per hour, state, heartbeat) for work in a VM, a container or a CI job.
  - The page shows it with elapsed time and cost, in red when it has been silent for 15 minutes; the plugin says so on the next shell command.
- **Safer writes.** Updating a node id the tree does not have writes nothing (no more "Untitled" nodes).
- **Honest updates.** `/ambiflex update` says which version is installed and which one the session runs; `/ambiflex page` never republishes over a newer live page.

## 0.14.0

- **Sounds on the page.** Eleven short motifs, synthesised in the browser (no audio files), mark what happens in the tree: new node, work starts, agent forks, criterion met or missed, your turn, blocked, node done, track closed, goal reached, week at risk.
  - Off by default: press **♪ Sound** to turn them on. The first load is silent, and when one update brings several events only the most important one plays.
  - The legend has a ▶ button for each sound.

## 0.13.3

- **`/ambiflex routing [off|suggest|auto] [model]`.** It sets model routing for the project from inside any session, remote ones included, where `/plugin configure` is not available.
  - The setting is kept in `.ambiflex/settings.json` and applies at once: the page shows each node's model right away.
  - Without arguments, it shows the current setting.
- **The goal and the Altitude tracks run on the strongest model at full effort** (Fable · max, within the top model). Depth and Range stay on Opus · high.

## 0.13.2

A tidier tree on the page.

- **Fewer crossings.** Rows are ordered by alternate sweeps, so links cross as little as possible, and children sit under their parents.
- **Drag a node to place it.** A drag on a node moves it; a drag on the background still pans. The position is kept across updates and reloads, in that browser and for that project. **Reset layout** forgets the positions.
- **Closed nodes hidden.** Abandoned, moved and superseded nodes are hidden by default; **Show closed (N)** brings them back.
- Run `/ambiflex page` once to republish your page.

## 0.13.1

- **`/ambiflex backfill`.** It fills the Usage, Agent OS and Growth views from the sessions this project already had on this machine. Claude Code keeps their transcripts in `~/.claude/projects/`.
  - **What it reads:** each session's cost, its models, its skill calls and changes, and the files of the brain it touched.
  - **Each session is read once,** and the running session is skipped. Run it again any time: it only reads new sessions.
  - **Its limit:** past sessions keep no usage-window readings, so their % of the week stays unknown.
  - **Requirement:** Python (`python3`, present on macOS).

## 0.13.0

**Agent OS: the brain of the project.** The Skills tab becomes Agent OS.

**The brain.** `CLAUDE.md` sits at the centre, with four rings around it:
- **Skills**, what the agent knows how to do.
- **Memory**, what it learned: `CLAUDE.md` files, `learnings.md`, memory notes, and tree nodes proven with a verification.
- **Routines**, what runs by itself: commands, hooks, `os/routines`.
- **Applications**, where it acts: project folders and MCP servers.

**How it works**
- Every link is something a file actually says: one file naming another element.
- When a skill is used or a file of an element is written, the element pulses and records the tree node it served. "Used for" leads back to the tree.
- Filter by ring, search, zoom with the wheel, drag to pan.
- The growth curve stays one click away in the **Growth** view.

Run `/ambiflex page` once to republish your page.

## 0.12.1

Savings.

- **A light model sorts each step.** With routing on, Haiku (low effort) classifies a new or edited step once as mechanical, standard or risky. Routing uses that instead of keywords alone; risky only ever moves a node up.
- **Compaction keeps the tree.** Past 70% of the context (the new **Compact at** setting; 0 turns it off), the conversation is compacted between turns. The summary keeps the goal, the open nodes, the proofs and the decisions, and drops logs and dead ends. A shorter context makes every request cheaper.
- **Status line.** It shows `auto 3/40 · 38% week left · n4 Parser · sonnet low`, always in view.

## 0.12.0

Model routing, so your week goes where it matters. New **Model routing** setting: `off` (the default), `suggest` or `auto`.

**How it routes**
- **The plan.** The goal and the tracks run on the strongest allowed model at full effort.
- **Each node.** It runs on the model and effort it needs:
  - tracks and important nodes → Opus, high;
  - standard steps → Sonnet, medium;
  - minor steps → Sonnet, low;
  - mechanical steps (rename, format, docs) → Haiku, low.

**Safeguards**
- A critical (importance 5) or risky node (security, auth, migration, production, data) never goes below the strong tier.
- A failed proof moves the next attempt up a tier and an effort level.
- A node with `model` / `effort` set keeps them (ask Claude to pin one).
- Nothing goes above the **Top model** setting, or your session's own model when it is empty.
- If a routed request is refused, it is sent again on the original model.

**On the page**
- Each node shows its route and why: "runs on" in auto, "needs" in suggest.
- The Usage tab adds the week by model.

Run `/ambiflex page` once to republish your page.

## 0.11.0

Usage monitor, in one unit: **% of your week**. A subscription is limited by a weekly window, plus a 5-hour burst limit, not by credits or dollars.

- **Top of the page.** It shows:
  - what is left of your week and when it resets;
  - a pace mark: where you would be at the pace that ends the week at exactly 100%;
  - where the week ends at the last 24 hours' pace, or when it runs out;
  - this project's share of the week;
  - what the rest of the plan needs;
  - the 5-hour burst limit.
- **Usage tab.** It lists every session on the project (start, minutes, % of the week, nodes) and the cost per node. API-dollar figures, compared with the new **Plan price** setting, stay in a closed detail.
- **How it is measured.** One reading per turn goes into `.ambiflex/usage.jsonl`, which is shared through git. The share of this project is how much the weekly window rose while its sessions ran.
- **Auto mode stops by itself** when the week would run out before it resets.
- Run `/ambiflex page` once to republish your page.

## 0.10.1

- **Anonymous install count.** At its first session on a machine, the plugin downloads one tiny file (one byte) from the `install-ping` GitHub release. GitHub keeps only the download total; nothing else is sent (no account, project or content).
- It is never sent in cloud sessions, or with `AMBIFLEX_NO_PING`, `DO_NOT_TRACK` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` set.
- To turn it off, use the new **Anonymous install count** setting. See "Privacy" in the README.

## 0.10.0

Agent OS release, built on the Toumaï Agent OS layout: `.claude/skills/<name>/` with `SKILL.md`, `learnings.md` (dated `## YYYY-MM-DD — title` entries) and `eval.json`.

- **Skills tab.** It shows KPIs (skills, learnings, eval cases, commits, uses, sessions) and a curve of cumulative skills and learnings since the first commit. It also lists each skill with its latest learnings, and gives a per-session breakdown.
- **Per-session tracking.** Each `Skill` call and each edit under `.claude/skills/` is recorded with its session and agent in `.ambiflex/skills.jsonl`, which is shared through git (`merge=union`).
- **Light / dark / auto theme switch** on the page, remembered per viewer.
- Run `/ambiflex page` once to republish your page.

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
