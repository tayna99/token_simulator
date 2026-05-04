import { describe, expect, it } from 'vitest'
import { MODELS } from '../data/models'
import { parseUsageCsv } from './usageImport'

describe('parseUsageCsv', () => {
  it('aggregates LLM usage CSV into totals and feature summaries', () => {
    const csv = [
      'timestamp,feature,model,input_tokens,output_tokens,total_cost,latency_ms,customer_id',
      '2026-05-01,rag_chat,claude-sonnet-4.6,1000,500,0.010,1200,acme',
      '2026-05-01,rag_chat,claude-sonnet-4.6,2000,700,0.020,1400,acme',
      '2026-05-01,summary,gemini-3.1-flash,3000,800,0.004,900,globex',
    ].join('\n')

    const result = parseUsageCsv(csv, MODELS)

    expect(result.requestCount).toBe(3)
    expect(result.totalInputTokens).toBe(6000)
    expect(result.totalOutputTokens).toBe(2000)
    expect(result.totalCostUsd).toBeCloseTo(0.034)
    expect(result.avgInputTokensPerRequest).toBe(2000)
    expect(result.avgOutputTokensPerRequest).toBe(667)
    expect(result.p95OutputTokens).toBe(800)
    expect(result.featureSummaries[0]).toMatchObject({
      feature: 'rag_chat',
      requestCount: 2,
      inputTokens: 3000,
      outputTokens: 1200,
    })
    expect(result.topFeatureByCost?.feature).toBe('rag_chat')
  })

  it('uses model pricing when total_cost is missing', () => {
    const csv = [
      'feature,model,input_tokens,output_tokens',
      'classification,gemini-3.1-flash,1000000,1000000',
    ].join('\n')

    const result = parseUsageCsv(csv, MODELS)

    expect(result.totalCostUsd).toBeCloseTo(0.5)
  })
})
