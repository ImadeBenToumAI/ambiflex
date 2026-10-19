# Synthesizes the narration lines with Kokoro (local, open-weights TTS) into film/assets/voice/*.wav.
# Setup: pip install kokoro-onnx soundfile, then download kokoro-v1.0.onnx and voices-v1.0.bin from
# https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0) next to this script or pass --models <dir>.
# Usage: python3 voice.py [--models DIR] [--voice am_michael] [--speed 0.95]
import argparse, json, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

LINES = [
    ("intro", "Ambiflex. An ambitious reasoning tree for Claude Code."),
    ("tree", "This is a plan Claude Code executed on its own. Nineteen nodes. One evening."),
    ("method", "It follows Felix Rieseberg's method: altitude, depth, range. The goal behind the goal, what the best expert would do, which other disciplines would help."),
    ("proof", "A node is not done because the model says so. It needs a proof: the test, the command, the metric. Without one, it waits for review. Only I can validate."),
    ("search", "Here it ran a tree search: three agents, three ways to speed up a parser, each in its own branch, scored by the same benchmark."),
    ("bench", "The agents reported their scores. Then I ran the benchmark myself. Three hundred and thirty-four milliseconds, down to forty-four."),
    ("cost", "Cost and time are on screen before and during, not after. Estimates are calibrated against real timings: this model finishes a two-day node in about ten minutes."),
    ("auto", "In auto mode, after each turn, the plugin hands Claude the next open node. No approval needed, until it hits a budget, a turn limit, or a decision that is mine."),
    ("steer", "And I steer from anywhere. Validate, go deeper, go wider, prune. Each tap is an instruction Claude acts on."),
    ("outro", "Ambiflex. Open source, one line to install. Built in one evening, for fifty-seven dollars, by the plan it was running."),
]

ap = argparse.ArgumentParser()
ap.add_argument("--models", default=os.path.dirname(os.path.abspath(__file__)))
ap.add_argument("--voice", default="am_michael")
ap.add_argument("--speed", type=float, default=0.95)
a = ap.parse_args()
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "film", "assets", "voice")
os.makedirs(out, exist_ok=True)
k = Kokoro(os.path.join(a.models, "kokoro-v1.0.onnx"), os.path.join(a.models, "voices-v1.0.bin"))
durations = {}
for key, text in LINES:
    samples, rate = k.create(text, voice=a.voice, speed=a.speed, lang="en-us")
    sf.write(os.path.join(out, f"{key}.wav"), samples, rate)
    durations[key] = round(len(samples) / rate, 2)
    print(key, durations[key], "s", file=sys.stderr)
json.dump(durations, open(os.path.join(out, "durations.json"), "w"), indent=1)
