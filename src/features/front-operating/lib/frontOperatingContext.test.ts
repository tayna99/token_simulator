import { describe, expect, it } from 'vitest'
import { AGENTCOST_FRONT_OPERATING_SYSTEM } from './frontOperatingContext'

describe('AGENTCOST_FRONT_OPERATING_SYSTEM', () => {
  it('defines the front operating assets that create_agent can retrieve', () => {
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.assets.map(asset => asset.id)).toEqual([
      'icp_scorecard',
      'lead_intake_log',
      'self_assessment_rules',
      'data_readiness_checklist',
      'sample_report_template',
      'offer_ladder',
      'approval_matrix',
      'learning_loop_review',
      'productization_backlog',
    ])
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.assets.every(asset => asset.ref.startsWith('asset:'))).toBe(true)
  })

  it('keeps data gate, offer ladder, approval, and learning loop available as read-only context', () => {
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.dataReadinessGate.acceptedColumns).toContain('customer_id')
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.dataReadinessGate.rejectedColumns).toContain('raw_prompt')
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.offerLadder.map(offer => offer.id)).toContain('ai_cost_snapshot')
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.approvalGates.every(gate => gate.required)).toBe(true)
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.learningLoopRecords).toEqual([])
  })
})
