import { describe, it, expect } from 'vitest'
import { topDriverHint } from './insights'

describe('topDriverHint', () => {
  it('recommends cache increase when uncached_input dominates and cache is low', () => {
    const h = topDriverHint({ topChannel: 'uncached_input', cacheHitRate: 0.2, batchEnabled: false })
    expect(h).toMatch(/cache/i)
  })

  it('recommends batch when output dominates and batch is off', () => {
    const h = topDriverHint({ topChannel: 'output', cacheHitRate: 0.8, batchEnabled: false })
    expect(h).toMatch(/batch/i)
  })

  it('recommends cheaper model when everything already optimized', () => {
    const h = topDriverHint({ topChannel: 'output', cacheHitRate: 0.8, batchEnabled: true })
    expect(h).toMatch(/cheaper|smaller/i)
  })

  it('notes prompt length when cached input dominates', () => {
    const h = topDriverHint({ topChannel: 'cached_input', cacheHitRate: 0.9, batchEnabled: false })
    expect(h).toMatch(/prompt|shorten|long/i)
  })

  it('handles none channel', () => {
    const h = topDriverHint({ topChannel: 'none', cacheHitRate: 0, batchEnabled: false })
    expect(h).toMatch(/no significant/i)
  })
})
