import { expect, test } from 'claude-code/testing'

import { buildSkills, countEvals, parseEvents, parseLearnings, parseSkillLog, parseSkillMd, skillOf } from '../hooks/skills'

{
  test('finds the skill a path belongs to', () => {
    expect(skillOf('/Users/x/Claude Coding/.claude/skills/gitlab-ops/SKILL.md')).toBe('gitlab-ops')
    expect(skillOf('.claude/skills/demo-ops/learnings.md')).toBe('demo-ops')
    expect(skillOf('src/skills/a.ts')).toBeUndefined()
  })

  test('reads frontmatter, dated learnings and evals', () => {
    expect(parseSkillMd('---\nname: gitlab-ops\ndescription: "Reach GitLab"\n---\n# x')).toEqual({ name: 'gitlab-ops', description: 'Reach GitLab' })
    expect(parseLearnings('# L\n## 2026-09-19 — a router said blocked\n\ntext\n## 2026-08-30 — green exit code\n')).toEqual([
      { date: '2026-08-30', title: 'green exit code' }, { date: '2026-09-19', title: 'a router said blocked' },
    ])
    expect(countEvals('[{"a":1},{"a":2}]')).toBe(2)
    expect(countEvals('{"evals":[1,2,3]}')).toBe(3)
    expect(countEvals('nope')).toBe(0)
  })

  test('builds the curve from git history, learnings and session events', () => {
    const log = parseSkillLog('\x1e2026-08-01T10:00:00+02:00\n\n.claude/skills/a/SKILL.md\n.claude/skills/a/x.md\n\x1e2026-08-05T10:00:00Z\n\n.claude/skills/b/SKILL.md\n.claude/skills/a/SKILL.md\n')
    expect(log).toEqual({ a: ['2026-08-01', '2026-08-05'], b: ['2026-08-05'] })
    const events = parseEvents('{"t":"2026-08-06T09:00:00Z","s":"s1","skill":"a","kind":"use"}\n{"t":"2026-08-06T09:05:00Z","s":"s2","agent":"ag","skill":"b","kind":"develop"}\nbad\n')
    const doc = buildSkills({ at: '2026-08-07T00:00:00Z', log, events, files: [{ name: 'a', learnings: '## 2026-08-03 — first lesson', files: [] }, { name: 'b', files: [] }] })
    expect(doc.timeline.map(p => [p.date, p.skills, p.learnings])).toEqual([['2026-08-01', 1, 0], ['2026-08-03', 1, 1], ['2026-08-05', 2, 1], ['2026-08-06', 2, 1]])
    const a = doc.skills.find(s => s.name === 'a')!
    expect([a.created, a.commits, a.uses, a.sessions]).toEqual(['2026-08-01', 2, 1, ['s1']])
    expect(doc.sessions.map(s => [s.s, s.uses, s.develops])).toEqual([['s2', 0, 1], ['s1', 1, 0]])
  })
}
