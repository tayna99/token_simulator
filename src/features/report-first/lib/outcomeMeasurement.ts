import type { UsageImportRow, UsageImportSummary } from '../../usage/lib/usageImport'

export type FeatureMeasurementFeatureType =
  | 'document_generation'
  | 'support_agent'
  | 'rag_search'
  | 'agent_workflow'
  | 'code_data_analysis'
  | 'media_generation'
  | 'general_ai_feature'

export type FeatureMeasurementRequiredData = 'usage_csv' | 'revenue_csv' | 'outcome_csv'
export type OutcomeVerificationStatus = 'unconfigured' | 'partial' | 'verifiable'
export type OutcomeLeakStatus = 'not_configured' | 'needs_outcome_data' | 'healthy' | 'outcome_leak'

export interface FeatureMeasurementContract {
  feature: string
  featureType: FeatureMeasurementFeatureType
  outcomeCriteria: string[]
  outcomeCriteriaLabel: string
  costCriteria: string[]
  costCriteriaLabel: string
  leakCriteriaLabel: string
  outcomeRateThreshold: number
  requiredData: FeatureMeasurementRequiredData[]
}

export interface OutcomeEventRow {
  timestamp: string | null
  customerId: string
  customerName?: string | null
  feature: string
  agentRunId: string
  outcomeType: string
  outcomeCount: number
  outcomeValueUsd?: number
  accepted: boolean
}

export interface OutcomeCsvParseResult {
  rows: OutcomeEventRow[]
  errors: string[]
  mappingWarnings: string[]
}

export interface FeatureOutcomeMeasurement {
  feature: string
  featureType: FeatureMeasurementFeatureType
  outcomeCriteriaLabel: string
  costCriteriaLabel: string
  leakCriteriaLabel: string
  verificationStatus: OutcomeVerificationStatus
  leakStatus: OutcomeLeakStatus
  usedWorkUnits: number
  successfulOutcomeCount: number
  totalCostUsd: number
  actualOutcomeRate: number | null
  costPerSuccessfulOutcomeUsd: number | null
  summary: string
}

const CONTRACTS_BY_TYPE: Record<FeatureMeasurementFeatureType, Omit<FeatureMeasurementContract, 'feature' | 'featureType'>> = {
  document_generation: {
    outcomeCriteria: ['report_downloaded', 'report_shared', 'report_saved', 'decision_used'],
    outcomeCriteriaLabel: '다운로드 또는 공유된 리포트',
    costCriteria: ['generation_cost', 'regeneration_cost', 'output_tokens'],
    costCriteriaLabel: '생성 비용 + 재생성 비용',
    leakCriteriaLabel: '실제 사용률 30% 미만',
    outcomeRateThreshold: 0.3,
    requiredData: ['usage_csv', 'outcome_csv'],
  },
  support_agent: {
    outcomeCriteria: ['ticket_resolved', 'no_human_escalation', 'satisfaction_passed'],
    outcomeCriteriaLabel: '사람에게 넘어가지 않고 해결된 문의',
    costCriteria: ['conversation_cost', 'retry_cost', 'escalation_cost'],
    costCriteriaLabel: '상담 비용 + 재시도 비용',
    leakCriteriaLabel: '해결률 30% 미만',
    outcomeRateThreshold: 0.3,
    requiredData: ['usage_csv', 'outcome_csv'],
  },
  rag_search: {
    outcomeCriteria: ['answer_accepted', 'source_clicked', 'repeat_question_absent'],
    outcomeCriteriaLabel: '채택된 답변 또는 출처 클릭',
    costCriteria: ['embedding_cost', 'vector_search_cost', 'generation_cost'],
    costCriteriaLabel: '검색 비용 + 생성 비용',
    leakCriteriaLabel: '채택률 30% 미만',
    outcomeRateThreshold: 0.3,
    requiredData: ['usage_csv', 'outcome_csv'],
  },
  agent_workflow: {
    outcomeCriteria: ['workflow_completed', 'user_approved', 'task_completed'],
    outcomeCriteriaLabel: '완료 또는 승인된 workflow',
    costCriteria: ['multi_call_cost', 'tool_call_cost', 'retry_cost'],
    costCriteriaLabel: '여러 번 모델 호출 + 실패/재시도',
    leakCriteriaLabel: '완료율 30% 미만',
    outcomeRateThreshold: 0.3,
    requiredData: ['usage_csv', 'outcome_csv'],
  },
  code_data_analysis: {
    outcomeCriteria: ['test_passed', 'query_succeeded', 'review_change_reduced'],
    outcomeCriteriaLabel: '테스트 통과 또는 쿼리 실행 성공',
    costCriteria: ['analysis_cost', 'execution_retry_cost', 'review_cost'],
    costCriteriaLabel: '분석 비용 + 재실행 비용',
    leakCriteriaLabel: '성공률 30% 미만',
    outcomeRateThreshold: 0.3,
    requiredData: ['usage_csv', 'outcome_csv'],
  },
  media_generation: {
    outcomeCriteria: ['asset_downloaded', 'asset_published', 'asset_delivered'],
    outcomeCriteriaLabel: '다운로드 또는 게시된 미디어',
    costCriteria: ['generation_cost', 'gpu_cost', 'regeneration_cost'],
    costCriteriaLabel: '생성 비용 + GPU/재생성 비용',
    leakCriteriaLabel: '사용률 30% 미만',
    outcomeRateThreshold: 0.3,
    requiredData: ['usage_csv', 'outcome_csv'],
  },
  general_ai_feature: {
    outcomeCriteria: ['accepted', 'completed', 'saved'],
    outcomeCriteriaLabel: '채택 또는 완료된 결과',
    costCriteria: ['generation_cost', 'retry_cost'],
    costCriteriaLabel: '생성 비용 + 재시도 비용',
    leakCriteriaLabel: '성공률 30% 미만',
    outcomeRateThreshold: 0.3,
    requiredData: ['usage_csv', 'outcome_csv'],
  },
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function numberFrom(value: string | undefined): number {
  if (!value) return 0
  const parsed = Number(value.replace(/[$,\s]/g, ''))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function optionalNumberFrom(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined
  const parsed = Number(value.replace(/[$,\s]/g, ''))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function booleanFrom(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase()
  return normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'accepted'
}

function valueFor(record: Record<string, string>, accepted: string[]): string | undefined {
  return accepted.map(key => record[normalizeHeader(key)]).find(value => value !== undefined && value !== '')
}

function classifyFeature(feature: string): FeatureMeasurementFeatureType {
  const normalized = feature.toLowerCase()
  if (/report|document|summary|proposal|memo/.test(normalized)) return 'document_generation'
  if (/support|ticket|chat_assistant|cs/.test(normalized)) return 'support_agent'
  if (/rag|search|faq|knowledge/.test(normalized)) return 'rag_search'
  if (/agent|workflow|automation/.test(normalized)) return 'agent_workflow'
  if (/code|sql|data|analysis|debug/.test(normalized)) return 'code_data_analysis'
  if (/image|video|audio|voice|media/.test(normalized)) return 'media_generation'
  return 'general_ai_feature'
}

export function buildMeasurementContractForFeature(feature: string): FeatureMeasurementContract {
  const featureType = classifyFeature(feature)
  return {
    feature,
    featureType,
    ...CONTRACTS_BY_TYPE[featureType],
  }
}

export function buildDefaultFeatureMeasurementContracts(summary: UsageImportSummary): FeatureMeasurementContract[] {
  return summary.featureSummaries.map(feature => buildMeasurementContractForFeature(feature.feature))
}

export function parseOutcomeCsv(rawCsv: string): OutcomeCsvParseResult {
  const result: OutcomeCsvParseResult = {
    rows: [],
    errors: [],
    mappingWarnings: [],
  }
  const lines = rawCsv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return result
  }

  const rawHeaders = parseCsvLine(lines[0])
  const headers = rawHeaders.map(normalizeHeader)
  const required = ['customerid', 'feature', 'agentrunid', 'outcometype', 'outcomecount', 'accepted']
  const missing = required.filter(header => !headers.includes(header))
  if (missing.length > 0) {
    result.errors.push(...missing.map(header => `missing_required_column:${header}`))
    return result
  }

  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line)
    const record = headers.reduce<Record<string, string>>((acc, header, valueIndex) => {
      acc[header] = values[valueIndex] ?? ''
      return acc
    }, {})
    const customerId = valueFor(record, ['customer_id', 'customerId'])
    const feature = valueFor(record, ['feature'])
    const agentRunId = valueFor(record, ['agent_run_id', 'agentRunId', 'run_id'])
    const outcomeType = valueFor(record, ['outcome_type', 'outcomeType'])
    const outcomeCount = numberFrom(valueFor(record, ['outcome_count', 'outcomeCount']))

    if (!customerId || !feature || !agentRunId || !outcomeType) {
      result.mappingWarnings.push(`row_${index + 2}_missing_join_key`)
      return
    }

    result.rows.push({
      timestamp: valueFor(record, ['timestamp', 'created_at']) ?? null,
      customerId,
      customerName: valueFor(record, ['customer_name', 'customerName']) ?? null,
      feature,
      agentRunId,
      outcomeType,
      outcomeCount,
      outcomeValueUsd: optionalNumberFrom(valueFor(record, ['outcome_value_usd', 'outcomeValueUsd'])),
      accepted: booleanFrom(valueFor(record, ['accepted'])),
    })
  })

  return result
}

function workUnitKey(row: UsageImportRow): string {
  return row.agentRunId || row.requestId || `${row.customerId ?? 'unknown'}:${row.feature}:${row.timestamp ?? ''}`
}

function matchingOutcomeEvents(
  usageRows: UsageImportRow[],
  events: OutcomeEventRow[],
  contract: FeatureMeasurementContract,
): OutcomeEventRow[] {
  const usageJoinKeys = new Set(usageRows.map(row => `${row.customerId ?? ''}:${row.feature}:${row.agentRunId ?? ''}`))
  return events.filter(event => (
    event.feature === contract.feature
    && usageJoinKeys.has(`${event.customerId}:${event.feature}:${event.agentRunId}`)
  ))
}

export function verifyFeatureOutcomeMeasurements(input: {
  summary: UsageImportSummary
  contracts: FeatureMeasurementContract[]
  outcomeEvents: OutcomeEventRow[]
}): FeatureOutcomeMeasurement[] {
  return input.contracts.map(contract => {
    const usageRows = input.summary.rows.filter(row => row.feature === contract.feature)
    const workUnits = new Set(usageRows.map(workUnitKey))
    const usedWorkUnits = workUnits.size > 0 ? workUnits.size : usageRows.length
    const totalCostUsd = usageRows.reduce((total, row) => total + Math.max(0, row.totalCostUsd), 0)

    if (input.outcomeEvents.length === 0) {
      return {
        feature: contract.feature,
        featureType: contract.featureType,
        outcomeCriteriaLabel: contract.outcomeCriteriaLabel,
        costCriteriaLabel: contract.costCriteriaLabel,
        leakCriteriaLabel: contract.leakCriteriaLabel,
        verificationStatus: 'partial',
        leakStatus: 'needs_outcome_data',
        usedWorkUnits,
        successfulOutcomeCount: 0,
        totalCostUsd,
        actualOutcomeRate: null,
        costPerSuccessfulOutcomeUsd: null,
        summary: '성과 이벤트 CSV가 없어 성과 누수로 확정하지 않습니다.',
      }
    }

    const matchedEvents = matchingOutcomeEvents(usageRows, input.outcomeEvents, contract)
    const successfulOutcomeCount = matchedEvents
      .filter(event => event.accepted && contract.outcomeCriteria.includes(event.outcomeType))
      .reduce((total, event) => total + event.outcomeCount, 0)
    const actualOutcomeRate = usedWorkUnits > 0 ? successfulOutcomeCount / usedWorkUnits : 0
    const costPerSuccessfulOutcomeUsd = successfulOutcomeCount > 0 ? totalCostUsd / successfulOutcomeCount : null
    const leakStatus: OutcomeLeakStatus = actualOutcomeRate < contract.outcomeRateThreshold ? 'outcome_leak' : 'healthy'
    const summary = leakStatus === 'outcome_leak'
      ? `성과 누수 후보: ${contract.outcomeCriteriaLabel} 기준 실제 사용률이 ${Math.round(actualOutcomeRate * 100)}%입니다.`
      : `${contract.outcomeCriteriaLabel} 기준으로 비용과 성과가 연결됐습니다.`

    return {
      feature: contract.feature,
      featureType: contract.featureType,
      outcomeCriteriaLabel: contract.outcomeCriteriaLabel,
      costCriteriaLabel: contract.costCriteriaLabel,
      leakCriteriaLabel: contract.leakCriteriaLabel,
      verificationStatus: 'verifiable',
      leakStatus,
      usedWorkUnits,
      successfulOutcomeCount,
      totalCostUsd,
      actualOutcomeRate,
      costPerSuccessfulOutcomeUsd,
      summary,
    }
  })
}

export function outcomeVerificationStatusLabel(status: OutcomeVerificationStatus): string {
  if (status === 'verifiable') return '검증 가능'
  if (status === 'partial') return '부분 검증'
  return '성과 기준 미설정'
}
