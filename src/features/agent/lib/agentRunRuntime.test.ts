import { describe, expect, it, vi } from 'vitest'
import { OPERATING_AGENTS } from '../../operating-assets/lib/operatingAssets'
import { AGENTCOST_FRONT_OPERATING_SYSTEM } from '../../front-operating/lib/frontOperatingContext'
import { runAgentRuntime } from './agentRunRuntime'

describe('runAgentRuntime', () => {
  it('requires the server runtime by default and returns unavailable when it cannot run', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: 'down' }), { status: 503 }))

    const result = await runAgentRuntime({
      mode: 'ask',
      activeStage: 'cost',
      question: 'What is breaking margin?',
      executionMode: 'stage_committee',
      snapshotVersion: 'snapshot:server-required',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
    }, { fetcher })

    expect(fetcher).toHaveBeenCalledWith('/api/agent/run', expect.objectContaining({ method: 'POST' }))
    expect(result.runtime.status).toBe('unavailable')
    expect(result.events[0].type).toBe('runtime_unavailable')
    expect(result.events[0].calledAgentTool).toBeNull()
    expect(result.calledAgentIds).toEqual([])
  })

  it('posts the active stage snapshot to the canonical agentic endpoint', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      events: [],
      answer: 'Cost pressure is grounded in tool:monthlyAiCogs.',
      report: 'CEO/CFO one-pager grounded in tool:monthlyAiCogs.',
      llmMode: 'provider-llm',
      runtime: {
        status: 'provider_llm',
        providerRunId: 'run:test-cost',
        agentInvocationProof: ['call_cost_modeling_agent', 'call_cost_engine_qa_agent', 'call_finance_ops_agent'],
        startedAt: '2026-05-25T00:00:00.000Z',
        completedAt: '2026-05-25T00:00:01.000Z',
      },
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
      ragContextBlocks: [{
        collection: 'official_docs',
        text: 'Cached input tokens receive a discount for repeated context.',
        refs: ['source:google-pricing'],
        sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
        score: 0.82,
        mayOverrideFacts: false,
        metadata: {
          sourceId: 'google-pricing',
          provider: 'google',
          servingProvider: 'first_party',
          modelFamilies: ['gemini'],
          sourceKind: 'pricing',
          sourceLanguage: 'en',
          pricingRegion: 'global',
          officialSourceTrust: 'official_pricing',
          capturedAt: '2026-05-24T00:00:00.000Z',
          sectionType: 'pricing',
          headingPath: ['Gemini API', 'Pricing'],
          contentHash: 'test-context',
        },
      }],
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
      ragContextBlocks: [expect.objectContaining({
        collection: 'official_docs',
        mayOverrideFacts: false,
        refs: ['source:google-pricing'],
      })],
    })
    expect(result.llmMode).toBe('provider-llm')
    expect(result.runtime.status).toBe('provider_llm')
    expect(result.runtime.providerRunId).toBe('run:test-cost')
    expect(result.runtime.agentInvocationProof).toEqual([
      'call_cost_modeling_agent',
      'call_cost_engine_qa_agent',
      'call_finance_ops_agent',
    ])
    expect(result.usedTools).toContain('lookup_snapshot_value')
    expect(result.calledAgentIds).toEqual(['cost_modeling', 'cost_engine_qa', 'finance_ops'])
    expect(result.primaryAgentId).toBe('cost_modeling')
    expect(result.snapshotVersion).toBe('snapshot:test')
    expect(result.supervisorSummary).toBe('Cost Modeling Agent led the review.')
    expect(result.decisionReadiness).toBe('ready')
  })

  it('passes HITL checkpoint request fields and preserves interrupt runtime proof', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      events: [{
        type: 'interrupt_requested',
        message: 'Human approval required before delegated agent tools run.',
        calledAgentTool: null,
        toolResultRefs: ['tool:monthlyAiCogs'],
        riskCardIds: [],
      }],
      answer: 'Paused for approval.',
      report: 'Paused before delegated agent tools.',
      llmMode: 'provider-llm',
      runtime: {
        status: 'interrupt_requested',
        startedAt: '2026-05-26T00:00:00.000Z',
        completedAt: '2026-05-26T00:00:01.000Z',
        agentInvocationProof: [],
        checkpoint: {
          persistence: 'memory',
          threadId: 'thread-hitl-1',
          checkpointNamespace: 'agentpayroll',
          checkpointId: 'checkpoint:agentpayroll:thread-hitl-1',
          interruptId: 'interrupt:supervisor-tools',
          status: 'interrupt_requested',
          reason: 'approval_required',
          resumePayload: {},
        },
      },
      supervisorSummary: 'Paused before operating agent delegation.',
      disagreements: [],
      decisionReadiness: 'needs_review',
      nextQuestions: ['Approve, reject, or hold?'],
      calledAgentIds: [],
      primaryAgentId: null,
      reviewerAgentIds: [],
      agentRoute: { executionMode: 'stage_committee', reason: 'checkpoint interrupt' },
      snapshotVersion: 'snapshot:hitl',
      usedTools: [],
      toolResultRefs: ['tool:monthlyAiCogs'],
      riskCardIds: [],
      decisionIds: [],
      evidenceRefs: [],
      warnings: [],
    }), { status: 200 }))

    const result = await runAgentRuntime({
      mode: 'decision_support',
      activeStage: 'decision-log',
      question: 'Pause before agent delegation.',
      executionMode: 'stage_committee',
      snapshotVersion: 'snapshot:hitl',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
      hitlCheckpoint: true,
      checkpointThreadId: 'thread-hitl-1',
      checkpointNamespace: 'agentpayroll',
    }, { runtime: 'server', fetcher })

    const [, requestInit] = fetcher.mock.calls[0]
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      hitlCheckpoint: true,
      checkpointThreadId: 'thread-hitl-1',
      checkpointNamespace: 'agentpayroll',
    })
    expect(result.llmMode).toBe('provider-llm')
    expect(result.runtime.status).toBe('interrupt_requested')
    expect(result.runtime.agentInvocationProof).toEqual([])
    expect(result.runtime.checkpoint).toMatchObject({
      threadId: 'thread-hitl-1',
      status: 'interrupt_requested',
      interruptId: 'interrupt:supervisor-tools',
    })
    expect(result.calledAgentIds).toEqual([])
    expect(result.events[0].calledAgentTool).toBeNull()
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
        runtime: {
          status: 'provider_llm',
          providerRunId: 'run:partial',
          agentInvocationProof: ['call_optimization_routing_agent'],
          startedAt: '2026-05-25T00:00:00.000Z',
          completedAt: '2026-05-25T00:00:01.000Z',
        },
        usedTools: ['retrieve_metric_flags'],
        toolResultRefs: ['tool:monthlyAiCogs'],
      }), { status: 200 })),
    })

    expect(result.calledAgentIds).toEqual(['optimization_routing', 'model_inference_research', 'trust_security_compliance'])
    expect(result.runtime.status).toBe('provider_llm')
    expect(result.runtime.providerRunId).toBe('run:partial')
    expect(result.assetRefs).toContain('asset:icp_scorecard')
    expect(result.primaryAgentId).toBe('optimization_routing')
    expect(result.snapshotVersion).toBe('snapshot:partial')
    expect(result.events[0].agentId).toBe('optimization_routing')
    expect(result.events[0].calledAgentTool).toBe('call_optimization_routing_agent')
    expect(result.events[0].usedCapabilityTools).toEqual(['retrieve_metric_flags'])
    expect(result.supervisorSummary).toContain('optimization_routing')
  })

  it('preserves fallback route and ref metadata when provider events are partial', async () => {
    const result = await runAgentRuntime({
      mode: 'ask',
      activeStage: 'optimize',
      question: 'Which routing change is safe?',
      executionMode: 'stage_committee',
      requestedAgentId: 'optimization_routing',
      snapshotVersion: 'snapshot:partial-contract',
      toolResults: { monthlyAiCogs: 4820, 'tool:decisionContext': { approved: false } },
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
      fetcher: vi.fn(async () => new Response(JSON.stringify({
        events: [{
          type: 'analysis',
          message: 'Provider omitted route fields.',
          toolResultRefs: [],
          riskCardIds: [],
        }],
        answer: 'Grounded provider answer.',
        report: 'Grounded provider report.',
        llmMode: 'provider-llm',
        runtime: {
          status: 'provider_llm',
          providerRunId: 'run:partial-contract',
          startedAt: '2026-05-25T00:00:00.000Z',
          completedAt: '2026-05-25T00:00:01.000Z',
        },
        toolResultRefs: [],
      }), { status: 200 })),
    })

    expect(result.snapshotVersion).toBe('snapshot:partial-contract')
    expect(result.primaryAgentId).toBe('optimization_routing')
    expect(result.calledAgentIds).toEqual(['optimization_routing', 'model_inference_research', 'trust_security_compliance'])
    expect(result.toolResultRefs).toEqual(['tool:monthlyAiCogs', 'tool:decisionContext'])
    expect(result.events[0]).toMatchObject({
      agentId: 'optimization_routing',
      calledAgentTool: 'call_optimization_routing_agent',
      toolResultRefs: ['tool:monthlyAiCogs', 'tool:decisionContext'],
      reviewerAgentIds: ['model_inference_research', 'trust_security_compliance'],
    })
  })

  it('returns exactly 11 called agents for all-hands deterministic fallback', async () => {
    const result = await runAgentRuntime({
      mode: 'ask',
      activeStage: 'cost',
      question: 'Bring every operating agent into the review.',
      executionMode: 'all_hands',
      snapshotVersion: 'snapshot:all-hands',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
    }, { runtime: 'local' })

    expect(result.calledAgentIds).toHaveLength(11)
    expect(new Set(result.calledAgentIds).size).toBe(11)
    expect(result.primaryAgentId).toBe(result.calledAgentIds[0])
    expect(result.reviewerAgentIds).toEqual(result.calledAgentIds.slice(1))
  })

  it('returns one called agent and no reviewers for single-agent deterministic fallback', async () => {
    const result = await runAgentRuntime({
      mode: 'ask',
      activeStage: 'cost',
      question: 'Ask only Cost Modeling.',
      executionMode: 'single_agent',
      requestedAgentId: 'cost_modeling',
      snapshotVersion: 'snapshot:single-agent',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
    }, { runtime: 'local' })

    expect(result.calledAgentIds).toEqual(['cost_modeling'])
    expect(result.primaryAgentId).toBe('cost_modeling')
    expect(result.reviewerAgentIds).toEqual([])
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
        runtime: {
          status: 'provider_llm',
          providerRunId: 'run:evidence',
          agentInvocationProof: ['call_cost_modeling_agent'],
          startedAt: '2026-05-25T00:00:00.000Z',
          completedAt: '2026-05-25T00:00:01.000Z',
        },
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

  it('surfaces C2 benchmark RAG refs in deterministic fallback evidence for optimization reviews', async () => {
    const result = await runAgentRuntime({
      mode: 'ask',
      activeStage: 'optimize',
      question: 'Can routing use GPT-5.5 for the expensive workflow?',
      executionMode: 'stage_committee',
      snapshotVersion: 'snapshot:c2-rag',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
      ragCollections: {
        official_docs: [{ id: 'openai-api-pricing', text: 'Official pricing source.', refs: ['source:openai-api-pricing'] }],
        benchmark_evidence: [{
          id: 'evidence:artificial-analysis-models:gpt-5-5:intelligence-index',
          text: 'GPT-5.5 intelligence_index: 74.',
          refs: ['evidence:artificial-analysis-models'],
        }],
        decision_history: [{ id: 'decision:routing-hold', text: 'Held routing until benchmark review.', refs: ['decision:routing-hold'] }],
      },
    }, { runtime: 'local' })

    expect(result.runtime.status).toBe('deterministic_preview')
    expect(result.calledAgentIds).toEqual([])
    expect(result.events[0].calledAgentTool).toBeNull()
    expect(result.evidenceCoverage.benchmarkEvidence).toMatchObject({
      found: true,
      refs: ['evidence:artificial-analysis-models'],
      warnings: [],
    })
    expect(result.evidenceRefs).toContain('evidence:artificial-analysis-models')
    expect(result.warnings).not.toContain('baseline_unavailable')
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
    expect(result.runtime.status).toBe('unavailable')
    expect(result.runtime.fallbackReason).toContain('503')
    expect(result.answer).toContain('tool:monthlyAiCogs')
    expect(result.toolResultRefs).toEqual(['tool:monthlyAiCogs'])
    expect(result.calledAgentIds).toEqual([])
    expect(result.primaryAgentId).toBeNull()
    expect(result.events).toHaveLength(1)
    expect(result.events[0].type).toBe('runtime_unavailable')
    expect(result.events[0].calledAgentTool).toBeNull()
    expect(result.events[0].agentId).toBeNull()
    expect(result.snapshotVersion).toBe('snapshot:fallback')
    expect(result.supervisorSummary).toContain('unavailable')
    expect(result.decisionReadiness).toBe('needs_review')
  })

  it('does not claim a HITL checkpoint interrupt when the server runtime falls back', async () => {
    const result = await runAgentRuntime({
      mode: 'decision_support',
      activeStage: 'decision-log',
      question: 'Pause before agent delegation.',
      executionMode: 'stage_committee',
      snapshotVersion: 'snapshot:fallback-hitl',
      toolResults: { monthlyAiCogs: 4820 },
      deterministicEvents: [],
      thresholdPolicy: {},
      metricFlags: [],
      riskCards: [],
      benchmarkCards: [],
      decisionHistory: [],
      factSources: [],
      operatingAgents: OPERATING_AGENTS.map(agent => ({ ...agent })),
      hitlCheckpoint: true,
      checkpointThreadId: 'thread-fallback-hitl',
      checkpointNamespace: 'agentpayroll',
    }, {
      runtime: 'server',
      fetcher: vi.fn(async () => new Response(JSON.stringify({ error: 'down' }), { status: 503 })),
    })

    expect(result.llmMode).toBe('deterministic-fallback')
    expect(result.runtime.status).toBe('unavailable')
    expect(result.runtime.checkpoint).toMatchObject({
      persistence: 'not_configured',
      threadId: 'thread-fallback-hitl',
      status: 'not_required',
      reason: expect.stringContaining('503'),
    })
    expect(result.runtime.checkpoint?.interruptId).toBeNull()
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

    expect(result.runtime.status).toBe('deterministic_preview')
    expect(result.calledAgentIds).toEqual([])
    expect(result.primaryAgentId).toBeNull()
    expect(result.events).toHaveLength(1)
    expect(result.events[0].type).toBe('deterministic_preview')
    expect(result.events[0].calledAgentTool).toBeNull()
    expect(result.warnings).toContain('trust pipeline requires review before snapshot use')
  })
})
