// The Archi tab's infrastructure map: the resources of a project on GCP, AWS and Azure, the flows between them,
// and the risks found. Claude fills .ambiflex/infra.json with tree_infra (from read-only gcloud, aws and az scans);
// the page draws it with the providers' official icons, which the plugin downloads from the providers themselves at
// run time (never bundled in a repository) and embeds only for the types the map uses.
import type { Alert } from './hub'

export const INFRA_FILE = '.ambiflex/infra.json'
export const PROVIDERS = ['gcp', 'aws', 'azure'] as const
export type Provider = (typeof PROVIDERS)[number]

export type Resource = {
  id: string
  provider: Provider | 'client' | 'external'
  /** A canonical type (KINDS) or the provider's own (e.g. "cloud_run"); unknown types get a generic glyph. */
  type: string
  name: string
  region?: string
  /** The network it sits in (VPC, VNet) and its subnet. */
  network?: string
  subnet?: string
  cidr?: string
  ip?: string
  /** Reachable from the internet. */
  public?: boolean
  /** The tree node this resource serves. */
  node?: string
  /** The provider's id (project, account, subscription path): masked on the page until Unmask. */
  ref?: string
}
export type Flow = { from: string; to: string; proto?: string; port?: number | string; label?: string; encrypted?: boolean }
export type Risk = { id?: string; resource?: string; level: 'high' | 'medium' | 'low'; title: string; why: string; fix?: string }
export type Infra = { at: string; scope?: string; resources: Resource[]; flows: Flow[]; risks: Risk[]; iam?: { who: string; role: string; on?: string }[]; secrets?: { name: string; where: string; rotated?: string }[] }

export const emptyInfra = (): Infra => ({ at: '', resources: [], flows: [], risks: [] })

/** Canonical kinds, each with the provider types that map to it. */
export const KINDS: Record<string, string[]> = {
  vm: ['compute_engine', 'gce', 'ec2', 'virtual_machine', 'vm'],
  serverless: ['cloud_run', 'app_runner', 'container_apps', 'app_service', 'fargate', 'ecs'],
  function: ['cloud_functions', 'lambda', 'function_app', 'function'],
  kubernetes: ['gke', 'eks', 'aks', 'kubernetes'],
  sql: ['cloud_sql', 'rds', 'aurora', 'sql_database', 'postgres', 'mysql', 'sql'],
  nosql: ['firestore', 'dynamodb', 'cosmos_db', 'nosql'],
  cache: ['memorystore', 'elasticache', 'redis', 'cache'],
  storage: ['cloud_storage', 'gcs', 's3', 'storage_account', 'blob', 'storage'],
  queue: ['pubsub', 'sqs', 'sns', 'eventbridge', 'service_bus', 'event_hubs', 'eventarc', 'queue'],
  lb: ['cloud_load_balancing', 'elb', 'alb', 'nlb', 'load_balancer', 'application_gateway', 'lb'],
  api: ['api_gateway', 'apigee', 'api_management', 'api'],
  cdn: ['cloud_cdn', 'cloudfront', 'front_door', 'cdn'],
  dns: ['cloud_dns', 'route53', 'dns_zone', 'dns'],
  firewall: ['cloud_armor', 'cloud_firewall', 'waf', 'azure_firewall', 'firewall'],
  nat: ['cloud_nat', 'nat_gateway', 'nat'],
  secrets: ['secret_manager', 'secrets_manager', 'key_vault', 'kms', 'secrets'],
  network: ['vpc', 'vnet', 'virtual_network', 'network'],
  warehouse: ['bigquery', 'redshift', 'synapse', 'warehouse'],
  iam: ['iam', 'entra', 'managed_identity'],
  scheduler: ['cloud_scheduler', 'scheduler'],
  registry: ['artifact_registry', 'ecr', 'container_registry', 'registry'],
}
export function kindOf(type: string): string | undefined {
  const t = type.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  if (KINDS[t]) return t
  const exact = Object.keys(KINDS).find(k => KINDS[k]!.includes(t))
  if (exact) return exact
  // The providers' own type names, as their CLIs print them: Microsoft.Web/sites, AWS::Lambda::Function, run.googleapis.com/Service.
  return MATCH.find(([re]) => re.test(t))?.[1]
}
const MATCH: [RegExp, string][] = [
  [/function|lambda/, 'function'],
  [/managedclusters|kubernetes|(^|_)(gke|eks|aks)(_|$)|container_googleapis/, 'kubernetes'],
  [/cloud_?run|run_googleapis|app_?runner|container_?apps?|web_sites|app_?service|fargate|(^|_)ecs(_|$)|app_?engine/, 'serverless'],
  [/firestore|dynamo|cosmos|documentdb|datastore/, 'nosql'],
  [/redis|memorystore|elasticache|(^|_)cache/, 'cache'],
  [/(^|_)sql|sqladmin|(^|_)rds(_|$)|aurora|postgres|mysql|mariadb/, 'sql'],
  [/pubsub|(^|_)sqs|(^|_)sns|eventbridge|servicebus|event_?hubs?|eventarc|eventgrid|queue|topic/, 'queue'],
  [/load_?balanc|elasticloadbalancing|(^|_)(elb|alb|nlb)(_|$)|forwarding_?rule|application_?gateway|backend_?service/, 'lb'],
  [/api_?gateway|apigateway|apigee|api_?management|apimanagement/, 'api'],
  [/(^|_)cdn|cloudfront|front_?door|frontdoor/, 'cdn'],
  [/(^|_)dns|route_?53|dnszones/, 'dns'],
  [/armor|(^|_)waf|firewall|security_?group|securitygroup|(^|_)nsg|networksecuritygroups/, 'firewall'],
  [/(^|_)nat(_|$)|nat_?gateway|natgateway|cloud_?nat/, 'nat'],
  [/secret|key_?vault|keyvault|(^|_)kms/, 'secrets'],
  [/bigquery|redshift|synapse|warehouse/, 'warehouse'],
  [/storage|(^|_)s3(_|$)|bucket|(^|_)blob|(^|_)gcs(_|$)/, 'storage'],
  [/(^|_)vpc|vnet|virtual_?networks?|virtualnetworks|(^|_)network|subnet/, 'network'],
  [/scheduler|(^|_)cron/, 'scheduler'],
  [/registry|(^|_)ecr(_|$)|artifact/, 'registry'],
  [/(^|_)iam|identity|entra|service_?account|managed_?identit/, 'iam'],
  [/compute|instance|(^|_)ec2|virtual_?machines?|virtualmachines|(^|_)vm(_|$)/, 'vm'],
]

/** The providers' own logos, for a zone's title and for a resource whose kind has no icon: from each pack, or Google's product logo. */
export const LOGOS: Record<Provider, { pack?: string; url?: string; mime: string }> = {
  gcp: { url: 'https://www.gstatic.com/images/branding/product/2x/google_cloud_48dp.png', mime: 'image/png' },
  aws: { pack: 'Architecture-Group-Icons_07312026/AWS-Cloud-logo_32.svg', mime: 'image/svg+xml' },
  azure: { pack: 'Azure_Public_Service_Icons/Icons/other/10018-icon-service-Azure-A.svg', mime: 'image/svg+xml' },
}

/** Where each provider publishes its official architecture icons, and the file of each kind inside the pack. */
export const PACKS: Record<Provider, { url: string; file: string; terms: string; icons: Record<string, string> }> = {
  gcp: {
    url: 'https://services.google.com/fh/files/misc/google-cloud-legacy-icons.zip', file: 'gcp-icons.zip',
    terms: 'https://cloud.google.com/icons',
    icons: Object.fromEntries(Object.entries({
      vm: 'compute_engine', serverless: 'cloud_run', function: 'cloud_functions', kubernetes: 'google_kubernetes_engine', sql: 'cloud_sql',
      nosql: 'firestore', cache: 'memorystore', storage: 'cloud_storage', queue: 'pubsub', lb: 'cloud_load_balancing', api: 'apigee_api_platform',
      cdn: 'cloud_cdn', dns: 'cloud_dns', firewall: 'cloud_armor', nat: 'cloud_nat', secrets: 'secret_manager', network: 'virtual_private_cloud',
      warehouse: 'bigquery', iam: 'identity_and_access_management', scheduler: 'cloud_scheduler', registry: 'artifact_registry',
    }).map(([k, v]) => [k, `${v}/${v}.svg`])),
  },
  aws: {
    url: 'https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip',
    file: 'aws-icons.zip', terms: 'https://aws.amazon.com/architecture/icons/',
    icons: Object.fromEntries(Object.entries({
      vm: 'Compute/48/Arch_Amazon-EC2', serverless: 'Compute/48/Arch_AWS-App-Runner', function: 'Compute/48/Arch_AWS-Lambda',
      kubernetes: 'Containers/48/Arch_Amazon-Elastic-Kubernetes-Service', sql: 'Databases/48/Arch_Amazon-RDS', nosql: 'Databases/48/Arch_Amazon-DynamoDB',
      cache: 'Databases/48/Arch_Amazon-ElastiCache', storage: 'Storage/48/Arch_Amazon-Simple-Storage-Service', queue: 'Application-Integration/48/Arch_Amazon-Simple-Queue-Service',
      lb: 'Networking-Content-Delivery/48/Arch_Elastic-Load-Balancing', api: 'Networking-Content-Delivery/48/Arch_Amazon-API-Gateway',
      cdn: 'Networking-Content-Delivery/48/Arch_Amazon-CloudFront', dns: 'Networking-Content-Delivery/48/Arch_Amazon-Route-53',
      firewall: 'Security-Identity/48/Arch_AWS-WAF', secrets: 'Security-Identity/48/Arch_AWS-Secrets-Manager',
      network: 'Networking-Content-Delivery/48/Arch_Amazon-Virtual-Private-Cloud', warehouse: 'Analytics/48/Arch_Amazon-Redshift',
      iam: 'Security-Identity/48/Arch_AWS-Identity-and-Access-Management', scheduler: 'Application-Integration/48/Arch_Amazon-EventBridge',
    }).map(([k, v]) => [k, `Architecture-Service-Icons_07312026/Arch_${v}_48.svg`])),
  },
  azure: {
    url: 'https://arch-center.azureedge.net/icons/Azure_Public_Service_Icons_V24.zip', file: 'azure-icons.zip',
    terms: 'https://learn.microsoft.com/azure/architecture/icons/',
    icons: Object.fromEntries(Object.entries({
      vm: 'compute/10021-icon-service-Virtual-Machine', serverless: 'app services/10035-icon-service-App-Services', function: 'compute/10029-icon-service-Function-Apps',
      kubernetes: 'compute/10023-icon-service-Kubernetes-Services', sql: 'databases/10130-icon-service-SQL-Database', nosql: 'databases/10121-icon-service-Azure-Cosmos-DB',
      cache: 'databases/10137-icon-service-Cache-Redis', storage: 'storage/10086-icon-service-Storage-Accounts', queue: 'integration/10836-icon-service-Azure-Service-Bus',
      lb: 'networking/10062-icon-service-Load-Balancers', api: 'devops/10042-icon-service-API-Management-Services', cdn: 'networking/10073-icon-service-Front-Door-and-CDN-Profiles',
      dns: 'networking/10064-icon-service-DNS-Zones', firewall: 'networking/10084-icon-service-Firewalls', nat: 'networking/10310-icon-service-NAT',
      secrets: 'security/10245-icon-service-Key-Vaults', network: 'networking/10061-icon-service-Virtual-Networks', warehouse: 'analytics/00606-icon-service-Azure-Synapse-Analytics',
      iam: 'identity/10227-icon-service-Managed-Identities',
    }).map(([k, v]) => [k, `Azure_Public_Service_Icons/Icons/${v}.svg`])),
  },
}

/** The icon keys ("aws:function") a map needs: one per provider and kind it uses. */
export function iconKeys(infra: Infra): string[] {
  const keys = new Set<string>()
  for (const r of infra.resources) {
    const k = kindOf(r.type)
    if (!(PROVIDERS as readonly string[]).includes(r.provider)) continue
    keys.add(`${r.provider}:logo`)
    if (k && PACKS[r.provider as Provider].icons[k]) keys.add(`${r.provider}:${k}`)
  }
  return [...keys].sort()
}

/** An SVG kept to drawing: no script, no event handler, no external reference. Undefined when it is not an SVG. */
export function cleanSvg(svg: string): string | undefined {
  const s = svg.replace(/^﻿/, '').replace(/<\?xml[^>]*>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim()
  if (!/^<svg[\s>]/i.test(s) || s.length > 60_000) return undefined
  return s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/(href\s*=\s*)("|')(?!#)[^"']*\2/gi, '$1$2#$2')
}

/** A map read from infra.json, with anything malformed dropped. */
export function parseInfra(raw: string): Infra {
  let j: Partial<Infra>
  try { j = JSON.parse(raw || '{}') } catch { return emptyInfra() }
  const str = (v: unknown, n = 200) => (typeof v === 'string' ? v.slice(0, n) : undefined)
  const resources = (Array.isArray(j.resources) ? j.resources : []).filter(r => r && typeof r.id === 'string' && typeof r.type === 'string').slice(0, 300)
    .map(r => {
      const p = ([...PROVIDERS, 'client', 'external'] as string[]).includes(r.provider) ? r.provider : 'external'
      const o: Resource = { id: r.id.slice(0, 80), provider: p as Resource['provider'], type: r.type.slice(0, 60), name: str(r.name) ?? r.id.slice(0, 80) }
      for (const k of ['region', 'network', 'subnet', 'cidr', 'ip', 'node', 'ref'] as const) { const v = str(r[k]); if (v) o[k] = v }
      if (r.public) o.public = true
      return o
    })
  const ids = new Set(resources.map(r => r.id))
  const flows = (Array.isArray(j.flows) ? j.flows : []).filter(f => f && ids.has(f.from) && ids.has(f.to)).slice(0, 500)
    .map(f => ({ from: f.from, to: f.to, ...(str(f.proto, 20) ? { proto: str(f.proto, 20) } : {}), ...(f.port !== undefined ? { port: String(f.port).slice(0, 20) } : {}), ...(str(f.label, 80) ? { label: str(f.label, 80) } : {}), ...(typeof f.encrypted === 'boolean' ? { encrypted: f.encrypted } : {}) }))
  const risks = (Array.isArray(j.risks) ? j.risks : []).filter(r => r && typeof r.title === 'string').slice(0, 200)
    .map((r, i) => ({ id: str(r.id, 40) ?? `r${i + 1}`, level: (['high', 'medium', 'low'].includes(r.level) ? r.level : 'medium') as Risk['level'], title: r.title.slice(0, 160), why: str(r.why, 600) ?? '', ...(str(r.resource, 80) ? { resource: str(r.resource, 80) } : {}), ...(str(r.fix, 600) ? { fix: str(r.fix, 600) } : {}) }))
  const iam = (Array.isArray(j.iam) ? j.iam : []).filter(a => a && typeof a.who === 'string' && typeof a.role === 'string').slice(0, 200).map(a => ({ who: a.who.slice(0, 160), role: a.role.slice(0, 120), ...(str(a.on) ? { on: str(a.on) } : {}) }))
  const secrets = (Array.isArray(j.secrets) ? j.secrets : []).filter(s => s && typeof s.name === 'string').slice(0, 200).map(s => ({ name: s.name.slice(0, 120), where: str(s.where) ?? '', ...(str(s.rotated, 40) ? { rotated: str(s.rotated, 40) } : {}) }))
  return { at: str(j.at, 40) ?? '', ...(str(j.scope) ? { scope: str(j.scope) } : {}), resources, flows, risks, ...(iam.length ? { iam } : {}), ...(secrets.length ? { secrets } : {}) }
}

/** Merges a tree_infra call into the map: resources and risks by id (remove: [ids] drops them), flows replaced when given. */
export function mergeInfra(base: Infra, patch: Partial<Infra> & { remove?: string[]; replace?: boolean }, now: string): Infra {
  if (patch.replace) return parseInfra(JSON.stringify({ ...patch, at: now }))
  const drop = new Set(patch.remove ?? [])
  const byId = new Map(base.resources.filter(r => !drop.has(r.id)).map(r => [r.id, r]))
  for (const r of patch.resources ?? []) byId.set(r.id, { ...(byId.get(r.id) ?? {}), ...r } as Resource)
  const risks = new Map(base.risks.filter(r => !drop.has(r.id ?? '')).map(r => [r.id ?? r.title, r]))
  for (const r of patch.risks ?? []) risks.set(r.id ?? r.title, r)
  return parseInfra(JSON.stringify({
    at: now, scope: patch.scope ?? base.scope, resources: [...byId.values()], flows: patch.flows ?? base.flows.filter(f => !drop.has(f.from) && !drop.has(f.to)),
    risks: [...risks.values()], iam: patch.iam ?? base.iam, secrets: patch.secrets ?? base.secrets,
  }))
}

/** High risks become hub alerts; medium ones amber. */
export function infraAlerts(infra: Infra): Alert[] {
  return infra.risks.filter(r => r.level !== 'low').map(r => ({
    key: `infra:${r.id}`, kind: 'infra' as const, title: `Infra: ${r.title}`.slice(0, 120), why: r.why.slice(0, 200), level: r.level === 'high' ? 'red' as const : 'amber' as const,
  }))
}

/** What tree_infra tells Claude to run: read-only listing commands, one block per provider. */
export const SCAN_HINT = [
  'Scan read-only, never create or change anything:',
  'GCP: gcloud run services list, gcloud functions list, gcloud compute instances list, gcloud sql instances list, gcloud compute networks list, gcloud compute networks subnets list, gcloud compute firewall-rules list, gcloud compute forwarding-rules list, gcloud pubsub topics list, gcloud secrets list, gcloud projects get-iam-policy <project> (each with --format=json).',
  'AWS: aws ec2 describe-instances, aws ec2 describe-vpcs, aws ec2 describe-subnets, aws ec2 describe-security-groups, aws lambda list-functions, aws rds describe-db-instances, aws s3api list-buckets, aws elbv2 describe-load-balancers, aws sqs list-queues, aws secretsmanager list-secrets.',
  'Azure: az resource list, az network vnet list, az network nsg list, az vm list -d, az webapp list, az functionapp list, az sql server list, az keyvault list.',
  'Then call tree_infra with resources (id, provider, type, name, region, network, subnet, cidr, ip, public, node), flows (from, to, proto, port, encrypted) and risks (level, title, why, fix, resource). Put the client (browser, mobile app) and third parties (payment provider, email…) as provider "client" / "external". Never put a secret value in the map.',
].join('\n')
