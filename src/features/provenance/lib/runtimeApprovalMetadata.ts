import type { DecisionChoice } from '../../decision-loop/lib/decisionHeader'

export type RuntimeProofStatus = 'provider_llm' | 'deterministic_preview' | 'unavailable' | 'connector_not_configured'

export interface RuntimeProofMetadata {
  status: RuntimeProofStatus
  providerRunId?: string
  agentInvocationProof: string[]
  fallbackReason?: string
  startedAt?: string
  completedAt?: string
}

export interface HumanApprovalMetadata {
  required: boolean
  decisionChoice: DecisionChoice
  approvedBy: string
  approvedAt?: string
  approvalMode: 'explicit_button' | 'ledger_import' | 'unknown' | string
}

const RUNTIME_PROOF_STATUSES = new Set<RuntimeProofStatus>([
  'provider_llm',
  'deterministic_preview',
  'unavailable',
  'connector_not_configured',
])

const DECISION_CHOICES = new Set<DecisionChoice>(['adopt', 'reject', 'hold'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isRuntimeProofStatus(value: unknown): value is RuntimeProofStatus {
  return typeof value === 'string' && RUNTIME_PROOF_STATUSES.has(value as RuntimeProofStatus)
}

function isDecisionChoice(value: unknown): value is DecisionChoice {
  return typeof value === 'string' && DECISION_CHOICES.has(value as DecisionChoice)
}

export function humanApprovalFromDecisionChoice(
  decisionChoice: DecisionChoice,
  approvedAt?: string,
): HumanApprovalMetadata {
  return {
    required: true,
    decisionChoice,
    approvedBy: 'workspace_user',
    ...(approvedAt ? { approvedAt } : {}),
    approvalMode: 'explicit_button',
  }
}

export function deterministicPreviewRuntimeProof(
  fallbackReason = 'money_leak_run_deterministic_snapshot_only',
): RuntimeProofMetadata {
  const now = new Date().toISOString()
  return {
    status: 'deterministic_preview',
    agentInvocationProof: [],
    fallbackReason,
    startedAt: now,
    completedAt: now,
  }
}

export function normalizeRuntimeProofMetadata(value: unknown): RuntimeProofMetadata | null {
  if (!isRecord(value) || !isRuntimeProofStatus(value.status)) return null
  const providerRunId = typeof value.providerRunId === 'string' && value.providerRunId.trim()
    ? value.providerRunId
    : undefined
  return {
    status: value.status,
    ...(value.status === 'provider_llm' && providerRunId ? { providerRunId } : {}),
    agentInvocationProof: value.status === 'provider_llm' && isStringArray(value.agentInvocationProof)
      ? value.agentInvocationProof
      : [],
    ...(typeof value.fallbackReason === 'string' && value.fallbackReason.trim() ? { fallbackReason: value.fallbackReason } : {}),
    ...(typeof value.startedAt === 'string' && value.startedAt.trim() ? { startedAt: value.startedAt } : {}),
    ...(typeof value.completedAt === 'string' && value.completedAt.trim() ? { completedAt: value.completedAt } : {}),
  }
}

export function normalizeHumanApprovalMetadata(value: unknown): HumanApprovalMetadata | null {
  if (!isRecord(value) || !isDecisionChoice(value.decisionChoice)) return null
  return {
    required: value.required === true,
    decisionChoice: value.decisionChoice,
    approvedBy: typeof value.approvedBy === 'string' && value.approvedBy.trim()
      ? value.approvedBy
      : 'workspace_user',
    ...(typeof value.approvedAt === 'string' && value.approvedAt.trim() ? { approvedAt: value.approvedAt } : {}),
    approvalMode: typeof value.approvalMode === 'string' && value.approvalMode.trim()
      ? value.approvalMode
      : 'unknown',
  }
}
