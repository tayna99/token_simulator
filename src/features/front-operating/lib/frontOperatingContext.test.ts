import { describe, expect, it } from 'vitest'
import { AGENTCOST_FRONT_OPERATING_SYSTEM } from './frontOperatingContext'

describe('AGENTCOST_FRONT_OPERATING_SYSTEM', () => {
  it('defines the front operating assets that create_agent can retrieve', () => {
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.assets.map(asset => asset.id)).toEqual([
      'icp_scorecard',
      'lead_intake_log',
      'self_assessment_rules',
      'data_readiness_checklist',
      'data_request_template',
      'sample_report_template',
      'offer_ladder',
      'ai_cost_snapshot_offer',
      'approval_matrix',
      'review_call_script',
      'learning_loop_review',
      'service_validation_ledger',
      'productization_backlog',
    ])
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.assets.every(asset => asset.ref.startsWith('asset:'))).toBe(true)
  })

  it('attaches service validation documents to the operating assets', () => {
    const documentPaths = new Map(AGENTCOST_FRONT_OPERATING_SYSTEM.assets.map(asset => [asset.id, asset.documentPath]))

    expect(documentPaths.get('icp_scorecard')).toBe('docs/service-validation/icp-scorecard.md')
    expect(documentPaths.get('data_readiness_checklist')).toBe('docs/service-validation/data-readiness-checklist.md')
    expect(documentPaths.get('data_request_template')).toBe('docs/templates/agentcost-data-request.md')
    expect(documentPaths.get('ai_cost_snapshot_offer')).toBe('docs/service-validation/ai-cost-snapshot-offer-one-pager.md')
    expect(documentPaths.get('review_call_script')).toBe('docs/service-validation/review-call-script.md')
    expect(documentPaths.get('learning_loop_review')).toBe('docs/service-validation/learning-loop-template.md')
    expect(documentPaths.get('service_validation_ledger')).toBe('docs/service-validation/service-mvp-validation-ledger.md')
  })

  it('keeps data gate, offer ladder, approval, and learning loop available as read-only context', () => {
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.dataReadinessGate.acceptedColumns).toContain('customer_id')
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.dataReadinessGate.rejectedColumns).toContain('raw_prompt')
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.offerLadder.map(offer => offer.id)).toContain('ai_cost_snapshot')
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.approvalGates.every(gate => gate.required)).toBe(true)
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.learningLoopRecords).toEqual([])
  })
})
