import { useTranslation } from 'react-i18next'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function BatchAnalyzer({ state }: Props) {
  const { t } = useTranslation()

  if (state.batchEnabled || state.periodOutputTokens === 0) {
    return null
  }

  // Calculate cost without batch
  const withoutBatch = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: false,
  })

  // Calculate cost with batch
  const withBatch = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: true,
  })

  const batchDiscount = state.currentModel.batchDiscount
  const monthlySavings = withoutBatch.monthlyCost - withBatch.monthlyCost
  const annualSavings = withoutBatch.annualCost - withBatch.annualCost
  const savingsPercent = (monthlySavings / withoutBatch.monthlyCost) * 100

  if (batchDiscount === 0 || monthlySavings <= 0) {
    return null
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        {t('batchAnalyzer.title')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">{t('batchAnalyzer.discountRate')}</div>
          <div className="text-2xl font-bold text-blue-900">
            {(batchDiscount * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {t('batchAnalyzer.onOutputTokens')}
          </div>
        </div>

        <div className="rounded-lg bg-green-50 border border-green-200 p-3">
          <div className="text-xs text-green-600 font-medium mb-1">{t('batchAnalyzer.monthlySavings')}</div>
          <div className="text-2xl font-bold text-green-900">
            {fmtCurrency(monthlySavings)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            {t('batchAnalyzer.reduction', { percent: `${savingsPercent.toFixed(1)}%` })}
          </div>
        </div>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
          <div className="text-xs text-emerald-600 font-medium mb-1">{t('batchAnalyzer.annualSavings')}</div>
          <div className="text-2xl font-bold text-emerald-900">
            {fmtCurrency(annualSavings)}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            {(annualSavings / 12).toFixed(0)} months to ROI
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>{t('batchAnalyzer.notePrefix')}</strong> {t('batchAnalyzer.note')} <strong>{(batchDiscount * 100).toFixed(0)}%</strong>.
        </p>
      </div>
    </section>
  )
}
