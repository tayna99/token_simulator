// src/components/MigrationPanel/index.tsx
import { calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency, fmtDelta, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function MigrationPanel({ state }: Props) {
  const isSameModel = state.currentModel.id === state.candidateModel.id

  if (isSameModel) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Migration Comparison</h2>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-sm text-amber-800">
            Current and candidate are the <strong>same model</strong> ({state.currentModel.name}).
            Select a different candidate to see migration delta.
          </p>
        </div>
      </section>
    )
  }

  const result = calculateMigrationDelta({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const isSaving = result.monthlyDelta < 0
  const deltaColor = isSaving ? 'text-green-600' : 'text-red-600'
  const deltaBg = isSaving ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'

  // Break-even analysis
  const MIGRATION_EFFORT_HOURS = 40
  const ENGINEER_HOURLY = 150
  const effortCost = MIGRATION_EFFORT_HOURS * ENGINEER_HOURLY
  const breakEvenMonths = isSaving
    ? Math.ceil(effortCost / Math.abs(result.monthlyDelta))
    : null

  // Directional arrows
  const arrow = isSaving ? '▼' : '▲'

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Migration Comparison</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current</p>
          <p className="font-semibold text-gray-900">{state.currentModel.name}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {fmtCurrency(result.currentCost.monthlyCost)}/mo
          </p>
          <p className="text-sm text-gray-500">{fmtCurrency(result.currentCost.annualCost)}/yr</p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Candidate</p>
          <p className="font-semibold text-gray-900">{state.candidateModel.name}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {fmtCurrency(result.candidateCost.monthlyCost)}/mo
          </p>
          <p className="text-sm text-gray-500">{fmtCurrency(result.candidateCost.annualCost)}/yr</p>
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${deltaBg}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Monthly Delta</p>
            <p
              data-testid="monthly-delta"
              className={`text-xl font-bold ${deltaColor}`}
            >
              <span translate="no">{arrow} {fmtDelta(result.monthlyDelta)}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Annual Delta</p>
            <p className={`text-xl font-bold ${deltaColor}`}>
              <span translate="no">{arrow} {fmtDelta(result.annualDelta)}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Change</p>
            <p className={`text-xl font-bold ${deltaColor}`}>
              {fmtPercent(result.savingPercent / 100, 1)}
            </p>
          </div>
        </div>

        {breakEvenMonths !== null && (
          <div className="pt-4 border-t border-current border-opacity-20 text-center">
            <p className="text-sm font-medium">
              Migration pays back in <span className="font-bold">{breakEvenMonths} month{breakEvenMonths !== 1 ? 's' : ''}</span>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
