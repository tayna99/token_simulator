import type { UsageImportRow } from './usageImport'

export type RevenueBasis = 'none' | 'csv_columns' | 'sample_fixture' | 'manual_map'
export type AnalysisReadinessStatus = 'ready' | 'needs_mapping' | 'blocked'

export type AvailableAnalysisId =
  | 'token_request_totals'
  | 'total_ai_cogs'
  | 'feature_cost'
  | 'model_cost'
  | 'cost_source_coverage'
  | 'customer_cost'
  | 'plan_cost'
  | 'session_trace'
  | 'agent_run_cost'
  | 'plan_margin'
  | 'customer_profitability'
  | 'loss_customer'
  | 'heavy_user_margin'
  | 'pricing_recommendation'

export type MappingNeedId =
  | 'customer_id'
  | 'plan_id'
  | 'session_id'
  | 'agent_run_id'
  | 'revenue'

export type DeferredJudgmentId =
  | 'plan_margin'
  | 'customer_profitability'
  | 'loss_customer'
  | 'heavy_user_margin'
  | 'pricing_recommendation'
  | 'all_analysis'

export interface AnalysisCapability {
  id: AvailableAnalysisId
  label: string
}

export interface MappingNeed {
  id: MappingNeedId
  label: string
  requiredColumns: string[]
  unlocks: Array<DeferredJudgmentId | AvailableAnalysisId>
}

export interface DeferredJudgment {
  id: DeferredJudgmentId
  label: string
  reason: string
  requiredMappings: MappingNeedId[]
}

export interface AnalysisReadinessReport {
  status: AnalysisReadinessStatus
  revenueBasis: RevenueBasis
  availableAnalyses: AnalysisCapability[]
  mappingNeeds: MappingNeed[]
  deferredJudgments: DeferredJudgment[]
}

export interface BuildAnalysisReadinessInput {
  headers: string[]
  rows: UsageImportRow[]
  revenueBasis: RevenueBasis
  blocked: boolean
}

const BASE_ANALYSES: AnalysisCapability[] = [
  capability('token_request_totals', 'Token and request totals'),
  capability('total_ai_cogs', 'Total AI COGS'),
  capability('feature_cost', 'Feature cost'),
  capability('model_cost', 'Model cost'),
  capability('cost_source_coverage', 'Cost source coverage'),
]

function capability(id: AvailableAnalysisId, label: string): AnalysisCapability {
  return { id, label }
}

function hasHeader(headers: Set<string>, names: string[]): boolean {
  return names.some(name => headers.has(name))
}

function hasDimension(rows: UsageImportRow[], key: 'customerId' | 'planId' | 'sessionId' | 'agentRunId'): boolean {
  return rows.some(row => !!row[key])
}

function need(id: MappingNeedId, label: string, requiredColumns: string[], unlocks: MappingNeed['unlocks']): MappingNeed {
  return { id, label, requiredColumns, unlocks }
}

function deferred(id: DeferredJudgmentId, label: string, requiredMappings: MappingNeedId[]): DeferredJudgment {
  return {
    id,
    label,
    reason: 'Required mapping or revenue basis is missing.',
    requiredMappings,
  }
}

export function hasRevenueBasis(report: Pick<AnalysisReadinessReport, 'revenueBasis' | 'status'> | null | undefined): boolean {
  return !!report && report.status !== 'blocked' && report.revenueBasis !== 'none'
}

export function buildAnalysisReadinessReport(input: BuildAnalysisReadinessInput): AnalysisReadinessReport {
  if (input.blocked) {
    return {
      status: 'blocked',
      revenueBasis: input.revenueBasis,
      availableAnalyses: [],
      mappingNeeds: [],
      deferredJudgments: [deferred('all_analysis', 'All analysis', [])],
    }
  }

  const headers = new Set(input.headers)
  const hasCustomer = hasHeader(headers, ['customer_id', 'customerId', 'user_id', 'userId']) || hasDimension(input.rows, 'customerId')
  const hasPlan = hasHeader(headers, ['plan_id', 'planId', 'plan']) || hasDimension(input.rows, 'planId')
  const hasSession = hasHeader(headers, ['session_id', 'sessionId', 'conversation_id', 'conversationId']) || hasDimension(input.rows, 'sessionId')
  const hasAgentRun = hasHeader(headers, ['agent_run_id', 'agentRunId', 'run_id', 'runId']) || hasDimension(input.rows, 'agentRunId')
  const hasRevenue = input.revenueBasis !== 'none'

  const availableAnalyses = [...BASE_ANALYSES]
  const mappingNeeds: MappingNeed[] = []
  const deferredJudgments: DeferredJudgment[] = []

  if (hasCustomer) {
    availableAnalyses.push(capability('customer_cost', 'Customer cost'))
  } else {
    mappingNeeds.push(need('customer_id', 'Customer ID', ['customer_id'], ['customer_cost', 'customer_profitability', 'loss_customer', 'heavy_user_margin']))
  }

  if (hasPlan) {
    availableAnalyses.push(capability('plan_cost', 'Plan cost'))
  } else {
    mappingNeeds.push(need('plan_id', 'Plan ID', ['plan_id'], ['plan_cost', 'plan_margin']))
  }

  if (hasSession) {
    availableAnalyses.push(capability('session_trace', 'Session trace'))
  } else {
    mappingNeeds.push(need('session_id', 'Session ID', ['session_id'], ['session_trace']))
  }

  if (hasAgentRun) {
    availableAnalyses.push(capability('agent_run_cost', 'Agent-run cost'))
  } else {
    mappingNeeds.push(need('agent_run_id', 'Agent run ID', ['agent_run_id'], ['agent_run_cost']))
  }

  if (!hasRevenue) {
    mappingNeeds.push(need('revenue', 'Revenue or margin basis', ['revenue', 'subscription_plan_price'], [
      'plan_margin',
      'customer_profitability',
      'loss_customer',
      'heavy_user_margin',
      'pricing_recommendation',
    ]))
  }

  if (hasPlan && hasRevenue) {
    availableAnalyses.push(capability('plan_margin', 'Plan margin'))
  } else {
    deferredJudgments.push(deferred('plan_margin', 'Plan margin', [
      ...(hasPlan ? [] : ['plan_id' as const]),
      ...(hasRevenue ? [] : ['revenue' as const]),
    ]))
  }

  if (hasCustomer && hasRevenue) {
    availableAnalyses.push(
      capability('customer_profitability', 'Customer profitability'),
      capability('loss_customer', 'Loss customer'),
      capability('heavy_user_margin', 'Heavy-user margin'),
      capability('pricing_recommendation', 'Pricing recommendation'),
    )
  } else {
    const customerRevenueNeeds = [
      ...(hasCustomer ? [] : ['customer_id' as const]),
      ...(hasRevenue ? [] : ['revenue' as const]),
    ]
    deferredJudgments.push(
      deferred('customer_profitability', 'Customer profitability', customerRevenueNeeds),
      deferred('loss_customer', 'Loss customer', customerRevenueNeeds),
      deferred('heavy_user_margin', 'Heavy-user margin', customerRevenueNeeds),
      deferred('pricing_recommendation', 'Pricing recommendation', customerRevenueNeeds),
    )
  }

  return {
    status: mappingNeeds.length > 0 || deferredJudgments.length > 0 ? 'needs_mapping' : 'ready',
    revenueBasis: input.revenueBasis,
    availableAnalyses,
    mappingNeeds,
    deferredJudgments,
  }
}
