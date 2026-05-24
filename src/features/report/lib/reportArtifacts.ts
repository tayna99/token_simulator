export type ReportAudience = 'developer' | 'pm' | 'ceo_cfo' | 'board'

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
  const lines = [
    `# ${input.title}`,
    '',
    '## Executive summary',
    input.executiveSummary,
    '',
    '## Metrics',
    ...input.metrics.map(metric => `- ${metric.label}: ${metric.value}`),
    '',
    '## Recommendations',
    ...(input.recommendations.length > 0 ? input.recommendations.map(item => `- ${item}`) : ['- No recommendation selected.']),
    '',
    '## Risks',
    ...(input.risks.length > 0 ? input.risks.map(item => `- ${item}`) : ['- No risk cards attached.']),
    '',
    '## Trust and data handling',
    `- Trust status: ${input.trust.status}`,
    `- Retention: ${input.trust.retentionNote}`,
    ...(input.trust.dataLimitations.length > 0
      ? input.trust.dataLimitations.map(item => `- Data limitation: ${item}`)
      : ['- Data limitation: none']),
    '',
    '## Calculation provenance',
    `- Formula version: ${input.formulaVersion}`,
    `- Provider registry version: ${input.providerRegistryVersion}`,
    `- Snapshot version: ${input.snapshotVersion ?? 'snapshot unavailable'}`,
    ...(input.decisionRefs?.length ? input.decisionRefs.map(ref => `- Decision ref: ${ref}`) : ['- Decision ref: none']),
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
