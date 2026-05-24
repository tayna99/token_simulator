import { describe, expect, it } from 'vitest'
import { MODELS } from '../../../data/models'
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

  it('preserves recommended attribution dimensions and explicit cost provenance', () => {
    const csv = [
      'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
      '2026-05-01T10:00:00Z,req_1,acme,pro,report_generation,claude-sonnet-4.6,sess_1,run_1,1000,500,0.010,1200,success',
    ].join('\n')

    const result = parseUsageCsv(csv, MODELS)

    expect(result.errors).toEqual([])
    expect(result.rows[0]).toMatchObject({
      timestamp: '2026-05-01T10:00:00Z',
      requestId: 'req_1',
      customerId: 'acme',
      planId: 'pro',
      sessionId: 'sess_1',
      agentRunId: 'run_1',
      status: 'success',
      costSource: 'explicit',
    })
  })

  it('reports missing required CSV columns without producing rows', () => {
    const csv = [
      'timestamp,feature,model,input_tokens',
      '2026-05-01,report_generation,claude-sonnet-4.6,1000',
    ].join('\n')

    const result = parseUsageCsv(csv, MODELS)

    expect(result.rows).toEqual([])
    expect(result.errors).toContain('Missing required column: output_tokens')
  })

  it('uses model pricing when total_cost is missing', () => {
    const csv = [
      'feature,model,input_tokens,output_tokens',
      'classification,gemini-3.1-flash,1000000,1000000',
    ].join('\n')

    const result = parseUsageCsv(csv, MODELS)

    expect(result.totalCostUsd).toBeCloseTo(0.5)
    expect(result.rows[0].costSource).toBe('model_price')
  })

  it('reports import health and missing attribution dimensions without guessing values', () => {
    const csv = [
      'timestamp,feature,model,input_tokens,output_tokens',
      '2026-05-01,classification,gemini-3.1-flash,1000,500',
    ].join('\n')

    const result = parseUsageCsv(csv, MODELS)

    expect(result.importHealthReport!.status).toBe('needs_mapping')
    expect(result.importHealthReport!.missingDimensionCounts).toMatchObject({
      customer: 1,
      plan: 1,
      session: 1,
      agent_run: 1,
    })
    expect(result.schemaMappingProfile!.normalizedTable).toBe('normalized_usage_table')
    expect(result.schemaMappingProfile!.columns.feature).toContain('feature')
    expect(result.rows[0]).toMatchObject({
      customerId: null,
      planId: null,
      sessionId: null,
      agentRunId: null,
    })
    expect(result.trustInspection?.status).toBe('needs_mapping')
    expect(result.trustInspection?.analysisScope.blocked).toContain('plan_margin')
  })

  it('attaches trust inspection that blocks raw prompt and API key exports', () => {
    const csv = [
      'timestamp,prompt,api_key,feature,model,input_tokens,output_tokens',
      '2026-05-01,"raw customer text",sk-test,classification,gemini-3.1-flash,1000,500',
    ].join('\n')

    const result = parseUsageCsv(csv, MODELS)

    expect(result.trustInspection?.status).toBe('blocked')
    expect(result.trustInspection?.allowedForSnapshot).toBe(false)
    expect(result.trustInspection?.warnings).toContain('raw_prompt_detected')
    expect(result.trustInspection?.warnings).toContain('api_key_candidate_detected')
  })
})
