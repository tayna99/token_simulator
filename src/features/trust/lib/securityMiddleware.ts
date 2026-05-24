import { DEFAULT_DATA_INTAKE_POLICY, type TrustWarning } from './dataIntakePolicy'

export type TrustInspectionStatus = 'ready' | 'needs_mapping' | 'blocked'
export type AnonymizationStatus = 'not_needed' | 'required' | 'blocked'

export interface TrustAnalysisScope {
  available: string[]
  blocked: string[]
}

export interface TrustInspectionInput {
  filename: string
  rawCsv: string
}

export interface TrustInspectionResult {
  status: TrustInspectionStatus
  warnings: TrustWarning[]
  allowedForSnapshot: boolean
  anonymizationStatus: AnonymizationStatus
  retentionNote: string
  analysisScope: TrustAnalysisScope
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

  if (containsRawPrompt(headers)) warnings.push('raw_prompt_detected')
  if (containsApiKey(input.rawCsv, headers)) warnings.push('api_key_candidate_detected')
  if (containsPii(input.rawCsv)) warnings.push('pii_candidate_detected')
  if (!headers.has('plan_id')) warnings.push('plan_id_missing')
  if (!headers.has('customer_id')) warnings.push('customer_id_missing')
  if (!headers.has('revenue') && !headers.has('subscription_plan_price')) warnings.push('revenue_missing')

  const blocked = warnings.includes('raw_prompt_detected') || warnings.includes('api_key_candidate_detected')
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
