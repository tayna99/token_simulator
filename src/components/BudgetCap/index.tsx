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
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold text-gray-800">
          {heading}
        </h2>
        <span className="text-xs text-gray-500" title="Calculate maximum requests or users your budget can support">(?)</span>
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1">
          <label
            htmlFor="monthly-budget"
            className="text-sm text-gray-600 block mb-1"
          >
            {t('budgetCap.label')}
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 text-sm mr-2">$</span>
            <input
              id="monthly-budget"
              type="number"
              min={0}
              placeholder="500"
              value={state.monthlyBudgetUsd ?? ''}
              onChange={e => {
                const v = e.target.value
                onBudgetChange(v === '' ? null : Math.max(0, Number(v)))
              }}
              aria-label="Monthly budget in USD"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
        {cap && state.monthlyBudgetUsd !== null && (
          <>
            <div className="flex-1 rounded bg-gray-50 p-3">
              <div className="text-xs text-gray-500">{t('budgetCap.costPerRequest')}</div>
              <div className="font-semibold">
                {fmtCurrency(cap.costPerRequestUsd, 4)}
              </div>
            </div>
            <div className="flex-1 rounded bg-gray-50 p-3">
              <div className="text-xs text-gray-500">
                {t('budgetCap.maxRequests')} / {t('periods.month')}
              </div>
              <div className="font-semibold">
                {cap.maxMonthlyRequests === Infinity
                  ? '∞'
                  : fmtTokens(cap.maxMonthlyRequests)}
              </div>
            </div>
            {maxUsers > 0 && (
              <div className="flex-1 rounded bg-gray-50 p-3">
                <div className="text-xs text-gray-500">{t('budgetCap.maxUsers')}</div>
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
