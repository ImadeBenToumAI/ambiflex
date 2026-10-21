import { expect, test } from 'claude-code/testing'

import { buildBrain, describe, elementOf } from '../hooks/brain'

test('brain: rings, edges only where a file names another element, proven nodes as memory, live links', () => {
  const doc = buildBrain({
    at: '2026-10-21T00:00:00Z',
    sources: [
      { id: 'core', ring: 'core', label: 'CLAUDE.md', path: 'CLAUDE.md', text: 'Use gitlab-ops for GitLab. Areas: see INFRA.' },
      { id: 'skill:gitlab-ops', ring: 'skills', label: 'gitlab-ops', path: '.claude/skills/gitlab-ops/SKILL.md', text: 'Clone over HTTPS. Lessons in learnings.' },
      { id: 'mem:os/areas/INFRA.md', ring: 'memory', label: 'INFRA', path: 'os/areas/INFRA.md', text: 'Internal GitLab: skill gitlab-ops.' },
      { id: 'routine:deploy.md', ring: 'routines', label: '/deploy', path: '.claude/commands/deploy.md', text: 'Run the build.' },
      { id: 'app:emulator', ring: 'applications', label: 'emulator', path: 'emulator/', text: '' },
    ],
    proven: [{ id: 'n3', title: 'HTTPS works to GitLab', verification: 'curl 302', at: '2026-10-20T00:00:00Z' }],
    links: [{ element: 'skill:gitlab-ops', node: 'n3', at: '2026-10-20T10:00:00Z', by: 'agent-1' }, { element: 'nowhere', node: 'n1', at: '2026-10-20T11:00:00Z' }],
  })
  expect(doc.counts).toEqual({ core: 1, skills: 1, memory: 2, routines: 1, applications: 1 })
  const has = (a: string, b: string) => doc.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  expect(has('core', 'skill:gitlab-ops')).toBe(true)
  expect(has('core', 'mem:os/areas/INFRA.md')).toBe(true)
  expect(has('mem:os/areas/INFRA.md', 'skill:gitlab-ops')).toBe(true)
  // CLAUDE.md loads every routine; nothing names the emulator folder, so it stands alone.
  expect(has('core', 'routine:deploy.md')).toBe(true)
  expect(doc.edges.some(e => e.includes('app:emulator'))).toBe(false)
  // The proven node is memory, linked to GitLab where its text names it… only through names: none here.
  expect(doc.nodes.find(n => n.id === 'learned:n3')?.ring).toBe('memory')
  expect(doc.nodes.find(n => n.id === 'skill:gitlab-ops')?.tree).toEqual(['n3'])
  expect(doc.recent).toEqual([{ id: 'skill:gitlab-ops', at: '2026-10-20T10:00:00Z', by: 'agent-1' }])
})

test('brain: a path finds its element; a description comes from frontmatter or the first line', () => {
  const src = [{ id: 'skill:a', path: '.claude/skills/a/SKILL.md' }, { id: 'app:web', path: 'web/' }, { id: 'core', path: 'CLAUDE.md' }]
  expect(elementOf('/repo/.claude/skills/a/learnings.md', src)).toBe('skill:a')
  expect(elementOf('/repo/web/src/index.ts', src)).toBe('app:web')
  expect(elementOf('/repo/CLAUDE.md', src)).toBe('core')
  expect(elementOf('/repo/other/x.ts', src)).toBeUndefined()
  expect(describe('---\nname: a\ndescription: "Does A"\n---\n# A')).toBe('Does A')
  expect(describe('# Infra\n\ntext')).toBe('Infra')
})
