# Running three agents like a chess engine

*Draft 1. Imade Ben Toum. Drafted by Claude from the session log; every number below is in the repository. To be edited and signed by me.*

A chess engine does not ask one grandmaster for the best move. It explores several candidate lines at once, scores each with the same evaluation, cuts the weak ones early and spends its remaining time on the strong ones. Felix Rieseberg's tutorial lists "use an outside judge" and "challenge assumptions" among the ways to be more ambitious with a model. Put together, they are a search, and a search wants parallelism.

Here is one run, end to end, with the numbers.

## The problem

A deliberately naive CSV parser, 120,000 rows, 334 ms on the benchmark. Three plausible ways to make it faster, each a hypothesis I would normally test one after the other:

- **n17, no object spread**: stop copying the row object once per cell; keep the split-based parsing.
- **n18, single pass**: one walk over the text with `indexOf`, no `split`, no intermediate arrays.
- **n19, shaped rows**: build a row factory from the header so every row shares one hidden class; trim only when needed.

Each is a node in the tree, under a parent node that names the judge: `BASELINE_MS=334 node demo/bench.js <implementation>`, which prints `SCORE = 334 / ms` and prints 0 if the output is wrong.

## The launch

One call, `tree_explore n16`, with a budget echoed before anything starts: 3 agents × 15 minutes. The plugin gave each track its own git worktree on its own branch (`ambiflex/n17-track-no-object-spread`, and so on), spawned a subagent in each, and told every agent the same thing: do the work there, run the judge, end your report with `NODE`, `RESULT` and `SCORE`.

I did nothing for the next twenty minutes except read what came back.

## The reports

| Track | Agent's score | My own run of the judge | ms |
|---|---|---|---|
| n17, no object spread | 3.15 | 2.95 | 113 |
| n18, single pass | 6.66 | 4.41 | 76 |
| n19, shaped rows | 7.3 | 7.24 | 46 |

Two things to notice. The agents' numbers and mine differ (container noise; n18's agent saw 50-82 ms over six runs and reported its best). The ranking does not. That is what an outside judge buys you: not a precise number, but a comparison you can trust because you ran it yourself, on branches you did not write.

## Prune, merge

`tree_prune n16` kept n19 and marked n17 and n18 abandoned, writing the reason into each ("scored 3.15 against 7.3 for n19"). The reason stays in the tree; next month I will know why the single-pass idea was dropped, and that it was close.

Then the winner's branch was merged into the main checkout and the benchmark run once more there: **44 ms, 7.4× faster**. The two losing worktrees were removed; their branches remain.

## What this cost

About $8 of model time for the three agents, on top of a $35 evening. Fifteen minutes of wall clock for the exploration, versus the forty-five or so I would have spent trying the three ideas in sequence, with the usual temptation to stop after the first one that worked (which would have been the 3× one).

## What makes it work, and what does not

It works when the judge is **cheap, automatic and the same for every track**. A benchmark, a test suite, a metric from logs. The moment the judge is "ask the model whether it looks good", the search collapses back into opinion.

It works when the tracks are **genuinely different hypotheses**, not three phrasings of the same idea. The parent node is where that thinking happens, before any agent starts, and it is the part the method calls Range: which disciplines would attack this differently?

It does not work for creative or taste-driven work, and the tutorial says so about Altitude too. There is no benchmark for a headline.

And it needs a budget shown before launch. Three agents is cheap. Thirty is a bill. The plugin prints the budget and, in auto mode, stops on the dollar cap you set.

## Try it

The run above is reproducible: `demo/parse.js` and `demo/bench.js` are in github.com/ImadeBenToumAI/ImadeBenToumAI, and the tree that recorded the three scores is in `.ambiflex/log.jsonl`. Install the plugin, create three child nodes with a judge, and call `tree_explore` on the parent. Then run the judge yourself before you merge anything. That last step is the whole method.
