import { calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function SavingsTracker({ state }: Props) {
  const delta = calculateMigrationDelta({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    monthlyRequests: state.monthlyRequests,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  if (delta.monthlyDelta >= 0) return null

  const monthlySavings = Math.abs(delta.monthlyDelta)
  const annualSavings = Math.abs(delta.annualDelta)
  const savingRatio = delta.currentCost.monthlyCost > 0
    ? monthlySavings / delta.currentCost.monthlyCost
    : 0

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm md:text-base font-semibold text-gray-800">
            Savings Tracker
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Projected savings from switching the selected workload to {state.candidateModel.name}.
          </p>
        </div>
        <div className="text-xs text-gray-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {fmtPercent(savingRatio, 1)} lower monthly cost
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Current monthly cost</div>
          <div className="text-lg font-semibold text-gray-900">{fmtCurrency(delta.currentCost.monthlyCost)}</div>
        </div>

        <div className="rounded-lg bg-green-50 border border-green-200 p-3">
          <div className="text-xs text-green-700">Monthly projected savings</div>
          <div className="text-lg font-semibold text-green-900">{fmtCurrency(monthlySavings)}</div>
        </div>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
          <div className="text-xs text-emerald-700">Annual projected savings</div>
          <div className="text-lg font-semibold text-emerald-900">{fmtCurrency(annualSavings)}</div>
        </div>
      </div>
    </section>
  )
}
