import { useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function CostProjection({ state }: Props) {
  const [monthlyGrowthRate, setMonthlyGrowthRate] = useState(0.1) // 10% monthly growth
  const [projectionMonths, setProjectionMonths] = useState(12)

  const currentCost = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  // Generate projection data
  const projections = []
  for (let month = 0; month <= projectionMonths; month++) {
    const growthMultiplier = Math.pow(1 + monthlyGrowthRate, month)
    const projectedCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens * growthMultiplier,
      monthlyOutputTokens: state.periodOutputTokens * growthMultiplier,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })
    projections.push({
      month,
      cost: projectedCost.monthlyCost,
      growth: (growthMultiplier - 1) * 100,
    })
  }

  const finalCost = projections[projections.length - 1].cost
  const totalCost = projections.reduce((sum, p) => sum + p.cost, 0)

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">Cost Projection</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Monthly Growth Rate: {(monthlyGrowthRate * 100).toFixed(1)}%
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={monthlyGrowthRate * 100}
            onChange={e => setMonthlyGrowthRate(parseFloat(e.target.value) / 100)}
            className="w-full"
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {[0, 0.05, 0.1, 0.2, 0.5].map(rate => (
              <button
                key={rate}
                onClick={() => setMonthlyGrowthRate(rate)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  Math.abs(monthlyGrowthRate - rate) < 0.001
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {(rate * 100).toFixed(0)}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Projection Period: {projectionMonths} months
          </label>
          <input
            type="range"
            min="1"
            max="36"
            value={projectionMonths}
            onChange={e => setProjectionMonths(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {[6, 12, 24, 36].map(months => (
              <button
                key={months}
                onClick={() => setProjectionMonths(months)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  projectionMonths === months
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {months}mo
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Current Monthly</div>
          <div className="text-xl font-bold text-gray-900">{fmtCurrency(currentCost.monthlyCost)}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 mb-1">Month {projectionMonths} Cost</div>
          <div className="text-xl font-bold text-blue-900">{fmtCurrency(finalCost)}</div>
          <div className="text-xs text-blue-600 mt-1">
            +{((finalCost / currentCost.monthlyCost - 1) * 100).toFixed(0)}% increase
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-600 mb-1">Total {projectionMonths}-Month</div>
          <div className="text-xl font-bold text-amber-900">{fmtCurrency(totalCost)}</div>
          <div className="text-xs text-amber-600 mt-1">
            avg {fmtCurrency(totalCost / (projectionMonths + 1))}/month
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Projection:</strong> At {(monthlyGrowthRate * 100).toFixed(1)}% monthly growth, your costs will grow from {fmtCurrency(currentCost.monthlyCost)} to {fmtCurrency(finalCost)} over {projectionMonths} months. Adjust growth rate to see different scenarios.
        </p>
      </div>
    </section>
  )
}
