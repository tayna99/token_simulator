import type { DecisionChoice } from '../../decision-loop/lib/decisionHeader'

export type RuntimeProofStatus =
  | 'provider_llm'
  | 'deterministic_preview'
  | 'unavailable'
  | 'connector_not_configured'
  | 'interrupt_requested'
  | 'resumed'

export interface RuntimeProofMetadata {
  status: RuntimeProofStatus
  providerRunId?: string
  agentInvocationProof: string[]
  fallbackReason?: string
  startedAt?: string
  completedAt?: string
  checkpoint?: RuntimeProofCheckpointMetadata
}

export interface RuntimeProofCheckpointMetadata {
  status: string
  persistence: string
  threadId: string
  checkpointNamespace: string
  checkpointId: string
  interruptId?: string | null
  reason?: string
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
  'interrupt_requested',
  'resumed',
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

function normalizeRuntimeProofCheckpointMetadata(value: unknown): RuntimeProofCheckpointMetadata | undefined {
  if (!isRecord(value)) return undefined
  if (
    typeof value.status !== 'string'
    || typeof value.persistence !== 'string'
    || typeof value.threadId !== 'string'
    || typeof value.checkpointNamespace !== 'string'
    || typeof value.checkpointId !== 'string'
  ) {
    return undefined
  }
  return {
    status: value.status,
    persistence: value.persistence,
    threadId: value.threadId,
    checkpointNamespace: value.checkpointNamespace,
    checkpointId: value.checkpointId,
    ...(typeof value.interruptId === 'string' && value.interruptId.trim() ? { interruptId: value.interruptId } : {}),
    ...(value.interruptId === null ? { interruptId: null } : {}),
    ...(typeof value.reason === 'string' && value.reason.trim() ? { reason: value.reason } : {}),
  }
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
  const checkpoint = normalizeRuntimeProofCheckpointMetadata(value.checkpoint)
  return {
    status: value.status,
    ...((value.status === 'provider_llm' || value.status === 'resumed') && providerRunId ? { providerRunId } : {}),
    agentInvocationProof: (value.status === 'provider_llm' || value.status === 'resumed' || value.status === 'interrupt_requested') && isStringArray(value.agentInvocationProof)
      ? value.agentInvocationProof
      : [],
    ...(typeof value.fallbackReason === 'string' && value.fallbackReason.trim() ? { fallbackReason: value.fallbackReason } : {}),
    ...(typeof value.startedAt === 'string' && value.startedAt.trim() ? { startedAt: value.startedAt } : {}),
    ...(typeof value.completedAt === 'string' && value.completedAt.trim() ? { completedAt: value.completedAt } : {}),
    ...(checkpoint ? { checkpoint } : {}),
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
