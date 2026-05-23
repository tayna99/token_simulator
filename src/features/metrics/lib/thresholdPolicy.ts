import type { Model } from '../../alternatives/data/models'

export type JudgmentSourceType = 'rule' | 'self_baseline' | 'peer_benchmark'
export type FactSourceType = 'official_api_doc'
export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type MetricSeverity = 'low' | 'medium' | 'high'

export type ThresholdId =
  | 'gross_margin_loss_usd'
  | 'gross_margin_thin_pct'
  | 'retry_rate_pct'
  | 'cache_hit_low_pct'
  | 'large_reused_input_tokens'
  | 'top_agent_concentration_pct'
  | 'top_agent_concentration_high_pct'
  | 'agent_loop_depth_count'
  | 'agent_loop_depth_high_count'
  | 'output_heavy_input_ratio'
  | 'output_heavy_min_tokens'
  | 'human_review_monthly_runs'
  | 'monthly_budget_usd'
  | 'stale_fact_source_days'

export interface ThresholdDefinition {
  id: ThresholdId
  label: string
  description: string
  defaultValue: number
  currentValue: number
  sourceType: JudgmentSourceType
  confidence: ConfidenceLevel
  adjustable: boolean
  lastUpdatedAt: string
  policyVersion: string
  qualityDependent?: boolean
}

export type ThresholdPolicy = Record<ThresholdId, ThresholdDefinition>
export type ThresholdOverrides = Partial<Record<ThresholdId, number>>

export interface BasisRef {
  id: string
  label: string
  sourceType: JudgmentSourceType
  thresholdId: ThresholdId
  thresholdValue: number
  observedValue: number
  confidence: ConfidenceLevel
  evidenceRef?: string
}

export interface MetricFlag {
  metricId: string
  severity: MetricSeverity
  basisRef: BasisRef
  thresholdUsed: ThresholdDefinition
  observedValue: number
  confidence: ConfidenceLevel
  qualityCaveat?: string
}

export interface FactSourceSnapshot {
  modelId: string
  provider: string
  name: string
  sourceType: FactSourceType
  sourceUrl: string
  sourceLabel: string
  lastVerifiedAt: string
  verificationStatus: 'fresh' | 'stale'
  warning: string | null
  capturedAt: string
}

const POLICY_VERSION = '2026-05-23.p0'
const UPDATED_AT = '2026-05-23'

function threshold(
  id: ThresholdId,
  label: string,
  description: string,
  defaultValue: number,
  sourceType: JudgmentSourceType = 'rule',
  confidence: ConfidenceLevel = 'high',
  adjustable = true,
  qualityDependent = false,
): ThresholdDefinition {
  return {
    id,
    label,
    description,
    defaultValue,
    currentValue: defaultValue,
    sourceType,
    confidence,
    adjustable,
    lastUpdatedAt: UPDATED_AT,
    policyVersion: POLICY_VERSION,
    qualityDependent,
  }
}

export const DEFAULT_THRESHOLD_POLICY: ThresholdPolicy = {
  gross_margin_loss_usd: threshold(
    'gross_margin_loss_usd',
    'Loss margin',
    'Gross margin below zero dollars is a loss.',
    0,
  ),
  gross_margin_thin_pct: threshold(
    'gross_margin_thin_pct',
    'Thin gross margin',
    'Gross margin below this ratio is thin for the current workspace policy.',
    0.4,
  ),
  retry_rate_pct: threshold(
    'retry_rate_pct',
    'High retry rate',
    'Retry rate above this ratio can inflate effective cost.',
    0.1,
  ),
  cache_hit_low_pct: threshold(
    'cache_hit_low_pct',
    'Low cache hit rate',
    'Reusable large inputs with cache hit rate below this ratio are cache-miss candidates.',
    0.5,
  ),
  large_reused_input_tokens: threshold(
    'large_reused_input_tokens',
    'Large reused input',
    'Reusable input artifacts at or above this token count should be checked for caching.',
    5000,
  ),
  top_agent_concentration_pct: threshold(
    'top_agent_concentration_pct',
    'Top agent concentration',
    'One agent at or above this share of total AI team cost is a concentration bottleneck.',
    0.4,
  ),
  top_agent_concentration_high_pct: threshold(
    'top_agent_concentration_high_pct',
    'High top agent concentration',
    'One agent at or above this share is a high-severity cost concentration.',
    0.45,
  ),
  agent_loop_depth_count: threshold(
    'agent_loop_depth_count',
    'Agent loop depth',
    'Calls per run at or above this count may indicate runaway agent loops.',
    4,
  ),
  agent_loop_depth_high_count: threshold(
    'agent_loop_depth_high_count',
    'High agent loop depth',
    'Calls per run at or above this count is a high-severity loop-depth finding.',
    5,
  ),
  output_heavy_input_ratio: threshold(
    'output_heavy_input_ratio',
    'Output-heavy ratio',
    'Output tokens above this ratio of input tokens can indicate oversized responses.',
    0.8,
    'self_baseline',
    'medium',
  ),
  output_heavy_min_tokens: threshold(
    'output_heavy_min_tokens',
    'Output-heavy minimum tokens',
    'Output-heavy findings require at least this many output tokens.',
    2000,
    'self_baseline',
    'medium',
  ),
  human_review_monthly_runs: threshold(
    'human_review_monthly_runs',
    'Frequent all-item human review',
    'All-item review at or above this monthly run count may bottleneck operations.',
    20,
  ),
  monthly_budget_usd: threshold(
    'monthly_budget_usd',
    'Monthly budget',
    'Workspace-provided monthly budget used for budget overage findings.',
    0,
  ),
  stale_fact_source_days: threshold(
    'stale_fact_source_days',
    'Official fact-source freshness',
    'Official pricing/spec facts should be re-verified after this many days.',
    30,
  ),
}

export function mergeThresholdPolicy(
  base: ThresholdPolicy = DEFAULT_THRESHOLD_POLICY,
  overrides: ThresholdOverrides = {},
): ThresholdPolicy {
  return Object.fromEntries(
    Object.entries(base).map(([id, definition]) => {
      const thresholdId = id as ThresholdId
      const override = overrides[thresholdId]
      return [
        thresholdId,
        {
          ...definition,
          currentValue: Number.isFinite(override) ? Number(override) : definition.currentValue,
        },
      ]
    }),
  ) as ThresholdPolicy
}

export function getThreshold(policy: ThresholdPolicy, id: ThresholdId): ThresholdDefinition {
  return policy[id] ?? DEFAULT_THRESHOLD_POLICY[id]
}

export function withThresholdValue(threshold: ThresholdDefinition, currentValue: number): ThresholdDefinition {
  return {
    ...threshold,
    currentValue: Number.isFinite(currentValue) ? currentValue : threshold.currentValue,
  }
}

export function createBasisRef(
  thresholdUsed: ThresholdDefinition,
  input: { observedValue: number; evidenceRef?: string },
): BasisRef {
  const observedValue = Number.isFinite(input.observedValue) ? input.observedValue : 0
  return {
    id: `basis:${thresholdUsed.sourceType}:${thresholdUsed.id}`,
    label: basisLabel({
      sourceType: thresholdUsed.sourceType,
      thresholdId: thresholdUsed.id,
      thresholdValue: thresholdUsed.currentValue,
    }),
    sourceType: thresholdUsed.sourceType,
    thresholdId: thresholdUsed.id,
    thresholdValue: thresholdUsed.currentValue,
    observedValue,
    confidence: thresholdUsed.confidence,
    evidenceRef: input.evidenceRef,
  }
}

export function basisLabel(ref: Pick<BasisRef, 'sourceType' | 'thresholdId' | 'thresholdValue'>): string {
  const prefix: Record<JudgmentSourceType, string> = {
    rule: 'rule',
    self_baseline: 'self baseline',
    peer_benchmark: 'peer benchmark',
  }
  return `${prefix[ref.sourceType]}: ${ref.thresholdId} ${ref.thresholdValue}`
}

export function createMetricFlag(input: {
  metricId: string
  severity: MetricSeverity
  basisRef: BasisRef
  thresholdUsed: ThresholdDefinition
  observedValue: number
  qualityCaveat?: string
}): MetricFlag {
  if (!['rule', 'self_baseline', 'peer_benchmark'].includes(input.basisRef.sourceType)) {
    throw new Error('Metric flag requires a rule, self-baseline, or peer-benchmark basis')
  }

  return {
    metricId: input.metricId,
    severity: input.severity,
    basisRef: input.basisRef,
    thresholdUsed: input.thresholdUsed,
    observedValue: Number.isFinite(input.observedValue) ? input.observedValue : 0,
    confidence: input.basisRef.confidence,
    qualityCaveat: input.qualityCaveat,
  }
}

export function staleFactSourceWarning(
  lastVerifiedAt: string,
  nowIso: string,
  maxAgeDays = DEFAULT_THRESHOLD_POLICY.stale_fact_source_days.currentValue,
): string | null {
  const lastVerifiedMs = Date.parse(lastVerifiedAt)
  const nowMs = Date.parse(nowIso)
  if (!Number.isFinite(lastVerifiedMs) || !Number.isFinite(nowMs)) return 'Price source should be re-verified'
  const ageDays = Math.floor((nowMs - lastVerifiedMs) / 86_400_000)
  return ageDays > maxAgeDays ? 'Price source should be re-verified' : null
}

export function factSourceSnapshotFromModels(models: Model[], capturedAt: string): FactSourceSnapshot[] {
  return models.map(model => {
    const warning = staleFactSourceWarning(model.lastVerifiedAt, capturedAt)
    return {
      modelId: model.id,
      provider: model.provider,
      name: model.name,
      sourceType: 'official_api_doc',
      sourceUrl: model.sourceUrl,
      sourceLabel: model.sourceLabel,
      lastVerifiedAt: model.lastVerifiedAt,
      verificationStatus: warning ? 'stale' : 'fresh',
      warning,
      capturedAt,
    }
  })
}
