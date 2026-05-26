export type ReportAudience = 'developer' | 'pm' | 'ceo_cfo' | 'board'

import { fmtCurrency, fmtTokens } from '../../../lib/format'
import type { DecisionChoice } from '../../decision-loop/lib/decisionHeader'
import type { PricingFreshnessBadge } from '../../facts/lib/pricingFreshness'
import type { RateCardDraft } from '../../pricing/lib/rateCardDraft'
import type { HumanApprovalMetadata, RuntimeProofMetadata } from '../../provenance/lib/runtimeApprovalMetadata'

export interface ReportSection {
  title: string
  body: string
}

export interface ReportArtifactInput {
  audience: ReportAudience
  headline: string
  toolResultRefs: string[]
  riskCardIds: string[]
  costSummary?: string
  marginSummary?: string
  bottleneckSummary?: string
  optimizationSummary?: string
  decisionSummary?: string
  evidenceRefs?: string[]
  operatingAssetHealth?: string[]
}

export interface ReportArtifact {
  audience: ReportAudience
  title: string
  sections: ReportSection[]
  toolResultRefs: string[]
  riskCardIds: string[]
}

export interface OnePageReportArtifactInput {
  title: string
  executiveSummary: string
  metrics: Array<{ label: string; value: string }>
  recommendations: string[]
  risks: string[]
  refs: string[]
  trust: {
    status: string
    dataLimitations: string[]
    retentionNote: string
  }
  formulaVersion: string
  providerRegistryVersion: string
  snapshotVersion?: string
  decisionRefs?: string[]
  decisionChoice?: DecisionChoice
  runtimeProof?: RuntimeProofMetadata | null
  humanApproval?: HumanApprovalMetadata | null
  rateCardDraft?: RateCardDraft
  pricingFreshness?: PricingFreshnessBadge[]
}

export interface OnePageReportArtifact {
  title: string
  markdown: string
  refs: string[]
}

const TITLES: Record<ReportAudience, string> = {
  developer: 'Developer breakdown',
  pm: 'PM rollout report',
  ceo_cfo: 'CEO/CFO 1-pager',
  board: 'Board-ready summary',
}

export function buildReportArtifact(input: ReportArtifactInput): ReportArtifact {
  const refs = input.toolResultRefs.join(', ') || 'no tool refs'
  const riskRefs = input.riskCardIds.join(', ') || 'no risk cards attached'
  const evidenceRefs = input.evidenceRefs?.join(', ') || 'no evidence refs'

  return {
    audience: input.audience,
    title: TITLES[input.audience],
    toolResultRefs: input.toolResultRefs,
    riskCardIds: input.riskCardIds,
    sections: [
      {
        title: 'Grounding',
        body: `${input.headline}. Deterministic refs: ${refs}.`,
      },
      {
        title: 'Risk',
        body: `Risk refs: ${riskRefs}.`,
      },
      {
        title: 'AI team cost decision',
        body: [
          input.costSummary,
          input.marginSummary,
          input.bottleneckSummary,
          input.optimizationSummary,
          input.decisionSummary,
          `Evidence refs: ${evidenceRefs}.`,
        ].filter(Boolean).join(' '),
      },
      {
        title: 'Operating asset health',
        body: input.operatingAssetHealth?.join(' ') || 'No operating asset health notes attached.',
      },
    ],
  }
}

export function buildOnePageReportArtifact(input: OnePageReportArtifactInput): OnePageReportArtifact {
  const agentInvocationProof = input.runtimeProof?.agentInvocationProof ?? []
  const lines = [
    `# ${input.title}`,
    '',
    '## Executive summary',
    input.executiveSummary,
    '',
    '## Money Leak Diagnosis',
    ...input.metrics.map(metric => `- ${metric.label}: ${metric.value}`),
    '',
    '## Selected Decision',
    ...(input.recommendations.length > 0 ? input.recommendations.map(item => `- ${item}`) : ['- No decision candidate selected.']),
    `- Decision choice: ${input.decisionChoice ?? 'not recorded'}`,
    ...(input.decisionRefs?.length ? input.decisionRefs.map(ref => `- Decision ref: ${ref}`) : ['- Decision ref: none']),
    '',
    '## Runtime proof',
    `- Runtime status: ${input.runtimeProof?.status ?? 'not recorded'}`,
    `- Provider run id: ${input.runtimeProof?.providerRunId ?? 'none'}`,
    ...(agentInvocationProof.length
      ? agentInvocationProof.map(ref => `- Agent invocation proof: ${ref}`)
      : ['- Agent invocation proof: none']),
    `- Fallback reason: ${input.runtimeProof?.fallbackReason ?? 'none'}`,
    `- Started at: ${input.runtimeProof?.startedAt ?? 'not recorded'}`,
    `- Completed at: ${input.runtimeProof?.completedAt ?? 'not recorded'}`,
    '',
    '## Human approval',
    `- Approval required: ${input.humanApproval?.required ?? false}`,
    `- Approval decision: ${input.humanApproval?.decisionChoice ?? input.decisionChoice ?? 'not recorded'}`,
    `- Approved by: ${input.humanApproval?.approvedBy ?? 'not recorded'}`,
    `- Approved at: ${input.humanApproval?.approvedAt ?? 'not recorded'}`,
    `- Approval mode: ${input.humanApproval?.approvalMode ?? 'not recorded'}`,
    '',
    '## Risks and limitations',
    ...(input.risks.length > 0 ? input.risks.map(item => `- ${item}`) : ['- No risk cards attached.']),
    '',
    '## Trust and data handling',
    `- Trust status: ${input.trust.status}`,
    `- Retention: ${input.trust.retentionNote}`,
    ...(input.trust.dataLimitations.length > 0
      ? input.trust.dataLimitations.map(item => `- Data limitation: ${item}`)
      : ['- Data limitation: none']),
    '',
    '## Rate Card and Pricing Context',
    ...(input.rateCardDraft ? [
      '- Rate-card draft/readiness context only; not billing execution.',
      `  - Policy type: ${input.rateCardDraft.policyType}`,
      `  - Included credits: ${fmtTokens(input.rateCardDraft.includedCredits)}`,
      `  - Overage price per request: ${fmtCurrency(input.rateCardDraft.overagePricePerRequest, 2)}`,
      `  - Customer cap: ${fmtCurrency(input.rateCardDraft.capUsdPerCustomer)}`,
      `  - Affected customers: ${fmtTokens(input.rateCardDraft.affectedCustomerCount)}`,
      `  - Status: ${input.rateCardDraft.status}`,
      `  - Execution mode: ${input.rateCardDraft.executionMode}`,
      `  - Billing executable: ${input.rateCardDraft.billingExecutable}`,
      `  - Stripe executable: ${input.rateCardDraft.stripeExecutable}`,
      `  - Requires human approval: ${input.rateCardDraft.requiresHumanApproval}`,
      ...input.rateCardDraft.marginBasisRefs.map(ref => `  - Margin basis ref: ${ref}`),
    ] : ['- Rate-card draft/readiness context: none; not billing execution.']),
    ...(input.pricingFreshness?.length ? [
      '- Pricing freshness',
      ...input.pricingFreshness.map(item => `  - ${item.modelId}: ${item.label} (${item.customerLabel})`),
    ] : ['- Pricing freshness: not attached']),
    '',
    '## Calculation provenance',
    `- Formula version: ${input.formulaVersion}`,
    `- Provider registry version: ${input.providerRegistryVersion}`,
    `- Snapshot version: ${input.snapshotVersion ?? 'snapshot unavailable'}`,
    '',
    '## Refs',
    ...input.refs.map(ref => `- ${ref}`),
  ]

  return {
    title: input.title,
    markdown: lines.join('\n'),
    refs: input.refs,
  }
}
