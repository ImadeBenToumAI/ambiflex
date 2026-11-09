import { expect, test } from 'claude-code/testing'
import { DEFAULT_ROLES, inferRole, knownRole, parseRoles, roleLabel, roleOf, rolePaths } from '../hooks/roles'

test('roles: three Gartner layers, inferred from a node\'s files, and a project can bring its own', () => {
  const paths = rolePaths(DEFAULT_ROLES)
  expect(paths.filter(p => p.depth === 1).map(p => p.path)).toEqual(['product', 'fde', 'platform'])
  expect(paths.some(p => p.path === 'product/engineering/backend' && p.depth === 3)).toBe(true)
  // A path is kept down to its deepest known layer; an unknown first layer is refused.
  expect(knownRole(DEFAULT_ROLES, 'product/engineering/nope')).toBe('product/engineering')
  expect(knownRole(DEFAULT_ROLES, 'sales')).toBeUndefined()
  // Inferred from the scope: front-end files, infra files.
  expect(inferRole(DEFAULT_ROLES, ['src/ui/**', 'src/ui/Button.tsx'])).toBe('product/engineering/frontend')
  expect(inferRole(DEFAULT_ROLES, ['infra/**'])).toBe('platform/agentops/sre')
  expect(inferRole(DEFAULT_ROLES, [])).toBeUndefined()
  // A role set on the node wins over its files.
  expect(roleOf(DEFAULT_ROLES, { role: 'fde/field/delivery', scope: ['src/ui/**'] })).toEqual({ path: 'fde/field/delivery', inferred: false })
  expect(roleOf(DEFAULT_ROLES, { scope: ['api/**'] })).toEqual({ path: 'product/engineering/backend', inferred: true })
  expect(roleLabel(DEFAULT_ROLES, 'product/engineering/backend')).toBe('Product Engineer › Product Engineering › Back-end')
  // A project file: valid entries kept, broken ones dropped, nothing valid falls back to the default.
  const own = parseRoles(JSON.stringify({ roles: [{ id: 'growth', label: 'Growth', children: [{ id: 'seo', label: 'SEO', globs: ['blog/**'] }, { id: 'BAD ID' }] }] }))
  expect(rolePaths(own).map(p => p.path)).toEqual(['growth', 'growth/seo'])
  expect(inferRole(own, ['blog/**'])).toBe('growth/seo')
  expect(parseRoles('not json')).toBe(DEFAULT_ROLES)
  expect(parseRoles('[]')).toBe(DEFAULT_ROLES)
})
