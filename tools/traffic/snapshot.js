// Reads the 14-day clones and views of this repository and merges them, per day, into docs/traffic.json.
// Usage: TRAFFIC_TOKEN=<token> node tools/traffic/snapshot.js [owner/repo]
const fs = require('node:fs')
const path = require('node:path')

const repo = process.argv[2] || process.env.GITHUB_REPOSITORY || 'ImadeBenToumAI/ambiflex'
const token = process.env.TRAFFIC_TOKEN
if (!token) { console.error('TRAFFIC_TOKEN is not set: create a fine-grained token on the repository with Administration: read-only.'); process.exit(1) }
const file = path.join(__dirname, '..', '..', 'docs', 'traffic.json')
const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { repo, days: {} }

async function get(kind) {
  const r = await fetch(`https://api.github.com/repos/${repo}/traffic/${kind}?per=day`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  })
  if (!r.ok) throw new Error(`${kind}: HTTP ${r.status} ${await r.text()}`)
  return r.json()
}

;(async () => {
  const [clones, views] = await Promise.all([get('clones'), get('views')])
  // The API reports each day's totals; later reads of the same day are authoritative (counts settle within 48 h).
  for (const d of clones.clones) { const day = d.timestamp.slice(0, 10); data.days[day] = { ...(data.days[day] ?? {}), clones: d.count, cloners: d.uniques } }
  for (const d of views.views) { const day = d.timestamp.slice(0, 10); data.days[day] = { ...(data.days[day] ?? {}), views: d.count, visitors: d.uniques } }
  data.repo = repo
  data.updatedAt = new Date().toISOString()
  const days = Object.values(data.days)
  data.totals = {
    clones: days.reduce((s, d) => s + (d.clones ?? 0), 0),
    views: days.reduce((s, d) => s + (d.views ?? 0), 0),
    days: days.length,
  }
  data.days = Object.fromEntries(Object.entries(data.days).sort(([a], [b]) => a.localeCompare(b)))
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n')
  console.log(`${repo}: ${data.totals.days} days recorded, ${data.totals.clones} clones, ${data.totals.views} views in total; last 14 days: ${clones.count} clones (${clones.uniques} unique), ${views.count} views (${views.uniques} unique)`)
})().catch(e => { console.error(e.message); process.exit(1) })
