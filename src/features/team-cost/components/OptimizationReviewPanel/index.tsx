import type { OperatingDecisionKind } from '../../../decision-log/lib/decisionLog'
import type { RiskCard } from '../../../agent/lib/riskCards'
import type { TeamCostGraphEvent } from '../../lib/teamCostState'
import type { OptimizationRecommendation } from '../../lib/optimizationPolicies'
import { Badge, Button, Field, Surface } from '../../../../shared/ui/primitives'
import { fmtCurrency } from '../../../../lib/format'

interface OptimizationReviewPanelProps {
  recommendations: OptimizationRecommendation[]
  events: TeamCostGraphEvent[]
  riskCards: RiskCard[]
  currentMonthlyCostUsd: number
  operatingDecisionKind: OperatingDecisionKind
  operatingDecisionReason: string
  onAdopt: () => void
  onReject: () => void
  onOperatingDecisionKindChange: (kind: OperatingDecisionKind) => void
  onOperatingDecisionReasonChange: (reason: string) => void
  onRecordOperatingDecision: () => void
}

const OPERATING_DECISION_KINDS: OperatingDecisionKind[] = [
  'approve',
  'automate',
  'authority',
  'policy',
  'attribution',
  'ownership',
]

export function OptimizationReviewPanel({
  recommendations,
  events,
  riskCards,
  currentMonthlyCostUsd,
  operatingDecisionKind,
  operatingDecisionReason,
  onAdopt,
  onReject,
  onOperatingDecisionKindChange,
  onOperatingDecisionReasonChange,
  onRecordOperatingDecision,
}: OptimizationReviewPanelProps) {
  const primaryRecommendation = recommendations[0]

  return (
    <Surface
      eyebrow="Agent graph"
      title="4. Optimization & Risk Review"
      description="Recommendations carry deterministic before/after refs. Human Operating Decision records how the team will approve, automate, or change authority."
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3">
          {recommendations.length === 0 ? (
            <p className="text-sm text-label-alternative">No optimization recommendation yet.</p>
          ) : recommendations.slice(0, 4).map(recommendation => (
            <div key={recommendation.id} className="rounded-wds border border-line-neutral p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{recommendation.title}</p>
                  <p className="mt-1 text-xs text-label-neutral">{recommendation.rationale}</p>
                  <p className="mt-2 text-xs text-label-alternative" translate="no">
                    Before: {fmtCurrency(recommendation.before.monthlyCostUsd)}
                    {' '} / After: {fmtCurrency(recommendation.after.monthlyCostUsd)}
                    {' '} / Savings: {fmtCurrency(recommendation.monthlySavingsUsd)}
                  </p>
                </div>
                <Badge tone="positive">{fmtCurrency(recommendation.monthlySavingsUsd)}</Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-wds border border-line-neutral p-3">
          <h3 className="text-sm font-semibold">LangGraph events</h3>
          <div className="mt-2 grid gap-2">
            {events.map((event, index) => (
              <div key={`${event.type}-${index}`} className="rounded-wds bg-fill-alternative p-2">
                <p className="text-xs font-semibold uppercase text-primary-normal">{event.type}</p>
                <p className="text-xs text-label-neutral">{event.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-wds border border-status-cautionary/30 bg-status-cautionary/10 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-status-cautionary">Risk Auditor</p>
              <p className="mt-1 text-sm text-label-neutral">
                Optimization decisions can be adopted only when risk cards and deterministic tool refs are attached.
              </p>
              {primaryRecommendation && (
                <p className="mt-2 text-xs text-label-alternative" translate="no">
                  Compare: {fmtCurrency(currentMonthlyCostUsd)} to {fmtCurrency(primaryRecommendation.costAfterUsd)}
                  {' '} / review gate remains human-approved.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={onAdopt}
                disabled={recommendations.length === 0 || riskCards.length === 0}
              >
                Adopt team-cost optimization
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onReject}
                disabled={recommendations.length === 0}
              >
                Reject team-cost optimization
              </Button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {riskCards.length === 0 ? (
              <p className="text-sm text-label-alternative">No linked risk cards yet.</p>
            ) : riskCards.slice(0, 4).map(card => (
              <div key={card.id} className="rounded-wds border border-line-neutral bg-surface-normal p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{card.title}</p>
                  <Badge tone={card.severity === 'high' ? 'negative' : 'caution'}>{card.severity}</Badge>
                </div>
                <p className="mt-1 text-xs text-label-neutral">{card.impact}</p>
                <p className="mt-2 text-xs text-label-alternative">Evidence: {card.evidenceId}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-wds border border-line-neutral p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">Human Operating Decision</p>
          <p className="mt-1 text-sm text-label-neutral">
            Record the operating choice behind the recommendation, including authority, automation, ownership, or attribution.
          </p>
          <div className="mt-3 grid gap-3">
            <Field label="Operating decision kind" htmlFor="operating-decision-kind">
              <select
                id="operating-decision-kind"
                value={operatingDecisionKind}
                onChange={event => onOperatingDecisionKindChange(event.target.value as OperatingDecisionKind)}
                className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
              >
                {OPERATING_DECISION_KINDS.map(kind => (
                  <option key={kind} value={kind}>{kind}</option>
                ))}
              </select>
            </Field>
            <Field label="Operating decision reason" htmlFor="operating-decision-reason">
              <textarea
                id="operating-decision-reason"
                value={operatingDecisionReason}
                onChange={event => onOperatingDecisionReasonChange(event.target.value)}
                className="min-h-24 w-full rounded-wds border border-line-neutral px-3 py-2 text-sm"
              />
            </Field>
            <Button
              size="sm"
              variant="primary"
              onClick={onRecordOperatingDecision}
              disabled={recommendations.length === 0 || riskCards.length === 0}
            >
              Record operating decision
            </Button>
          </div>
        </div>
      </div>
    </Surface>
  )
}
