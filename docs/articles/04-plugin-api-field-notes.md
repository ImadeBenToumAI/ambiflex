# What I learned building a plugin on Claude Code's new function-hooks API

*Draft 1, written with the data of one evening. Imade Ben Toum. To be signed and published by me; Claude drafted it from the session log.*

Claude Code's plugin API (the "function hooks" surface, early access as of October 2026) lets a TypeScript module sit between the user, the model and the engine: it can rewrite a prompt, draw a pane, register tools the model calls, start subagents, and submit prompts of its own. I used it to build Ambiflex, a reasoning tree that runs Felix Rieseberg's *be-ambitious* method and executes a reviewed plan on its own. Here is what the API did well, what surprised me, and what I would tell the team. Every point below has a commit behind it.

## 1. The validator is the best part

`claude plugin validate` reads the module the way the engine will and refuses, before anything loads, what the engine would refuse at run time: a `$` passed to a function that is not declared at the top of the file, a state reference whose key is not a string literal, a gating hook without a `.catch`. The error messages name the compiled line and the rule. I rewrote three things because of it in the first ten minutes, and none of them would have been found by TypeScript. Ship this in CI by default.

## 2. `claude plugin test` is honest about what it does not mock

The test kit runs the plugin against the engine's own hook chain but lays no bottom under most nouns: `ui.toast`, `ui.open`, `fs.write`, `session.usage`, `process.run` all answer "no implementation" until the test registers a hook for them. That is the right design (nothing is silently faked), but a short list of the nouns a typical plugin touches, with a one-line bottom for each, would save every author the same half hour. Mine is twelve lines and I would gladly contribute it.

## 3. The surface model is right: mobile is honest

A pane is drawn on terminal and desktop; the mobile app reports `isFullscreen: false` and places no pane at all. The API says so in the types instead of silently dropping the pane, and `CommandOutput` lets the same tree draw inline in the transcript where a pane cannot exist. I did not expect to ship a mobile view the same evening.

## 4. A prompt a plugin submits is not a turn, everywhere

`$.prompt.submit` from a `turn.complete` hook is how a plugin keeps an autonomous loop going. On a terminal it starts the next turn. In the cloud session I was working in, the first seven submissions were queued and delivered later in one batch, and the wake-word rewrite in `prompt.submit` never saw the user's dictated text. The fix on my side was a fallback: detect, on `turn.start`, that a submitted hand-over did not start the turn, then carry it on the user's next turn and switch to a peer message. The ask: one documented guarantee per host about when a submitted prompt runs, or a result that says "queued" versus "started".

## 5. `cd` moves your plugin

`$.fs` paths are relative to the working directory, and the Bash tool's `cd` changes it. After one `cd plugins/ambiflex`, my plugin wrote its state under the plugin's own folder and the tree "forgot" every update. `$.session.root()` is the stable anchor; I would put that sentence in the first page of the `$.fs` docs.

## 6. Hot reload runs mid-turn, which is both great and surprising

Saving the module reloads it when the turn ends, *or sooner when a tool the plugin registered is about to run*. Great: I could fix a hook and see the fix on the next tool call. Surprising: `register` runs again, module variables reset, and `session.start` fires again, so anything the plugin counted in a variable is gone. Everything that matters went into `$.state` and an append-only log on disk, which is the design the docs recommend; I just learned why.

## 7. Agents from a hook: `$.agent.spawn` works, `prompt.submit` from a tool hook does not

A tool hook holds the turn, so `$.prompt.submit` inside it is refused ("it would wait on the turn this hook is holding"). `$.agent.spawn` from the same place works and runs in the background; the agent's report comes back as a `turn.complete` with an `agentId`. That asymmetry is logical once you see it, and the refusal message says exactly why. One wish: the test kit cannot start agents, so it strips `agentId` from a test bottom's answer; a documented way to stub a spawned agent's `turn.complete` would let the tree-search path be tested without matching on a `NODE:` line in the report.

## 8. What the API made possible in one evening

- A plan with 19 nodes executed in auto mode: after each turn the plugin hands the model the next open node whose parents are settled.
- Three subagents exploring three ways to speed up a parser in parallel, each in its own git worktree, scored by the same benchmark, pruned to the winner, merged: 334 ms to 44 ms, verified by a benchmark the agents did not run.
- Cost read from the session's own ledger (`$.session.usage().cost.usd`), alerts on a budget and on the 5-hour window, a calibration factor from real timings: the model finishes a "2-day" node in about ten minutes, which is a number worth having in front of you when you estimate.

## 9. What I would ask the team for

1. A `queued | started` result on `$.prompt.submit`, or a documented per-host behaviour.
2. A standard bottoms file for the test kit.
3. A way to stub a spawned agent's completion in tests.
4. `$.session.root()` in the first paragraph of the `$.fs` docs.
5. A pane on mobile, even read-only.

Everything else I expected to be hard was not. The API is early access and it already carries a real product.
