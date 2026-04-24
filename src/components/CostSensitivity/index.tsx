import { useMemo } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function CostSensitivity({ state }: Props) {
  const sensitivity = useMemo(() => {
    const base = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    // Impact of 50% increase in input tokens
    const inputUp50 = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens * 1.5,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    // Impact of 50% increase in output tokens
    const outputUp50 = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens * 1.5,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    // Impact of 20% better cache hit rate
    const cacheUp = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: Math.min(1, state.cacheHitRate + 0.2),
      batchEnabled: state.batchEnabled,
    })

    // Impact of batch enablement
    const batchOn = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: true,
    })

    const baseCost = base.monthlyCost

    const impacts = [
      {
        label: 'Input +50%',
        cost: inputUp50.monthlyCost,
        delta: inputUp50.monthlyCost - baseCost,
        percent: ((inputUp50.monthlyCost - baseCost) / baseCost) * 100,
      },
      {
        label: 'Output +50%',
        cost: outputUp50.monthlyCost,
        delta: outputUp50.monthlyCost - baseCost,
        percent: ((outputUp50.monthlyCost - baseCost) / baseCost) * 100,
      },
      {
        label: 'Cache +20%',
        cost: cacheUp.monthlyCost,
        delta: cacheUp.monthlyCost - baseCost,
        percent: ((cacheUp.monthlyCost - baseCost) / baseCost) * 100,
      },
    ]

    if (!state.batchEnabled && state.periodOutputTokens > 0) {
      impacts.push({
        label: 'Enable Batch',
        cost: batchOn.monthlyCost,
        delta: batchOn.monthlyCost - baseCost,
        percent: ((batchOn.monthlyCost - baseCost) / baseCost) * 100,
      })
    }

    return { baseCost, impacts: impacts.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent)) }
  }, [state])

  const maxImpact = Math.max(...sensitivity.impacts.map(i => Math.abs(i.percent)))

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Sensitivity Analysis
      </h2>

      <div className="space-y-3 mb-4">
        {sensitivity.impacts.map(impact => {
          const barWidth = maxImpact > 0 ? (Math.abs(impact.percent) / maxImpact) * 100 : 0
          const isNegative = impact.percent < 0

          return (
            <div key={impact.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{impact.label}</span>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {fmtCurrency(impact.cost)}
                  </div>
                  <div className={`text-xs ${isNegative ? 'text-green-600' : 'text-red-600'}`}>
                    {isNegative ? '−' : '+'}{fmtCurrency(Math.abs(impact.delta))} ({isNegative ? '' : '+'}{impact.percent.toFixed(1)}%)
                  </div>
                </div>
              </div>

              <div className="h-2 bg-gray-100 rounded overflow-hidden">
                <div
                  className={`h-full ${isNegative ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-gray-700">
          <strong>Current cost:</strong> {fmtCurrency(sensitivity.baseCost)}/month
        </p>
        <p className="text-xs text-gray-600 mt-2">
          <strong>How to read:</strong> Shows the cost impact of a 50% change in inputs/outputs, or 20% improvement in cache. Higher bars mean that parameter has bigger impact on your costs.
        </p>
      </div>
    </section>
  )
}
