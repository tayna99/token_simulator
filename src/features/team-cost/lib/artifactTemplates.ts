import type { Artifact } from './agentSpec'

export type ArtifactTemplateId =
  | 'customer_interview_transcript_short'
  | 'customer_interview_transcript_medium'
  | 'customer_interview_transcript_long'
  | 'competitor_links_bundle'
  | 'market_scan_notes'
  | 'prd_medium'
  | 'user_flow'
  | 'screen_spec_set'
  | 'wireframe_description'
  | 'component_list'
  | 'codebase_context_long'
  | 'error_log_bundle'
  | 'implementation_plan'
  | 'test_result_summary'
  | 'landing_copy'
  | 'seo_keyword_brief'
  | 'lead_profile'
  | 'cold_email_sequence'
  | 'support_ticket'
  | 'support_reply_draft'
  | 'knowledge_base_context'
  | 'meeting_transcript'
  | 'action_item_summary'
  | 'contract_excerpt'
  | 'finance_cost_data'

export interface ArtifactTemplate extends Artifact {
  id: ArtifactTemplateId
  evidenceId: string
}

function template(
  id: ArtifactTemplateId,
  name: string,
  kind: string,
  estTokens: number,
  size: Artifact['size'],
  reusedEachRun = false,
): ArtifactTemplate {
  return { id, name, kind, estTokens, reusedEachRun, size, evidenceId: 'template-default-v0' }
}

export const ARTIFACT_TEMPLATES: ArtifactTemplate[] = [
  template('customer_interview_transcript_short', 'Customer interview transcript', 'interview', 3000, 'short'),
  template('customer_interview_transcript_medium', 'Customer interview transcript', 'interview', 5000, 'medium'),
  template('customer_interview_transcript_long', 'Customer interview transcript', 'interview', 8000, 'long'),
  template('competitor_links_bundle', 'Competitor links bundle', 'research', 1500, 'medium'),
  template('market_scan_notes', 'Market scan notes', 'research', 2500, 'medium'),
  template('prd_medium', 'PRD', 'product', 3000, 'medium'),
  template('user_flow', 'User flow', 'product', 1200, 'short'),
  template('screen_spec_set', 'Screen spec set', 'design', 3500, 'medium'),
  template('wireframe_description', 'Wireframe description', 'design', 1800, 'medium'),
  template('component_list', 'Component list', 'design', 900, 'short'),
  template('codebase_context_long', 'Codebase context', 'engineering', 12000, 'long', true),
  template('error_log_bundle', 'Error log bundle', 'engineering', 2500, 'medium'),
  template('implementation_plan', 'Implementation plan', 'engineering', 2500, 'medium'),
  template('test_result_summary', 'Test result summary', 'engineering', 1200, 'short'),
  template('landing_copy', 'Landing copy', 'marketing', 1000, 'short'),
  template('seo_keyword_brief', 'SEO keyword brief', 'marketing', 800, 'short'),
  template('lead_profile', 'Lead profile', 'sales', 700, 'short'),
  template('cold_email_sequence', 'Cold email sequence', 'sales', 1200, 'short'),
  template('support_ticket', 'Support ticket', 'support', 400, 'short'),
  template('support_reply_draft', 'Support reply draft', 'support', 600, 'short'),
  template('knowledge_base_context', 'Knowledge base context', 'support', 6000, 'long', true),
  template('meeting_transcript', 'Meeting transcript', 'ops', 6000, 'long'),
  template('action_item_summary', 'Action item summary', 'ops', 800, 'short'),
  template('contract_excerpt', 'Contract excerpt', 'legal', 5000, 'long'),
  template('finance_cost_data', 'Finance cost data', 'finance', 2000, 'medium'),
]

export function getArtifactTemplate(id: ArtifactTemplateId): ArtifactTemplate | undefined {
  const template = ARTIFACT_TEMPLATES.find(item => item.id === id)
  return template ? { ...template } : undefined
}

export function artifactFromTemplate(id: ArtifactTemplateId, override?: Partial<Artifact>): Artifact {
  const base = getArtifactTemplate(id)
  if (!base) throw new Error(`Unknown artifact template: ${id}`)
  return { ...base, ...override }
}
