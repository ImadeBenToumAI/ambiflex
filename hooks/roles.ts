// Roles: who a node's work belongs to, in three layers (Gartner's view of where engineering roles are
// heading: Product Engineers, Forward-Deployed Engineers, an AI Platform Team), down to the craft.
// A project can rename or extend them in .ambiflex/roles.json; the page filters the tree by any layer.

export type Role = { id: string; label: string; globs?: string[]; children?: Role[] }

export const ROLES_FILE = '.ambiflex/roles.json'

export const DEFAULT_ROLES: Role[] = [
  { id: 'product', label: 'Product Engineer', children: [
    { id: 'engineering', label: 'Product Engineering', children: [
      { id: 'frontend', label: 'Front-end', globs: ['**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte', '**/*.css', '**/*.scss', '**/*.html', 'src/ui/**', 'web/**', 'frontend/**', 'app/**', 'pages/**', 'components/**'] },
      { id: 'backend', label: 'Back-end', globs: ['api/**', 'server/**', 'backend/**', 'src/api/**', 'src/server/**', '**/*.go', '**/*.rs', '**/*.java', '**/*.rb', '**/*.php', '**/*.cs'] },
      { id: 'mobile', label: 'Mobile', globs: ['ios/**', 'android/**', 'mobile/**', '**/*.swift', '**/*.kt', '**/*.dart'] },
      { id: 'data', label: 'API & data', globs: ['**/*.sql', 'migrations/**', 'db/**', 'schema/**', '**/*.proto', '**/*.graphql'] },
    ] },
    { id: 'experience', label: 'Experience Design', children: [
      { id: 'ux', label: 'UX', globs: ['design/**', '**/*.fig', '**/*.svg'] },
      { id: 'qa', label: 'QA', globs: ['test/**', 'tests/**', 'e2e/**', '**/*.test.*', '**/*.spec.*'] },
    ] },
  ] },
  { id: 'fde', label: 'Forward-Deployed Engineer', children: [
    { id: 'requirements', label: 'AI Requirements Analyst', children: [
      { id: 'analysis', label: 'Business analysis', globs: ['specs/**', 'requirements/**', 'docs/specs/**'] },
    ] },
    { id: 'field', label: 'Forward-Deployed Engineering', children: [
      { id: 'architecture', label: 'Architecture', globs: ['docs/adr/**', 'docs/architecture/**'] },
      { id: 'integration', label: 'Integration', globs: ['integrations/**', 'connectors/**', 'webhooks/**'] },
      { id: 'delivery', label: 'Delivery', globs: ['docs/**', '**/*.md', 'CHANGELOG*'] },
    ] },
  ] },
  { id: 'platform', label: 'AI Platform Team', children: [
    { id: 'agentops', label: 'AI Agent Ops', children: [
      { id: 'platform', label: 'Platform', globs: ['.claude/**', 'plugins/**', 'agents/**', 'skills/**'] },
      { id: 'sre', label: 'DevOps / SRE', globs: ['infra/**', 'terraform/**', 'k8s/**', 'deploy/**', '.github/**', '**/Dockerfile', '**/*.tf', '**/*.yml', '**/*.yaml'] },
    ] },
    { id: 'ai', label: 'AI Engineers', children: [
      { id: 'ml', label: 'ML', globs: ['models/**', 'training/**', '**/*.ipynb', 'ml/**'] },
      { id: 'datascience', label: 'Data Science', globs: ['notebooks/**', 'analysis/**', 'data/**'] },
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
      const globs = Array.isArray(o.globs) ? o.globs.filter((g): g is string => typeof g === 'string' && g.length > 0 && g.length < 120).slice(0, 40) : undefined
      const children = depth < 3 && Array.isArray(o.children) ? o.children.map(c => clean(c, depth + 1)).filter((c): c is Role => !!c) : undefined
      return { id: o.id, label, ...(globs?.length ? { globs } : {}), ...(children?.length ? { children } : {}) }
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

/** A node's role: the one set on it, else the one its scope or handoff files point to. */
export function roleOf(roles: Role[], node: { role?: string; scope?: string[]; handoff?: { files?: string[] } }): { path?: string; inferred: boolean } {
  const set = knownRole(roles, node.role)
  if (set) return { path: set, inferred: false }
  const path = inferRole(roles, [...(node.scope ?? []), ...(node.handoff?.files ?? [])])
  return { path, inferred: !!path }
}

/** "Product Engineer › Product Engineering › Back-end" for a path. */
export function roleLabel(roles: Role[], path: string | undefined): string {
  if (!path) return ''
  const labels = new Map(rolePaths(roles).map(p => [p.path, p.label]))
  const parts = path.split('/')
  return parts.map((_, i) => labels.get(parts.slice(0, i + 1).join('/')) ?? parts[i]).join(' › ')
}
