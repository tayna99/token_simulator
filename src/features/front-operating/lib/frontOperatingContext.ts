export interface FrontOperatingAsset {
  id: string
  label: string
  ref: `asset:${string}`
  owner: 'operator' | 'trust_review' | 'finance_ops' | 'knowledge_ops'
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
  offerLadder: Array<{
    id: string
    label: string
    minPriceKrw: number
    maxPriceKrw: number
    purpose: string
  }>
  approvalGates: Array<{
    id: string
    label: string
    required: true
  }>
  learningLoopRecords: Array<Record<string, unknown>>
}

export const AGENTCOST_FRONT_OPERATING_SYSTEM: FrontOperatingSystemContext = {
  assets: [
    { id: 'icp_scorecard', label: 'ICP Scorecard', ref: 'asset:icp_scorecard', owner: 'operator' },
    { id: 'lead_intake_log', label: 'Lead Intake Log', ref: 'asset:lead_intake_log', owner: 'operator' },
    { id: 'self_assessment_rules', label: 'Self-Assessment Rules', ref: 'asset:self_assessment_rules', owner: 'operator' },
    { id: 'data_readiness_checklist', label: 'Data Readiness Checklist', ref: 'asset:data_readiness_checklist', owner: 'trust_review' },
    { id: 'sample_report_template', label: 'Sample Report Template', ref: 'asset:sample_report_template', owner: 'knowledge_ops' },
    { id: 'offer_ladder', label: 'Offer Ladder', ref: 'asset:offer_ladder', owner: 'finance_ops' },
    { id: 'approval_matrix', label: 'Human Approval Matrix', ref: 'asset:approval_matrix', owner: 'trust_review' },
    { id: 'learning_loop_review', label: 'Learning Loop Review', ref: 'asset:learning_loop_review', owner: 'knowledge_ops' },
    { id: 'productization_backlog', label: 'Productization Backlog', ref: 'asset:productization_backlog', owner: 'knowledge_ops' },
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
  offerLadder: [
    { id: 'free_fit_check', label: 'Free Fit Check', minPriceKrw: 0, maxPriceKrw: 0, purpose: 'diagnostic fit' },
    { id: 'data_readiness_check', label: 'Data Readiness Check', minPriceKrw: 50_000, maxPriceKrw: 150_000, purpose: 'analysis scope' },
    { id: 'ai_cost_snapshot', label: 'AI Cost Snapshot', minPriceKrw: 300_000, maxPriceKrw: 1_000_000, purpose: 'one-page report and review call' },
    { id: 'monthly_ai_cost_review', label: 'Monthly AI Cost Review', minPriceKrw: 300_000, maxPriceKrw: 1_500_000, purpose: 'recurring decision log' },
  ],
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
