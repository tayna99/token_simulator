import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency, fmtNumber, fmtPercent, fmtTokens } from '../../lib/format'
import type { SimState } from '../../App'

interface RequestType {
  id: string
  name: string
  share: number
}

interface Props {
  state: SimState
}

const DEFAULT_REQUEST_TYPES: RequestType[] = [
  { id: 'search-query', name: 'Search Query', share: 40 },
  { id: 'code-generation', name: 'Code Generation', share: 25 },
  { id: 'chat-response', name: 'Chat Response', share: 20 },
  { id: 'summarization', name: 'Summarization', share: 15 },
]

function clampShare(raw: string): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function RequestPatternAnalyzer({ state }: Props) {
  const [requestTypes, setRequestTypes] = useState<RequestType[]>(DEFAULT_REQUEST_TYPES)

  const totalShare = requestTypes.reduce((sum, type) => sum + type.share, 0)
  const hasValidShare = totalShare === 100

  const rows = useMemo(() => {
    return requestTypes.map(type => {
      const ratio = type.share / 100
      const monthlyInputTokens = state.periodInputTokens * ratio
      const monthlyOutputTokens = state.periodOutputTokens * ratio
      const monthlyRequests = state.monthlyRequests * ratio
      const cost = calculateCost({
        model: state.currentModel,
        monthlyInputTokens,
        monthlyOutputTokens,
        monthlyRequests,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      })

      return {
        ...type,
        monthlyRequests,
        monthlyInputTokens,
        monthlyOutputTokens,
        monthlyCost: cost.monthlyCost,
        costPerRequest: cost.costPerRequest,
      }
    }).sort((a, b) => b.monthlyCost - a.monthlyCost)
  }, [requestTypes, state])

  const totalCost = rows.reduce((sum, row) => sum + row.monthlyCost, 0)
  const topDriver = rows[0]

  const updateShare = (id: string, share: number) => {
    setRequestTypes(prev => prev.map(type => type.id === id ? { ...type, share } : type))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Request Pattern Analyzer
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Requests/Month</div>
          <div className="text-2xl font-bold text-blue-900">{fmtTokens(state.monthlyRequests)}</div>
          <div className="text-xs text-blue-700 mt-1">{fmtNumber(state.monthlyRequests / 30)}/day avg</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Total Pattern Cost</div>
          <div className="text-2xl font-bold text-purple-900">{fmtCurrency(totalCost)}</div>
          <div className="text-xs text-purple-700 mt-1">calculator-derived</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Largest Driver</div>
          <div className="text-sm font-bold text-green-900">{topDriver?.name ?? 'None'}</div>
          <div className="text-xs text-green-700 mt-1">{topDriver ? fmtCurrency(topDriver.monthlyCost) : '$0'}/month</div>
        </div>
      </div>

      <div className={`mb-4 rounded-lg border p-3 text-xs ${hasValidShare ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        Traffic share total: <strong>{fmtPercent(totalShare / 100)}</strong>
        {!hasValidShare && <span className="ml-2">Traffic share total must equal 100% before using this as a complete workload split.</span>}
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Request type</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Traffic share</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly requests</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Input tokens</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Output tokens</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Cost/request</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(type => (
              <tr key={type.id} data-testid={`request-type-${type.id}`} className="border-t border-gray-100 hover:bg-blue-50">
                <td className="py-2 px-2 font-medium text-gray-900">{type.name}</td>
                <td className="py-2 px-2 text-right">
                  <div className="flex justify-end items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={type.share}
                      onChange={e => updateShare(type.id, clampShare(e.target.value))}
                      aria-label={`${type.name} traffic share`}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-right"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtTokens(type.monthlyRequests)}</td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtTokens(type.monthlyInputTokens)}</td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtTokens(type.monthlyOutputTokens)}</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">{fmtCurrency(type.costPerRequest, 4)}</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">{fmtCurrency(type.monthlyCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
        Edit the traffic distribution to map your own request mix. Each row receives the same share of input tokens,
        output tokens, and requests, then runs through the shared calculator path.
      </div>
    </section>
  )
}
