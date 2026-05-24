import type { DecisionChoice } from './decisionHeader'

export interface ExportGateDecisionLike {
  id: string
  decisionChoice?: DecisionChoice | null
}

export interface ExportGateResult {
  allowed: boolean
  reason?: string
  decisionId?: string
  decisionChoice?: DecisionChoice
}

const CHOICES = new Set<DecisionChoice>(['adopt', 'reject', 'hold'])

export function canExportOnePageReport(decisions: ExportGateDecisionLike[]): ExportGateResult {
  const decision = decisions.find(item => item.decisionChoice && CHOICES.has(item.decisionChoice))
  if (!decision?.decisionChoice) {
    return {
      allowed: false,
      reason: 'Record adopt, reject, or hold before exporting the one-page report.',
    }
  }

  return {
    allowed: true,
    decisionId: decision.id,
    decisionChoice: decision.decisionChoice,
  }
}
