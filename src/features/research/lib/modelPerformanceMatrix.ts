export type MatrixQualityBasis = 'assumption' | 'third_party_benchmark' | 'official_model_card' | 'internal_eval'
export type MatrixEvidenceStatus = 'verified' | 'needs_review' | 'baseline_unavailable' | 'assumption'
export type MatrixDecisionAuthority = 'routing_allowed' | 'validation_required' | 'review_only'
export type MatrixModality = 'text' | 'image' | 'audio' | 'video'

export interface MatrixModelLike {
  id: string
  name: string
  contextWindow: number
  modalities?: MatrixModality[]
  outputModalities?: MatrixModality[]
}

export interface MatrixBenchmarkRecordLike {
  id: string
  modelIds: string[]
  taskTags: string[]
  metricKinds: string[]
  benchmarkSuite: string[]
  sourceRefs: string[]
  reviewStatus: 'verified' | 'needs_review'
  qualityBasis: MatrixQualityBasis
}

export interface MatrixTaskProfile {
  taskType: string
  requiredInputModalities: MatrixModality[]
  requiredOutputModalities: MatrixModality[]
  minContextTokens: number
  qualityFloor: number
}

export interface ModelPerformanceMatrixRow {
  taskType: string
  modelId: string
  modelName: string
  qualityBasis: MatrixQualityBasis
  evidenceStatus: MatrixEvidenceStatus
  decisionAuthority: MatrixDecisionAuthority
  evidenceRefs: string[]
  benchmarkRecordIds: string[]
  metricKinds: string[]
  benchmarkSuites: string[]
  normalizedQualityScore: number | null
  taskFit: {
    contextWindowOk: boolean
    inputModalitiesOk: boolean
    outputModalitiesOk: boolean
  }
  risk: string
  capturedAt: string
}

export interface RoutingGate {
  allowed: boolean
  status: MatrixDecisionAuthority
  warnings: string[]
  refs: string[]
}

const DEFAULT_TASK_PROFILES: MatrixTaskProfile[] = [
  {
    taskType: 'classification',
    requiredInputModalities: ['text'],
    requiredOutputModalities: ['text'],
    minContextTokens: 4_000,
    qualityFloor: 0.75,
  },
  {
    taskType: 'report_generation',
    requiredInputModalities: ['text'],
    requiredOutputModalities: ['text'],
    minContextTokens: 16_000,
    qualityFloor: 0.86,
  },
  {
    taskType: 'customer_support',
    requiredInputModalities: ['text'],
    requiredOutputModalities: ['text'],
    minContextTokens: 8_000,
    qualityFloor: 0.8,
  },
]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function modelModalities(model: MatrixModelLike, key: 'modalities' | 'outputModalities'): MatrixModality[] {
  const values = model[key]
  return values && values.length > 0 ? values : ['text']
}

function hasEvery(required: MatrixModality[], actual: MatrixModality[]): boolean {
  return required.every(item => actual.includes(item))
}

function recordMatchesTask(record: MatrixBenchmarkRecordLike, taskType: string): boolean {
  const tags = record.taskTags.map(tag => tag.toLowerCase())
  return tags.includes(taskType.toLowerCase()) || tags.includes('routing') || tags.includes('general')
}

function strongestBasis(records: MatrixBenchmarkRecordLike[]): MatrixQualityBasis {
  if (records.some(record => record.qualityBasis === 'internal_eval')) return 'internal_eval'
  if (records.some(record => record.qualityBasis === 'third_party_benchmark')) return 'third_party_benchmark'
  if (records.some(record => record.qualityBasis === 'official_model_card')) return 'official_model_card'
  return 'assumption'
}

function evidenceStatus(records: MatrixBenchmarkRecordLike[]): MatrixEvidenceStatus {
  if (records.length === 0) return 'baseline_unavailable'
  if (records.some(record => record.reviewStatus === 'verified')) return 'verified'
  if (records.some(record => record.qualityBasis === 'assumption')) return 'assumption'
  return 'needs_review'
}

function decisionAuthority(input: {
  status: MatrixEvidenceStatus
  taskFit: ModelPerformanceMatrixRow['taskFit']
}): MatrixDecisionAuthority {
  const fitOk = input.taskFit.contextWindowOk
    && input.taskFit.inputModalitiesOk
    && input.taskFit.outputModalitiesOk
  if (!fitOk) return 'review_only'
  if (input.status === 'verified') return 'routing_allowed'
  if (input.status === 'needs_review' || input.status === 'assumption') return 'validation_required'
  return 'review_only'
}

function riskText(input: {
  status: MatrixEvidenceStatus
  authority: MatrixDecisionAuthority
  taskType: string
}): string {
  if (input.authority === 'routing_allowed') {
    return `${input.taskType} routing has verified model performance evidence.`
  }
  if (input.status === 'baseline_unavailable') {
    return `${input.taskType} has no benchmark baseline for this model; keep routing as review-only.`
  }
  return `${input.taskType} routing requires human quality validation before production adoption.`
}

export function buildModelPerformanceMatrix(input: {
  models: MatrixModelLike[]
  benchmarkRecords?: MatrixBenchmarkRecordLike[]
  taskProfiles?: MatrixTaskProfile[]
  capturedAt?: string
}): ModelPerformanceMatrixRow[] {
  const records = input.benchmarkRecords ?? []
  const taskProfiles = input.taskProfiles ?? DEFAULT_TASK_PROFILES
  const capturedAt = input.capturedAt ?? new Date().toISOString()

  return input.models.flatMap(model => taskProfiles.map(task => {
    const matched = records.filter(record => (
      record.modelIds.includes(model.id) && recordMatchesTask(record, task.taskType)
    ))
    const status = evidenceStatus(matched)
    const taskFit = {
      contextWindowOk: model.contextWindow >= task.minContextTokens,
      inputModalitiesOk: hasEvery(task.requiredInputModalities, modelModalities(model, 'modalities')),
      outputModalitiesOk: hasEvery(task.requiredOutputModalities, modelModalities(model, 'outputModalities')),
    }
    const authority = decisionAuthority({ status, taskFit })

    return {
      taskType: task.taskType,
      modelId: model.id,
      modelName: model.name,
      qualityBasis: matched.length > 0 ? strongestBasis(matched) : 'assumption',
      evidenceStatus: status,
      decisionAuthority: authority,
      evidenceRefs: unique(matched.flatMap(record => record.sourceRefs)),
      benchmarkRecordIds: matched.map(record => record.id),
      metricKinds: unique(matched.flatMap(record => record.metricKinds)),
      benchmarkSuites: unique(matched.flatMap(record => record.benchmarkSuite)),
      normalizedQualityScore: null,
      taskFit,
      risk: riskText({ status, authority, taskType: task.taskType }),
      capturedAt,
    }
  }))
}

export function routingGateForMatrixRow(row: ModelPerformanceMatrixRow | undefined): RoutingGate {
  if (!row) {
    return {
      allowed: false,
      status: 'review_only',
      warnings: ['model_perf_matrix_row_missing'],
      refs: [],
    }
  }
  if (row.decisionAuthority === 'routing_allowed') {
    return {
      allowed: true,
      status: row.decisionAuthority,
      warnings: [],
      refs: row.evidenceRefs,
    }
  }
  return {
    allowed: false,
    status: row.decisionAuthority,
    warnings: [row.evidenceStatus],
    refs: row.evidenceRefs,
  }
}
