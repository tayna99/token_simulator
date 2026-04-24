import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import { MODELS } from '../../data/models'
import type { SimState } from '../../App'

type SortKey = 'name' | 'cost' | 'inputPrice' | 'outputPrice' | 'context'
type SortOrder = 'asc' | 'desc'

interface Props {
  state: SimState
}

export function ModelMatrix({ state }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const modelData = useMemo(() => {
    return MODELS.map(model => ({
      model,
      cost: calculateCost({
        model,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost,
    }))
      .sort((a, b) => {
        let aVal, bVal
        switch (sortKey) {
          case 'cost':
            aVal = a.cost
            bVal = b.cost
            break
          case 'inputPrice':
            aVal = a.model.inputPrice
            bVal = b.model.inputPrice
            break
          case 'outputPrice':
            aVal = a.model.outputPrice
            bVal = b.model.outputPrice
            break
          case 'context':
            aVal = a.model.contextWindow
            bVal = b.model.contextWindow
            break
          case 'name':
          default:
            aVal = a.model.name.toLowerCase()
            bVal = b.model.name.toLowerCase()
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
  }, [state, sortKey, sortOrder])

  const SortHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => {
        if (sortKey === col) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
          setSortKey(col)
          setSortOrder('asc')
        }
      }}
      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
    >
      {label}
      {sortKey === col && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
    </button>
  )

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Complete Model Comparison Matrix
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">
                <SortHeader col="name" label="Model" />
              </th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Provider</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">
                <SortHeader col="inputPrice" label="Input" />
              </th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">
                <SortHeader col="outputPrice" label="Output" />
              </th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">
                <SortHeader col="cost" label="Monthly" />
              </th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">
                <SortHeader col="context" label="Context" />
              </th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Features</th>
            </tr>
          </thead>
          <tbody>
            {modelData.map(({ model, cost }, idx) => (
              <tr
                key={model.id}
                className={`border-t border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
              >
                <td className="py-2 px-2 font-medium text-gray-900">{model.name}</td>
                <td className="py-2 px-2 text-center text-gray-600 text-xs">
                  <span className="capitalize">{model.provider}</span>
                </td>
                <td className="py-2 px-2 text-right text-gray-700">
                  ${model.inputPrice.toFixed(3)}
                </td>
                <td className="py-2 px-2 text-right text-gray-700">
                  ${model.outputPrice.toFixed(3)}
                </td>
                <td
                  className={`py-2 px-2 text-right font-semibold ${
                    cost < 2000
                      ? 'text-green-700 bg-green-50'
                      : cost < 5000
                        ? 'text-gray-700'
                        : 'text-red-700'
                  }`}
                >
                  {fmtCurrency(cost)}
                </td>
                <td className="py-2 px-2 text-right text-gray-600">
                  {(model.contextWindow / 1000).toFixed(0)}K
                </td>
                <td className="py-2 px-2 text-center text-xs">
                  <div className="flex gap-1 justify-center flex-wrap">
                    {model.cacheDiscount > 0 && (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        C
                      </span>
                    )}
                    {model.batchDiscount > 0 && (
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        B
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>Legend:</strong> C = Prompt Caching, B = Batch API
        </p>
        <p>
          Showing costs for your configuration: {(state.periodInputTokens / 1_000_000).toFixed(1)}M input tokens,{' '}
          {(state.periodOutputTokens / 1_000_000).toFixed(1)}M output tokens
        </p>
      </div>
    </section>
  )
}
