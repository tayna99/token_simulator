import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function BreakevenAnalysis({ state }: Props) {
  const [switchingCost, setSwitchingCost] = useState(50000) // Implementation + training
  const [riskFactor, setRiskFactor] = useState(100) // 100% = no risk, 80% = 20% risk

  const analysis = useMemo(() => {
    const currentCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    const candidateCost = calculateCost({
      model: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    const monthlySavings = currentCost - candidateCost
    const monthlySavingsAdjusted = monthlySavings * (riskFactor / 100)

    // Breakeven in months (switching cost / monthly savings)
    const breakevenMonths = monthlySavingsAdjusted > 0 ? Math.ceil(switchingCost / monthlySavingsAdjusted) : Infinity
    const breakevenYears = breakevenMonths / 12

    // Generate month-by-month data
    const months = []
    let cumulativeSavings = -switchingCost // Start with negative switching cost

    for (let m = 1; m <= 36; m++) {
      cumulativeSavings += monthlySavingsAdjusted
      const isPositive = cumulativeSavings > 0
      const breakeven = !isPositive && cumulativeSavings + monthlySavingsAdjusted > 0

      months.push({
        month: m,
        monthlySavings: monthlySavingsAdjusted,
        cumulativeSavings: cumulativeSavings,
        isPositive,
        breakeven,
      })
    }

    // ROI calculation at different time horizons
    const roi1Year = ((monthlySavingsAdjusted * 12 - switchingCost) / switchingCost) * 100
    const roi2Year = ((monthlySavingsAdjusted * 24 - switchingCost) / switchingCost) * 100
    const roi3Year = ((monthlySavingsAdjusted * 36 - switchingCost) / switchingCost) * 100

    // Risk scenarios
    const pessimisticSavings = monthlySavings * 0.7 // 30% less savings than expected
    const optimisticSavings = monthlySavings * 1.3 // 30% more savings than expected

    const pessimisticBreakeven = pessimisticSavings > 0 ? Math.ceil(switchingCost / pessimisticSavings) : Infinity
    const optimisticBreakeven = optimisticSavings > 0 ? Math.ceil(switchingCost / optimisticSavings) : Infinity

    return {
      currentCost,
      candidateCost,
      monthlySavings,
      monthlySavingsAdjusted,
      breakevenMonths,
      breakevenYears,
      months,
      roi1Year,
      roi2Year,
      roi3Year,
      pessimisticBreakeven,
      optimisticBreakeven,
      isBeneficial: monthlySavings > 0,
    }
  }, [state, switchingCost, riskFactor])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Break-even Analysis
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Switching Cost (implementation + training)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-600">$</span>
            <input
              type="number"
              min="0"
              step="5000"
              value={switchingCost}
              onChange={e => setSwitchingCost(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-6 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Risk Factor ({riskFactor}%)</label>
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            value={riskFactor}
            onChange={e => setRiskFactor(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-600 mt-1">
            {riskFactor === 100 ? 'No risk applied' : `${100 - riskFactor}% risk reduction`}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-700 mb-1">Monthly Savings</div>
          <div className="text-2xl font-bold text-blue-900">
            {fmtCurrency(analysis.monthlySavingsAdjusted)}
          </div>
          <div className="text-xs text-blue-700 mt-1">{analysis.isBeneficial ? 'Positive' : 'Negative'} savings</div>
        </div>
      </div>

      {/* Main break-even indicator */}
      <div className={`rounded-lg p-6 mb-6 border-2 ${
        analysis.isBeneficial
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-700 mb-1">Break-even Period</div>
            <div className="text-4xl font-bold text-gray-900">
              {analysis.breakevenMonths === Infinity ? '∞' : analysis.breakevenMonths}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {analysis.breakevenMonths === Infinity ? 'Never breaks even' : `${analysis.breakevenYears.toFixed(1)} years`}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-700 mb-1">1-Year ROI</div>
            <div className={`text-4xl font-bold ${analysis.roi1Year >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {analysis.roi1Year.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {analysis.roi1Year >= 0 ? 'Return' : 'Loss'} in year 1
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-700 mb-1">3-Year ROI</div>
            <div className={`text-4xl font-bold ${analysis.roi3Year >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {analysis.roi3Year.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {analysis.roi3Year >= 0 ? 'Return' : 'Loss'} in 3 years
            </div>
          </div>
        </div>
      </div>

      {/* Break-even timeline chart */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Cumulative Savings Over Time</div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-end justify-between h-32 gap-0.5">
            {analysis.months.map((month, idx) => {
              const isFirst = idx === 0
              const isBreakeven = month.breakeven
              const maxValue = Math.max(...analysis.months.map(m => Math.abs(m.cumulativeSavings)))
              const barHeight = (Math.abs(month.cumulativeSavings) / maxValue) * 100

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end relative group"
                  title={`Month ${month.month}: ${fmtCurrency(month.cumulativeSavings)}`}
                >
                  <div
                    className={`w-full transition-colors ${
                      isBreakeven ? 'bg-amber-500' : month.isPositive ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ height: `${barHeight}%`, minHeight: '2px' }}
                  ></div>
                  {isFirst && (
                    <div className="absolute bottom-2 text-xs text-gray-600 font-medium">Start</div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
            <div>Month 1</div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Negative</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span>Break-even</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Positive</span>
              </div>
            </div>
            <div>Month 36</div>
          </div>
        </div>
      </div>

      {/* Risk scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs font-medium text-red-700 mb-2">Pessimistic Scenario</div>
          <div className="text-xs text-red-800 space-y-1">
            <div className="flex justify-between">
              <span>Monthly Savings:</span>
              <span className="font-semibold">{fmtCurrency(analysis.monthlySavings * 0.7)}</span>
            </div>
            <div className="flex justify-between">
              <span>Break-even:</span>
              <span className="font-semibold">
                {analysis.pessimisticBreakeven === Infinity ? 'Never' : `${analysis.pessimisticBreakeven} months`}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-700 mb-2">Base Case</div>
          <div className="text-xs text-blue-800 space-y-1">
            <div className="flex justify-between">
              <span>Monthly Savings:</span>
              <span className="font-semibold">{fmtCurrency(analysis.monthlySavingsAdjusted)}</span>
            </div>
            <div className="flex justify-between">
              <span>Break-even:</span>
              <span className="font-semibold">
                {analysis.breakevenMonths === Infinity ? 'Never' : `${analysis.breakevenMonths} months`}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs font-medium text-green-700 mb-2">Optimistic Scenario</div>
          <div className="text-xs text-green-800 space-y-1">
            <div className="flex justify-between">
              <span>Monthly Savings:</span>
              <span className="font-semibold">{fmtCurrency(analysis.monthlySavings * 1.3)}</span>
            </div>
            <div className="flex justify-between">
              <span>Break-even:</span>
              <span className="font-semibold">
                {analysis.optimisticBreakeven === Infinity ? 'Never' : `${analysis.optimisticBreakeven} months`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decision framework */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-blue-900 mb-2">When to Switch</div>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>✓ Break-even &lt; 12 months: Switch quickly</li>
            <li>✓ Break-even 12-24 months: Strong business case</li>
            <li>⚠ Break-even 24+ months: Requires board approval</li>
            <li>✗ Never breaks even: Do not switch</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-amber-900 mb-2">Risk Considerations</div>
          <ul className="text-xs text-amber-800 space-y-1">
            <li>• Quality differences may impact adoption</li>
            <li>• Team retraining costs can be higher</li>
            <li>• Integration challenges may delay benefits</li>
            <li>• Volume discounts may improve over time</li>
          </ul>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Adjust switching cost and risk factor to model different scenarios. The chart shows
          when cumulative savings exceed switching costs. Break-even analysis helps justify model migration decisions to
          stakeholders.
        </p>
        <p>
          <strong>Risk factor:</strong> Use 100% for best-case scenario, reduce to 70-80% to conservatively account for
          unexpected costs or lower-than-expected savings.
        </p>
      </div>
    </section>
  )
}
