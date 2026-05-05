import type { CostChannel } from './breakdown'

export interface HintInput {
  topChannel: CostChannel
  cacheHitRate: number
  batchEnabled: boolean
}

export function topDriverHint(i: HintInput): string {
  if (i.topChannel === 'none') return 'No significant cost yet.'
  if (i.topChannel === 'uncached_input' && i.cacheHitRate < 0.5) {
    return 'Biggest drain: uncached input. Raising cache hit rate from ' +
      `${Math.round(i.cacheHitRate * 100)}% to 70%+ could slash this.`
  }
  if (i.topChannel === 'output' && !i.batchEnabled) {
    return 'Biggest drain: output tokens. If you can accept async, Batch Mode cuts this ~50%.'
  }
  if (i.topChannel === 'cached_input') {
    return 'Biggest drain: even cached input. Likely the prompt is too long — shorten it.'
  }
  return 'Most levers pulled. A cheaper / smaller model is the next step.'
}
