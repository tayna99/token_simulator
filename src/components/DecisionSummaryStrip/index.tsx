import { calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency, fmtDelta } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export function DecisionSummaryStrip({ state }: Props) {
  const result = calculateMigrationDelta({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    monthlyRequests: state.monthlyRequests,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      <Metric label="Current monthly" value={fmtCurrency(result.currentCost.monthlyCost)} />
      <Metric label="Candidate monthly" value={fmtCurrency(result.candidateCost.monthlyCost)} />
      <Metric label="Monthly delta" value={fmtDelta(result.monthlyDelta)} />
      <Metric label="Annual delta" value={fmtDelta(result.annualDelta)} />
      <Metric label="Current/request" value={fmtCurrency(result.currentCost.costPerRequest, 4)} />
      <Metric label="Candidate/request" value={fmtCurrency(result.candidateCost.costPerRequest, 4)} />
    </section>
  )
}
