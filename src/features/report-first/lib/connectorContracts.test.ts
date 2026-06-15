import { describe, expect, it } from 'vitest'

import {
  buildConnectorReadinessReport,
  connectorContractBySource,
  connectorContractsByKind,
  CONNECTOR_FORBIDDEN_COLUMNS,
} from './connectorContracts'

describe('connectorContracts', () => {
  it('ships field contracts for usage, billing, outcome, and policy sources', () => {
    expect(connectorContractsByKind('llm_usage').map(contract => contract.sourceId)).toEqual([
      'openai',
      'anthropic',
      'gemini',
      'langfuse',
      'helicone',
      'vercel_ai_gateway',
      'generic_gateway',
    ])
    expect(connectorContractsByKind('billing').map(contract => contract.sourceId)).toEqual([
      'stripe',
      'billing_db',
      'manual_revenue_csv',
    ])
    expect(connectorContractsByKind('outcome').map(contract => contract.sourceId)).toEqual([
      'product_analytics',
      'manual_outcome_csv',
    ])
    expect(connectorContractsByKind('policy').map(contract => contract.sourceId)).toEqual([
      'decision_ledger',
      'manual_policy_csv',
    ])
  })

  it('keeps sensitive raw fields forbidden for every source contract', () => {
    expect(CONNECTOR_FORBIDDEN_COLUMNS).toEqual(expect.arrayContaining([
      'prompt',
      'messages',
      'api_key',
      'email',
    ]))

    for (const contract of connectorContractsByKind()) {
      expect(contract.forbiddenColumns).toEqual(expect.arrayContaining(CONNECTOR_FORBIDDEN_COLUMNS))
      expect(contract.normalizedTarget).toMatch(/normalized_|decision_ledger/)
    }
  })

  it('describes token economy columns without requiring new usage row fields', () => {
    const helicone = connectorContractBySource('helicone')
    const openai = connectorContractBySource('openai')

    expect(helicone?.optionalColumns).toEqual(expect.arrayContaining([
      'cache_read_tokens',
      'cache_write_tokens',
      'tool_call_count',
      'session_id',
      'agent_run_id',
    ]))
    expect(openai?.optionalColumns).toEqual(expect.arrayContaining([
      'cached_tokens',
      'web_search_count',
      'image_input_tokens',
      'audio_input_seconds',
    ]))
  })

  it('builds a readiness report that separates CSV contracts from live API configuration', () => {
    const report = buildConnectorReadinessReport({
      usageColumns: ['customer_id', 'feature', 'model', 'input_tokens', 'output_tokens', 'cached_tokens'],
      hasRevenueMapping: true,
      hasOutcomeEvents: false,
      hasPolicyDecision: true,
    })

    expect(report.summary).toContain('사용량 CSV 계약 준비')
    expect(report.sections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'llm_usage',
        status: 'csv_contract_ready',
      }),
      expect.objectContaining({
        kind: 'billing',
        status: 'sample_supported',
      }),
      expect.objectContaining({
        kind: 'outcome',
        status: 'csv_contract_ready',
      }),
      expect.objectContaining({
        kind: 'policy',
        status: 'sample_supported',
      }),
    ]))
    expect(report.liveConnectorStatus).toBe('connector_not_configured')
    expect(report.verifiedColumns).toEqual(expect.arrayContaining(['cached_tokens']))
  })
})
