import { expect, test } from 'claude-code/testing'
import { PACKS, cleanSvg, emptyInfra, iconKeys, infraAlerts, kindOf, mergeInfra, parseInfra } from '../hooks/infra'

const T0 = '2026-10-24T10:00:00.000Z'

test('infra: provider types map to one kind, and each kind to an official icon of each pack', () => {
  expect(kindOf('cloud_run')).toBe('serverless')
  expect(kindOf('Lambda')).toBe('function')
  expect(kindOf('key-vault')).toBe('secrets')
  expect(kindOf('teapot')).toBe(undefined)
  for (const p of ['gcp', 'aws', 'azure'] as const) for (const path of Object.values(PACKS[p].icons)) expect(path.endsWith('.svg')).toBe(true)
  expect(PACKS.gcp.icons.queue).toBe('pubsub/pubsub.svg')
})

test('infra: merges by id, drops flows to removed resources, keeps only well-formed entries', () => {
  let m = mergeInfra(emptyInfra(), { resources: [{ id: 'a', provider: 'gcp', type: 'cloud_run', name: 'api' }, { id: 'b', provider: 'aws', type: 'lambda', name: 'cb' }] as never, flows: [{ from: 'a', to: 'b' }, { from: 'a', to: 'zz' }], risks: [{ id: 'k1', level: 'high', title: 'SSH open', why: 'port 22' }] }, T0)
  expect(m.resources.length).toBe(2)
  expect(m.flows.length).toBe(1)
  expect(iconKeys(m)).toEqual(['aws:function', 'aws:logo', 'gcp:logo', 'gcp:serverless'])
  m = mergeInfra(m, { resources: [{ id: 'a', ip: '10.0.0.2' }] as never }, T0)
  expect(m.resources.find(r => r.id === 'a')!.ip).toBe('10.0.0.2')
  expect(m.resources.find(r => r.id === 'a')!.name).toBe('api')
  m = mergeInfra(m, { remove: ['b'] }, T0)
  expect(m.resources.length).toBe(1)
  expect(m.flows.length).toBe(0)
  expect(parseInfra('not json').resources.length).toBe(0)
  expect(parseInfra(JSON.stringify({ resources: [{ id: 'x', provider: 'mars', type: 'vm' }, { nope: 1 }] })).resources[0]!.provider).toBe('external')
})

test('infra: high and medium risks become hub alerts, low ones do not', () => {
  const m = mergeInfra(emptyInfra(), { risks: [{ id: 'h', level: 'high', title: 'a', why: '' }, { id: 'm', level: 'medium', title: 'b', why: '' }, { id: 'l', level: 'low', title: 'c', why: '' }] }, T0)
  expect(infraAlerts(m).map(a => `${a.key}:${a.level}`)).toEqual(['infra:h:red', 'infra:m:amber'])
})

test('infra: an icon keeps only its drawing', () => {
  const s = cleanSvg('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>alert(1)</script><use href="https://evil/x.svg#a"/><use href="#ok"/><path d="M0 0"/></svg>')!
  expect(s.includes('script')).toBe(false)
  expect(s.includes('onload')).toBe(false)
  expect(s.includes('evil')).toBe(false)
  expect(s.includes('href="#ok"')).toBe(true)
  expect(cleanSvg('<html></html>')).toBe(undefined)
})

test('infra: the providers\' own type names find their kind; each provider in the map asks for its logo', () => {
  expect(kindOf('Microsoft.Web/sites')).toBe('serverless')
  expect(kindOf('Microsoft.DocumentDB/databaseAccounts')).toBe('nosql')
  expect(kindOf('Microsoft.KeyVault/vaults')).toBe('secrets')
  expect(kindOf('Microsoft.EventHub/namespaces')).toBe('queue')
  expect(kindOf('AWS::Lambda::Function')).toBe('function')
  expect(kindOf('AWS::DynamoDB::Table')).toBe('nosql')
  expect(kindOf('run.googleapis.com/Service')).toBe('serverless')
  expect(kindOf('sqladmin.googleapis.com/Instance')).toBe('sql')
  expect(kindOf('compute.googleapis.com/Instance')).toBe('vm')
  const m = mergeInfra(emptyInfra(), { resources: [{ id: 'a', provider: 'azure', type: 'Microsoft.Web/sites', name: 'x' }, { id: 'b', provider: 'gcp', type: 'teapot', name: 'y' }] as never }, T0)
  expect(iconKeys(m)).toEqual(['azure:logo', 'azure:serverless', 'gcp:logo'])
})
