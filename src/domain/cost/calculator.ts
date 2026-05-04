import type { Model } from '../../data/models'

export interface CalcInput {
  model: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequests?: number
  cacheHitRate: number   // 0-1
  batchEnabled: boolean
}

export interface CalcResult {
  monthlyCost: number
  annualCost: number
  inputCost: number
  outputCost: number
  cachedInputCost: number
  uncachedInputCost: number
  monthlyRequests: number
  costPerRequest: number
  cacheSavings: number
  batchSavings: number
}

type BaseCalcResult = Omit<CalcResult, 'cacheSavings' | 'batchSavings'>

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function finiteRatio(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

function baseCost(input: CalcInput): BaseCalcResult {
  const { model, batchEnabled } = input
  const monthlyInputTokens = finiteNonNegative(input.monthlyInputTokens)
  const monthlyOutputTokens = finiteNonNegative(input.monthlyOutputTokens)
  const monthlyRequests = finiteNonNegative(input.monthlyRequests ?? 0)
  const cacheHitRate = finiteRatio(input.cacheHitRate)
  const cachedInputTokens = monthlyInputTokens * cacheHitRate
  const uncachedInputTokens = monthlyInputTokens * (1 - cacheHitRate)
  const batchMult = batchEnabled ? (1 - model.batchDiscount) : 1

  const uncachedInputCost = (uncachedInputTokens / 1_000_000) * model.inputPrice * batchMult
  const cachedInputCost = (cachedInputTokens / 1_000_000) * model.inputPrice * (1 - model.cacheDiscount) * batchMult
  const inputCost = uncachedInputCost + cachedInputCost

  const outputCost = (monthlyOutputTokens / 1_000_000) * model.outputPrice * batchMult

  const monthlyCost = inputCost + outputCost

  return {
    monthlyCost,
    annualCost: monthlyCost * 12,
    inputCost,
    outputCost,
    cachedInputCost,
    uncachedInputCost,
    monthlyRequests,
    costPerRequest: monthlyRequests > 0 ? monthlyCost / monthlyRequests : 0,
  }
}

export function calculateCost(input: CalcInput): CalcResult {
  const current = baseCost(input)
  const cacheBaseline = baseCost({ ...input, cacheHitRate: 0 })
  const batchBaseline = baseCost({ ...input, batchEnabled: false })

  return {
    ...current,
    cacheSavings: Math.max(0, cacheBaseline.monthlyCost - current.monthlyCost),
    batchSavings: input.batchEnabled ? Math.max(0, batchBaseline.monthlyCost - current.monthlyCost) : 0,
  }
}

export interface MigrationInput {
  currentModel: Model
  candidateModel: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequests?: number
  cacheHitRate: number
  batchEnabled: boolean
}

export interface MigrationResult {
  currentCost: CalcResult
  candidateCost: CalcResult
  monthlyDelta: number
  annualDelta: number
  savingPercent: number
}

export function calculateMigrationDelta(input: MigrationInput): MigrationResult {
  const currentCost = calculateCost({ ...input, model: input.currentModel })
  const candidateCost = calculateCost({ ...input, model: input.candidateModel })

  const monthlyDelta = candidateCost.monthlyCost - currentCost.monthlyCost
  const annualDelta = monthlyDelta * 12
  const savingPercent = currentCost.monthlyCost === 0
    ? 0
    : (monthlyDelta / currentCost.monthlyCost) * 100

  return { currentCost, candidateCost, monthlyDelta, annualDelta, savingPercent }
}
