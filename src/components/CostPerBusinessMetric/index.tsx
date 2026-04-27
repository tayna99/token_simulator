import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency, fmtNumber, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface BusinessMetric {
  name: string
  denominator: number
}

interface Props {
  state: SimState
}

function parsePositiveNumber(raw: string): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function fmtUnitCost(value: number): string {
  return fmtCurrency(value, value < 1 ? 4 : 2)
}

export function CostPerBusinessMetric({ state }: Props) {
  const [metricName, setMetricName] = useState('')
  const [denominator, setDenominator] = useState('')
  const [metrics, setMetrics] = useState<BusinessMetric[]>([])
  const [error, setError] = useState('')

  const costs = useMemo(() => {
    const current = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    const candidate = calculateCost({
      model: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    return {
      currentMonthlyCost: current.monthlyCost,
      candidateMonthlyCost: candidate.monthlyCost,
    }
  }, [state])

  const addMetric = () => {
    const parsed = parsePositiveNumber(denominator)
    const name = metricName.trim()

    if (!name || parsed === null) {
      setError('Enter a metric name and a denominator greater than 0.')
      return
    }

    setMetrics(prev => [...prev, { name, denominator: parsed }])
    setMetricName('')
    setDenominator('')
    setError('')
  }

  const removeMetric = (index: number) => {
    setMetrics(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Per Business Metric
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Add a denominator you actually track, such as tickets, PRs, users, jobs, or transactions per month.
          </p>
          <label className="block text-xs font-medium text-gray-700" htmlFor="business-metric-name">
            Metric name
          </label>
          <input
            id="business-metric-name"
            type="text"
            placeholder="Support tickets"
            value={metricName}
            onChange={e => setMetricName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs"
          />
          <label className="block text-xs font-medium text-gray-700" htmlFor="business-metric-denominator">
            Monthly denominator
          </label>
          <div className="flex gap-2">
            <input
              id="business-metric-denominator"
              type="number"
              min="0"
              step="1"
              placeholder="1000"
              value={denominator}
              onChange={e => setDenominator(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={addMetric}
              className="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add metric
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-700 mb-2">Configured denominators</div>
          {metrics.length === 0 ? (
            <div className="text-xs text-blue-600">No denominators yet</div>
          ) : (
            <div className="space-y-1">
              {metrics.map((metric, idx) => (
                <div key={`${metric.name}-${idx}`} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-blue-800">
                    {metric.name} ({fmtNumber(metric.denominator)})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMetric(idx)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          Add a denominator to compare cost per business metric. This panel does not invent proxy metrics.
        </div>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Metric</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly denominator</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">{state.currentModel.name}</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">{state.candidateModel.name}</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Difference</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, idx) => {
                const currentUnitCost = costs.currentMonthlyCost / metric.denominator
                const candidateUnitCost = costs.candidateMonthlyCost / metric.denominator
                const diff = currentUnitCost - candidateUnitCost
                const diffPct = currentUnitCost > 0 ? diff / currentUnitCost : 0
                const saves = diff > 0

                return (
                  <tr key={`${metric.name}-${idx}`} className="border-t border-gray-100 hover:bg-blue-50">
                    <td className="py-2 px-2 font-medium text-gray-900">{metric.name}</td>
                    <td className="py-2 px-2 text-right text-gray-700">{fmtNumber(metric.denominator)}</td>
                    <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                      {fmtUnitCost(currentUnitCost)}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                      {fmtUnitCost(candidateUnitCost)}
                    </td>
                    <td className={`py-2 px-2 text-right font-semibold ${saves ? 'text-green-700' : 'text-red-700'}`}>
                      {saves ? '-' : '+'}{fmtUnitCost(Math.abs(diff))}
                      <div className={`text-xs ${saves ? 'text-green-600' : 'text-red-600'}`}>
                        {saves ? '-' : '+'}{fmtPercent(Math.abs(diffPct), 1)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
