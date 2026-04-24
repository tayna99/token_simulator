import { useTranslation } from 'react-i18next'
import { calculateCapacity } from '../../lib/budget'
import { fmtCurrency, fmtTokens } from '../../lib/format'
import { ROLE_PACK } from '../../lib/roleLanguage'
import type { SimState } from '../../App'

interface Props {
  state: SimState
  onBudgetChange: (v: number | null) => void
}

export function BudgetCap({ state, onBudgetChange }: Props) {
  const { t } = useTranslation()
  const heading = ROLE_PACK[state.role].budgetHeading

  const avgIn =
    state.monthlyRequests > 0
      ? state.periodInputTokens / state.monthlyRequests
      : 0
  const avgOut =
    state.monthlyRequests > 0
      ? state.periodOutputTokens / state.monthlyRequests
      : 0

  const cap =
    state.monthlyBudgetUsd !== null
      ? calculateCapacity({
          model: state.currentModel,
          monthlyBudgetUsd: state.monthlyBudgetUsd,
          avgInputTokensPerRequest: avgIn,
          avgOutputTokensPerRequest: avgOut,
          cacheHitRate: state.cacheHitRate,
          batchEnabled: state.batchEnabled,
        })
      : null

  const maxUsers =
    cap &&
    state.monthlyRequests > 0 &&
    state.activeUsers > 0
      ? Math.floor(
          cap.maxMonthlyRequests /
            (state.monthlyRequests / state.activeUsers)
        )
      : 0

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        {heading}
      </h2>
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1">
          <label
            htmlFor="monthly-budget"
            className="text-sm text-gray-600 block mb-1"
          >
            {t('budgetCap.label')}
          </label>
          <input
            id="monthly-budget"
            type="number"
            min={0}
            placeholder="e.g. 500"
            value={state.monthlyBudgetUsd ?? ''}
            onChange={e => {
              const v = e.target.value
              onBudgetChange(v === '' ? null : Math.max(0, Number(v)))
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        {cap && state.monthlyBudgetUsd !== null && (
          <>
            <div className="flex-1 rounded bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Cost per request</div>
              <div className="font-semibold">
                {fmtCurrency(cap.costPerRequestUsd, 4)}
              </div>
            </div>
            <div className="flex-1 rounded bg-gray-50 p-3">
              <div className="text-xs text-gray-500">
                Max requests / month
              </div>
              <div className="font-semibold">
                {cap.maxMonthlyRequests === Infinity
                  ? '∞'
                  : fmtTokens(cap.maxMonthlyRequests)}
              </div>
            </div>
            {maxUsers > 0 && (
              <div className="flex-1 rounded bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Max active users</div>
                <div className="font-semibold">
                  {fmtTokens(maxUsers)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
