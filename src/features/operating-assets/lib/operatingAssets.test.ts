import { describe, expect, it } from 'vitest'
import {
  ACTIVE_OPERATING_AGENT_IDS,
  CORE_OPERATING_AGENT_IDS,
  OPERATING_AGENTS,
  OPERATING_ASSETS,
  P1_AUTOMATION_MODULES,
  operatingAssetsForAgent,
  p0OperatingAssetSummary,
} from './operatingAssets'

describe('operatingAssets', () => {
  it('defines the P0 operating asset registry and surfaces all eleven operating agents', () => {
    expect(OPERATING_ASSETS.map(asset => asset.id)).toEqual([
      'provider_registry',
      'model_perf_matrix',
      'cost_formula_registry',
      'usage_schema_mapping',
      'calculation_snapshots',
      'optimization_playbook',
      'pricing_policy_library',
      'customer_cost_review',
      'security_runbook',
      'operating_ledger',
    ])

    expect(ACTIVE_OPERATING_AGENT_IDS).toHaveLength(11)
    expect(ACTIVE_OPERATING_AGENT_IDS).toEqual(OPERATING_AGENTS.map(agent => agent.id))
    expect(CORE_OPERATING_AGENT_IDS).toEqual([
      'provider_api_intelligence',
      'model_inference_research',
      'cost_modeling',
      'usage_data_ingestion',
      'cost_engine_qa',
      'customer_diagnostic_pricing',
    ])
    expect(OPERATING_AGENTS.map(agent => agent.id)).toEqual([
      'provider_api_intelligence',
      'model_inference_research',
      'cost_modeling',
      'usage_data_ingestion',
      'cost_engine_qa',
      'optimization_routing',
      'customer_diagnostic_pricing',
      'pricing_revenue_ops',
      'trust_security_compliance',
      'finance_ops',
      'knowledge_release_ops',
    ])
  })

  it('maps each active operating agent to owned assets', () => {
    expect(operatingAssetsForAgent('provider_api_intelligence').map(asset => asset.id)).toContain('provider_registry')
    expect(operatingAssetsForAgent('customer_diagnostic_pricing').map(asset => asset.id)).toContain('customer_cost_review')
  })

  it('summarizes active, partial, and later assets for UI health copy', () => {
    const summary = p0OperatingAssetSummary()

    expect(summary.activeAgentCount).toBe(11)
    expect(summary.coreAgentCount).toBe(6)
    expect(summary.totalCount).toBe(10)
    expect(summary.statusLabels).toContain('automation_ready')
    expect(summary.assetRefs).toContain('asset:provider_registry')
  })

  it('keeps deferred integrations in an explicit P1 automation roadmap', () => {
    expect(P1_AUTOMATION_MODULES.map(module => module.id)).toEqual([
      'supervisor_agent_as_tool_orchestration',
      'official_docs_change_monitor',
      'full_vector_rag',
      'sdk_gateway_collection',
      'vllm_gpu_serving_economics',
      'slack_email_alerts',
      'stripe_billing_execution',
      'benchmark_marketplace',
      'customer_facing_saas_dashboard',
      'retention_data_room_automation',
      'trust_pipeline_expansion',
    ])
    expect(P1_AUTOMATION_MODULES.every(module => module.activationCriteria.length > 0)).toBe(true)
    expect(P1_AUTOMATION_MODULES.every(module => module.humanApprovalRequired)).toBe(true)
  })

  it('assigns Official Research Watchtower ownership to provider and release agents', () => {
    const monitor = P1_AUTOMATION_MODULES.find(module => module.id === 'official_docs_change_monitor')

    expect(monitor?.ownerAgentIds).toEqual(['provider_api_intelligence', 'knowledge_release_ops'])
    expect(monitor?.activationCriteria.join(' ')).toMatch(/Watchtower/i)
    expect(monitor?.activationCriteria.join(' ')).toMatch(/China/i)
  })
})
