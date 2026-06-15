export type ConnectorSourceKind = 'llm_usage' | 'billing' | 'outcome' | 'policy'

export type ConnectorSourceId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'langfuse'
  | 'helicone'
  | 'vercel_ai_gateway'
  | 'generic_gateway'
  | 'stripe'
  | 'billing_db'
  | 'manual_revenue_csv'
  | 'product_analytics'
  | 'manual_outcome_csv'
  | 'decision_ledger'
  | 'manual_policy_csv'

export type ConnectorReadinessStatus =
  | 'sample_supported'
  | 'csv_contract_ready'
  | 'connector_not_configured'
  | 'unsupported'

export interface ConnectorFieldContract {
  sourceId: ConnectorSourceId
  kind: ConnectorSourceKind
  label: string
  status: ConnectorReadinessStatus
  normalizedTarget: 'normalized_usage_table' | 'normalized_revenue_table' | 'normalized_outcome_table' | 'decision_ledger'
  requiredColumns: string[]
  optionalColumns: string[]
  forbiddenColumns: string[]
}

export interface ConnectorReadinessSection {
  kind: ConnectorSourceKind
  label: string
  status: ConnectorReadinessStatus
  detail: string
}

export interface ConnectorReadinessReport {
  sections: ConnectorReadinessSection[]
  liveConnectorStatus: ConnectorReadinessStatus
  verifiedColumns: string[]
  summary: string
}

export const CONNECTOR_FORBIDDEN_COLUMNS = [
  'prompt',
  'messages',
  'api_key',
  'email',
  'phone',
  'raw_prompt',
  'secret',
]

const TOKEN_ECONOMY_OPTIONAL_COLUMNS = [
  'session_id',
  'agent_run_id',
  'cache_read_tokens',
  'cache_write_tokens',
  'cached_tokens',
  'tool_call_count',
  'web_search_count',
  'image_input_tokens',
  'audio_input_seconds',
  'latency_ms',
  'status',
]

const USAGE_REQUIRED_COLUMNS = ['customer_id', 'feature', 'model', 'input_tokens', 'output_tokens']

const CONTRACTS: ConnectorFieldContract[] = [
  usageContract('openai', 'OpenAI usage export', 'sample_supported', ['request_id', 'total_cost', ...TOKEN_ECONOMY_OPTIONAL_COLUMNS]),
  usageContract('anthropic', 'Anthropic usage export', 'sample_supported', ['request_id', 'total_cost', ...TOKEN_ECONOMY_OPTIONAL_COLUMNS]),
  usageContract('gemini', 'Gemini usage export', 'sample_supported', ['request_id', 'total_cost', ...TOKEN_ECONOMY_OPTIONAL_COLUMNS]),
  usageContract('langfuse', 'Langfuse traces export', 'sample_supported', ['id', 'cost_usd', 'latency', 'result', ...TOKEN_ECONOMY_OPTIONAL_COLUMNS]),
  usageContract('helicone', 'Helicone sessions export', 'sample_supported', ['request_id', 'total_cost', ...TOKEN_ECONOMY_OPTIONAL_COLUMNS]),
  usageContract('vercel_ai_gateway', 'Vercel AI Gateway export', 'sample_supported', ['request_id', 'provider', 'total_cost', ...TOKEN_ECONOMY_OPTIONAL_COLUMNS]),
  usageContract('generic_gateway', 'Generic LLM gateway CSV', 'csv_contract_ready', ['request_id', 'total_cost', ...TOKEN_ECONOMY_OPTIONAL_COLUMNS]),
  {
    sourceId: 'stripe',
    kind: 'billing',
    label: 'Stripe subscription export',
    status: 'sample_supported',
    normalizedTarget: 'normalized_revenue_table',
    requiredColumns: ['customer_id', 'revenue_collected', 'included_tokens'],
    optionalColumns: ['customer_name', 'plan_id', 'overage_rate_usd_per_1k_tokens', 'subscription_id'],
    forbiddenColumns: CONNECTOR_FORBIDDEN_COLUMNS,
  },
  {
    sourceId: 'billing_db',
    kind: 'billing',
    label: 'Internal billing DB export',
    status: 'sample_supported',
    normalizedTarget: 'normalized_revenue_table',
    requiredColumns: ['customer_id', 'revenue_collected', 'included_tokens'],
    optionalColumns: ['customer_name', 'plan_id', 'overage_rate_usd_per_1k_tokens', 'billing_period'],
    forbiddenColumns: CONNECTOR_FORBIDDEN_COLUMNS,
  },
  {
    sourceId: 'manual_revenue_csv',
    kind: 'billing',
    label: 'Manual revenue CSV',
    status: 'csv_contract_ready',
    normalizedTarget: 'normalized_revenue_table',
    requiredColumns: ['customer_id', 'revenue_collected', 'included_tokens'],
    optionalColumns: ['customer_name', 'plan_id', 'overage_rate_usd_per_1k_tokens'],
    forbiddenColumns: CONNECTOR_FORBIDDEN_COLUMNS,
  },
  {
    sourceId: 'product_analytics',
    kind: 'outcome',
    label: 'Product analytics outcome export',
    status: 'csv_contract_ready',
    normalizedTarget: 'normalized_outcome_table',
    requiredColumns: ['customer_id', 'feature', 'agent_run_id', 'outcome_type', 'outcome_count', 'accepted'],
    optionalColumns: ['timestamp', 'customer_name', 'outcome_value_usd'],
    forbiddenColumns: CONNECTOR_FORBIDDEN_COLUMNS,
  },
  {
    sourceId: 'manual_outcome_csv',
    kind: 'outcome',
    label: 'Manual outcome CSV',
    status: 'sample_supported',
    normalizedTarget: 'normalized_outcome_table',
    requiredColumns: ['customer_id', 'feature', 'agent_run_id', 'outcome_type', 'outcome_count', 'accepted'],
    optionalColumns: ['timestamp', 'customer_name', 'outcome_value_usd'],
    forbiddenColumns: CONNECTOR_FORBIDDEN_COLUMNS,
  },
  {
    sourceId: 'decision_ledger',
    kind: 'policy',
    label: 'AgentPayroll decision ledger',
    status: 'csv_contract_ready',
    normalizedTarget: 'decision_ledger',
    requiredColumns: ['decision_id', 'policy_candidate', 'decision_choice', 'reason'],
    optionalColumns: ['decided_at', 'owner_role', 'connector_status', 'rollback_ref'],
    forbiddenColumns: CONNECTOR_FORBIDDEN_COLUMNS,
  },
  {
    sourceId: 'manual_policy_csv',
    kind: 'policy',
    label: 'Manual policy decision CSV',
    status: 'sample_supported',
    normalizedTarget: 'decision_ledger',
    requiredColumns: ['decision_id', 'policy_candidate', 'decision_choice', 'reason'],
    optionalColumns: ['decided_at', 'owner_role', 'connector_status'],
    forbiddenColumns: CONNECTOR_FORBIDDEN_COLUMNS,
  },
]

function usageContract(
  sourceId: ConnectorSourceId,
  label: string,
  status: ConnectorReadinessStatus,
  optionalColumns: string[],
): ConnectorFieldContract {
  return {
    sourceId,
    kind: 'llm_usage',
    label,
    status,
    normalizedTarget: 'normalized_usage_table',
    requiredColumns: USAGE_REQUIRED_COLUMNS,
    optionalColumns: [...new Set(optionalColumns)],
    forbiddenColumns: CONNECTOR_FORBIDDEN_COLUMNS,
  }
}

export function connectorContractsByKind(kind?: ConnectorSourceKind): ConnectorFieldContract[] {
  return kind ? CONTRACTS.filter(contract => contract.kind === kind) : [...CONTRACTS]
}

export function connectorContractBySource(sourceId: ConnectorSourceId): ConnectorFieldContract | undefined {
  return CONTRACTS.find(contract => contract.sourceId === sourceId)
}

export function connectorReadinessStatusLabel(status: ConnectorReadinessStatus): string {
  if (status === 'sample_supported') return '샘플 지원'
  if (status === 'csv_contract_ready') return 'CSV 계약 준비'
  if (status === 'connector_not_configured') return 'API 미연결'
  return '미지원'
}

export function buildConnectorReadinessReport(input: {
  usageColumns?: string[]
  hasRevenueMapping?: boolean
  hasOutcomeEvents?: boolean
  hasPolicyDecision?: boolean
} = {}): ConnectorReadinessReport {
  const usageColumns = input.usageColumns ?? []
  const verifiedColumns = [...new Set(usageColumns.filter(Boolean))]
  const usageReady = USAGE_REQUIRED_COLUMNS.every(column => verifiedColumns.includes(column))
    || ['customer_id', 'feature', 'model'].every(column => verifiedColumns.includes(column))
  const usageStatus: ConnectorReadinessStatus = usageReady ? 'csv_contract_ready' : 'sample_supported'
  const billingStatus: ConnectorReadinessStatus = input.hasRevenueMapping ? 'sample_supported' : 'csv_contract_ready'
  const outcomeStatus: ConnectorReadinessStatus = input.hasOutcomeEvents ? 'sample_supported' : 'csv_contract_ready'
  const policyStatus: ConnectorReadinessStatus = input.hasPolicyDecision ? 'sample_supported' : 'csv_contract_ready'

  const sections: ConnectorReadinessSection[] = [
    {
      kind: 'llm_usage',
      label: 'LLM 사용량',
      status: usageStatus,
      detail: usageReady
        ? `사용량 CSV 계약 준비: ${verifiedColumns.slice(0, 8).join(', ')}`
        : 'Helicone, Langfuse, OpenAI, Anthropic, Gemini, Vercel AI Gateway CSV 샘플을 지원합니다.',
    },
    {
      kind: 'billing',
      label: '매출/요금제',
      status: billingStatus,
      detail: input.hasRevenueMapping
        ? '고객별 매출, 포함량, 초과 과금 단가를 매핑했습니다.'
        : 'Stripe 또는 billing DB export를 CSV 계약으로 받을 수 있습니다.',
    },
    {
      kind: 'outcome',
      label: '제품 성과 이벤트',
      status: outcomeStatus,
      detail: input.hasOutcomeEvents
        ? 'outcome event가 성과 기준 검증에 연결됐습니다.'
        : 'outcome CSV가 없으면 성과 누수는 부분 검증으로 남깁니다.',
    },
    {
      kind: 'policy',
      label: '정책 결정 기록',
      status: policyStatus,
      detail: input.hasPolicyDecision
        ? '사람의 채택/보류/거절 결정이 리포트 기준으로 고정됐습니다.'
        : '정책 CSV 또는 Decision Ledger 계약은 준비됐고 외부 과금 실행은 하지 않습니다.',
    },
  ]

  return {
    sections,
    liveConnectorStatus: 'connector_not_configured',
    verifiedColumns,
    summary: `${sections[0].detail}. Live API는 ${connectorReadinessStatusLabel('connector_not_configured')} 상태입니다.`,
  }
}
