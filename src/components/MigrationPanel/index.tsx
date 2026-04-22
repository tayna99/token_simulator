// src/components/MigrationPanel/index.tsx
import { calculateMigrationDelta } from '../../lib/calculator'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtDelta(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  return `${sign}$${fmt(abs)}`
}

export function MigrationPanel({ state }: Props) {
  const result = calculateMigrationDelta({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.monthlyInputTokens,
    monthlyOutputTokens: state.monthlyOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const isSaving = result.monthlyDelta < 0
  const deltaColor = isSaving ? 'text-green-600' : 'text-red-600'
  const deltaBg = isSaving ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Migration Comparison</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current</p>
          <p className="font-semibold text-gray-900">{state.currentModel.name}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            ${fmt(result.currentCost.monthlyCost)}/mo
          </p>
          <p className="text-sm text-gray-500">${fmt(result.currentCost.annualCost)}/yr</p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Candidate</p>
          <p className="font-semibold text-gray-900">{state.candidateModel.name}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            ${fmt(result.candidateCost.monthlyCost)}/mo
          </p>
          <p className="text-sm text-gray-500">${fmt(result.candidateCost.annualCost)}/yr</p>
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${deltaBg}`}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">Monthly Delta</p>
            <p
              data-testid="monthly-delta"
              className={`text-xl font-bold ${deltaColor}`}
            >
              {fmtDelta(result.monthlyDelta)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Annual Delta</p>
            <p className={`text-xl font-bold ${deltaColor}`}>
              {fmtDelta(result.annualDelta)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Change</p>
            <p className={`text-xl font-bold ${deltaColor}`}>
              {result.savingPercent.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
