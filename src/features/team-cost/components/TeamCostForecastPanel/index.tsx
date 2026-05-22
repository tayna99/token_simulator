import type { BottleneckFinding } from '../../lib/bottleneckAnalysis'
import type { Deliverable } from '../../lib/deliverables'
import type { DeliverablePerformanceSummary } from '../../lib/deliverableMetrics'
import type { AgentCostEstimate, TeamCostEstimate } from '../../lib/estimateAgentWorkload'
import { Badge, MetricTile, Surface } from '../../../../shared/ui/primitives'
import { fmtCurrency, fmtPercent, fmtTokens } from '../../../../lib/format'

interface TeamCostForecastPanelProps {
  teamEstimate: TeamCostEstimate
  estimates: AgentCostEstimate[]
  bottlenecks: BottleneckFinding[]
  deliverables: Deliverable[]
  performanceSummary: DeliverablePerformanceSummary
}

function toneForSeverity(severity: string): 'positive' | 'caution' | 'negative' {
  if (severity === 'high') return 'negative'
  if (severity === 'medium') return 'caution'
  return 'positive'
}

function statusTone(status: Deliverable['status']): 'positive' | 'caution' | 'negative' {
  if (status === 'passed_review' || status === 'produced') return 'positive'
  if (status === 'escalated' || status === 'reworked') return 'caution'
  return 'negative'
}

export function TeamCostForecastPanel({
  teamEstimate,
  estimates,
  bottlenecks,
  deliverables,
  performanceSummary,
}: TeamCostForecastPanelProps) {
  return (
    <Surface
      eyebrow="Deterministic forecast"
      title="3. Cost & Performance"
      description="Agent I/O and call volume still drive cost. The deliverable board attributes that existing cost estimate to concrete outputs."
    >
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="Monthly cost" value={fmtCurrency(teamEstimate.monthlyCostUsd)} help="Calculated from existing agent estimates" />
        <MetricTile label="Monthly requests" value={fmtTokens(teamEstimate.monthlyRequests)} />
        <MetricTile label="Input tokens" value={fmtTokens(teamEstimate.monthlyInputTokens)} />
        <MetricTile label="Top agent share" value={fmtPercent(teamEstimate.topAgentShare)} tone={teamEstimate.topAgentShare > 0.45 ? 'negative' : 'caution'} />
      </div>
      <p className="sr-only" data-testid="team-monthly-cost">{fmtCurrency(teamEstimate.monthlyCostUsd)}</p>

      <div className="mt-4 rounded-wds border border-line-neutral">
        <div className="flex flex-col gap-2 border-b border-line-neutral px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Deliverable Board</h3>
            <p className="text-xs text-label-alternative">
              Outputs, attributed cost, review pass rate, and rework/escalation signals.
            </p>
          </div>
          <Badge tone="primary">{fmtTokens(performanceSummary.throughput)} outputs</Badge>
        </div>
        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
          {deliverables.map(deliverable => {
            const costPerDeliverable = deliverable.count > 0
              ? deliverable.costAttributedUsd / deliverable.count
              : 0
            return (
              <div key={deliverable.id} className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-label-normal">{deliverable.type}</p>
                    <p className="text-xs text-label-alternative">{deliverable.agentRole}</p>
                  </div>
                  <Badge tone={statusTone(deliverable.status)}>{deliverable.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-label-neutral">
                  <p><strong className="text-label-normal">{fmtTokens(deliverable.count)}</strong> delivered</p>
                  <p><strong className="text-label-normal">{fmtTokens(deliverable.callsConsumed)}</strong> calls consumed</p>
                  <p><strong className="text-label-normal">{fmtCurrency(costPerDeliverable, 3)}</strong> cost per deliverable</p>
                  <p>{fmtPercent(performanceSummary.passRate)} pass rate</p>
                  <p>{fmtPercent(performanceSummary.reworkRate)} rework / {fmtPercent(performanceSummary.escalationRate)} escalation signal</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-wds border border-line-neutral">
          <div className="border-b border-line-neutral px-3 py-2">
            <h3 className="text-sm font-semibold">Agent breakdown</h3>
          </div>
          <div className="divide-y divide-line-neutral">
            {estimates.slice(0, 6).map(estimate => (
              <div key={estimate.agentId} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{estimate.role}</p>
                  <p className="text-xs text-label-alternative" translate="no">{fmtTokens(estimate.monthlyInputTokens + estimate.monthlyOutputTokens)} tokens</p>
                </div>
                <strong className="text-sm" translate="no">{fmtCurrency(estimate.cost.monthlyCost)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          {bottlenecks.slice(0, 5).map(finding => (
            <div key={finding.id} className="rounded-wds border border-line-neutral p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-label-alternative">{finding.kind}</p>
                <Badge tone={toneForSeverity(finding.severity)}>{finding.severity}</Badge>
              </div>
              <p className="mt-1 text-sm text-label-neutral">{finding.message}</p>
            </div>
          ))}
        </div>
      </div>
    </Surface>
  )
}
