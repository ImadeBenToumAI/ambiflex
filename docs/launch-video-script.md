# Ambiflex launch film: narration script (English, 104 s)

Desktop, dark mode, 1920×1080, rendered with HyperFrames from `tools/launch-video/film`. One calm voice, no music. The narration below is the text `tools/launch-video/voice.py` synthesizes (Kokoro, voice `am_michael`, speed 0.95); the cue times are the ones in the composition.

| # | Time | On screen | Narration |
|---|---|---|---|
| 1 | 0:00–0:06 | Animated logo in 3D, wordmark, tagline. | "Ambiflex. An ambitious reasoning tree for Claude Code." |
| 2 | 0:06–0:13 | The whole tree, 19 nodes, 3D push-in. | "This is a plan Claude Code executed on its own. Nineteen nodes. One evening." |
| 3 | 0:13–0:25 | The top of the tree, three colour-coded labels. | "It follows Felix Rieseberg's method: altitude, depth, range. The goal behind the goal, what the best expert would do, which other disciplines would help." |
| 4 | 0:25–0:37 | Node n7 opens. The verification line is highlighted. | "A node is not done because the model says so. It needs a proof: the test, the command, the metric. Without one, it waits for review. Only I can validate." |
| 5 | 0:37–0:48 | Node n16 opens: three tracks, three scores. | "Here it ran a tree search: three agents, three ways to speed up a parser, each in its own branch, scored by the same benchmark." |
| 6 | 0:48–0:59 | Terminal: the benchmark on the merged code. SCORE 7.38 lands. | "The agents reported their scores. Then I ran the benchmark myself. Three hundred and thirty-four milliseconds, down to forty-four." |
| 7 | 0:59–1:12 | Header: cost line, ETA, expected end, calibration. | "Cost and time are on screen before and during, not after. Estimates are calibrated against real timings: this model finishes a two-day node in about ten minutes." |
| 8 | 1:12–1:25 | Terminal: the plugin's hand-over line, then the next node starts. | "In auto mode, after each turn, the plugin hands Claude the next open node. No approval needed, until it hits a budget, a turn limit, or a decision that is mine." |
| 9 | 1:25–1:34 | Node n11 opens; the cursor clicks Validate; toast "Sent to Claude". | "And I steer from anywhere. Validate, go deeper, go wider, prune. Each tap is an instruction Claude acts on." |
| 10 | 1:34–1:44 | Logo, install line, repository. | "Ambiflex. Open source, one line to install. Built in one evening, for fifty-seven dollars, by the plan it was running." |

## Subtitles

`assets/launch/ambiflex-film.srt` carries the on-screen subtitle lines at the cue times above; the film also draws them in the picture.

## Voice

Generated locally by `tools/launch-video/voice.py` with Kokoro (open-weights TTS, no API key). To use a studio voice instead, record the right-hand column line by line into `tools/launch-video/film/assets/voice/<key>.wav` (keys: intro, tree, method, proof, search, bench, cost, auto, steer, outro), adjust the `data-start`/`data-duration` of the matching `<audio>` elements in `tools/launch-video/film/index.html` if a line runs longer, and re-render.
