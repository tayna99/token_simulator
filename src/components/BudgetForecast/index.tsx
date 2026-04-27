import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function BudgetForecast({ state }: Props) {
  const [budgetAmount, setBudgetAmount] = useState(state.monthlyBudgetUsd ?? 50000)
  const [growthRate, setGrowthRate] = useState(5) // 5% month-over-month growth
  const [forecastMonths, setForecastMonths] = useState(12)

  const forecast = useMemo(() => {
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

    const months = []
    const growthMultiplier = 1 + growthRate / 100

    for (let m = 1; m <= forecastMonths; m++) {
      const costMultiplier = Math.pow(growthMultiplier, m - 1)
      const currentMonthCost = currentCost * costMultiplier
      const candidateMonthCost = candidateCost * costMultiplier

      const utilizationCurrent = (currentMonthCost / budgetAmount) * 100
      const utilizationCandidate = (candidateMonthCost / budgetAmount) * 100

      const overbudgetCurrent = utilizationCurrent > 100
      const overbudgetCandidate = utilizationCandidate > 100

      months.push({
        month: m,
        monthLabel: `M${m}`,
        currentCost: currentMonthCost,
        candidateCost: candidateMonthCost,
        budgetAmount,
        utilizationCurrent,
        utilizationCandidate,
        overbudgetCurrent,
        overbudgetCandidate,
        overageAmountCurrent: Math.max(0, currentMonthCost - budgetAmount),
        overageAmountCandidate: Math.max(0, candidateMonthCost - budgetAmount),
      })
    }

    return {
      months,
      currentTotalCost: months.reduce((sum, m) => sum + m.currentCost, 0),
      candidateTotalCost: months.reduce((sum, m) => sum + m.candidateCost, 0),
      currentFirstOverbudget: months.find(m => m.overbudgetCurrent),
      candidateFirstOverbudget: months.find(m => m.overbudgetCandidate),
      currentTotalOverage: months.reduce((sum, m) => sum + m.overageAmountCurrent, 0),
      candidateTotalOverage: months.reduce((sum, m) => sum + m.overageAmountCandidate, 0),
    }
  }, [state, budgetAmount, growthRate, forecastMonths])

  const needsBudgetIncrease = forecast.currentFirstOverbudget || forecast.candidateFirstOverbudget
  const recommendedBudget = needsBudgetIncrease
    ? Math.ceil(Math.max(...forecast.months.map(m => m.currentCost)) / 1000) * 1000
    : budgetAmount

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Budget Forecast & Alerts
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Monthly Budget</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-600">$</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={budgetAmount}
              onChange={e => setBudgetAmount(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-6 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Growth Rate (%/month)</label>
          <input
            type="number"
            min="0"
            max="50"
            step="1"
            value={growthRate}
            onChange={e => setGrowthRate(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Forecast Period (months)</label>
          <select
            value={forecastMonths}
            onChange={e => setForecastMonths(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
            <option value={36}>36 months</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Recommended Budget</label>
          <div className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900">
            {fmtCurrency(recommendedBudget)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {/* Current Model Forecast */}
        <div className={`rounded-lg p-4 border-2 ${
          forecast.currentFirstOverbudget ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
        }`}>
          <div className="text-sm font-semibold text-gray-900 mb-3">
            {state.currentModel.name} - {forecastMonths}mo Forecast
          </div>

          <div className="space-y-2 mb-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-700">Total Cost:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(forecast.currentTotalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Budget Amount:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(budgetAmount * forecastMonths)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Utilization:</span>
              <span className={`font-semibold ${
                (forecast.currentTotalCost / (budgetAmount * forecastMonths)) > 1 ? 'text-red-700' : 'text-green-700'
              }`}>
                {((forecast.currentTotalCost / (budgetAmount * forecastMonths)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {forecast.currentFirstOverbudget && (
            <div className="bg-white rounded p-2 text-xs mb-3">
              <div className="font-semibold text-red-900 mb-1">⚠️ Budget Alert</div>
              <div className="text-red-800">
                Overage starts {forecast.currentFirstOverbudget.monthLabel}
              </div>
              <div className="text-red-800 font-semibold mt-1">
                Total overage: {fmtCurrency(forecast.currentTotalOverage)}
              </div>
            </div>
          )}

          {!forecast.currentFirstOverbudget && (
            <div className="bg-white rounded p-2 text-xs">
              <div className="font-semibold text-green-900">✓ Within Budget</div>
              <div className="text-green-800">No overages projected</div>
            </div>
          )}
        </div>

        {/* Candidate Model Forecast */}
        <div className={`rounded-lg p-4 border-2 ${
          forecast.candidateFirstOverbudget ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
        }`}>
          <div className="text-sm font-semibold text-gray-900 mb-3">
            {state.candidateModel.name} - {forecastMonths}mo Forecast
          </div>

          <div className="space-y-2 mb-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-700">Total Cost:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(forecast.candidateTotalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Budget Amount:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(budgetAmount * forecastMonths)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Utilization:</span>
              <span className={`font-semibold ${
                (forecast.candidateTotalCost / (budgetAmount * forecastMonths)) > 1 ? 'text-red-700' : 'text-green-700'
              }`}>
                {((forecast.candidateTotalCost / (budgetAmount * forecastMonths)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {forecast.candidateFirstOverbudget && (
            <div className="bg-white rounded p-2 text-xs mb-3">
              <div className="font-semibold text-red-900 mb-1">⚠️ Budget Alert</div>
              <div className="text-red-800">
                Overage starts {forecast.candidateFirstOverbudget.monthLabel}
              </div>
              <div className="text-red-800 font-semibold mt-1">
                Total overage: {fmtCurrency(forecast.candidateTotalOverage)}
              </div>
            </div>
          )}

          {!forecast.candidateFirstOverbudget && (
            <div className="bg-white rounded p-2 text-xs">
              <div className="font-semibold text-green-900">✓ Within Budget</div>
              <div className="text-green-800">No overages projected</div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Month-by-Month Chart */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-800 mb-3">Monthly Budget Utilization</div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-end justify-between h-40 gap-1">
            {forecast.months.map((month, idx) => {
              const showMonthLabel = [0, Math.floor(forecastMonths / 4), Math.floor(forecastMonths / 2), forecastMonths - 1].includes(idx)
              const isCurrent = state.currentModel.id === state.currentModel.id
              const utilization = isCurrent ? month.utilizationCurrent : month.utilizationCandidate
              const barHeight = Math.min(utilization / 100, 1.5) * 100

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className={`w-full rounded-t transition-colors ${
                      utilization > 100 ? 'bg-red-500' : utilization > 80 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ height: `${barHeight}%`, minHeight: '2px' }}
                    title={`${utilization.toFixed(0)}% utilization`}
                  ></div>
                  {showMonthLabel && (
                    <div className="text-xs text-gray-600 mt-2 font-medium">{month.monthLabel}</div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
            <div>Month 1</div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>&lt;80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>80-100%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>&gt;100%</span>
              </div>
            </div>
            <div>Month {forecastMonths}</div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to interpret:</strong> Green indicates healthy budget utilization (&lt;80%).
          Yellow signals caution (80-100%). Red indicates budget overrun (&gt;100%).
        </p>
        <p>
          <strong>Growth rate:</strong> Models token usage growth at specified percentage per month.
          Adjust based on your expected user/workload growth.
        </p>
      </div>
    </section>
  )
}
