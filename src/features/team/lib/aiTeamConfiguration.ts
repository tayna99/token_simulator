import type { UsageImportSummary } from '../../usage/lib/usageImport'
import type { AttributionResult } from '../../usage/lib/attribution'
import type { Decision } from '../../decision-log/lib/decisionLog'
import type { AgentAccountability } from '../../team-cost/lib/accountability'
import type { Deliverable } from '../../team-cost/lib/deliverables'

export interface CompanyProfile {
  companyType: string
  stage: string
  budgetLabel: string
  locale: 'en' | 'ko'
}

export interface AITeamAgent {
  id: string
  role: string
  modelId: string
  promptTemplate: string
  guardrails: string[]
  reviewGate: string
  assignedTasks: string[]
  expectedVolume: {
    label: string
    monthlyRuns: number
    avgDocumentsPerRun: number
  }
  costBudgetUsd: number
}

export interface AITeamConfiguration {
  companyProfile: CompanyProfile
  agents: AITeamAgent[]
  usage: UsageImportSummary | null
  attribution: Partial<Record<AttributionResult['axis'], AttributionResult>>
  decisionLog: Decision[]
  deliverables?: Deliverable[]
  agentAccountability?: AgentAccountability[]
  decisionApprovalLog?: Decision[]
  usagePerformanceLogs?: UsageImportSummary | null
  configSnapshotRef: string
}

export const DEFAULT_AI_TEAM_AGENTS: AITeamAgent[] = [
  {
    id: 'agent-research',
    role: 'Research Agent',
    modelId: 'claude-sonnet-4.6',
    promptTemplate: 'Synthesize market evidence into sourced research briefs.',
    guardrails: ['cite evidence ids', 'human approval before external claims'],
    reviewGate: 'Founder approval before external claims',
    assignedTasks: ['market scan', 'evidence synthesis'],
    expectedVolume: {
      label: '5 research briefs / week',
      monthlyRuns: 20,
      avgDocumentsPerRun: 6,
    },
    costBudgetUsd: 60,
  },
  {
    id: 'agent-reporting',
    role: 'CFO Reporter Agent',
    modelId: 'gemini-3.1-flash',
    promptTemplate: 'Convert deterministic tool outputs into finance-facing summaries.',
    guardrails: ['numbers must cite tool refs', 'risk cards required before recommendation'],
    reviewGate: 'CEO/CFO approval before sharing',
    assignedTasks: ['margin report', 'board summary'],
    expectedVolume: {
      label: '4 reports / month',
      monthlyRuns: 4,
      avgDocumentsPerRun: 2,
    },
    costBudgetUsd: 40,
  },
  {
    id: 'agent-ops',
    role: 'Ops Analyst Agent',
    modelId: 'claude-sonnet-4.6',
    promptTemplate: 'Inspect attribution, margin, and pricing scenario outputs.',
    guardrails: ['do not calculate numbers directly', 'attach risk cards to optimizations'],
    reviewGate: 'Human approval for pricing changes',
    assignedTasks: ['cost attribution', 'risk audit'],
    expectedVolume: {
      label: '300 workflow checks / month',
      monthlyRuns: 300,
      avgDocumentsPerRun: 1,
    },
    costBudgetUsd: 120,
  },
]
