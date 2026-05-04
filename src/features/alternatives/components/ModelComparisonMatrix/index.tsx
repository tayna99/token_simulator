import { useMemo, useState } from 'react'
import { MODELS } from '../../../../data/models'
import { calculateCost } from '../../../../lib/calculator'
import { fmtCurrency, fmtDelta, fmtNumber, fmtPricePerMillion, fmtTokens } from '../../../../lib/format'
import type { SimState } from '../../../../App'

type SortKey = 'costPerRequest' | 'monthlyCost' | 'contextWindow' | 'cache' | 'batch'

interface Props {
  state: SimState
}

function providerLabel(provider: string): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

export function ModelComparisonMatrix({ state }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('costPerRequest')
  const [showOnlyCompetitive, setShowOnlyCompetitive] = useState(true)

  const comparison = useMemo(() => {
    const current = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      monthlyRequests: state.monthlyRequests,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    const rows = MODELS.map(model => {
      const cost = calculateCost({
        model,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        monthlyRequests: state.monthlyRequests,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      })

      return {
        model,
        monthlyCost: cost.monthlyCost,
        costPerRequest: cost.costPerRequest,
        delta: cost.monthlyCost - current.monthlyCost,
        contextWindow: model.contextWindow,
        supportsCaching: model.supportsCaching,
        supportsBatch: model.supportsBatch,
        isCurrentModel: model.id === state.currentModel.id,
        isCandidateModel: model.id === state.candidateModel.id,
      }
    })

    const cheapest = Math.min(...rows.map(row => row.monthlyCost))
    const filtered = showOnlyCompetitive
      ? rows.filter(row => row.monthlyCost <= cheapest * 2)
      : rows

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'costPerRequest':
          return a.costPerRequest - b.costPerRequest
        case 'monthlyCost':
          return a.monthlyCost - b.monthlyCost
        case 'contextWindow':
          return b.contextWindow - a.contextWindow
        case 'cache':
          return Number(b.supportsCaching) - Number(a.supportsCaching) || a.costPerRequest - b.costPerRequest
        case 'batch':
          return Number(b.supportsBatch) - Number(a.supportsBatch) || a.costPerRequest - b.costPerRequest
      }
    })

    return { rows: sorted, cheapest }
  }, [state, sortBy, showOnlyCompetitive])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Model Comparison Matrix
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="model-matrix-sort" className="block text-xs font-medium text-gray-700 mb-2">
            Sort models
          </label>
          <select
            id="model-matrix-sort"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="costPerRequest">Cost/request (low to high)</option>
            <option value="monthlyCost">Monthly cost (low to high)</option>
            <option value="contextWindow">Context window (large to small)</option>
            <option value="cache">Cache support first</option>
            <option value="batch">Batch support first</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={showOnlyCompetitive}
              onChange={e => setShowOnlyCompetitive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Show models within 2x of the cheapest monthly cost
          </label>
        </div>
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Model</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Provider</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Price</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly cost</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Cost/request</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">vs current</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Context</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Cache</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Batch</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map(row => (
              <tr
                key={row.model.id}
                data-testid="model-comparison-row"
                className={`border-t border-gray-100 ${
                  row.isCurrentModel
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : row.isCandidateModel
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-2 px-2 font-medium text-gray-900">
                  {row.model.name}
                  {row.isCurrentModel && <span className="ml-1 text-xs bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded">Current</span>}
                  {row.isCandidateModel && <span className="ml-1 text-xs bg-green-200 text-green-900 px-1.5 py-0.5 rounded">Candidate</span>}
                </td>
                <td className="py-2 px-2 text-gray-600">{providerLabel(row.model.provider)}</td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtPricePerMillion(row.model.inputPrice, row.model.outputPrice)}</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">{fmtCurrency(row.monthlyCost)}</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">{fmtCurrency(row.costPerRequest, 4)}</td>
                <td className={`py-2 px-2 text-right font-semibold ${row.delta > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {fmtDelta(row.delta)}
                </td>
                <td className="py-2 px-2 text-right text-gray-700" title={fmtNumber(row.contextWindow)}>
                  {fmtTokens(row.contextWindow)}
                </td>
                <td className="py-2 px-2 text-center">
                  {row.supportsCaching ? <span className="text-xs bg-blue-100 text-blue-900 px-1 py-0.5 rounded">Yes</span> : <span className="text-gray-400">No</span>}
                </td>
                <td className="py-2 px-2 text-center">
                  {row.supportsBatch ? <span className="text-xs bg-green-100 text-green-900 px-1 py-0.5 rounded">Yes</span> : <span className="text-gray-400">No</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
        Rankings use the selected workload, shared cache rate, batch mode, and static model catalog only. No benchmark,
        speed, or subjective score is inferred here.
      </div>
    </section>
  )
}
