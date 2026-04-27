import { calculateCost } from '../../lib/calculator'
import { calculateCapacity } from '../../lib/budget'
import { fmtCurrency, fmtPercent, fmtTokens } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
  onBudgetChange: (value: number | null) => void
}

function finiteBudget(value: string): number | null {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

export function BudgetGuardrails({ state, onBudgetChange }: Props) {
  const current = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    monthlyRequests: state.monthlyRequests,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const avgInputTokensPerRequest = state.monthlyRequests > 0
    ? state.periodInputTokens / state.monthlyRequests
    : 0
  const avgOutputTokensPerRequest = state.monthlyRequests > 0
    ? state.periodOutputTokens / state.monthlyRequests
    : 0

  const budget = state.monthlyBudgetUsd
  const capacity = budget !== null
    ? calculateCapacity({
        model: state.currentModel,
        monthlyBudgetUsd: budget,
        avgInputTokensPerRequest,
        avgOutputTokensPerRequest,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      })
    : null

  const remaining = budget === null ? null : budget - current.monthlyCost
  const budgetRatio = budget && budget > 0 ? current.monthlyCost / budget : 0
  const alertThreshold = budget === null ? current.monthlyCost * 1.2 : budget * 0.8
  const maxUsers = capacity && state.activeUsers > 0 && state.monthlyRequests > 0
    ? Math.floor(capacity.maxMonthlyRequests / (state.monthlyRequests / state.activeUsers))
    : 0

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Budget & Quota Guardrails
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-2">Monthly budget</span>
          <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2">
            <span className="text-sm text-gray-500 mr-1">$</span>
            <input
              type="number"
              min={0}
              value={budget ?? ''}
              onChange={event => onBudgetChange(finiteBudget(event.target.value))}
              aria-label="Monthly budget"
              className="w-full text-sm outline-none"
              placeholder="500"
            />
          </div>
        </label>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Current spend</div>
          <div className="text-lg font-semibold text-gray-900">{fmtCurrency(current.monthlyCost)}</div>
          <div className="text-xs text-gray-600">{budget ? fmtPercent(budgetRatio, 1) : 'No budget set'}</div>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Manual alert threshold</div>
          <div className="text-lg font-semibold text-gray-900">{fmtCurrency(alertThreshold)}</div>
          <div className="text-xs text-gray-600">{budget === null ? '20% above current spend' : '80% of budget'}</div>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Monthly request quota</div>
          <div className="text-lg font-semibold text-gray-900">
            {capacity ? fmtTokens(capacity.maxMonthlyRequests) : 'Set budget'}
          </div>
          <div className="text-xs text-gray-600">{capacity ? `${fmtCurrency(capacity.costPerRequestUsd, 4)}/request` : 'Capacity pending'}</div>
        </div>
      </div>

      <div className={`rounded-lg border p-3 text-sm ${
        budget === null
          ? 'border-blue-200 bg-blue-50 text-blue-800'
          : remaining !== null && remaining >= 0
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
      }`}>
        {budget === null && 'Set a monthly budget to calculate request quota and overage risk.'}
        {budget !== null && remaining !== null && remaining >= 0 && (
          <>Within budget by <strong>{fmtCurrency(remaining)}</strong>. {maxUsers > 0 && <>Implied user quota: <strong>{fmtTokens(maxUsers)}</strong>.</>}</>
        )}
        {budget !== null && remaining !== null && remaining < 0 && (
          <>Over budget by <strong>{fmtCurrency(Math.abs(remaining))}</strong>. Reduce traffic, switch models, or raise budget.</>
        )}
      </div>
    </section>
  )
}
