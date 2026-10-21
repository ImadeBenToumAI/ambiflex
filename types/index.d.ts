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
  /** Step number among the children of the same first parent: 1, 2, 3… run in that order. */
  seq?: number
  /** Importance from 1 (minor) to 5 (critical), independent of the time estimate. Default 1. */
  weight?: number
  /** The acceptance criterion: what a measured result must reach for the node to be done. */
  acceptance?: string
  /** Each attempt at reaching the acceptance criterion, oldest first. */
  iterations?: Iteration[]
  startedAt?: string
  finishedAt?: string
  createdAt: string
  updatedAt: string
}

export type Iteration = { n: number; result: string; value?: number; passed: boolean; at: string }

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

/** What one running loop does right now: the main loop ("main") or a subagent, on the node it serves. */
export type LiveActivity = {
  node: string
  /** Who works: "Claude" for the main loop, the agent's description for a subagent. */
  who: string
  phase: 'starting' | 'thinking' | 'tool'
  /** The tool call under way ("Bash: npm test"), empty while the model thinks. */
  label: string
  branch?: string
  at: string
}

/** One commit for the page's Git graph: hash, parent hashes, refs ("HEAD -> main", "origin/x", "tag: v1"), subject, author, ISO date. */
export type GitCommit = { h: string; p: string[]; refs: string[]; s: string; a: string; t: string }

export type BranchInfo = { commits: string[]; pr?: string }

export type Tab = 'tree' | 'git'

declare module 'claude-code' {
  interface PluginState {
    ambiflex: {
      tree: Tree
      selected: string
      expanded: boolean
      tab: Tab
      /** Graph view: '' default for the tree's size, 'all' every node, 'compact' finished leaves folded. */
      view: '' | 'all' | 'compact'
      git: string
      agents: string[]
      branches: Record<string, BranchInfo>
      /** Keyed by agent id, or "main" for the main loop. */
      live: Record<string, LiveActivity>
    }
  }
}
