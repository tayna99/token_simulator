import { calculateCost, calculateMigrationDelta } from '../../../lib/calculator'
import type { Model } from '../../../data/models'

export type SavingsLeverId =
  | 'model-switch'
  | 'prompt-caching'
  | 'batch-processing'
  | 'output-token-cap'
  | 'feature-routing'

export interface SavingsLeverInput {
  currentModel: Model
  candidateModel: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequests: number
  cacheHitRate: number
  batchEnabled: boolean
  cacheableShare: number
  batchableShare: number
  outputReductionRate: number
  routingEligibleShare: number
}

export interface SavingsLever {
  id: SavingsLeverId
  strategy: string
  monthlySavings: number
  annualSavings: number
  riskText: string
  conditionText: string
  recommendedUse: string
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function finiteRatio(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

function lever(
  id: SavingsLeverId,
  strategy: string,
  monthlySavings: number,
  riskText: string,
  conditionText: string,
  recommendedUse: string,
): SavingsLever {
  const savings = Math.max(0, monthlySavings)
  return {
    id,
    strategy,
    monthlySavings: savings,
    annualSavings: savings * 12,
    riskText,
    conditionText,
    recommendedUse,
  }
}

export function rankSavingsLevers(input: SavingsLeverInput): SavingsLever[] {
  const current = calculateCost({
    model: input.currentModel,
    monthlyInputTokens: input.monthlyInputTokens,
    monthlyOutputTokens: input.monthlyOutputTokens,
    monthlyRequests: input.monthlyRequests,
    cacheHitRate: input.cacheHitRate,
    batchEnabled: input.batchEnabled,
  })
  const migration = calculateMigrationDelta({
    currentModel: input.currentModel,
    candidateModel: input.candidateModel,
    monthlyInputTokens: input.monthlyInputTokens,
    monthlyOutputTokens: input.monthlyOutputTokens,
    monthlyRequests: input.monthlyRequests,
    cacheHitRate: input.cacheHitRate,
    batchEnabled: input.batchEnabled,
  })
  const cacheableShare = finiteRatio(input.cacheableShare)
  const batchableShare = finiteRatio(input.batchableShare)
  const outputReductionRate = finiteRatio(input.outputReductionRate)
  const routingEligibleShare = finiteRatio(input.routingEligibleShare)
  const inputCostWithoutCache = (finiteNonNegative(input.monthlyInputTokens) / 1_000_000) * input.currentModel.inputPrice
  const outputCost = (finiteNonNegative(input.monthlyOutputTokens) / 1_000_000) * input.currentModel.outputPrice
  const modelSwitchSavings = Math.max(0, -migration.monthlyDelta)
  const cacheSavings = input.currentModel.supportsCaching
    ? inputCostWithoutCache * cacheableShare * input.currentModel.cacheDiscount
    : 0
  const batchSavings = input.currentModel.supportsBatch
    ? current.monthlyCost * batchableShare * input.currentModel.batchDiscount
    : 0
  const outputCapSavings = outputCost * outputReductionRate
  const routingSavings = modelSwitchSavings * routingEligibleShare

  return [
    lever(
      'model-switch',
      'Model switch',
      modelSwitchSavings,
      'Quality degradation possible; validate task-level evals before routing all traffic.',
      'Candidate must satisfy quality, latency, context, and tool-call requirements.',
      'Classification, summary, simple extraction',
    ),
    lever(
      'prompt-caching',
      'Prompt caching',
      cacheSavings,
      'Requires repeatable prompt patterns; personalized context may not cache well.',
      cacheableShare > 0
        ? 'Works when system prompts, policies, or retrieved context repeat across requests.'
        : 'Needs repeatable prompt or context blocks before savings are available.',
      'RAG system prompts, fixed policy blocks',
    ),
    lever(
      'batch-processing',
      'Batch processing',
      batchSavings,
      'Lower real-time responsiveness; unsuitable for interactive user-facing paths.',
      batchableShare > 0
        ? 'Works for traffic that can wait for asynchronous processing.'
        : 'Needs offline or delayed work before savings are available.',
      'Nightly analysis, bulk reports',
    ),
    lever(
      'output-token-cap',
      'Output token cap',
      outputCapSavings,
      'Answer quality can degrade when summaries or explanations are cut too aggressively.',
      'Works when concise outputs are acceptable and answer completeness is monitored.',
      'Internal summaries, log analysis',
    ),
    lever(
      'feature-routing',
      'Feature-level routing',
      routingSavings,
      'Higher implementation complexity; requires feature-specific quality thresholds.',
      'Works when cheap models can safely handle only some request classes.',
      'Operational AI apps with mixed features',
    ),
  ].sort((a, b) => b.monthlySavings - a.monthlySavings)
}
