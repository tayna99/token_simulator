import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function TeamCostAnalysis({ state }: Props) {
  const [teamSize, setTeamSize] = useState(15)
  const [customersServed, setCustomersServed] = useState(5000)
  const [yearsToAmortize, setYearsToAmortize] = useState(3)

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

    const annualCurrent = currentCost * 12
    const annualCandidate = candidateCost * 12
    const multiYearCurrent = annualCurrent * yearsToAmortize
    const multiYearCandidate = annualCandidate * yearsToAmortize

    // Per developer metrics
    const costPerDevMonthCurrent = currentCost / Math.max(teamSize, 1)
    const costPerDevMonthCandidate = candidateCost / Math.max(teamSize, 1)
    const costPerDevYearCurrent = annualCurrent / Math.max(teamSize, 1)
    const costPerDevYearCandidate = annualCandidate / Math.max(teamSize, 1)

    // Per customer metrics
    const costPerCustomerMonthCurrent = currentCost / Math.max(customersServed, 1)
    const costPerCustomerMonthCandidate = candidateCost / Math.max(customersServed, 1)
    const costPerCustomerYearCurrent = annualCurrent / Math.max(customersServed, 1)
    const costPerCustomerYearCandidate = annualCandidate / Math.max(customersServed, 1)

    // Team productivity metrics
    const costPerDevPerMultiYear = multiYearCurrent / Math.max(teamSize, 1)
    const candidateCostPerDevPerMultiYear = multiYearCandidate / Math.max(teamSize, 1)

    // ROI perspective: if team generates value
    const avgRevenuePerDev = 500000 // Assumed
    const devProductivityPercentOfSalary = (costPerDevYearCurrent / avgRevenuePerDev) * 100

    return {
      currentCost,
      candidateCost,
      monthlySavings: currentCost - candidateCost,
      annualSavings: annualCurrent - annualCandidate,
      multiYearSavings: multiYearCurrent - multiYearCandidate,
      costPerDevMonthCurrent,
      costPerDevMonthCandidate,
      costPerDevYearCurrent,
      costPerDevYearCandidate,
      costPerCustomerMonthCurrent,
      costPerCustomerMonthCandidate,
      costPerCustomerYearCurrent,
      costPerCustomerYearCandidate,
      costPerDevPerMultiYear,
      candidateCostPerDevPerMultiYear,
      devProductivityPercentOfSalary,
      breakEvenPoint: currentCost > candidateCost ? 0 : Math.ceil((candidateCost - currentCost) / Math.max(state.periodInputTokens + state.periodOutputTokens, 1) * 1_000_000),
    }
  }, [state, teamSize, customersServed, yearsToAmortize])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Team Size & Economics Analysis
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Team Size: {teamSize} developers
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={teamSize}
            onChange={e => setTeamSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Customers Served: {customersServed.toLocaleString()}
          </label>
          <input
            type="range"
            min="100"
            max="100000"
            step="100"
            value={customersServed}
            onChange={e => setCustomersServed(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Years to Amortize: {yearsToAmortize}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={yearsToAmortize}
            onChange={e => setYearsToAmortize(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Cost per Developer/Month</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-lg font-bold text-blue-900">{fmtCurrency(analysis.costPerDevMonthCurrent)}</div>
              <div className="text-xs text-blue-600">{state.currentModel.name}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-900">{fmtCurrency(analysis.costPerDevMonthCandidate)}</div>
              <div className="text-xs text-blue-600">{state.candidateModel.name}</div>
            </div>
          </div>
          <div className="text-xs text-blue-600 mt-2">
            {analysis.costPerDevMonthCurrent > analysis.costPerDevMonthCandidate
              ? `Save ${fmtCurrency(analysis.costPerDevMonthCurrent - analysis.costPerDevMonthCandidate)} per dev`
              : `Cost ${fmtCurrency(analysis.costPerDevMonthCandidate - analysis.costPerDevMonthCurrent)} more per dev`}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Cost per Developer/Year</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-lg font-bold text-green-900">{fmtCurrency(analysis.costPerDevYearCurrent)}</div>
              <div className="text-xs text-green-600">{state.currentModel.name}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-900">{fmtCurrency(analysis.costPerDevYearCandidate)}</div>
              <div className="text-xs text-green-600">{state.candidateModel.name}</div>
            </div>
          </div>
          <div className="text-xs text-green-600 mt-2">
            {analysis.costPerDevYearCurrent > analysis.costPerDevYearCandidate
              ? `Save ${fmtCurrency(analysis.costPerDevYearCurrent - analysis.costPerDevYearCandidate)} per dev/year`
              : `Cost ${fmtCurrency(analysis.costPerDevYearCandidate - analysis.costPerDevYearCurrent)} more per dev/year`}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Cost per Customer/Month</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-lg font-bold text-purple-900">{fmtCurrency(analysis.costPerCustomerMonthCurrent)}</div>
              <div className="text-xs text-purple-600">{state.currentModel.name}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-900">{fmtCurrency(analysis.costPerCustomerMonthCandidate)}</div>
              <div className="text-xs text-purple-600">{state.candidateModel.name}</div>
            </div>
          </div>
          <div className="text-xs text-purple-600 mt-2">
            {analysis.costPerCustomerMonthCurrent > analysis.costPerCustomerMonthCandidate
              ? `Save ${fmtCurrency(analysis.costPerCustomerMonthCurrent - analysis.costPerCustomerMonthCandidate)}/customer`
              : `Cost ${fmtCurrency(analysis.costPerCustomerMonthCandidate - analysis.costPerCustomerMonthCurrent)}/customer`}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-600 font-medium mb-1">Cost per Customer/Year</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-lg font-bold text-amber-900">{fmtCurrency(analysis.costPerCustomerYearCurrent)}</div>
              <div className="text-xs text-amber-600">{state.currentModel.name}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-900">{fmtCurrency(analysis.costPerCustomerYearCandidate)}</div>
              <div className="text-xs text-amber-600">{state.candidateModel.name}</div>
            </div>
          </div>
          <div className="text-xs text-amber-600 mt-2">
            {analysis.costPerCustomerYearCurrent > analysis.costPerCustomerYearCandidate
              ? `Save ${fmtCurrency(analysis.costPerCustomerYearCurrent - analysis.costPerCustomerYearCandidate)}/customer/year`
              : `Cost ${fmtCurrency(analysis.costPerCustomerYearCandidate - analysis.costPerCustomerYearCurrent)}/customer/year`}
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="text-xs text-indigo-600 font-medium mb-1">Team {yearsToAmortize}-Year Total</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-lg font-bold text-indigo-900">{fmtCurrency(analysis.costPerDevPerMultiYear)}</div>
              <div className="text-xs text-indigo-600">per dev</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-900">{fmtCurrency(analysis.candidateCostPerDevPerMultiYear)}</div>
              <div className="text-xs text-indigo-600">per dev</div>
            </div>
          </div>
          <div className="text-xs text-indigo-600 mt-2">
            {analysis.costPerDevPerMultiYear > analysis.candidateCostPerDevPerMultiYear
              ? `Save ${fmtCurrency(analysis.costPerDevPerMultiYear - analysis.candidateCostPerDevPerMultiYear)} per dev total`
              : `Cost ${fmtCurrency(analysis.candidateCostPerDevPerMultiYear - analysis.costPerDevPerMultiYear)} more per dev`}
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
          <div className="text-xs text-rose-600 font-medium mb-1">Annual Savings (Team)</div>
          <div className="text-2xl font-bold text-rose-900">
            {analysis.annualSavings > 0 ? '+' : '−'}{fmtCurrency(Math.abs(analysis.annualSavings))}
          </div>
          <div className="text-xs text-rose-600 mt-1">
            {analysis.multiYearSavings > 0
              ? `${fmtCurrency(analysis.multiYearSavings)} over ${yearsToAmortize} years`
              : `Additional cost: ${fmtCurrency(Math.abs(analysis.multiYearSavings))}`}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">Cost as % of Developer Salary</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-700">{state.currentModel.name} (assuming $500K annual dev output)</span>
            <span className="text-sm font-semibold text-gray-900">
              {analysis.devProductivityPercentOfSalary.toFixed(2)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(analysis.devProductivityPercentOfSalary, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-600">
            {analysis.devProductivityPercentOfSalary < 5
              ? '✓ Cost-effective: LLM costs are negligible vs developer productivity'
              : analysis.devProductivityPercentOfSalary < 15
                ? '✓ Reasonable: LLM costs are reasonable compared to productivity gains'
                : '⚠️ High: LLM costs are significant — focus on ROI per feature'}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to interpret:</strong> Compare costs per developer and per customer to understand economic impact at scale. Lower cost-per-unit means better margins.
        </p>
        <p>
          <strong>Typical benchmarks:</strong> Enterprise tools often cost $10-50 per developer per year. If your cost per customer exceeds a few cents, ensure you're capturing enough value.
        </p>
      </div>
    </section>
  )
}
