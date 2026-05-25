import { DEFAULT_DATA_INTAKE_POLICY, type TrustWarning } from './dataIntakePolicy'

export type TrustInspectionStatus = 'ready' | 'needs_mapping' | 'blocked'
export type AnonymizationStatus = 'not_needed' | 'required' | 'blocked'
export type UsageIngressKind = 'csv' | 'summary' | 'sdk_lite' | 'demo_seed'
export type TrustGateDecision = 'allowed' | 'blocked' | 'needs_mapping'

export interface TrustAnalysisScope {
  available: string[]
  blocked: string[]
}

export interface TrustInspectionInput {
  filename: string
  rawCsv: string
  ingressKind?: UsageIngressKind
  source?: string
  fileSizeBytes?: number
  workspaceId?: string
}

export interface TrustInspectionResult {
  status: TrustInspectionStatus
  warnings: TrustWarning[]
  allowedForSnapshot: boolean
  anonymizationStatus: AnonymizationStatus
  retentionNote: string
  analysisScope: TrustAnalysisScope
}

export interface UsageIngressValidationInput {
  ingressKind: UsageIngressKind
  source?: string
  rawCsv?: string
  summary?: unknown
  fileName?: string
  fileSizeBytes?: number
  workspaceId?: string
}

export interface UsageIngressValidationResult {
  decision: TrustGateDecision
  allowedForSnapshot: boolean
  inspection: TrustInspectionResult | null
  blockedReason?: 'missing_trust_inspection' | 'trust_inspection_blocked' | 'missing_raw_csv' | 'demo_seed_not_explicitly_allowed'
  retentionJobRequired?: boolean
}

function fileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

function headerSet(rawCsv: string): Set<string> {
  const firstLine = rawCsv.split(/\r?\n/)[0] ?? ''
  return new Set(firstLine.split(',').map(item => item.trim()))
}

function hasAny(headers: Set<string>, names: string[]): boolean {
  return names.some(name => headers.has(name))
}

function containsRawPrompt(headers: Set<string>): boolean {
  return hasAny(headers, ['prompt', 'raw_prompt', 'messages', 'conversation', 'transcript'])
}

function containsApiKey(rawCsv: string, headers: Set<string>): boolean {
  return hasAny(headers, ['api_key', 'apikey', 'openai_api_key', 'provider_api_key'])
    || /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{4,}\b/.test(rawCsv)
}

function containsPii(rawCsv: string): boolean {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(rawCsv)
    || /\b(?:\+?\d[\d\s().-]{7,}\d)\b/.test(rawCsv)
}

function availableScopes(headers: Set<string>): string[] {
  const scopes = ['feature_cost', 'model_cost']
  if (headers.has('retry_count') || headers.has('status')) scopes.push('retry_cost')
  if (headers.has('customer_id')) scopes.push('customer_cost')
  if (headers.has('plan_id')) scopes.push('plan_cost')
  return scopes
}

function blockedScopes(headers: Set<string>, blocked: boolean): string[] {
  if (blocked) return ['all_analysis']
  return [
    ...(headers.has('plan_id') ? [] : ['plan_margin']),
    ...(headers.has('customer_id') ? [] : ['customer_profitability']),
    ...(headers.has('revenue') || headers.has('subscription_plan_price') ? [] : ['loss_customer']),
  ]
}

export function inspectUsageImportSecurity(input: TrustInspectionInput): TrustInspectionResult {
  const headers = headerSet(input.rawCsv)
  const warnings: TrustWarning[] = []
  const extension = fileExtension(input.filename)
  const maxFileSizeBytes = DEFAULT_DATA_INTAKE_POLICY.maxFileSizeMb * 1024 * 1024

  if (extension && !DEFAULT_DATA_INTAKE_POLICY.allowedFileTypes.includes(extension as 'csv' | 'jsonl')) {
    warnings.push('file_type_not_allowed')
  }
  if (typeof input.fileSizeBytes === 'number' && input.fileSizeBytes > maxFileSizeBytes) {
    warnings.push('file_size_exceeded')
  }

  if (containsRawPrompt(headers)) warnings.push('raw_prompt_detected')
  if (containsApiKey(input.rawCsv, headers)) warnings.push('api_key_candidate_detected')
  if (containsPii(input.rawCsv)) warnings.push('pii_candidate_detected')
  if (!headers.has('plan_id')) warnings.push('plan_id_missing')
  if (!headers.has('customer_id')) warnings.push('customer_id_missing')
  if (!headers.has('revenue') && !headers.has('subscription_plan_price')) warnings.push('revenue_missing')

  const blocked = warnings.includes('raw_prompt_detected')
    || warnings.includes('api_key_candidate_detected')
    || warnings.includes('file_type_not_allowed')
    || warnings.includes('file_size_exceeded')
  const needsMapping = warnings.some(warning => (
    warning === 'plan_id_missing'
    || warning === 'customer_id_missing'
    || warning === 'revenue_missing'
    || warning === 'pii_candidate_detected'
  ))

  return {
    status: blocked ? 'blocked' : needsMapping ? 'needs_mapping' : 'ready',
    warnings,
    allowedForSnapshot: !blocked,
    anonymizationStatus: blocked ? 'blocked' : warnings.includes('pii_candidate_detected') ? 'required' : 'not_needed',
    retentionNote: `Raw upload should be deleted or re-confirmed after ${DEFAULT_DATA_INTAKE_POLICY.retentionDays} days.`,
    analysisScope: {
      available: blocked ? [] : availableScopes(headers),
      blocked: blockedScopes(headers, blocked),
    },
  }
}

function isTrustInspectionResult(value: unknown): value is TrustInspectionResult {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<TrustInspectionResult>
  return (candidate.status === 'ready' || candidate.status === 'needs_mapping' || candidate.status === 'blocked')
    && typeof candidate.allowedForSnapshot === 'boolean'
    && (candidate.anonymizationStatus === 'not_needed' || candidate.anonymizationStatus === 'required' || candidate.anonymizationStatus === 'blocked')
    && typeof candidate.retentionNote === 'string'
    && Array.isArray(candidate.warnings)
    && !!candidate.analysisScope
    && Array.isArray(candidate.analysisScope.available)
    && Array.isArray(candidate.analysisScope.blocked)
}

function trustGateDecision(inspection: TrustInspectionResult): UsageIngressValidationResult {
  if (!inspection.allowedForSnapshot || inspection.status === 'blocked') {
    return {
      decision: 'blocked',
      allowedForSnapshot: false,
      inspection,
      blockedReason: 'trust_inspection_blocked',
      retentionJobRequired: inspection.retentionNote.length > 0,
    }
  }
  return {
    decision: inspection.status === 'needs_mapping' ? 'needs_mapping' : 'allowed',
    allowedForSnapshot: true,
    inspection,
    retentionJobRequired: inspection.retentionNote.length > 0,
  }
}

export function validateUsageIngress(input: UsageIngressValidationInput): UsageIngressValidationResult {
  if (input.ingressKind === 'demo_seed') {
    return {
      decision: 'allowed',
      allowedForSnapshot: true,
      inspection: null,
    }
  }

  if (input.ingressKind === 'csv' || input.ingressKind === 'sdk_lite') {
    if (typeof input.rawCsv !== 'string') {
      return {
        decision: 'blocked',
        allowedForSnapshot: false,
        inspection: null,
        blockedReason: 'missing_raw_csv',
      }
    }
    return trustGateDecision(inspectUsageImportSecurity({
      filename: input.fileName ?? `${input.source ?? input.ingressKind}.csv`,
      rawCsv: input.rawCsv,
      ingressKind: input.ingressKind,
      source: input.source,
      fileSizeBytes: input.fileSizeBytes,
      workspaceId: input.workspaceId,
    }))
  }

  const summary = input.summary as { trustInspection?: unknown } | null
  if (!summary || !isTrustInspectionResult(summary.trustInspection)) {
    return {
      decision: 'blocked',
      allowedForSnapshot: false,
      inspection: null,
      blockedReason: 'missing_trust_inspection',
    }
  }
  return trustGateDecision(summary.trustInspection)
}
