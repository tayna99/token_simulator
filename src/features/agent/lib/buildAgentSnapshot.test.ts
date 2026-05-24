import { describe, expect, it } from 'vitest'
import { buildAgentSnapshot } from './buildAgentSnapshot'
import { AGENTCOST_FRONT_OPERATING_SYSTEM } from '../../front-operating/lib/frontOperatingContext'

const baseInput = {
  activeStage: 'cost' as const,
  toolResults: {
    monthlyAiCogs: 4820,
    'team.monthlyCostUsd': 9200,
  },
  deterministicEvents: [],
  thresholdPolicy: {
    gross_margin_thin_pct: { currentValue: 0.4, policyVersion: 'v0' },
  },
  metricFlags: [{ metricId: 'gross_margin', basisRef: 'basis:rule:gross_margin_thin_pct' }],
  riskCards: [{ id: 'risk-model-routing-quality' }],
  benchmarkCards: [],
  decisionHistory: [{ id: 'decision-1', what: 'Adopt credit pricing' }],
  factSources: [{ id: 'fact-openai', provider: 'openai' }],
  operatingAgents: [{ id: 'cost_modeling', label: 'Cost Modeling Agent' }],
  operatingAssets: [{ id: 'cost_formula_registry', ref: 'asset:cost_formula_registry' }],
  providerRegistry: [{ id: 'fact-openai', provider: 'openai' }],
  modelPerfMatrix: [{ taskType: 'classification', modelId: 'gpt-5-mini' }],
  operatingLedger: [{ id: 'ledger-1', workstream: 'Cost Modeling' }],
  officialSourceRegistry: [{ id: 'zai-pricing', modelOwner: 'zai_glm' }],
  officialSourceSnippets: [{ snippetId: 'source:zai-pricing#glm-5', text: 'GLM-5 input price' }],
  modelReleaseCandidates: [{ candidateId: 'zai:glm:z-ai:global', status: 'needs_pricing_review' }],
  pricingFactCandidates: [{ id: 'fact:zai-glm-5', modelFamily: 'glm' }],
  fxRateSnapshots: [{ base: 'CNY', quote: 'USD', rate: null, source: 'manual_review_required' }],
  frontOperatingSystem: AGENTCOST_FRONT_OPERATING_SYSTEM,
}

describe('buildAgentSnapshot', () => {
  it('returns a stable snapshot version for the same deterministic input', () => {
    const first = buildAgentSnapshot(baseInput)
    const second = buildAgentSnapshot({
      ...baseInput,
      toolResults: { ...baseInput.toolResults },
      decisionHistory: [...baseInput.decisionHistory],
    })

    expect(first.snapshotVersion).toBe(second.snapshotVersion)
    expect(first.snapshotVersion).toMatch(/^snapshot:cost:/)
    expect(first.toolResults.monthlyAiCogs).toBe(4820)
    expect(first.decisionHistory).toHaveLength(1)
  })

  it('changes the snapshot version when policy or decision history changes', () => {
    const original = buildAgentSnapshot(baseInput)
    const changedPolicy = buildAgentSnapshot({
      ...baseInput,
      thresholdPolicy: {
        gross_margin_thin_pct: { currentValue: 0.35, policyVersion: 'v1' },
      },
    })
    const changedDecision = buildAgentSnapshot({
      ...baseInput,
      decisionHistory: [
        ...baseInput.decisionHistory,
        { id: 'decision-2', what: 'Hold routing change' },
      ],
    })

    expect(changedPolicy.snapshotVersion).not.toBe(original.snapshotVersion)
    expect(changedDecision.snapshotVersion).not.toBe(original.snapshotVersion)
  })

  it('includes trust, formula, provider, and data limitation metadata', () => {
    const snapshot = buildAgentSnapshot({
      ...baseInput,
      trustInspection: {
        status: 'needs_mapping',
        warnings: ['plan_id_missing'],
        allowedForSnapshot: true,
        anonymizationStatus: 'not_needed',
        retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
        analysisScope: { available: ['feature_cost'], blocked: ['plan_margin'] },
      },
      formulaVersion: 'cost_formula_v0.3',
      providerRegistryVersion: 'provider_registry_v0.4',
    })

    expect(snapshot.trustInspection?.status).toBe('needs_mapping')
    expect(snapshot.formulaVersion).toBe('cost_formula_v0.3')
    expect(snapshot.providerRegistryVersion).toBe('provider_registry_v0.4')
    expect(snapshot.dataLimitations).toContain('plan_margin')
  })

  it('includes Official Research Watchtower metadata in the deterministic snapshot hash', () => {
    const original = buildAgentSnapshot(baseInput)
    const changedCandidate = buildAgentSnapshot({
      ...baseInput,
      modelReleaseCandidates: [
        ...baseInput.modelReleaseCandidates,
        { candidateId: 'kimi:k2-6', status: 'needs_pricing_review' },
      ],
    })

    expect(original.officialSourceRegistry).toHaveLength(1)
    expect(original.officialSourceSnippets).toHaveLength(1)
    expect(original.modelReleaseCandidates).toHaveLength(1)
    expect(original.pricingFactCandidates).toHaveLength(1)
    expect(original.fxRateSnapshots).toHaveLength(1)
    expect(changedCandidate.snapshotVersion).not.toBe(original.snapshotVersion)
  })

  it('includes front operating system context in the deterministic snapshot hash', () => {
    const original = buildAgentSnapshot(baseInput)
    const changedFrontOperating = buildAgentSnapshot({
      ...baseInput,
      frontOperatingSystem: {
        ...AGENTCOST_FRONT_OPERATING_SYSTEM,
        learningLoopRecords: [{ id: 'learning-1', customerId: 'cust_1' }],
      },
    })

    expect(original.frontOperatingSystem).toBeDefined()
    expect(original.frontOperatingSystem?.assets.map(asset => asset.ref)).toContain('asset:icp_scorecard')
    expect(changedFrontOperating.snapshotVersion).not.toBe(original.snapshotVersion)
  })
})
