import { describe, expect, it } from 'vitest'
import {
  AGENTCOST_FRONT_OPERATING_SYSTEM,
  CUSTOMER_FRONT_OPERATING_ASSETS,
  EXPERT_INTERNAL_FRONT_OPERATING_ASSETS,
  getFrontOperatingAssetsForSurface,
  isCustomerFacingFrontOperatingAsset,
} from './frontOperatingContext'

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

  it('classifies every asset by its intended service surface', () => {
    const surfaces = new Map(AGENTCOST_FRONT_OPERATING_SYSTEM.assets.map(asset => [asset.id, asset.surface]))

    expect(surfaces.get('data_readiness_checklist')).toBe('both')
    expect(surfaces.get('data_request_template')).toBe('both')
    expect(surfaces.get('sample_report_template')).toBe('customer')
    expect(surfaces.get('ai_cost_snapshot_offer')).toBe('both')

    expect(surfaces.get('icp_scorecard')).toBe('expert')
    expect(surfaces.get('lead_intake_log')).toBe('internal')
    expect(surfaces.get('self_assessment_rules')).toBe('both')
    expect(surfaces.get('offer_ladder')).toBe('internal')
    expect(surfaces.get('approval_matrix')).toBe('internal')
    expect(surfaces.get('review_call_script')).toBe('expert')
    expect(surfaces.get('learning_loop_review')).toBe('internal')
    expect(surfaces.get('service_validation_ledger')).toBe('internal')
    expect(surfaces.get('productization_backlog')).toBe('internal')
  })

  it('exports customer-facing selectors so UI surfaces do not duplicate filtering rules', () => {
    expect(CUSTOMER_FRONT_OPERATING_ASSETS.map(asset => asset.id)).toEqual([
      'self_assessment_rules',
      'data_readiness_checklist',
      'data_request_template',
      'sample_report_template',
      'ai_cost_snapshot_offer',
    ])
    expect(getFrontOperatingAssetsForSurface('customer').map(asset => asset.id)).toEqual(
      CUSTOMER_FRONT_OPERATING_ASSETS.map(asset => asset.id),
    )
    expect(CUSTOMER_FRONT_OPERATING_ASSETS.every(isCustomerFacingFrontOperatingAsset)).toBe(true)
  })

  it('keeps expert and internal assets out of customer first-screen selectors', () => {
    expect(EXPERT_INTERNAL_FRONT_OPERATING_ASSETS.map(asset => asset.id)).toEqual([
      'icp_scorecard',
      'lead_intake_log',
      'offer_ladder',
      'approval_matrix',
      'review_call_script',
      'learning_loop_review',
      'service_validation_ledger',
      'productization_backlog',
    ])
    expect(getFrontOperatingAssetsForSurface('expert').map(asset => asset.id)).toEqual([
      'icp_scorecard',
      'self_assessment_rules',
      'data_readiness_checklist',
      'data_request_template',
      'ai_cost_snapshot_offer',
      'review_call_script',
    ])
    expect(getFrontOperatingAssetsForSurface('internal').map(asset => asset.id)).toEqual([
      'lead_intake_log',
      'offer_ladder',
      'approval_matrix',
      'learning_loop_review',
      'service_validation_ledger',
      'productization_backlog',
    ])
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

  it('does not treat document-backed assets as automatically customer-visible', () => {
    const documentBackedCustomerIds = CUSTOMER_FRONT_OPERATING_ASSETS
      .filter(asset => asset.documentPath)
      .map(asset => asset.id)

    expect(documentBackedCustomerIds).toEqual([
      'data_readiness_checklist',
      'data_request_template',
      'ai_cost_snapshot_offer',
    ])
    expect(CUSTOMER_FRONT_OPERATING_ASSETS.map(asset => asset.id)).not.toContain('icp_scorecard')
    expect(CUSTOMER_FRONT_OPERATING_ASSETS.map(asset => asset.id)).not.toContain('review_call_script')
    expect(CUSTOMER_FRONT_OPERATING_ASSETS.map(asset => asset.id)).not.toContain('learning_loop_review')
    expect(CUSTOMER_FRONT_OPERATING_ASSETS.map(asset => asset.id)).not.toContain('service_validation_ledger')
  })

  it('keeps data gate, offer ladder, approval, and learning loop available as read-only context', () => {
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.dataReadinessGate.acceptedColumns).toContain('customer_id')
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.dataReadinessGate.rejectedColumns).toContain('raw_prompt')
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.offerLadder.map(offer => offer.id)).toContain('ai_cost_snapshot')
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.approvalGates.every(gate => gate.required)).toBe(true)
    expect(AGENTCOST_FRONT_OPERATING_SYSTEM.learningLoopRecords).toEqual([])
  })
})
