import type { Model } from '../data/models'

export interface CalcInput {
  model: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  cacheHitRate: number   // 0-1
  batchEnabled: boolean
}

export interface CalcResult {
  monthlyCost: number
  annualCost: number
  inputCost: number
  outputCost: number
}

export function calculateCost(input: CalcInput): CalcResult {
  const { model, monthlyInputTokens, monthlyOutputTokens, cacheHitRate, batchEnabled } = input

  const cachedInputTokens = monthlyInputTokens * cacheHitRate
  const uncachedInputTokens = monthlyInputTokens * (1 - cacheHitRate)
  const batchMult = batchEnabled ? (1 - model.batchDiscount) : 1

  const uncachedInputCost = (uncachedInputTokens / 1_000_000) * model.inputPrice * batchMult
  const cachedInputCost = (cachedInputTokens / 1_000_000) * model.inputPrice * (1 - model.cacheDiscount) * batchMult
  const inputCost = uncachedInputCost + cachedInputCost

  const outputCost = (monthlyOutputTokens / 1_000_000) * model.outputPrice * batchMult

  const monthlyCost = inputCost + outputCost

  return { monthlyCost, annualCost: monthlyCost * 12, inputCost, outputCost }
}

export interface MigrationInput {
  currentModel: Model
  candidateModel: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
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
