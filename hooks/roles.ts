// Roles: who a node's work belongs to, in three layers (Gartner's view of where engineering roles are
// heading: Product Engineers, Forward-Deployed Engineers, an AI Platform Team), down to the craft.
// A project can rename or extend them in .ambiflex/roles.json; the page filters the tree by any layer.

export type Role = { id: string; label: string; globs?: string[]; words?: string[]; children?: Role[] }

export const ROLES_FILE = '.ambiflex/roles.json'

export const DEFAULT_ROLES: Role[] = [
  { id: 'product', label: 'Product Engineer', children: [
    { id: 'engineering', label: 'Product Engineering', children: [
      { id: 'frontend', label: 'Front-end', words: ['ui', 'frontend', 'front-end', 'page', 'screen', 'button', 'react', 'css', 'design system', 'web app', 'dashboard', 'widget', 'form', 'landing'],  globs: ['**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte', '**/*.css', '**/*.scss', '**/*.html', 'src/ui/**', 'web/**', 'frontend/**', 'app/**', 'pages/**', 'components/**'] },
      { id: 'backend', label: 'Back-end', words: ['api', 'backend', 'back-end', 'endpoint', 'server', 'service', 'webhook', 'auth', 'payment', 'billing', 'queue', 'worker', 'microservice', 'rest', 'grpc'],  globs: ['api/**', 'server/**', 'backend/**', 'src/api/**', 'src/server/**', '**/*.go', '**/*.rs', '**/*.java', '**/*.rb', '**/*.php', '**/*.cs'] },
      { id: 'mobile', label: 'Mobile', words: ['mobile', 'ios', 'android', 'app store', 'flutter', 'react native', 'whatsapp'],  globs: ['ios/**', 'android/**', 'mobile/**', '**/*.swift', '**/*.kt', '**/*.dart'] },
      { id: 'data', label: 'API & data', words: ['database', 'schema', 'migration', 'sql', 'postgres', 'data model', 'etl', 'pipeline', 'import', 'export', 'kpi', 'analytics', 'report'],  globs: ['**/*.sql', 'migrations/**', 'db/**', 'schema/**', '**/*.proto', '**/*.graphql'] },
    ] },
    { id: 'experience', label: 'Experience Design', children: [
      { id: 'ux', label: 'UX', words: ['ux', 'user research', 'wireframe', 'mockup', 'prototype', 'usability', 'copy', 'onboarding'],  globs: ['design/**', '**/*.fig', '**/*.svg'] },
      { id: 'qa', label: 'QA', words: ['test', 'qa', 'e2e', 'regression', 'quality', 'bug', 'fixture', 'acceptance'],  globs: ['test/**', 'tests/**', 'e2e/**', '**/*.test.*', '**/*.spec.*'] },
    ] },
  ] },
  { id: 'fde', label: 'Forward-Deployed Engineer', children: [
    { id: 'requirements', label: 'AI Requirements Analyst', children: [
      { id: 'analysis', label: 'Business analysis', words: ['requirement', 'spec', 'user story', 'business', 'roi', 'pricing', 'price', 'gtm', 'icp', 'market', 'prospect', 'client', 'customer', 'loi', 'contract', 'legal', 'dpa', 'consent', 'compliance', 'strategy'],  globs: ['specs/**', 'requirements/**', 'docs/specs/**'] },
    ] },
    { id: 'field', label: 'Forward-Deployed Engineering', children: [
      { id: 'architecture', label: 'Architecture', words: ['architecture', 'adr', 'design doc', 'core', 'platform design', 'multi-tenant', 'tenant'],  globs: ['docs/adr/**', 'docs/architecture/**'] },
      { id: 'integration', label: 'Integration', words: ['integration', 'connector', 'sap', 'crm', 'erp', 'salesforce', 'partner', 'third-party', 'tapi', 'telecom', 'operator'],  globs: ['integrations/**', 'connectors/**', 'webhooks/**'] },
      { id: 'delivery', label: 'Delivery', words: ['demo', 'delivery', 'rollout', 'launch', 'go-live', 'training', 'docs', 'documentation', 'faq', 'support', 'onboard', 'pilot'],  globs: ['docs/**', '**/*.md', 'CHANGELOG*'] },
    ] },
  ] },
  { id: 'platform', label: 'AI Platform Team', children: [
    { id: 'agentops', label: 'AI Agent Ops', children: [
      { id: 'platform', label: 'Platform', words: ['agent', 'claude', 'plugin', 'skill', 'mcp', 'prompt', 'tooling', 'harness'],  globs: ['.claude/**', 'plugins/**', 'agents/**', 'skills/**'] },
      { id: 'sre', label: 'DevOps / SRE', words: ['deploy', 'ci', 'cd', 'infra', 'cloud', 'kubernetes', 'docker', 'terraform', 'monitoring', 'alert', 'hardening', 'security', 'backup', 'gcp', 'aws', 'azure', 'uptime', 'sla'],  globs: ['infra/**', 'terraform/**', 'k8s/**', 'deploy/**', '.github/**', '**/Dockerfile', '**/*.tf', '**/*.yml', '**/*.yaml'] },
    ] },
    { id: 'ai', label: 'AI Engineers', children: [
      { id: 'ml', label: 'ML', words: ['model', 'training', 'fine-tune', 'fine tuning', 'stt', 'tts', 'asr', 'llm', 'embedding', 'inference', 'voice', 'speech', 'nlp'],  globs: ['models/**', 'training/**', '**/*.ipynb', 'ml/**'] },
      { id: 'datascience', label: 'Data Science', words: ['analysis', 'experiment', 'a/b', 'metric', 'notebook', 'statistic', 'forecast', 'insight'],  globs: ['notebooks/**', 'analysis/**', 'data/**'] },
    ] },
  ] },
]

const ID = /^[a-z0-9][a-z0-9-]{0,31}$/

/** A roles file read back: invalid entries are dropped, and an empty or broken file falls back to the default. */
export function parseRoles(text: string | undefined): Role[] {
  if (!text) return DEFAULT_ROLES
  try {
    const clean = (r: unknown, depth: number): Role | undefined => {
      const o = r as Record<string, unknown>
      if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !ID.test(o.id)) return undefined
      const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim().slice(0, 40) : o.id
      const words = Array.isArray(o.words) ? o.words.filter((w): w is string => typeof w === 'string' && w.length > 1 && w.length < 40).map(w => w.toLowerCase()).slice(0, 60) : undefined
      const globs = Array.isArray(o.globs) ? o.globs.filter((g): g is string => typeof g === 'string' && g.length > 0 && g.length < 120).slice(0, 40) : undefined
      const children = depth < 3 && Array.isArray(o.children) ? o.children.map(c => clean(c, depth + 1)).filter((c): c is Role => !!c) : undefined
      return { id: o.id, label, ...(globs?.length ? { globs } : {}), ...(words?.length ? { words } : {}), ...(children?.length ? { children } : {}) }
    }
    const j = JSON.parse(text)
    const list = (Array.isArray(j) ? j : j?.roles) as unknown[]
    const roles = Array.isArray(list) ? list.map(r => clean(r, 1)).filter((r): r is Role => !!r) : []
    return roles.length ? roles : DEFAULT_ROLES
  } catch { return DEFAULT_ROLES }
}

/** Every role path ("product", "product/engineering", "product/engineering/frontend") with its label. */
export function rolePaths(roles: Role[]): { path: string; label: string; depth: number }[] {
  const out: { path: string; label: string; depth: number }[] = []
  const walk = (rs: Role[], prefix: string, depth: number) => {
    for (const r of rs) {
      const path = prefix ? `${prefix}/${r.id}` : r.id
      out.push({ path, label: r.label, depth })
      if (r.children) walk(r.children, path, depth + 1)
    }
  }
  walk(roles, '', 1)
  return out
}

/** A role path the taxonomy knows, cut at its deepest known layer; undefined when its first layer is unknown. */
export function knownRole(roles: Role[], path: string | undefined): string | undefined {
  if (!path) return undefined
  let level = roles, kept: string[] = []
  for (const id of path.split('/').map(s => s.trim()).filter(Boolean)) {
    const r = level.find(x => x.id === id)
    if (!r) break
    kept.push(id)
    level = r.children ?? []
  }
  return kept.length ? kept.join('/') : undefined
}

// Glob → regex, the same reading as a node's scope: ** spans folders, * stays in one.
const globRe = (g: string) => new RegExp('^' + g.replace(/^\.?\//, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0001/g, '(?:.*/)?') + '$')

/**
 * The role a set of paths points to: each path votes for the deepest role whose globs match it (a glob's
 * literal prefix stands for the files under it); the path with most votes wins, ties keep taxonomy order.
 */
export function inferRole(roles: Role[], paths: string[]): string | undefined {
  if (!paths.length) return undefined
  const leaves = rolePaths(roles).filter(p => p.depth >= 1)
  const byPath = new Map(leaves.map(p => [p.path, 0]))
  const globsOf = (path: string) => {
    let level = roles, r: Role | undefined
    for (const id of path.split('/')) { r = level.find(x => x.id === id); level = r?.children ?? [] }
    return r?.globs ?? []
  }
  for (const raw of paths) {
    const p = raw.replace(/^\.?\//, '')
    const sample = p.replace(/\*\*.*$/, 'x/x.x').replace(/\*/g, 'x')
    let best: string | undefined
    for (const leaf of leaves) if (globsOf(leaf.path).some(g => globRe(g).test(p) || globRe(g).test(sample))) { if (!best || leaf.depth > best.split('/').length) best = leaf.path }
    if (best) byPath.set(best, (byPath.get(best) ?? 0) + 1)
  }
  let win: string | undefined, n = 0
  for (const [path, v] of byPath) if (v > n) { win = path; n = v }
  return win
}

/** The role a node's words point to: each leaf scores the keywords (and its own label) found in the text. */
export function roleFromText(roles: Role[], text: string): string | undefined {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9/+&.-]+/g, ' ')} `
  let win: string | undefined, best = 0
  const walk = (rs: Role[], prefix: string) => {
    for (const r of rs) {
      const path = prefix ? `${prefix}/${r.id}` : r.id
      const words = [...(r.words ?? []), r.label.toLowerCase()]
      const score = words.reduce((n, w) => n + (t.includes(` ${w.replace(/[^a-z0-9/+&.-]+/g, ' ')} `) || t.includes(` ${w}s `) ? 1 : 0), 0)
      if (score > best) { best = score; win = path }
      if (r.children) walk(r.children, path)
    }
  }
  walk(roles, '')
  return win
}

type RoleNode = { id?: string; role?: string; scope?: string[]; handoff?: { files?: string[] }; title?: string; summary?: string; headline?: string; parents?: string[]; lens?: string }

/**
 * A node's role: the one set on it, else the one its files point to, else the one its title and summary point to,
 * else its nearest parent's. Every node but the goal ends with one, so the page can always tag and group it.
 */
export function roleOf(roles: Role[], node: RoleNode, byId?: Map<string, RoleNode>, seen = new Set<string>()): { path?: string; inferred: boolean } {
  const set = knownRole(roles, node.role)
  if (set) return { path: set, inferred: false }
  const files = inferRole(roles, [...(node.scope ?? []), ...(node.handoff?.files ?? [])])
  if (files) return { path: files, inferred: true }
  const words = roleFromText(roles, `${node.title ?? ''} ${node.headline ?? ''} ${node.summary ?? ''}`)
  if (words) return { path: words, inferred: true }
  if (byId && node.id) seen.add(node.id)
  for (const p of node.parents ?? []) {
    const parent = byId?.get(p)
    if (!parent || seen.has(p) || parent.lens === 'goal') continue
    const r = roleOf(roles, parent, byId, seen)
    if (r.path) return { path: r.path, inferred: true }
  }
  return { inferred: false }
}

/** "Product Engineer › Product Engineering › Back-end" for a path. */
export function roleLabel(roles: Role[], path: string | undefined): string {
  if (!path) return ''
  const labels = new Map(rolePaths(roles).map(p => [p.path, p.label]))
  const parts = path.split('/')
  return parts.map((_, i) => labels.get(parts.slice(0, i + 1).join('/')) ?? parts[i]).join(' › ')
}
