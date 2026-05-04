import { calculateCost, type CalcInput } from './calculator'

export interface QualityAssumptions {
  qualityScore: number
  latencyScore: number
  riskScore: number
  toolCallReliabilityScore: number
  retryRate: number
  humanReviewRate: number
  csEscalationRate: number
  reviewCostPerRequestUsd: number
  csCostPerEscalationUsd: number
}

export interface DecisionMetricsInput extends CalcInput {
  assumptions: QualityAssumptions
}

export interface DecisionMetricsResult {
  rawMonthlyCost: number
  effectiveMonthlyCost: number
  retryCost: number
  humanReviewCost: number
  csEscalationCost: number
  monthlyRequests: number
  costPerSuccessfulRequest: number
  qualityScore: number
  latencyScore: number
  riskScore: number
  toolCallReliabilityScore: number
  qualityLabel: string
  latencyLabel: string
  riskLabel: string
  verdict: string
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function clampScore(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Moderate'
  return 'Watch'
}

function riskLabel(score: number): string {
  if (score >= 70) return 'High'
  if (score >= 35) return 'Medium'
  return 'Low'
}

export function calculateDecisionMetrics(input: DecisionMetricsInput): DecisionMetricsResult {
  const cost = calculateCost(input)
  const assumptions = input.assumptions
  const monthlyRequests = finiteNonNegative(input.monthlyRequests ?? cost.monthlyRequests)
  const retryRate = finiteNonNegative(assumptions.retryRate)
  const humanReviewRate = finiteNonNegative(assumptions.humanReviewRate)
  const csEscalationRate = finiteNonNegative(assumptions.csEscalationRate)
  const reviewCostPerRequestUsd = finiteNonNegative(assumptions.reviewCostPerRequestUsd)
  const csCostPerEscalationUsd = finiteNonNegative(assumptions.csCostPerEscalationUsd)
  const rawMonthlyCost = cost.monthlyCost
  const retryCost = rawMonthlyCost * retryRate
  const humanReviewCost = monthlyRequests * humanReviewRate * reviewCostPerRequestUsd
  const csEscalationCost = monthlyRequests * csEscalationRate * csCostPerEscalationUsd
  const effectiveMonthlyCost = rawMonthlyCost + retryCost + humanReviewCost + csEscalationCost
  const qualityScore = clampScore(assumptions.qualityScore)
  const latencyScore = clampScore(assumptions.latencyScore)
  const riskScore = clampScore(assumptions.riskScore)
  const toolCallReliabilityScore = clampScore(assumptions.toolCallReliabilityScore)

  return {
    rawMonthlyCost,
    effectiveMonthlyCost,
    retryCost,
    humanReviewCost,
    csEscalationCost,
    monthlyRequests,
    costPerSuccessfulRequest: monthlyRequests > 0 ? effectiveMonthlyCost / monthlyRequests : 0,
    qualityScore,
    latencyScore,
    riskScore,
    toolCallReliabilityScore,
    qualityLabel: scoreLabel(qualityScore),
    latencyLabel: scoreLabel(latencyScore),
    riskLabel: riskLabel(riskScore),
    verdict: 'Assumption-based estimate: validate quality and operational risk before switching.',
  }
}
