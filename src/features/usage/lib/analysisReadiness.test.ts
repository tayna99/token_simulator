import { describe, expect, it } from 'vitest'
import { buildAnalysisReadinessReport, hasRevenueBasis } from './analysisReadiness'
import type { UsageImportRow } from './usageImport'

function row(overrides: Partial<UsageImportRow> = {}): UsageImportRow {
  return {
    timestamp: '2026-05-01',
    requestId: null,
    customerId: null,
    planId: null,
    feature: 'rag_chat',
    modelId: 'claude-sonnet-4.6',
    sessionId: null,
    agentRunId: null,
    inputTokens: 1000,
    outputTokens: 500,
    totalCostUsd: 0.01,
    latencyMs: null,
    status: null,
    costSource: 'explicit',
    ...overrides,
  }
}

describe('buildAnalysisReadinessReport', () => {
  it('allows partial cost diagnosis from the minimum usage CSV shape', () => {
    const report = buildAnalysisReadinessReport({
      headers: ['feature', 'model', 'input_tokens', 'output_tokens'],
      rows: [row()],
      revenueBasis: 'none',
      blocked: false,
    })

    expect(report.status).toBe('needs_mapping')
    expect(report.availableAnalyses.map(item => item.id)).toEqual([
      'token_request_totals',
      'total_ai_cogs',
      'feature_cost',
      'model_cost',
      'cost_source_coverage',
    ])
    expect(report.mappingNeeds.map(item => item.id)).toEqual([
      'customer_id',
      'plan_id',
      'session_id',
      'agent_run_id',
      'revenue',
    ])
    expect(report.deferredJudgments.map(item => item.id)).toContain('loss_customer')
    expect(report.deferredJudgments.map(item => item.id)).toContain('pricing_recommendation')
    expect(hasRevenueBasis(report)).toBe(false)
  })

  it('unlocks customer, plan, session, agent-run, and revenue judgments when mappings exist', () => {
    const report = buildAnalysisReadinessReport({
      headers: [
        'customer_id',
        'plan_id',
        'feature',
        'model',
        'session_id',
        'agent_run_id',
        'input_tokens',
        'output_tokens',
        'revenue',
      ],
      rows: [row({
        customerId: 'cust_001',
        planId: 'pro',
        sessionId: 'sess_001',
        agentRunId: 'run_001',
      })],
      revenueBasis: 'csv_columns',
      blocked: false,
    })

    expect(report.status).toBe('ready')
    expect(report.availableAnalyses.map(item => item.id)).toEqual([
      'token_request_totals',
      'total_ai_cogs',
      'feature_cost',
      'model_cost',
      'cost_source_coverage',
      'customer_cost',
      'plan_cost',
      'session_trace',
      'agent_run_cost',
      'plan_margin',
      'customer_profitability',
      'loss_customer',
      'heavy_user_margin',
      'pricing_recommendation',
    ])
    expect(report.mappingNeeds).toEqual([])
    expect(report.deferredJudgments).toEqual([])
    expect(hasRevenueBasis(report)).toBe(true)
  })

  it('blocks every analysis when the trust gate blocks ingestion', () => {
    const report = buildAnalysisReadinessReport({
      headers: ['prompt', 'api_key', 'feature', 'model', 'input_tokens', 'output_tokens'],
      rows: [row()],
      revenueBasis: 'none',
      blocked: true,
    })

    expect(report.status).toBe('blocked')
    expect(report.availableAnalyses).toEqual([])
    expect(report.mappingNeeds).toEqual([])
    expect(report.deferredJudgments.map(item => item.id)).toEqual(['all_analysis'])
  })
})
