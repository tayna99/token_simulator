export type OperatingAgentId =
  | 'provider_api_intelligence'
  | 'model_inference_research'
  | 'cost_modeling'
  | 'usage_data_ingestion'
  | 'cost_engine_qa'
  | 'optimization_routing'
  | 'customer_diagnostic_pricing'
  | 'pricing_revenue_ops'
  | 'trust_security_compliance'
  | 'finance_ops'
  | 'knowledge_release_ops'

export type OperatingAssetId =
  | 'provider_registry'
  | 'model_perf_matrix'
  | 'cost_formula_registry'
  | 'usage_schema_mapping'
  | 'calculation_snapshots'
  | 'optimization_playbook'
  | 'pricing_policy_library'
  | 'customer_cost_review'
  | 'security_runbook'
  | 'operating_ledger'

export type OperatingAgentActivation = 'core_active' | 'workflow_active' | 'guardrail_active' | 'ops_active'
export type OperatingAssetStatus = 'active' | 'partial' | 'automation_ready'

export interface OperatingAgent {
  id: OperatingAgentId
  label: string
  role: string
  activation: OperatingAgentActivation
  ownedAssetIds: OperatingAssetId[]
}

export interface OperatingAsset {
  id: OperatingAssetId
  label: string
  ownerAgentIds: OperatingAgentId[]
  status: OperatingAssetStatus
  ref: `asset:${OperatingAssetId}`
}

export interface P1AutomationModule {
  id:
    | 'supervisor_agent_as_tool_orchestration'
    | 'official_docs_change_monitor'
    | 'full_vector_rag'
    | 'sdk_gateway_collection'
    | 'vllm_gpu_serving_economics'
    | 'slack_email_alerts'
    | 'stripe_billing_execution'
    | 'benchmark_marketplace'
    | 'customer_facing_saas_dashboard'
    | 'retention_data_room_automation'
    | 'trust_pipeline_expansion'
  label: string
  ownerAgentIds: OperatingAgentId[]
  activationCriteria: string[]
  humanApprovalRequired: boolean
}

export const OPERATING_ASSETS: OperatingAsset[] = [
  {
    id: 'provider_registry',
    label: 'Provider Registry',
    ownerAgentIds: ['provider_api_intelligence'],
    status: 'active',
    ref: 'asset:provider_registry',
  },
  {
    id: 'model_perf_matrix',
    label: 'Model Performance Matrix',
    ownerAgentIds: ['model_inference_research'],
    status: 'partial',
    ref: 'asset:model_perf_matrix',
  },
  {
    id: 'cost_formula_registry',
    label: 'Cost Formula Registry',
    ownerAgentIds: ['cost_modeling', 'cost_engine_qa'],
    status: 'active',
    ref: 'asset:cost_formula_registry',
  },
  {
    id: 'usage_schema_mapping',
    label: 'Usage Schema Mapping',
    ownerAgentIds: ['usage_data_ingestion'],
    status: 'active',
    ref: 'asset:usage_schema_mapping',
  },
  {
    id: 'calculation_snapshots',
    label: 'Calculation Snapshots',
    ownerAgentIds: ['cost_engine_qa'],
    status: 'active',
    ref: 'asset:calculation_snapshots',
  },
  {
    id: 'optimization_playbook',
    label: 'Optimization Playbook',
    ownerAgentIds: ['optimization_routing'],
    status: 'active',
    ref: 'asset:optimization_playbook',
  },
  {
    id: 'pricing_policy_library',
    label: 'Pricing Policy Library',
    ownerAgentIds: ['pricing_revenue_ops', 'finance_ops'],
    status: 'partial',
    ref: 'asset:pricing_policy_library',
  },
  {
    id: 'customer_cost_review',
    label: 'Customer Cost Review',
    ownerAgentIds: ['customer_diagnostic_pricing', 'finance_ops'],
    status: 'active',
    ref: 'asset:customer_cost_review',
  },
  {
    id: 'security_runbook',
    label: 'Security Runbook',
    ownerAgentIds: ['trust_security_compliance'],
    status: 'partial',
    ref: 'asset:security_runbook',
  },
  {
    id: 'operating_ledger',
    label: 'Operating Ledger',
    ownerAgentIds: ['knowledge_release_ops', 'finance_ops'],
    status: 'active',
    ref: 'asset:operating_ledger',
  },
]

export const OPERATING_AGENTS: OperatingAgent[] = [
  {
    id: 'provider_api_intelligence',
    label: 'Provider & API Intelligence Agent',
    role: 'Official pricing, model/API conditions, source freshness',
    activation: 'core_active',
    ownedAssetIds: ['provider_registry'],
  },
  {
    id: 'model_inference_research',
    label: 'Model & Inference Research Agent',
    role: 'Task/model fit, quality assumptions, routing evidence',
    activation: 'core_active',
    ownedAssetIds: ['model_perf_matrix'],
  },
  {
    id: 'cost_modeling',
    label: 'Cost Modeling Agent',
    role: 'Cost formula versions and margin definitions',
    activation: 'core_active',
    ownedAssetIds: ['cost_formula_registry'],
  },
  {
    id: 'usage_data_ingestion',
    label: 'Usage Data Ingestion Agent',
    role: 'CSV/export normalization, import health, schema mapping',
    activation: 'core_active',
    ownedAssetIds: ['usage_schema_mapping'],
  },
  {
    id: 'cost_engine_qa',
    label: 'Cost Engine / QA Agent',
    role: 'Deterministic engine snapshots, refs, regression tests',
    activation: 'core_active',
    ownedAssetIds: ['cost_formula_registry', 'calculation_snapshots'],
  },
  {
    id: 'optimization_routing',
    label: 'Optimization & Routing Agent',
    role: 'Caching, routing, batching, output caps, review gates',
    activation: 'workflow_active',
    ownedAssetIds: ['optimization_playbook'],
  },
  {
    id: 'customer_diagnostic_pricing',
    label: 'Customer Diagnostic / Pricing Agent',
    role: 'Monthly cost review, loss customers, plan-level margin',
    activation: 'core_active',
    ownedAssetIds: ['customer_cost_review'],
  },
  {
    id: 'pricing_revenue_ops',
    label: 'Pricing & Revenue Ops Agent',
    role: 'Pricing scenarios, credit/overage/cap policy',
    activation: 'workflow_active',
    ownedAssetIds: ['pricing_policy_library'],
  },
  {
    id: 'trust_security_compliance',
    label: 'Trust / Security / Compliance Agent',
    role: 'PII redaction, retention, AI output guard, audit posture',
    activation: 'guardrail_active',
    ownedAssetIds: ['security_runbook'],
  },
  {
    id: 'finance_ops',
    label: 'Finance Ops Agent',
    role: 'Dogfooding, own serving cost, runway and billing readiness',
    activation: 'ops_active',
    ownedAssetIds: ['pricing_policy_library', 'customer_cost_review', 'operating_ledger'],
  },
  {
    id: 'knowledge_release_ops',
    label: 'Knowledge & Release Ops Agent',
    role: 'Change logs, release notes, runbooks, operating ledger',
    activation: 'ops_active',
    ownedAssetIds: ['operating_ledger'],
  },
]

export const ACTIVE_OPERATING_AGENT_IDS = OPERATING_AGENTS.map(agent => agent.id)

export const CORE_OPERATING_AGENT_IDS: OperatingAgentId[] = [
  'provider_api_intelligence',
  'model_inference_research',
  'cost_modeling',
  'usage_data_ingestion',
  'cost_engine_qa',
  'customer_diagnostic_pricing',
]

export const P1_AUTOMATION_MODULES: P1AutomationModule[] = [
  {
    id: 'supervisor_agent_as_tool_orchestration',
    label: 'Supervisor Agent-as-Tool orchestration',
    ownerAgentIds: ['knowledge_release_ops', 'cost_engine_qa', 'trust_security_compliance'],
    activationCriteria: ['Stage router selects primary/reviewer agents', 'Supervisor synthesis preserves tool refs'],
    humanApprovalRequired: true,
  },
  {
    id: 'official_docs_change_monitor',
    label: 'Official docs change monitor',
    ownerAgentIds: ['provider_api_intelligence', 'knowledge_release_ops'],
    activationCriteria: [
      'Official Research Watchtower source registry diff',
      'China provider coverage for Qwen, Kimi, DeepSeek, GLM, MiniMax, Doubao, ERNIE, Hunyuan, and StepFun',
      'Human approval before Fact Ledger update',
    ],
    humanApprovalRequired: true,
  },
  {
    id: 'full_vector_rag',
    label: 'Full vector RAG',
    ownerAgentIds: ['model_inference_research', 'knowledge_release_ops'],
    activationCriteria: ['Separated official-doc, benchmark, and decision-history retrievers'],
    humanApprovalRequired: true,
  },
  {
    id: 'sdk_gateway_collection',
    label: 'SDK/Gateway automatic collection',
    ownerAgentIds: ['usage_data_ingestion', 'trust_security_compliance', 'cost_engine_qa'],
    activationCriteria: ['Adapter passes Trust Intake', 'Normalized usage table includes required dimensions'],
    humanApprovalRequired: true,
  },
  {
    id: 'vllm_gpu_serving_economics',
    label: 'vLLM/GPU serving economics',
    ownerAgentIds: ['model_inference_research', 'cost_modeling'],
    activationCriteria: ['TTFT, ITL/TPOT, throughput, KV cache, and GPU utilization inputs'],
    humanApprovalRequired: true,
  },
  {
    id: 'slack_email_alerts',
    label: 'Slack/Email alerts',
    ownerAgentIds: ['trust_security_compliance', 'knowledge_release_ops'],
    activationCriteria: ['Threshold policy source', 'Decision follow-up owner', 'Opt-in destination'],
    humanApprovalRequired: true,
  },
  {
    id: 'stripe_billing_execution',
    label: 'Stripe billing execution',
    ownerAgentIds: ['pricing_revenue_ops', 'finance_ops'],
    activationCriteria: ['Adopted pricing decision', 'Rollback path', 'Explicit billing approval'],
    humanApprovalRequired: true,
  },
  {
    id: 'benchmark_marketplace',
    label: 'Benchmark marketplace',
    ownerAgentIds: ['model_inference_research', 'customer_diagnostic_pricing'],
    activationCriteria: ['Verified peer corpus', 'Evidence IDs', 'Baseline unavailable fallback'],
    humanApprovalRequired: true,
  },
  {
    id: 'customer_facing_saas_dashboard',
    label: 'Customer-facing SaaS dashboard',
    ownerAgentIds: ['customer_diagnostic_pricing', 'finance_ops', 'knowledge_release_ops'],
    activationCriteria: ['Workspace home', 'Monthly review history', 'Decision ledger and report export'],
    humanApprovalRequired: true,
  },
  {
    id: 'retention_data_room_automation',
    label: 'Retention/Data room automation',
    ownerAgentIds: ['trust_security_compliance', 'knowledge_release_ops'],
    activationCriteria: ['No raw prompt/API key/PII storage', 'Audit export and artifact inventory'],
    humanApprovalRequired: true,
  },
  {
    id: 'trust_pipeline_expansion',
    label: 'Trust pipeline expansion',
    ownerAgentIds: ['trust_security_compliance', 'usage_data_ingestion'],
    activationCriteria: ['Raw prompt block', 'PII/API key detection', 'Schema health gating'],
    humanApprovalRequired: true,
  },
]

export function operatingAssetsForAgent(agentId: OperatingAgentId): OperatingAsset[] {
  return OPERATING_ASSETS.filter(asset => asset.ownerAgentIds.includes(agentId))
}

export function p0OperatingAssetSummary() {
  return {
    activeAgentCount: ACTIVE_OPERATING_AGENT_IDS.length,
    coreAgentCount: CORE_OPERATING_AGENT_IDS.length,
    totalCount: OPERATING_ASSETS.length,
    statusLabels: [...new Set([
      ...OPERATING_ASSETS.map(asset => asset.status),
      'automation_ready' as const,
    ])],
    assetRefs: OPERATING_ASSETS.map(asset => asset.ref),
    automationModuleCount: P1_AUTOMATION_MODULES.length,
  }
}
