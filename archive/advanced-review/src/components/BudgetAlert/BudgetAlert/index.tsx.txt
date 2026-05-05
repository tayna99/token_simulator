import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function BudgetAlert({ state }: Props) {
  const [budgetThreshold, setBudgetThreshold] = useState(state.monthlyBudgetUsd || 5000)

  const costs = useMemo(() => {
    const current = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    const candidate = calculateCost({
      model: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    return {
      currentCost: current.monthlyCost,
      candidateCost: candidate.monthlyCost,
      currentExceeds: current.monthlyCost > budgetThreshold,
      candidateExceeds: candidate.monthlyCost > budgetThreshold,
      savings: current.monthlyCost - candidate.monthlyCost,
    }
  }, [state, budgetThreshold])

  const suggestedBudget = Math.ceil(Math.max(costs.currentCost, costs.candidateCost) * 1.1 / 100) * 100

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Budget Alert & Threshold
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Budget Threshold: {fmtCurrency(budgetThreshold)}/month
          </label>
          <input
            type="range"
            min="0"
            max="20000"
            step="500"
            value={budgetThreshold}
            onChange={e => setBudgetThreshold(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {[1000, 2500, 5000, 10000].map(budget => (
              <button
                key={budget}
                onClick={() => setBudgetThreshold(budget)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  budgetThreshold === budget
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {fmtCurrency(budget)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            className={`rounded-lg border-2 p-4 ${
              costs.currentExceeds
                ? 'bg-red-50 border-red-300'
                : 'bg-green-50 border-green-300'
            }`}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">Current Model</div>
            <div className="text-2xl font-bold text-gray-900">
              {fmtCurrency(costs.currentCost)}
            </div>
            <div className="text-xs mt-2">
              {costs.currentExceeds ? (
                <span className="text-red-700 font-medium">
                  ⚠️ Exceeds budget by {fmtCurrency(costs.currentCost - budgetThreshold)}
                </span>
              ) : (
                <span className="text-green-700">
                  ✓ Within budget ({fmtCurrency(budgetThreshold - costs.currentCost)} remaining)
                </span>
              )}
            </div>
          </div>

          <div
            className={`rounded-lg border-2 p-4 ${
              costs.candidateExceeds
                ? 'bg-red-50 border-red-300'
                : 'bg-green-50 border-green-300'
            }`}
          >
            <div className="text-xs font-medium text-gray-600 mb-1">Candidate Model</div>
            <div className="text-2xl font-bold text-gray-900">
              {fmtCurrency(costs.candidateCost)}
            </div>
            <div className="text-xs mt-2">
              {costs.candidateExceeds ? (
                <span className="text-red-700 font-medium">
                  ⚠️ Exceeds budget by {fmtCurrency(costs.candidateCost - budgetThreshold)}
                </span>
              ) : (
                <span className="text-green-700">
                  ✓ Within budget ({fmtCurrency(budgetThreshold - costs.candidateCost)} remaining)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-gray-700 mb-2">
            <strong>Recommendation:</strong> Based on current usage, set budget to at least{' '}
            <strong>{fmtCurrency(suggestedBudget)}</strong> to have a 10% safety margin.
          </p>
          {costs.savings < 0 && (
            <p className="text-xs text-blue-600">
              Switching to candidate saves {fmtCurrency(Math.abs(costs.savings))}/month
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
