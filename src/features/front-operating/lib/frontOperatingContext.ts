import { FRONT_OPERATING_OFFER_LADDER, type FrontOperatingOffer } from './customerServiceOffer'

export type FrontOperatingSurface = 'customer' | 'expert' | 'both' | 'internal'

export interface FrontOperatingAsset {
  id: string
  label: string
  ref: `asset:${string}`
  owner: 'operator' | 'trust_review' | 'finance_ops' | 'knowledge_ops'
  surface: FrontOperatingSurface
  documentPath?: string
}

export interface FrontOperatingSystemContext {
  assets: FrontOperatingAsset[]
  leadFitRules: {
    grades: string[]
    nextActions: string[]
  }
  selfAssessment: {
    questionCount: number
    questions: string[]
  }
  dataReadinessGate: {
    acceptedColumns: string[]
    rejectedColumns: string[]
    availableAnalysis: string[]
    blockedAnalysis: string[]
  }
  sampleReportSections: string[]
  offerLadder: FrontOperatingOffer[]
  approvalGates: Array<{
    id: string
    label: string
    required: true
  }>
  learningLoopRecords: Array<Record<string, unknown>>
}

export const AGENTCOST_FRONT_OPERATING_SYSTEM: FrontOperatingSystemContext = {
  assets: [
    { id: 'icp_scorecard', label: 'ICP Scorecard', ref: 'asset:icp_scorecard', owner: 'operator', surface: 'expert', documentPath: 'docs/service-validation/icp-scorecard.md' },
    { id: 'lead_intake_log', label: 'Lead Intake Log', ref: 'asset:lead_intake_log', owner: 'operator', surface: 'internal' },
    { id: 'self_assessment_rules', label: 'Self-Assessment Rules', ref: 'asset:self_assessment_rules', owner: 'operator', surface: 'both' },
    { id: 'data_readiness_checklist', label: 'Data Readiness Checklist', ref: 'asset:data_readiness_checklist', owner: 'trust_review', surface: 'both', documentPath: 'docs/service-validation/data-readiness-checklist.md' },
    { id: 'data_request_template', label: 'Trust-safe Data Request Template', ref: 'asset:data_request_template', owner: 'trust_review', surface: 'both', documentPath: 'docs/templates/agentcost-data-request.md' },
    { id: 'sample_report_template', label: 'Sample Report Template', ref: 'asset:sample_report_template', owner: 'knowledge_ops', surface: 'customer' },
    { id: 'offer_ladder', label: 'Offer Ladder', ref: 'asset:offer_ladder', owner: 'finance_ops', surface: 'internal' },
    { id: 'ai_cost_snapshot_offer', label: 'AI Cost Snapshot Offer One-Pager', ref: 'asset:ai_cost_snapshot_offer', owner: 'finance_ops', surface: 'both', documentPath: 'docs/service-validation/ai-cost-snapshot-offer-one-pager.md' },
    { id: 'approval_matrix', label: 'Human Approval Matrix', ref: 'asset:approval_matrix', owner: 'trust_review', surface: 'internal' },
    { id: 'review_call_script', label: 'Review Call Script', ref: 'asset:review_call_script', owner: 'operator', surface: 'expert', documentPath: 'docs/service-validation/review-call-script.md' },
    { id: 'learning_loop_review', label: 'Learning Loop Review', ref: 'asset:learning_loop_review', owner: 'knowledge_ops', surface: 'internal', documentPath: 'docs/service-validation/learning-loop-template.md' },
    { id: 'service_validation_ledger', label: 'Service MVP Validation Ledger', ref: 'asset:service_validation_ledger', owner: 'knowledge_ops', surface: 'internal', documentPath: 'docs/service-validation/service-mvp-validation-ledger.md' },
    { id: 'productization_backlog', label: 'Productization Backlog', ref: 'asset:productization_backlog', owner: 'knowledge_ops', surface: 'internal' },
  ],
  leadFitRules: {
    grades: ['A', 'B', 'C'],
    nextActions: ['AI Cost Snapshot', 'Data Readiness Check', 'Sample Report'],
  },
  selfAssessment: {
    questionCount: 8,
    questions: [
      'live_ai_feature',
      'minimum_monthly_cost',
      'customer_usage_split',
      'feature_usage_split',
      'plan_revenue_join',
      'retry_logs',
      'metadata_only_export',
      'decision_to_change',
    ],
  },
  dataReadinessGate: {
    acceptedColumns: [
      'timestamp',
      'customer_id',
      'plan_id',
      'feature',
      'model',
      'input_tokens',
      'output_tokens',
      'total_cost',
      'status',
      'retry_count',
    ],
    rejectedColumns: ['raw_prompt', 'conversation', 'email', 'phone', 'name', 'api_key'],
    availableAnalysis: ['feature_cost', 'customer_cost', 'plan_margin', 'model_cost', 'retry_cost'],
    blockedAnalysis: ['customer_cost', 'plan_margin', 'retry_cost'],
  },
  sampleReportSections: [
    'Executive Summary',
    'Feature cost breakdown',
    'Customer cost breakdown',
    'Plan gross margin',
    'Loss customer check',
    'Recommended actions',
    'Decision Log example',
    'Data limitations',
  ],
  offerLadder: FRONT_OPERATING_OFFER_LADDER,
  approvalGates: [
    { id: 'customer_acceptance', label: 'Customer acceptance', required: true },
    { id: 'analysis_scope', label: 'Analysis scope', required: true },
    { id: 'security_pii', label: 'Security and PII decision', required: true },
    { id: 'final_numbers', label: 'Final numbers', required: true },
    { id: 'customer_report', label: 'Customer report', required: true },
    { id: 'price_proposal', label: 'Price proposal', required: true },
    { id: 'contract_refund_liability', label: 'Contract, refund, and liability language', required: true },
  ],
  learningLoopRecords: [],
}

export function isCustomerFacingFrontOperatingAsset(asset: FrontOperatingAsset): boolean {
  return asset.surface === 'customer' || asset.surface === 'both'
}

export function getFrontOperatingAssetsForSurface(surface: Exclude<FrontOperatingSurface, 'both'>): FrontOperatingAsset[] {
  if (surface === 'customer') {
    return AGENTCOST_FRONT_OPERATING_SYSTEM.assets.filter(isCustomerFacingFrontOperatingAsset)
  }

  if (surface === 'expert') {
    return AGENTCOST_FRONT_OPERATING_SYSTEM.assets.filter(asset => asset.surface === 'expert' || asset.surface === 'both')
  }

  return AGENTCOST_FRONT_OPERATING_SYSTEM.assets.filter(asset => asset.surface === 'internal')
}

export const CUSTOMER_FRONT_OPERATING_ASSETS = getFrontOperatingAssetsForSurface('customer')

export const EXPERT_INTERNAL_FRONT_OPERATING_ASSETS = AGENTCOST_FRONT_OPERATING_SYSTEM.assets.filter(
  asset => asset.surface === 'expert' || asset.surface === 'internal',
)
