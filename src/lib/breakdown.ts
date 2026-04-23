import type { Model } from '../data/models'

export type CostChannel = 'uncached_input' | 'cached_input' | 'output' | 'none'

export interface BreakdownInput {
  model: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
}

export interface BreakdownResult {
  uncachedInputUsd: number
  cachedInputUsd: number
  outputUsd: number
  batchSavingsUsd: number       // how much batch saved vs no-batch baseline
  totalUsd: number
  topChannel: CostChannel
}

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0
}

export function calculateBreakdown(input: BreakdownInput): BreakdownResult {
  const m = input.model
  const inTok = safe(input.monthlyInputTokens)
  const outTok = safe(input.monthlyOutputTokens)
  const cacheRate = Math.min(1, Math.max(0, safe(input.cacheHitRate)))
  const batchMult = input.batchEnabled ? (1 - m.batchDiscount) : 1

  const uncachedIn = inTok * (1 - cacheRate)
  const cachedIn = inTok * cacheRate
  const uncachedInputUsd = (uncachedIn / 1_000_000) * m.inputPrice * batchMult
  const cachedInputUsd = (cachedIn / 1_000_000) * m.inputPrice * (1 - m.cacheDiscount) * batchMult
  const outputUsd = (outTok / 1_000_000) * m.outputPrice * batchMult

  // hypothetical no-batch total for delta
  const noBatchIn = (uncachedIn / 1_000_000) * m.inputPrice +
                    (cachedIn / 1_000_000) * m.inputPrice * (1 - m.cacheDiscount)
  const noBatchOut = (outTok / 1_000_000) * m.outputPrice
  const noBatchTotal = noBatchIn + noBatchOut
  const batchedTotal = uncachedInputUsd + cachedInputUsd + outputUsd
  const batchSavingsUsd = input.batchEnabled ? (noBatchTotal - batchedTotal) : 0

  const channels: Array<[CostChannel, number]> = [
    ['uncached_input', uncachedInputUsd],
    ['cached_input', cachedInputUsd],
    ['output', outputUsd],
  ]
  const top = channels.reduce<[CostChannel, number]>(
    (a, b) => b[1] > a[1] ? b : a,
    ['none', 0]
  )
  const topChannel: CostChannel = top[1] > 0 ? top[0] : 'none'

  return {
    uncachedInputUsd, cachedInputUsd, outputUsd,
    batchSavingsUsd,
    totalUsd: batchedTotal,
    topChannel,
  }
}
