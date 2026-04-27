// src/components/MigrationPanel/index.tsx
import { useTranslation } from 'react-i18next'
import { calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency, fmtDelta, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function MigrationPanel({ state }: Props) {
  const { t } = useTranslation()
  const isSameModel = state.currentModel.id === state.candidateModel.id

  if (isSameModel) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">{t('migration.title')}</h2>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-sm text-amber-800">
            {t('errors.sameModel')} ({state.currentModel.name}).
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
    monthlyRequests: state.monthlyRequests,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const isSaving = result.monthlyDelta < 0
  const deltaColor = isSaving ? 'text-green-600' : 'text-red-600'
  const deltaBg = isSaving ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'

  const migrationEffortHours = 40
  const engineerHourly = 150
  const effortCost = migrationEffortHours * engineerHourly
  const breakEvenMonths = isSaving
    ? Math.ceil(effortCost / Math.abs(result.monthlyDelta))
    : null

  const arrow = isSaving ? '▼' : '▲'
  const breakdownDiffs = [
    { label: 'input cost', summaryLabel: 'input', value: result.candidateCost.inputCost - result.currentCost.inputCost },
    { label: 'output cost', summaryLabel: 'output', value: result.candidateCost.outputCost - result.currentCost.outputCost },
    { label: 'cache savings', summaryLabel: 'cache', value: result.candidateCost.cacheSavings - result.currentCost.cacheSavings },
    { label: 'batch savings', summaryLabel: 'batch', value: result.candidateCost.batchSavings - result.currentCost.batchSavings },
  ]
  const changedMost = breakdownDiffs.reduce((best, item) =>
    Math.abs(item.value) > Math.abs(best.value) ? item : best
  )

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm md:text-base font-semibold text-gray-800">{t('migration.title')}</h2>
        <span className="text-xs text-gray-500" title="Compares costs between current model and candidate model with migration effort consideration">(?)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mb-6">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 md:p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t('config.currentModel')}</p>
          <p className="font-semibold text-sm md:text-base text-gray-900">{state.currentModel.name}</p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 mt-2">
            {fmtCurrency(result.currentCost.monthlyCost)}/mo
          </p>
          <p className="text-xs md:text-sm text-gray-500">{fmtCurrency(result.currentCost.annualCost)}/yr</p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 md:p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{t('config.candidateModel')}</p>
          <p className="font-semibold text-sm md:text-base text-gray-900">{state.candidateModel.name}</p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 mt-2">
            {fmtCurrency(result.candidateCost.monthlyCost)}/mo
          </p>
          <p className="text-xs md:text-sm text-gray-500">{fmtCurrency(result.candidateCost.annualCost)}/yr</p>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Breakdown</th>
              <th className="px-3 py-2 text-right font-medium">{t('config.currentModel')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('config.candidateModel')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-3 py-2 text-gray-600">Input cost</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.currentCost.inputCost)}</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.candidateCost.inputCost)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-600">Output cost</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.currentCost.outputCost)}</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.candidateCost.outputCost)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-600">Uncached input</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.currentCost.uncachedInputCost)}</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.candidateCost.uncachedInputCost)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-600">Cached input</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.currentCost.cachedInputCost)}</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.candidateCost.cachedInputCost)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-600">Cache savings</td>
              <td data-testid="current-cache-savings" className="px-3 py-2 text-right text-gray-900">
                {fmtCurrency(result.currentCost.cacheSavings)}
              </td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.candidateCost.cacheSavings)}</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-600">Batch savings</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.currentCost.batchSavings)}</td>
              <td className="px-3 py-2 text-right text-gray-900">{fmtCurrency(result.candidateCost.batchSavings)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        Changed most: <span className="font-semibold">{changedMost.summaryLabel}</span> ({fmtDelta(changedMost.value)}).
      </p>

      <div className={`rounded-lg border p-3 md:p-4 ${deltaBg}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 text-center mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('migration.monthly')}</p>
            <p
              data-testid="monthly-delta"
              className={`text-lg md:text-xl font-bold ${deltaColor}`}
            >
              <span translate="no">{arrow} {fmtDelta(result.monthlyDelta)}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('migration.annual')}</p>
            <p className={`text-lg md:text-xl font-bold ${deltaColor}`}>
              <span translate="no">{arrow} {fmtDelta(result.annualDelta)}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('migration.percent')}</p>
            <p className={`text-lg md:text-xl font-bold ${deltaColor}`}>
              {fmtPercent(result.savingPercent / 100, 1)}
            </p>
          </div>
        </div>

        {breakEvenMonths !== null && (
          <div data-testid="break-even" className="pt-3 md:pt-4 border-t border-current border-opacity-20 text-center">
            <p className="text-xs md:text-sm font-medium">
              {t('migration.breakEven')} <span className="font-bold">{breakEvenMonths} {t('migration.months')}</span>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
