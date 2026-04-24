import { useMemo } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency, fmtTokens } from '../../lib/format'
import { PRESETS } from '../../data/presets'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function WorkloadImpact({ state }: Props) {
  const impacts = useMemo(() => {
    const current = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    return PRESETS.map(preset => {
      const presetCost = calculateCost({
        model: state.currentModel,
        monthlyInputTokens: preset.monthlyInputTokens,
        monthlyOutputTokens: preset.monthlyOutputTokens,
        cacheHitRate: preset.defaultCacheHitRate,
        batchEnabled: preset.defaultBatchEnabled,
      })

      return {
        preset,
        cost: presetCost.monthlyCost,
        ratioDelta: presetCost.monthlyCost / current.monthlyCost,
      }
    }).sort((a, b) => a.cost - b.cost)
  }, [state])

  const currentCost = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  }).monthlyCost

  const maxCost = impacts[impacts.length - 1]?.cost || 0

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Workload Impact on Cost
      </h2>

      <div className="space-y-2">
        {impacts.map(({ preset, cost, ratioDelta }) => {
          const maxWidth = maxCost > 0 ? (cost / maxCost) * 100 : 0
          const isCheaper = cost < currentCost
          const isExpensive = cost > currentCost * 1.5

          return (
            <div key={preset.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="w-full sm:w-40">
                <div className="text-xs sm:text-sm font-medium text-gray-900">{preset.name}</div>
                <div className="text-xs text-gray-500">
                  {fmtTokens(preset.monthlyInputTokens)} / {fmtTokens(preset.monthlyOutputTokens)}
                </div>
              </div>

              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isCheaper ? 'bg-green-500' : isExpensive ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${maxWidth}%` }}
                />
              </div>

              <div className="w-20 sm:w-24 text-right">
                <div className="text-sm font-semibold text-gray-900">{fmtCurrency(cost)}</div>
                <div className={`text-xs ${isCheaper ? 'text-green-600' : isExpensive ? 'text-red-600' : 'text-gray-500'}`}>
                  {isCheaper ? '↓' : isExpensive ? '↑' : '≈'} {Math.abs((ratioDelta - 1) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
        <strong>Current workload:</strong> {fmtTokens(state.periodInputTokens)} input, {fmtTokens(state.periodOutputTokens)} output → {fmtCurrency(currentCost)}/month
      </div>
    </section>
  )
}
