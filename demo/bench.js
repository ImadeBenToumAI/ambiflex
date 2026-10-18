// Judge for the tree search: prints SCORE = baseline ms / this implementation's ms (higher is better).
// Usage: node demo/bench.js [path/to/parse.js]
const { performance } = require('node:perf_hooks')
const path = require('node:path')
const impl = require(path.resolve(process.argv[2] || path.join(__dirname, 'parse.js')))
const BASELINE_MS = Number(process.env.BASELINE_MS || 0)
const header = 'id,name,email,age,city,score\n'
let text = header
for (let i = 0; i < 120000; i++) text += `${i},user${i},user${i}@example.com,${20 + (i % 50)},City${i % 100},${(i * 7) % 1000}\n`
const expected = 120000
// Correctness gate: wrong output scores 0.
const sample = impl.parse(text)
if (sample.length !== expected || sample[5].email !== 'user5@example.com' || sample[119999].city !== 'City99') { console.log('SCORE: 0 (incorrect output)'); process.exit(1) }
let best = Infinity
for (let r = 0; r < 5; r++) { const t0 = performance.now(); impl.parse(text); best = Math.min(best, performance.now() - t0) }
console.log(`ms: ${best.toFixed(1)}`)
if (BASELINE_MS) console.log(`SCORE: ${(BASELINE_MS / best).toFixed(2)}`)
