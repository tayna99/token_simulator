import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function CacheAnalyzer({ state }: Props) {
  if (state.cacheHitRate >= 0.8 || state.periodInputTokens === 0 || state.currentModel.cacheDiscount === 0) {
    return null
  }

  // Current cache rate
  const current = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  // Optimized cache rate (80%)
  const optimized = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: 0.8,
    batchEnabled: state.batchEnabled,
  })

  const cacheDiscount = state.currentModel.cacheDiscount
  const monthlySavings = current.monthlyCost - optimized.monthlyCost
  const annualSavings = current.annualCost - optimized.annualCost
  const savingsPercent = (monthlySavings / current.monthlyCost) * 100

  if (cacheDiscount === 0 || monthlySavings <= 0) {
    return null
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Prompt Caching Impact
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
          <div className="text-xs text-indigo-600 font-medium mb-1">Cache Discount Rate</div>
          <div className="text-2xl font-bold text-indigo-900">
            {((1 - cacheDiscount) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-indigo-600 mt-1">
            cost reduction on cached tokens
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Monthly Savings @80%</div>
          <div className="text-2xl font-bold text-blue-900">
            {fmtCurrency(monthlySavings)}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {savingsPercent.toFixed(1)}% reduction
          </div>
        </div>

        <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3">
          <div className="text-xs text-cyan-600 font-medium mb-1">Annual Savings @80%</div>
          <div className="text-2xl font-bold text-cyan-900">
            {fmtCurrency(annualSavings)}
          </div>
          <div className="text-xs text-cyan-600 mt-1">
            from {(state.cacheHitRate * 100).toFixed(0)}% to 80%
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Tip:</strong> Prompt caching stores frequently-used contexts (like system prompts, documentation, or conversation history). This reduces costs by up to <strong>{((1 - cacheDiscount) * 100).toFixed(0)}%</strong> on cached input tokens. Increase your cache hit rate above to see the impact.
        </p>
      </div>
    </section>
  )
}
