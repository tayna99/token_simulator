import { describe, expect, it } from 'vitest'
import { evaluateApprovalGate } from './approvalGate'

describe('evaluateApprovalGate', () => {
  it('blocks adopted decisions without risk cards and tool refs', () => {
    expect(evaluateApprovalGate({
      recommendationId: 'rec-cache',
      toolResultRefs: ['tool:optimization.rec-cache.monthlySavingsUsd'],
      riskCardIds: [],
    }).status).toBe('blocked')

    expect(evaluateApprovalGate({
      recommendationId: 'rec-cache',
      toolResultRefs: ['tool:optimization.rec-cache.monthlySavingsUsd'],
      riskCardIds: ['risk-cache-staleness'],
    }).status).toBe('approval_required')
  })
})
