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
}

export interface ReportArtifact {
  audience: ReportAudience
  title: string
  sections: ReportSection[]
  toolResultRefs: string[]
  riskCardIds: string[]
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
    ],
  }
}
