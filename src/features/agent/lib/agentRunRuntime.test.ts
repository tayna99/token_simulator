import { describe, expect, it, vi } from 'vitest'
import { OPERATING_AGENTS } from '../../operating-assets/lib/operatingAssets'
import { AGENTCOST_FRONT_OPERATING_SYSTEM } from '../../front-operating/lib/frontOperatingContext'
import { runAgentRuntime } from './agentRunRuntime'

describe('runAgentRuntime', () => {
  it('posts the active stage snapshot to the canonical agentic endpoint', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      events: [],
      answer: 'Cost pressure is grounded in tool:monthlyAiCogs.',
      report: 'CEO/CFO one-pager grounded in tool:monthlyAiCogs.',
      llmMode: 'provider-llm',
      supervisorSummary: 'Cost Modeling Agent led the review.',
      disagreements: [],
      decisionReadiness: 'ready',
      nextQuestions: ['Approve or hold?'],
      calledAgentIds: ['cost_modeling', 'cost_engine_qa', 'finance_ops'],
      primaryAgentId: 'cost_modeling',
      reviewerAgentIds: ['cost_engine_qa', 'finance_ops'],
      agentRoute: { executionMode: 'stage_committee', reason: 'cost stage default operating team' },
      snapshotVersion: 'snapshot:test',
      usedTools: ['lookup_snapshot_value'],
      toolResultRefs: ['tool:monthlyAiCogs'],
      riskCardIds: [],
      decisionIds: [],
      evidenceRefs: [],
      warnings: [],
    }), { status: 200 }))

    const result = await runAgentRuntime({
      mode: 'ask',
      activeStage: 'cost',
      question: 'What is breaking margin?',
      executionMode: 'stage_committee',
      requestedAgentId: 'cost_modeling',
      snapshotVersion: 'snapshot:test',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
      frontOperatingSystem: AGENTCOST_FRONT_OPERATING_SYSTEM,
    }, { runtime: 'server', fetcher })

    expect(fetcher).toHaveBeenCalledWith('/api/agent/run', expect.objectContaining({ method: 'POST' }))
    const [, requestInit] = fetcher.mock.calls[0]
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      activeStage: 'cost',
      executionMode: 'stage_committee',
      requestedAgentId: 'cost_modeling',
      snapshotVersion: 'snapshot:test',
      toolResults: { monthlyAiCogs: 4820 },
      operatingAgents: expect.arrayContaining([expect.objectContaining({ id: 'cost_modeling' })]),
      frontOperatingSystem: expect.objectContaining({
        assets: expect.arrayContaining([expect.objectContaining({ ref: 'asset:icp_scorecard' })]),
      }),
    })
    expect(result.llmMode).toBe('provider-llm')
    expect(result.usedTools).toContain('lookup_snapshot_value')
    expect(result.calledAgentIds).toEqual(['cost_modeling', 'cost_engine_qa', 'finance_ops'])
    expect(result.primaryAgentId).toBe('cost_modeling')
    expect(result.snapshotVersion).toBe('snapshot:test')
    expect(result.supervisorSummary).toBe('Cost Modeling Agent led the review.')
    expect(result.decisionReadiness).toBe('ready')
  })

  it('merges fallback route metadata into partial provider responses', async () => {
    const result = await runAgentRuntime({
      mode: 'ask',
      activeStage: 'optimize',
      question: 'Which routing change is safe?',
      executionMode: 'stage_committee',
      snapshotVersion: 'snapshot:partial',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
      frontOperatingSystem: AGENTCOST_FRONT_OPERATING_SYSTEM,
    }, {
      runtime: 'server',
      fetcher: vi.fn(async () => new Response(JSON.stringify({
        events: [{
          type: 'analysis',
          message: 'Optimization review grounded in tool:monthlyAiCogs.',
          toolResultRefs: ['tool:monthlyAiCogs'],
          riskCardIds: [],
        }],
        answer: 'Grounded in tool:monthlyAiCogs.',
        report: 'Grounded report.',
        llmMode: 'provider-llm',
        usedTools: ['retrieve_metric_flags'],
        toolResultRefs: ['tool:monthlyAiCogs'],
      }), { status: 200 })),
    })

    expect(result.calledAgentIds).toEqual(['optimization_routing', 'model_inference_research', 'trust_security_compliance'])
    expect(result.assetRefs).toContain('asset:icp_scorecard')
    expect(result.primaryAgentId).toBe('optimization_routing')
    expect(result.snapshotVersion).toBe('snapshot:partial')
    expect(result.events[0].agentId).toBe('optimization_routing')
    expect(result.events[0].calledAgentTool).toBe('call_optimization_routing_agent')
    expect(result.events[0].usedCapabilityTools).toEqual(['retrieve_metric_flags'])
    expect(result.supervisorSummary).toContain('optimization_routing')
  })

  it('normalizes evidence coverage and event stance from provider responses', async () => {
    const result = await runAgentRuntime({
      mode: 'ask',
      activeStage: 'cost',
      question: 'Is the cache decision ready?',
      executionMode: 'stage_committee',
      snapshotVersion: 'snapshot:evidence',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
      frontOperatingSystem: AGENTCOST_FRONT_OPERATING_SYSTEM,
    }, {
      runtime: 'server',
      fetcher: vi.fn(async () => new Response(JSON.stringify({
        events: [{
          type: 'analysis',
          message: 'Benchmark is missing; cite baseline_unavailable.',
          toolResultRefs: [],
          riskCardIds: [],
          stance: 'caution',
          evidenceWarnings: ['baseline_unavailable'],
          nextQuestion: 'Which peer baseline should we add before adoption?',
        }],
        answer: 'Decision needs review.',
        report: 'Decision needs review.',
        llmMode: 'provider-llm',
        decisionReadiness: 'needs_review',
        evidenceCoverage: {
          officialDocs: { found: true, refs: ['source:google-pricing'], records: [{ id: 'google-pricing', text: 'Cache pricing.' }], scores: [1], warnings: [] },
          benchmarkEvidence: { found: false, refs: [], records: [], scores: [], warnings: ['baseline_unavailable'] },
          decisionHistory: { found: true, refs: ['decision:cache-policy'], records: [{ id: 'cache-policy', text: 'Held cache policy.' }], scores: [1], warnings: [] },
        },
        warnings: ['baseline_unavailable'],
      }), { status: 200 })),
    })

    expect(result.events[0].stance).toBe('caution')
    expect(result.events[0].evidenceWarnings).toEqual(['baseline_unavailable'])
    expect(result.events[0].nextQuestion).toMatch(/peer baseline/i)
    expect(result.evidenceCoverage.officialDocs.refs).toEqual(['source:google-pricing'])
    expect(result.evidenceCoverage.benchmarkEvidence.warnings).toContain('baseline_unavailable')
    expect(result.decisionReadiness).toBe('needs_review')
  })

  it('returns deterministic fallback when the server runtime fails', async () => {
    const result = await runAgentRuntime({
      mode: 'report',
      activeStage: 'bottleneck',
      question: 'Draft report',
      executionMode: 'stage_committee',
      snapshotVersion: 'snapshot:fallback',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
    }, {
      runtime: 'server',
      fetcher: vi.fn(async () => new Response(JSON.stringify({ error: 'down' }), { status: 503 })),
    })

    expect(result.llmMode).toBe('deterministic-fallback')
    expect(result.answer).toContain('tool:monthlyAiCogs')
    expect(result.toolResultRefs).toEqual(['tool:monthlyAiCogs'])
    expect(result.calledAgentIds).toEqual(['customer_diagnostic_pricing', 'usage_data_ingestion', 'cost_engine_qa'])
    expect(result.primaryAgentId).toBe('customer_diagnostic_pricing')
    expect(result.events.map(event => event.agentId)).toEqual(result.calledAgentIds)
    expect(result.snapshotVersion).toBe('snapshot:fallback')
    expect(result.supervisorSummary).toContain('customer_diagnostic_pricing')
    expect(result.decisionReadiness).toBe('needs_review')
  })

  it('adds Trust/Security reviewer when snapshot has blocking trust warnings', async () => {
    const result = await runAgentRuntime({
      mode: 'report',
      activeStage: 'design',
      question: 'Can we analyze this customer export?',
      executionMode: 'stage_committee',
      snapshotVersion: 'snapshot:design:trust',
      toolResults: { monthlyAiCogs: 0 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
      trustInspection: {
        status: 'blocked',
        warnings: ['raw_prompt_detected'],
        allowedForSnapshot: false,
        anonymizationStatus: 'blocked',
        retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
        analysisScope: { available: [], blocked: ['all_analysis'] },
      },
    }, { runtime: 'local' })

    expect(result.calledAgentIds).toEqual(['trust_security_compliance', 'usage_data_ingestion', 'cost_engine_qa'])
    expect(result.primaryAgentId).toBe('trust_security_compliance')
    expect(result.warnings).toContain('trust pipeline requires review before snapshot use')
  })
})
