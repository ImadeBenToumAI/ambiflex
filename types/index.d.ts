export type Lens = 'goal' | 'altitude' | 'depth' | 'range' | 'step'
export type Status = 'proposed' | 'exploring' | 'review' | 'done' | 'validated' | 'merged' | 'abandoned'

export type TreeNode = {
  id: string
  title: string
  lens: Lens
  status: Status
  parents: string[]
  summary?: string
  detail?: string
  /** Estimated effort, e.g. "30min", "2h", "3d", "1w". */
  estimate?: string
  /** External judge that confirmed the result (test, command, metric). Required for `done`. */
  verification?: string
  agent?: string
  branch?: string
  /** The external judge this track declares (a test, benchmark or metric) and the score it reported. */
  judge?: string
  score?: number
  startedAt?: string
  finishedAt?: string
  createdAt: string
  updatedAt: string
}

export type Auto = {
  on: boolean
  startedAt?: string
  turns: number
  maxTurns: number
}

export type Cost = {
  /** USD spent since auto mode (or the goal) started, from the session's own cost ledger. */
  spentUsd: number
  /** USD the whole session has cost so far. */
  sessionUsd: number
  /** USD per hour of work: measured from this session once it has run a few minutes, assumed before. */
  ratePerHour: number
  assumedRate: boolean
  /** Projected USD to finish what is left. */
  estimateUsd: number
  model: string
  /** The rate-limit windows the API last reported (five_hour, seven_day, …), as percent used. */
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
}

export type Tree = { version: 1; goal: string; nodes: TreeNode[]; auto: Auto; cost: Cost }

export type BranchInfo = { commits: string[]; pr?: string }

export type Tab = 'tree' | 'git'

declare module 'claude-code' {
  interface PluginState {
    ambiflex: {
      tree: Tree
      selected: string
      expanded: boolean
      tab: Tab
      git: string
      agents: string[]
      branches: Record<string, BranchInfo>
    }
  }
}
