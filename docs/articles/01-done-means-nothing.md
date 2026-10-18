# "Done" means nothing when an agent says it

*Draft 1. Imade Ben Toum. Drafted by Claude from the session log; to be edited and signed by me.*

Last week I asked Claude Code to fix a bug and it said "done" in forty seconds. It had changed the right file. It had not run the test. The test failed. Nothing about the word "done" had changed between the moment it was true and the moment it was not.

Felix Rieseberg's tutorial on being more ambitious with models has one line I keep coming back to: *don't let the model grade its own work*. He means it as advice about prompting. I took it as a rule to put in software, and this is what happened.

## The rule

In Ambiflex, the plugin I built to run his method inside Claude Code, every piece of work is a node in a tree. A node has a status. The statuses are the usual ones, with one change: **`done` cannot be set without a `verification`**, a field that names the test, command or metric that proved the result. If Claude calls `tree_upsert` with `status: done` and no verification, the plugin does not refuse; it saves the node as `needs review` and tells Claude why. The user is the only one who can move a node to `validated`.

That is the whole mechanism. Eleven lines of TypeScript and one test.

## What changed in practice

Three things, in the order I noticed them.

**Claude started running the judge before claiming the result.** Not because it was told to in a prompt, but because the only way to get a node marked done was to have something to put in the verification field. On the twelve nodes the plugin has run so far, every `done` carries a command or a test count. Two nodes stayed at `needs review` for a while because nothing could prove them yet; that was the right outcome, and it was visible.

**Agents stopped being trusted by default.** When a subagent finishes, the plugin moves its node to `needs review`, never to `done`. An agent finishing proves nothing. On the tree-search run (three agents, three ways to speed up a parser) each agent reported a score, and I ran the benchmark myself on their branches before merging the winner: 3.15 / 6.66 / 7.3 reported, 2.95 / 4.41 / 7.24 measured. Same ranking, different numbers. The gap is container noise, but the point is that I had a number of my own.

**"Needs review" became the interesting status.** On the panel it is a diamond. It is the queue of things an agent believes are finished and nobody has checked. When that queue is empty, the plan is actually done. When it is long, the agents are moving faster than the proof, and that is the moment to slow down.

## The number that surprised me

Once nodes carried real start and end times, the plugin could compute a calibration factor: actual time over estimated time, median over finished nodes. My estimates were written in human days. Claude finished a "2-day" node in about ten minutes. Factor: 0.01. The first version of the calibration code threw that number away as an artefact. It was not an artefact. It was the measurement.

## What I would tell you to do

You do not need a plugin for this. You need one field and one habit: when the model says a thing is done, ask it what proved that, and write the answer down next to the thing. If there is no answer, the thing is not done. It is waiting for review, and now you know.

The plugin is at github.com/ImadeBenToumAI/ambiflex. The verification rule is in `hooks/tree.ts`, function `upsert`, with the test that checks it.
