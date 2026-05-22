import { Badge, MetricTile, Surface } from '../../../../shared/ui/primitives'
import { fmtCurrency, fmtPercent, fmtTokens } from '../../../../lib/format'
import type { OperationalSignalSummary as OperationalSignalSummaryData } from '../../lib/operationalSignals'

interface Props {
  summary: OperationalSignalSummaryData
}

export function OperationalSignalSummary({ summary }: Props) {
  return (
    <Surface
      eyebrow="Operational signals"
      title="Operational Signal Summary"
      description="This is not an alerting system yet. It points to the sessions and agent runs worth inspecting before margin or pricing decisions."
    >
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile
          label="Top session"
          value={summary.topSession ? fmtCurrency(summary.topSession.costUsd) : '$0'}
          help={summary.topSession ? summary.topSession.id : 'No session id'}
          tone={summary.topSession ? 'caution' : 'neutral'}
        />
        <MetricTile
          label="Top agent run"
          value={summary.topAgentRun ? fmtCurrency(summary.topAgentRun.costUsd) : '$0'}
          help={summary.topAgentRun ? summary.topAgentRun.id : 'No agent run id'}
          tone={summary.topAgentRun ? 'caution' : 'neutral'}
        />
        <MetricTile
          label="Failed/retry share"
          value={fmtPercent(summary.failedShare)}
          help={`${fmtTokens(summary.missingStatusCount)} missing statuses`}
          tone={summary.failedShare > 0 ? 'negative' : 'positive'}
        />
        <MetricTile
          label="Missing dimensions"
          value={fmtTokens(summary.missingDimensionCount)}
          help="Rows missing customer, plan, session, or agent-run"
        />
      </div>
      {summary.highOutputTokenRows.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.highOutputTokenRows.map(row => (
            <Badge key={row.requestId ?? `${row.feature}-${row.outputTokens}`}>
              {row.feature}: {fmtTokens(row.outputTokens)} output
            </Badge>
          ))}
        </div>
      )}
    </Surface>
  )
}
