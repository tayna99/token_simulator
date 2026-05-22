import type { AgentSpec } from './agentSpec'

export interface BenchmarkCard {
  id: string
  tags: string[]
  title: string
  monthlyRuns: number
  evidenceId: string
}

export interface BenchmarkMatch {
  id: string
  agentId: string
  ratio: number
  title: string
  evidenceId: string
}

export const TEAM_COST_BENCHMARKS: BenchmarkCard[] = [
  { id: 'bench-founder-research', tags: ['founder', 'research'], title: 'Founder research cadence', monthlyRuns: 20, evidenceId: 'benchmark-v0' },
  { id: 'bench-engineering-loop', tags: ['engineering', 'mvp'], title: 'MVP engineering iteration cadence', monthlyRuns: 30, evidenceId: 'benchmark-v0' },
  { id: 'bench-cs-early', tags: ['cs', 'support'], title: 'Early support workload', monthlyRuns: 300, evidenceId: 'benchmark-v0' },
]

export function retrieveBenchmarkCards(tags: string[]): BenchmarkCard[] {
  const normalized = new Set(tags.map(tag => tag.toLowerCase()))
  return TEAM_COST_BENCHMARKS
    .filter(card => card.tags.some(tag => normalized.has(tag)))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function compareSpecToBenchmark(spec: AgentSpec, card: BenchmarkCard, monthlyRuns: number): BenchmarkMatch {
  return {
    id: `${card.id}-${spec.id}`,
    agentId: spec.id,
    ratio: card.monthlyRuns > 0 ? monthlyRuns / card.monthlyRuns : 0,
    title: card.title,
    evidenceId: card.evidenceId,
  }
}
