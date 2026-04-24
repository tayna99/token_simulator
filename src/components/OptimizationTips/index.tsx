import { useTranslation } from 'react-i18next'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function OptimizationTips({ state }: Props) {
  const { t } = useTranslation()

  const currentCost = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  // Show impact of increasing cache hit rate by 10%
  const improvedCacheRate = Math.min(1, state.cacheHitRate + 0.1)
  const improvedCostWithCache = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: improvedCacheRate,
    batchEnabled: state.batchEnabled,
  })

  const cacheSavings = currentCost.monthlyCost - improvedCostWithCache.monthlyCost
  const cacheSavingsPercent = (cacheSavings / currentCost.monthlyCost) * 100

  // Show impact of enabling batch mode (if not already enabled)
  const batchCost = state.batchEnabled ? null : calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: true,
  })

  const batchSavings = batchCost ? currentCost.monthlyCost - batchCost.monthlyCost : 0
  const batchSavingsPercent = batchCost ? (batchSavings / currentCost.monthlyCost) * 100 : 0

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">{t('optimization.title')}</h2>

      <div className="space-y-3">
        {state.cacheHitRate < 0.9 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs font-medium text-blue-900 mb-2">
              💡 {t('optimization.cacheTitle')}
            </p>
            <p className="text-xs text-blue-800 mb-2">
              {t('optimization.cacheDescription', {
                rate: fmtPercent(state.cacheHitRate + 0.1),
                saving: fmtCurrency(cacheSavings),
                percent: cacheSavingsPercent.toFixed(1),
              })}
            </p>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.max(cacheSavingsPercent * 2, 10)}%` }}
              />
            </div>
          </div>
        )}

        {!state.batchEnabled && state.periodOutputTokens > 0 && batchSavings > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-xs font-medium text-green-900 mb-2">
              ⚡ {t('optimization.batchTitle')}
            </p>
            <p className="text-xs text-green-800 mb-2">
              {t('optimization.batchDescription', {
                saving: fmtCurrency(batchSavings),
                percent: batchSavingsPercent.toFixed(1),
              })}
            </p>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.max(batchSavingsPercent * 2, 10)}%` }}
              />
            </div>
          </div>
        )}

        {state.cacheHitRate >= 0.9 && state.batchEnabled && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded">
            <p className="text-xs text-purple-800">
              ✨ {t('optimization.optimized')}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
