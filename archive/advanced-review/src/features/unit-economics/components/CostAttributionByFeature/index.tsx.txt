import { useMemo, useState } from 'react'
import { calculateCost } from '../../../../lib/calculator'
import { fmtCurrency, fmtNumber, fmtPercent, fmtTokens } from '../../../../lib/format'
import type { SimState } from '../../../../App'

interface Feature {
  id: string
  name: string
  share: number
}

interface Props {
  state: SimState
}

const DEFAULT_FEATURES: Feature[] = [
  { id: 'rag-search', name: 'RAG Search', share: 35 },
  { id: 'code-generation', name: 'Code Generation', share: 25 },
  { id: 'summarization', name: 'Summarization', share: 20 },
  { id: 'classification', name: 'Classification', share: 12 },
  { id: 'other', name: 'Other', share: 8 },
]

function clampShare(raw: string): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function CostAttributionByFeature({ state }: Props) {
  const [features, setFeatures] = useState<Feature[]>(DEFAULT_FEATURES)

  const totalShare = features.reduce((sum, feature) => sum + feature.share, 0)
  const hasValidShare = totalShare === 100

  const rows = useMemo(() => {
    return features.map(feature => {
      const ratio = feature.share / 100
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
        ...feature,
        monthlyInputTokens,
        monthlyOutputTokens,
        monthlyRequests,
        monthlyCost: cost.monthlyCost,
        costPerRequest: cost.costPerRequest,
      }
    }).sort((a, b) => b.monthlyCost - a.monthlyCost)
  }, [features, state])

  const totalCost = rows.reduce((sum, row) => sum + row.monthlyCost, 0)
  const topDriver = rows[0]

  const updateShare = (id: string, share: number) => {
    setFeatures(prev => prev.map(feature => feature.id === id ? { ...feature, share } : feature))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Attribution by Feature
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Attributed Monthly Cost</div>
          <div className="text-2xl font-bold text-blue-900">{fmtCurrency(totalCost)}</div>
          <div className="text-xs text-blue-700 mt-1">calculator-derived</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Feature Count</div>
          <div className="text-2xl font-bold text-purple-900">{fmtNumber(features.length)}</div>
          <div className="text-xs text-purple-700 mt-1">editable shares</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Largest Driver</div>
          <div className="text-sm font-bold text-green-900">{topDriver?.name ?? 'None'}</div>
          <div className="text-xs text-green-700 mt-1">{topDriver ? fmtCurrency(topDriver.monthlyCost) : '$0'}/month</div>
        </div>
      </div>

      <div className={`mb-4 rounded-lg border p-3 text-xs ${hasValidShare ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        Feature share total: <strong>{fmtPercent(totalShare / 100)}</strong>
        {!hasValidShare && <span className="ml-2">Feature share total must equal 100% before using this as a complete attribution.</span>}
      </div>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Feature</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Share</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly requests</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Input tokens</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Output tokens</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Cost/request</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(feature => (
              <tr key={feature.id} data-testid={`feature-${feature.id}`} className="border-t border-gray-100 hover:bg-blue-50">
                <td className="py-2 px-2 font-medium text-gray-900">{feature.name}</td>
                <td className="py-2 px-2 text-right">
                  <div className="flex justify-end items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={feature.share}
                      onChange={e => updateShare(feature.id, clampShare(e.target.value))}
                      aria-label={`${feature.name} share`}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-right"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtTokens(feature.monthlyRequests)}</td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtTokens(feature.monthlyInputTokens)}</td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtTokens(feature.monthlyOutputTokens)}</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">{fmtCurrency(feature.costPerRequest, 4)}</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">{fmtCurrency(feature.monthlyCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
        Allocate the selected workload across product features. Each feature receives the same share of requests,
        input tokens, and output tokens, then runs through the shared calculator path.
      </div>
    </section>
  )
}
