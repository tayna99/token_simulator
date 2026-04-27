import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function TCOCalculator({ state }: Props) {
  const [tcoYears, setTcoYears] = useState(3)
  const [implementationCost, setImplementationCost] = useState(50000)
  const [infrastructureCostPerMonth, setInfrastructureCostPerMonth] = useState(5000)
  const [trainingCostPerMonth, setTrainingCostPerMonth] = useState(2000)
  const [maintenanceCostPercent, setMaintenanceCostPercent] = useState(10)

  const tco = useMemo(() => {
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

    const months = tcoYears * 12
    const trainingMonths = Math.min(3, months) // Training only in first 3 months

    // Current model TCO
    const currentLLMCost = currentCost * months
    const currentInfraCost = infrastructureCostPerMonth * months
    const currentTrainingCost = trainingCostPerMonth * trainingMonths
    const currentMaintenanceCost = (currentLLMCost * maintenanceCostPercent) / 100
    const currentTotalTCO = currentLLMCost + implementationCost + currentInfraCost + currentTrainingCost + currentMaintenanceCost

    // Candidate model TCO
    const candidateLLMCost = candidateCost * months
    const candidateInfraCost = infrastructureCostPerMonth * months
    const candidateTrainingCost = trainingCostPerMonth * trainingMonths
    const candidateMaintenanceCost = (candidateLLMCost * maintenanceCostPercent) / 100
    const candidateTotalTCO = candidateLLMCost + implementationCost + candidateInfraCost + candidateTrainingCost + candidateMaintenanceCost

    const monthlyAverageCurrent = currentTotalTCO / months
    const monthlyAverageCandidate = candidateTotalTCO / months

    const savingsAbsolute = currentTotalTCO - candidateTotalTCO
    const savingsPercent = currentTotalTCO > 0 ? (savingsAbsolute / currentTotalTCO) * 100 : 0

    return {
      current: {
        llmCost: currentLLMCost,
        implementation: implementationCost,
        infrastructure: currentInfraCost,
        training: currentTrainingCost,
        maintenance: currentMaintenanceCost,
        total: currentTotalTCO,
        monthlyAverage: monthlyAverageCurrent,
      },
      candidate: {
        llmCost: candidateLLMCost,
        implementation: implementationCost,
        infrastructure: candidateInfraCost,
        training: candidateTrainingCost,
        maintenance: candidateMaintenanceCost,
        total: candidateTotalTCO,
        monthlyAverage: monthlyAverageCandidate,
      },
      savings: {
        absolute: savingsAbsolute,
        percent: savingsPercent,
      },
    }
  }, [state, tcoYears, implementationCost, infrastructureCostPerMonth, trainingCostPerMonth, maintenanceCostPercent])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Total Cost of Ownership (TCO) Calculator
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Analysis Period (years)</label>
          <select
            value={tcoYears}
            onChange={e => setTcoYears(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={1}>1 year</option>
            <option value={2}>2 years</option>
            <option value={3}>3 years</option>
            <option value={5}>5 years</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Implementation Cost (one-time)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-600">$</span>
            <input
              type="number"
              min="0"
              step="5000"
              value={implementationCost}
              onChange={e => setImplementationCost(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-6 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Infrastructure Cost/Month</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-600">$</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={infrastructureCostPerMonth}
              onChange={e => setInfrastructureCostPerMonth(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-6 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Training Cost/Month (first 3mo)</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-600">$</span>
            <input
              type="number"
              min="0"
              step="500"
              value={trainingCostPerMonth}
              onChange={e => setTrainingCostPerMonth(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-6 text-sm"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-2">Maintenance Cost (% of LLM annual cost)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={maintenanceCostPercent}
              onChange={e => setMaintenanceCostPercent(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-semibold text-gray-900 min-w-fit">{maintenanceCostPercent}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Current Model TCO */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">
            {state.currentModel.name} - {tcoYears}-Year TCO
          </div>

          <div className="space-y-2 mb-4 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-700">LLM Costs:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.current.llmCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Implementation:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.current.implementation)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Infrastructure:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.current.infrastructure)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Training:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.current.training)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Maintenance:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.current.maintenance)}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between font-bold">
              <span className="text-blue-900">Total TCO:</span>
              <span className="text-blue-900 text-lg">{fmtCurrency(tco.current.total)}</span>
            </div>
            <div className="flex justify-between text-gray-600 pt-1">
              <span>Monthly Average:</span>
              <span className="font-medium">{fmtCurrency(tco.current.monthlyAverage)}</span>
            </div>
          </div>
        </div>

        {/* Candidate Model TCO */}
        <div className={`rounded-lg p-4 border-2 ${
          tco.savings.absolute > 0
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="text-sm font-semibold text-gray-900 mb-3">
            {state.candidateModel.name} - {tcoYears}-Year TCO
          </div>

          <div className="space-y-2 mb-4 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-700">LLM Costs:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.candidate.llmCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Implementation:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.candidate.implementation)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Infrastructure:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.candidate.infrastructure)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Training:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.candidate.training)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Maintenance:</span>
              <span className="font-semibold text-gray-900">{fmtCurrency(tco.candidate.maintenance)}</span>
            </div>
            <div className={`border-t pt-2 mt-2 flex justify-between font-bold ${
              tco.savings.absolute > 0 ? 'border-green-200' : 'border-red-200'
            }`}>
              <span className="text-gray-900">Total TCO:</span>
              <span className={`text-lg ${tco.savings.absolute > 0 ? 'text-green-900' : 'text-red-900'}`}>
                {fmtCurrency(tco.candidate.total)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 pt-1">
              <span>Monthly Average:</span>
              <span className="font-medium">{fmtCurrency(tco.candidate.monthlyAverage)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Summary */}
      <div className={`rounded-lg p-4 mb-6 ${
        tco.savings.absolute > 0
          ? 'bg-green-50 border border-green-200'
          : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="text-sm font-semibold text-gray-900 mb-3">
          {tcoYears}-Year Savings Analysis
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white rounded p-3">
            <div className="text-gray-600 font-medium">Total Savings</div>
            <div className={`text-2xl font-bold ${
              tco.savings.absolute > 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {tco.savings.absolute > 0 ? '−' : '+'}{fmtCurrency(Math.abs(tco.savings.absolute))}
            </div>
          </div>

          <div className="bg-white rounded p-3">
            <div className="text-gray-600 font-medium">Savings %</div>
            <div className={`text-2xl font-bold ${
              tco.savings.absolute > 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {tco.savings.absolute > 0 ? '−' : '+'}{Math.abs(tco.savings.percent).toFixed(1)}%
            </div>
          </div>

          <div className="bg-white rounded p-3">
            <div className="text-gray-600 font-medium">Monthly Savings</div>
            <div className={`text-2xl font-bold ${
              (tco.current.monthlyAverage - tco.candidate.monthlyAverage) > 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {(tco.current.monthlyAverage - tco.candidate.monthlyAverage) > 0 ? '−' : '+'}{fmtCurrency(Math.abs(tco.current.monthlyAverage - tco.candidate.monthlyAverage))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Cost Breakdown by Category</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current breakdown */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-700 mb-2">{state.currentModel.name}</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>LLM Costs</span>
                <span className="font-semibold">{((tco.current.llmCost / tco.current.total) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded"
                  style={{ width: `${(tco.current.llmCost / tco.current.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between">
                <span>Implementation + Training</span>
                <span className="font-semibold">{(((tco.current.implementation + tco.current.training) / tco.current.total) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-1.5">
                <div
                  className="bg-amber-600 h-1.5 rounded"
                  style={{ width: `${((tco.current.implementation + tco.current.training) / tco.current.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between">
                <span>Infrastructure + Maintenance</span>
                <span className="font-semibold">{(((tco.current.infrastructure + tco.current.maintenance) / tco.current.total) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-1.5">
                <div
                  className="bg-purple-600 h-1.5 rounded"
                  style={{ width: `${((tco.current.infrastructure + tco.current.maintenance) / tco.current.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Candidate breakdown */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-700 mb-2">{state.candidateModel.name}</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>LLM Costs</span>
                <span className="font-semibold">{((tco.candidate.llmCost / tco.candidate.total) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded"
                  style={{ width: `${(tco.candidate.llmCost / tco.candidate.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between">
                <span>Implementation + Training</span>
                <span className="font-semibold">{(((tco.candidate.implementation + tco.candidate.training) / tco.candidate.total) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-1.5">
                <div
                  className="bg-amber-600 h-1.5 rounded"
                  style={{ width: `${((tco.candidate.implementation + tco.candidate.training) / tco.candidate.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between">
                <span>Infrastructure + Maintenance</span>
                <span className="font-semibold">{(((tco.candidate.infrastructure + tco.candidate.maintenance) / tco.candidate.total) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded h-1.5">
                <div
                  className="bg-purple-600 h-1.5 rounded"
                  style={{ width: `${((tco.candidate.infrastructure + tco.candidate.maintenance) / tco.candidate.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>TCO includes:</strong> LLM costs, one-time implementation, recurring infrastructure, initial training,
          and ongoing maintenance. Training costs are limited to first 3 months.
        </p>
        <p>
          <strong>Use this for:</strong> Board presentations, budget planning, business case development. TCO shows the
          true cost of ownership including all supporting infrastructure and personnel costs.
        </p>
      </div>
    </section>
  )
}
