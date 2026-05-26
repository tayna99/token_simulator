import type { FactSourceSnapshot, ThresholdPolicy } from '../../metrics/lib/thresholdPolicy'
import type { TrustInspectionStatus } from '../../trust/lib/securityMiddleware'
import type { TrustWarning } from '../../trust/lib/dataIntakePolicy'
import type { DecisionChoice } from '../../decision-loop/lib/decisionHeader'
import type { PricingFreshnessBadge } from '../../facts/lib/pricingFreshness'
import type { RateCardDraft } from '../../pricing/lib/rateCardDraft'
import {
  humanApprovalFromDecisionChoice,
  normalizeHumanApprovalMetadata,
  normalizeRuntimeProofMetadata,
  type HumanApprovalMetadata,
  type RuntimeProofMetadata,
} from '../../provenance/lib/runtimeApprovalMetadata'

export type DecisionStatus = 'adopted' | 'rejected' | 'held' | 'superseded'
export type OperatingDecisionKind = 'approve' | 'automate' | 'authority' | 'policy' | 'attribution' | 'ownership'
export type DecisionAiMode = 'llm_assisted' | 'deterministic_fallback' | 'unknown'

export interface OperatingLedgerMetadata {
  workstream: string
  source: string
  agentUsed: string
  proposedChange: string
  humanDecision: string
  artifactUpdated: string
  impact: string
  followUp: string
}

export interface AgentReviewMetadata {
  calledAgentIds: string[]
  primaryAgentId: string | null
  reviewerAgentIds: string[]
  usedCapabilityTools: string[]
  snapshotVersion: string
  supervisorSummary: string
}

export interface TrustReviewMetadata {
  status: TrustInspectionStatus | 'unknown'
  warnings: TrustWarning[] | string[]
  retentionNote: string
}

export interface ReportReviewMetadata {
  noRawPrompt: boolean
  noUncitedNumbers: boolean
  providerSourceVisible: boolean
  formulaVersionVisible: boolean
}

export interface DecisionInput {
  kind?: OperatingDecisionKind
  what: string
  why: string
  assumptions: Record<string, unknown>
  toolResultRefs: string[]
  riskCards: string[]
  status: DecisionStatus
  decisionChoice?: DecisionChoice | null
  createdAt?: string
  performanceSnapshot?: Record<string, unknown>
  costSnapshot?: Record<string, unknown>
  thresholdSnapshot?: Partial<ThresholdPolicy>
  factSourceSnapshot?: FactSourceSnapshot[]
  rateCardDraft?: RateCardDraft | null
  pricingFreshnessSnapshot?: PricingFreshnessBadge[]
  aiMode?: DecisionAiMode
  operatingLedger?: OperatingLedgerMetadata | null
  agentReview?: AgentReviewMetadata | null
  trustReview?: TrustReviewMetadata | null
  reportReview?: ReportReviewMetadata | null
  runtimeProof?: RuntimeProofMetadata | null
  humanApproval?: HumanApprovalMetadata | null
}

export interface Decision extends DecisionInput {
  id: string
  kind: OperatingDecisionKind
  createdAt: string
  performanceSnapshot: Record<string, unknown>
  costSnapshot: Record<string, unknown>
  thresholdSnapshot: Partial<ThresholdPolicy>
  factSourceSnapshot: FactSourceSnapshot[]
  decisionChoice: DecisionChoice | null
  rateCardDraft: RateCardDraft | null
  pricingFreshnessSnapshot: PricingFreshnessBadge[]
  aiMode: DecisionAiMode
  operatingLedger: OperatingLedgerMetadata | null
  agentReview: AgentReviewMetadata | null
  trustReview: TrustReviewMetadata | null
  reportReview: ReportReviewMetadata | null
  runtimeProof: RuntimeProofMetadata | null
  humanApproval: HumanApprovalMetadata | null
}

const STORAGE_KEY = 'token-simulator:decision-log'
const DECISION_KINDS = new Set<OperatingDecisionKind>([
  'approve',
  'automate',
  'authority',
  'policy',
  'attribution',
  'ownership',
])
const DECISION_AI_MODES = new Set<DecisionAiMode>(['llm_assisted', 'deterministic_fallback', 'unknown'])
const DECISION_CHOICES = new Set<DecisionChoice>(['adopt', 'reject', 'hold'])

function idFromTimestamp(createdAt: string): string {
  return `decision-${createdAt.replace(/[^0-9A-Za-z]/g, '-')}`
    .replace(/-+/g, '-')
    .replace(/-$/, '')
}

export function createDecision(input: DecisionInput): Decision {
  if (input.status === 'adopted' && input.riskCards.length === 0) {
    throw new Error('Risk card is required before adopting an optimization decision')
  }

  const createdAt = input.createdAt ?? new Date().toISOString()
  const decisionChoice = input.decisionChoice ?? null
  const runtimeProof = input.runtimeProof ? normalizeRuntimeProofMetadata(input.runtimeProof) : null
  const humanApproval = input.humanApproval
    ? normalizeHumanApprovalMetadata(input.humanApproval)
    : decisionChoice
      ? humanApprovalFromDecisionChoice(decisionChoice, createdAt)
      : null
  return {
    ...input,
    kind: input.kind ?? 'approve',
    createdAt,
    id: idFromTimestamp(createdAt),
    performanceSnapshot: input.performanceSnapshot ?? {},
    costSnapshot: input.costSnapshot ?? {},
    thresholdSnapshot: input.thresholdSnapshot ?? {},
    factSourceSnapshot: input.factSourceSnapshot ?? [],
    decisionChoice,
    rateCardDraft: input.rateCardDraft ?? null,
    pricingFreshnessSnapshot: input.pricingFreshnessSnapshot ?? [],
    aiMode: input.aiMode ?? 'unknown',
    operatingLedger: input.operatingLedger ?? null,
    agentReview: input.agentReview ?? null,
    trustReview: input.trustReview ?? null,
    reportReview: input.reportReview ?? null,
    runtimeProof,
    humanApproval,
  }
}

function isPresentText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validateOperatingLedgerMetadata(value: OperatingLedgerMetadata): void {
  const missing = ([
    'workstream',
    'source',
    'agentUsed',
    'proposedChange',
    'humanDecision',
    'artifactUpdated',
    'impact',
    'followUp',
  ] as const).filter(key => !isPresentText(value[key]))
  if (missing.length > 0) {
    throw new Error(`Operating ledger entry requires ${missing.join(', ')}`)
  }
}

export function createOperatingLedgerEntry(
  input: DecisionInput & { operatingLedger: OperatingLedgerMetadata },
): Decision & { operatingLedger: OperatingLedgerMetadata } {
  validateOperatingLedgerMetadata(input.operatingLedger)
  return createDecision({
    ...input,
    kind: input.kind ?? 'policy',
  }) as Decision & { operatingLedger: OperatingLedgerMetadata }
}

export function serializeDecisionLog(decisions: Decision[]): string {
  return JSON.stringify(decisions, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isOperatingDecisionKind(value: unknown): value is OperatingDecisionKind {
  return typeof value === 'string' && DECISION_KINDS.has(value as OperatingDecisionKind)
}

function isDecisionAiMode(value: unknown): value is DecisionAiMode {
  return typeof value === 'string' && DECISION_AI_MODES.has(value as DecisionAiMode)
}

function isDecisionChoice(value: unknown): value is DecisionChoice {
  return typeof value === 'string' && DECISION_CHOICES.has(value as DecisionChoice)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isRateCardDraft(value: unknown): value is RateCardDraft {
  if (!isRecord(value)) return false
  const status = String(value.status ?? value.executionMode)
  return typeof value.policyType === 'string'
    && typeof value.includedCredits === 'number'
    && typeof value.overagePricePerRequest === 'number'
    && typeof value.capUsdPerCustomer === 'number'
    && typeof value.affectedCustomerCount === 'number'
    && isStringArray(value.marginBasisRefs)
    && ['draft', 'approved', 'pushed_to_billing', 'failed'].includes(status)
    && typeof value.billingExecutable === 'boolean'
    && typeof value.stripeExecutable === 'boolean'
    && value.requiresHumanApproval === true
}

function isPricingFreshnessBadge(value: unknown): value is PricingFreshnessBadge {
  if (!isRecord(value)) return false
  return typeof value.modelId === 'string'
    && ['verified', 'estimated', 'tbd', 'source_changed'].includes(String(value.state))
    && typeof value.label === 'string'
    && typeof value.customerLabel === 'string'
    && typeof value.recheckRequired === 'boolean'
    && typeof value.sourceUrl === 'string'
    && typeof value.lastVerifiedAt === 'string'
}

function isAgentReviewMetadata(value: unknown): value is AgentReviewMetadata {
  if (!isRecord(value)) return false
  return isStringArray(value.calledAgentIds)
    && (typeof value.primaryAgentId === 'string' || value.primaryAgentId === null)
    && isStringArray(value.reviewerAgentIds)
    && isStringArray(value.usedCapabilityTools)
    && typeof value.snapshotVersion === 'string'
    && typeof value.supervisorSummary === 'string'
}

function isTrustReviewMetadata(value: unknown): value is TrustReviewMetadata {
  if (!isRecord(value)) return false
  return typeof value.status === 'string'
    && isStringArray(value.warnings)
    && typeof value.retentionNote === 'string'
}

function isReportReviewMetadata(value: unknown): value is ReportReviewMetadata {
  if (!isRecord(value)) return false
  return typeof value.noRawPrompt === 'boolean'
    && typeof value.noUncitedNumbers === 'boolean'
    && typeof value.providerSourceVisible === 'boolean'
    && typeof value.formulaVersionVisible === 'boolean'
}

function isRuntimeProofMetadata(value: unknown): value is RuntimeProofMetadata {
  return normalizeRuntimeProofMetadata(value) !== null
}

function isHumanApprovalMetadata(value: unknown): value is HumanApprovalMetadata {
  return normalizeHumanApprovalMetadata(value) !== null
}

function isDecision(value: unknown): value is DecisionInput & { id: string; createdAt: string } {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Decision>
  return typeof candidate.id === 'string'
    && typeof candidate.what === 'string'
    && typeof candidate.why === 'string'
    && typeof candidate.createdAt === 'string'
    && (candidate.status === 'adopted' || candidate.status === 'rejected' || candidate.status === 'held' || candidate.status === 'superseded')
    && Array.isArray(candidate.toolResultRefs)
    && Array.isArray(candidate.riskCards)
    && (!('kind' in candidate) || isOperatingDecisionKind(candidate.kind))
    && (!('performanceSnapshot' in candidate) || isRecord(candidate.performanceSnapshot))
    && (!('costSnapshot' in candidate) || isRecord(candidate.costSnapshot))
    && (!('thresholdSnapshot' in candidate) || isRecord(candidate.thresholdSnapshot))
    && (!('factSourceSnapshot' in candidate) || Array.isArray(candidate.factSourceSnapshot))
    && (!('decisionChoice' in candidate) || candidate.decisionChoice === null || isDecisionChoice(candidate.decisionChoice))
    && (!('rateCardDraft' in candidate) || candidate.rateCardDraft === null || isRateCardDraft(candidate.rateCardDraft))
    && (!('pricingFreshnessSnapshot' in candidate) || (Array.isArray(candidate.pricingFreshnessSnapshot) && candidate.pricingFreshnessSnapshot.every(isPricingFreshnessBadge)))
    && (!('aiMode' in candidate) || isDecisionAiMode(candidate.aiMode))
    && (!('operatingLedger' in candidate) || candidate.operatingLedger === null || isRecord(candidate.operatingLedger))
    && (!('agentReview' in candidate) || candidate.agentReview === null || isAgentReviewMetadata(candidate.agentReview))
    && (!('trustReview' in candidate) || candidate.trustReview === null || isTrustReviewMetadata(candidate.trustReview))
    && (!('reportReview' in candidate) || candidate.reportReview === null || isReportReviewMetadata(candidate.reportReview))
    && (!('runtimeProof' in candidate) || candidate.runtimeProof === null || isRuntimeProofMetadata(candidate.runtimeProof))
    && (!('humanApproval' in candidate) || candidate.humanApproval === null || isHumanApprovalMetadata(candidate.humanApproval))
}

function normalizeDecision(decision: DecisionInput & { id: string; createdAt: string }): Decision {
  const decisionChoice = isDecisionChoice(decision.decisionChoice) ? decision.decisionChoice : null
  const runtimeProof = normalizeRuntimeProofMetadata(decision.runtimeProof)
  const humanApproval = normalizeHumanApprovalMetadata(decision.humanApproval)
  return {
    ...decision,
    kind: decision.kind ?? 'approve',
    performanceSnapshot: isRecord(decision.performanceSnapshot) ? decision.performanceSnapshot : {},
    costSnapshot: isRecord(decision.costSnapshot) ? decision.costSnapshot : {},
    thresholdSnapshot: isRecord(decision.thresholdSnapshot) ? decision.thresholdSnapshot as Partial<ThresholdPolicy> : {},
    factSourceSnapshot: Array.isArray(decision.factSourceSnapshot) ? decision.factSourceSnapshot : [],
    decisionChoice,
    rateCardDraft: isRateCardDraft(decision.rateCardDraft) ? decision.rateCardDraft : null,
    pricingFreshnessSnapshot: Array.isArray(decision.pricingFreshnessSnapshot)
      ? decision.pricingFreshnessSnapshot.filter(isPricingFreshnessBadge)
      : [],
    aiMode: isDecisionAiMode(decision.aiMode) ? decision.aiMode : 'unknown',
    operatingLedger: isRecord(decision.operatingLedger) ? decision.operatingLedger as unknown as OperatingLedgerMetadata : null,
    agentReview: isAgentReviewMetadata(decision.agentReview) ? decision.agentReview : null,
    trustReview: isTrustReviewMetadata(decision.trustReview) ? decision.trustReview : null,
    reportReview: isReportReviewMetadata(decision.reportReview) ? decision.reportReview : null,
    runtimeProof,
    humanApproval: humanApproval ?? (decisionChoice ? humanApprovalFromDecisionChoice(decisionChoice, decision.createdAt) : null),
  }
}

export function normalizeDecisionRecord(value: unknown): Decision | null {
  return isDecision(value) ? normalizeDecision(value) : null
}

export function loadDecisionLog(storage: Pick<Storage, 'getItem'> = window.localStorage): Decision[] {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.map(normalizeDecisionRecord).filter((decision): decision is Decision => Boolean(decision))
      : []
  } catch {
    return []
  }
}

export function saveDecisionLog(
  decisions: Decision[],
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  storage.setItem(STORAGE_KEY, serializeDecisionLog(decisions))
}

export function deleteDecision(decisions: Decision[], id: string): Decision[] {
  return decisions.filter(decision => decision.id !== id)
}

export function exportDecisionLogFileName(nowIso = new Date().toISOString()): string {
  return `ai-team-ops-decision-log-${nowIso.slice(0, 10)}.json`
}
