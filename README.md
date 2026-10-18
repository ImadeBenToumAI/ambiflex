# Ambiflex: an ambitious reasoning tree for Claude Code

Ambiflex turns Felix Rieseberg's **be-ambitious** method (Altitude, Depth, Range) into something you can **see and steer** while Claude Code works, and that can **run the plan on its own** once you have approved it.

- **Reasoning graph.** A root goal (the goal behind the goal), **Altitude / Depth / Range** tracks, and steps. Branches can converge (merge), like Git branches.
- **Live panel.** Top-down graph like a Git log (colour = track, dashed = proposed, ◆ = needs review, ✓ = validated, ⤵ = merged, red dot = agent running; branches descend and merge), progress in %, "you are here", **end-to-end ETA** on the critical path, an **expected end date** (8h days, or around the clock in auto mode, ± the spread of three-point estimates such as `1h/2h/4h`), and a calibration factor (actual / estimated, measured on real nodes only) that Claude applies to its next estimates.
- **Cost, before and during.** An estimated cost to finish (remaining effort × an hourly rate: assumed per model family until the session has measured its own, then measured), the amount spent on the plan and in the session (from Claude Code's own cost ledger), and the API usage windows (5-hour, 7-day) as percent used. Alerts at a configurable share of your budget or of a usage window; auto mode stops when the budget is spent.
- **Wake word.** Start any prompt, typed or dictated, with the wake word (default `ambiflex`): `ambiflex make the signup flow crash-free` applies the method to that task, `ambiflex auto` runs the reviewed plan without approval, `ambiflex stop`, `ambiflex status`. The plugin reads the prompt text, so voice works wherever the app offers dictation; it does not listen to audio itself.
- **Steer by touch.** Tap a node, then **Validate, Deeper, Wider, Higher, Spawn agent, Abandon, Merge into…**. Each action reaches Claude as a `[tree] …` instruction.
- **Nothing is "done" without proof.** A node marked done without a `verification` (the test, command or metric that proved it) is kept at *needs review*. Only you can set *validated*.
- **Auto mode.** `/ambiflex auto` (or the *Run on auto* button) executes the plan without asking for approval: after each turn, the plugin hands Claude the next open node whose parents are settled, until nothing is left, the turn budget is spent, you interrupt, or `/ambiflex stop`. It announces the end-to-end ETA when it starts and writes a report (estimate vs. actual per node) when it finishes.
- **Subagents on their own branch.** An agent spawned with `#n4` in its description is attached to node n4, shown live, and gets a branch `ambiflex/n4-<title>` in a worktree under `.ambiflex/worktrees/`; the node shows its commits and PR, and *Validate* proposes the merge (never merges on its own).
- **Tree search.** `tree_explore <node>` (or *Explore tracks* on a node) spawns one subagent per competing track, in parallel, each in its own branch, scored by the judge the track declares (a test, a benchmark, a metric); the scores land on the nodes as the agents report, *Prune weak* keeps the best and *Merge best* folds it in. The budget (agents × minutes) is shown before launch.
- **Git branches tab.** Branches, commits and merges, refreshed after every git command.
- **History without conflicts.** Every change is one line appended to `.ambiflex/log.jsonl` (merged by Git with `merge=union`, so two sessions never conflict); the tree is replayed from it, and `.ambiflex/tree.json` is kept as a readable snapshot.
- **Mobile.** The mobile app places no panel, so `/ambiflex` draws the tree inline in the transcript. For a persistent, touch-first view, Claude can publish an "Ambiflex" claude.ai page that mirrors the tree live and sends your taps back as comments.

Claude fills the tree through the tools `tree_set_goal`, `tree_upsert`, `tree_merge`, `tree_get`, `tree_auto`.

## Commands

| Command | Effect |
|---|---|
| `/ambiflex` | Open the panel (or draw the tree inline on mobile) |
| `/ambiflex auto [turns]` | Run the plan without approval; optional turn budget (default 40) |
| `/ambiflex stop` | Stop auto mode |
| `/ambiflex status` | Text report: progress, ETA, calibration, nodes |

## Settings

In `/config` (or `pluginConfigs.ambiflex` in settings): `wakeWord` (default `ambiflex`, empty disables), `budgetUsd` (0 = none), `alertPct` (80), `rateLimitAlertPct` (80), `hourlyRateUsd` (0 = measure from the session).

Cost figures come from Claude Code's own ledger (`$.session.usage().cost.usd`) and the rate-limit windows the API reports. On a subscription plan the dollar figure is the API-equivalent value, and the usage windows are the figures that matter.

## Install

In a Claude Code terminal session:

```
/plugin install ambiflex --marketplace ImadeBenToumAI/ambiflex
```

From a shell:

```
claude plugin install ambiflex --marketplace ImadeBenToumAI/ambiflex
```

In the desktop app: **+** next to the prompt box → **Plugins** → **Add marketplace** `ImadeBenToumAI/ambiflex` → **Add plugin** `ambiflex`.

To enable it for every session of a repository, add to that repository's `.claude/settings.json`: `"extraKnownMarketplaces": {"ambiflex": {"source": {"source": "github", "repo": "ImadeBenToumAI/ambiflex"}}}, "enabledPlugins": {"ambiflex@ambiflex": true}`.

> Status: Claude Code's "function hooks" plugin API is in early access and may change between releases.

## Safety notes

- The system prompt carries only the method. The tree's content reaches the model through `tree_get`, as data, with long fields clipped. A repository cannot inject instructions through `tree.json`.
- Auto mode submits prompts in your session under **your** permission mode. Set the permission mode you are comfortable with before starting it.
- Auto mode stops on any interrupted or errored turn.

## Develop

```
claude plugin validate .
claude plugin test .
```
