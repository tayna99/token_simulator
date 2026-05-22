import type { ToolResultRef } from './toolContract'

export interface ApprovalGateInput {
  recommendationId: string
  toolResultRefs: ToolResultRef[]
  riskCardIds: string[]
}

export type ApprovalGateStatus = 'blocked' | 'approval_required'

export interface ApprovalGateResult {
  status: ApprovalGateStatus
  message: string
}

export function evaluateApprovalGate(input: ApprovalGateInput): ApprovalGateResult {
  if (input.riskCardIds.length === 0 || input.toolResultRefs.length === 0) {
    return {
      status: 'blocked',
      message: 'Risk cards and deterministic tool refs are required before adoption.',
    }
  }

  return {
    status: 'approval_required',
    message: 'Human Operating Decision is required before this optimization can enter the Decision & Approval Log.',
  }
}
