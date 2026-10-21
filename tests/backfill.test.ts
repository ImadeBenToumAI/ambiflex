import { expect, test } from 'claude-code/testing'

import { backfillLines, parseSummaries, transcriptDir } from '../hooks/backfill'

test('backfill: finds the transcript folder Claude Code uses for a project', () => {
  expect(transcriptDir('/Users/imade', '/Users/imade/Claude Coding/')).toBe('/Users/imade/.claude/projects/-Users-imade-Claude-Coding')
  expect(transcriptDir('/home/u/', '/home/u/my.repo')).toBe('/home/u/.claude/projects/-home-u-my-repo')
})

test('backfill: session summaries become usage readings, skill uses and changes, brain touches', () => {
  const out = [
    JSON.stringify({ s: '4433682f-2d64-5615-9b85-041821f8dcc0', start: '2026-10-18T23:31:00Z', end: '2026-10-21T19:18:00Z', usd: 266.97, models: { 'claude-opus-5-5': 10, 'claude-fable-5-1': 3 }, skills: [{ skill: 'gitlab-ops', t: '2026-10-19T10:00:00Z' }], edits: [{ file: '/Users/i/proj/.claude/skills/gitlab-ops/learnings.md', t: '2026-10-19T11:00:00Z' }, { file: '/Users/i/proj/src/a.ts', t: '2026-10-19T12:00:00Z' }], tools: 40 }),
    'garbage',
    JSON.stringify({ s: 'x', start: '', end: '' }),
  ].join('\n')
  const sessions = parseSummaries(out)
  expect(sessions.length).toBe(1)
  const lines = backfillLines(sessions, p => (p.includes('.claude/skills/gitlab-ops/') ? 'skill:gitlab-ops' : undefined))
  const usage = lines.usage.map(l => JSON.parse(l))
  expect(usage.map(u => [u.usd, u.m, u.backfill])).toEqual([[0, 'claude-opus-5-5', true], [266.97, 'claude-opus-5-5', true]])
  expect(usage.map(u => u.s)).toEqual(['f8dcc0', 'f8dcc0'])
  const skills = lines.skills.map(l => JSON.parse(l))
  expect(skills.map(x => [x.skill, x.kind])).toEqual([['gitlab-ops', 'use'], ['gitlab-ops', 'develop']])
  expect(skills[1].file).toBe('gitlab-ops/learnings.md')
  expect(lines.brain.map(l => JSON.parse(l).element)).toEqual(['skill:gitlab-ops', 'skill:gitlab-ops'])
})
