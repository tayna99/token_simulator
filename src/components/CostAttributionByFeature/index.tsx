import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Feature {
  id: string
  name: string
  percentage: number
  color: string
}

interface FeatureCost {
  id: string
  name: string
  percentage: number
  inputTokens: number
  outputTokens: number
  monthlyCost: number
  color: string
  avgCostPerRequest: number
  efficiencyScore: number
}

interface Props {
  state: SimState
}

export function CostAttributionByFeature({ state }: Props) {
  const [features, setFeatures] = useState<Feature[]>([
    { id: '1', name: 'RAG Search', percentage: 35, color: 'bg-blue-500' },
    { id: '2', name: 'Code Generation', percentage: 25, color: 'bg-purple-500' },
    { id: '3', name: 'Summarization', percentage: 20, color: 'bg-green-500' },
    { id: '4', name: 'Classification', percentage: 12, color: 'bg-amber-500' },
    { id: '5', name: 'Other', percentage: 8, color: 'bg-gray-500' },
  ])
  const [newFeatureName, setNewFeatureName] = useState('')
  const [newFeaturePercent, setNewFeaturePercent] = useState(0)

  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-red-500']

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

    // Distribute tokens by feature percentage
    const featureCosts: FeatureCost[] = features.map(f => {
      const inputTokens = state.periodInputTokens * (f.percentage / 100)
      const outputTokens = state.periodOutputTokens * (f.percentage / 100)

      // Simple cost calculation based on distribution
      const featureCostCurrent = currentCost * (f.percentage / 100)

      // Estimate efficiency (lower tokens per request is better)
      // Assume average request count from monthly requests in state
      const avgTokensPerRequest = (inputTokens + outputTokens) / Math.max(state.monthlyRequests || 1, 1)

      // Efficiency score: tokens per request (lower is better, inverted)
      const efficiencyScore = Math.max(0, 100 - (avgTokensPerRequest / 100))

      return {
        id: f.id,
        name: f.name,
        percentage: f.percentage,
        inputTokens,
        outputTokens,
        monthlyCost: featureCostCurrent,
        color: f.color,
        avgCostPerRequest: featureCostCurrent / Math.max(state.monthlyRequests * (f.percentage / 100), 1),
        efficiencyScore: Math.max(0, Math.min(100, efficiencyScore)),
      }
    })

    featureCosts.sort((a, b) => b.monthlyCost - a.monthlyCost)

    const totalCost = featureCosts.reduce((sum, f) => sum + f.monthlyCost, 0)
    const totalInputTokens = featureCosts.reduce((sum, f) => sum + f.inputTokens, 0)
    const totalOutputTokens = featureCosts.reduce((sum, f) => sum + f.outputTokens, 0)

    // Find optimization opportunities
    const opportunitiesRanked = featureCosts
      .filter(f => f.percentage > 5) // Only features >5% of load
      .sort((a, b) => b.monthlyCost - a.monthlyCost)
      .slice(0, 3)

    return {
      featureCosts,
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      opportunitiesRanked,
      currentCost,
      candidateCost,
    }
  }, [state, features])

  const addFeature = () => {
    if (!newFeatureName.trim() || newFeaturePercent <= 0) return

    const totalPercent = features.reduce((sum, f) => sum + f.percentage, 0)
    if (totalPercent + newFeaturePercent > 100) {
      alert('Total percentage cannot exceed 100%')
      return
    }

    const newFeature: Feature = {
      id: Date.now().toString(),
      name: newFeatureName,
      percentage: newFeaturePercent,
      color: colors[features.length % colors.length],
    }

    setFeatures([...features, newFeature])
    setNewFeatureName('')
    setNewFeaturePercent(0)
  }

  const updateFeaturePercent = (id: string, percentage: number) => {
    const otherTotal = features
      .filter(f => f.id !== id)
      .reduce((sum, f) => sum + f.percentage, 0)

    if (otherTotal + percentage <= 100) {
      setFeatures(features.map(f => (f.id === id ? { ...f, percentage } : f)))
    }
  }

  const removeFeature = (id: string) => {
    setFeatures(features.filter(f => f.id !== id))
  }

  const totalPercent = features.reduce((sum, f) => sum + f.percentage, 0)

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Attribution by Feature
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Total Monthly Cost</div>
          <div className="text-2xl font-bold text-blue-900">{fmtCurrency(analysis.totalCost)}</div>
          <div className="text-xs text-blue-700 mt-1">Across {features.length} features</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Total Tokens</div>
          <div className="text-2xl font-bold text-purple-900">
            {((analysis.totalInputTokens + analysis.totalOutputTokens) / 1_000_000).toFixed(0)}M
          </div>
          <div className="text-xs text-purple-700 mt-1">
            {(analysis.totalInputTokens / 1_000_000).toFixed(1)}M input, {(analysis.totalOutputTokens / 1_000_000).toFixed(1)}M output
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Top Opportunity</div>
          <div className="text-sm font-bold text-green-900">
            {analysis.opportunitiesRanked[0]?.name || 'N/A'}
          </div>
          <div className="text-xs text-green-700 mt-1">
            {analysis.opportunitiesRanked[0] ? fmtCurrency(analysis.opportunitiesRanked[0].monthlyCost) : '—'}/month
          </div>
        </div>
      </div>

      {/* Cost pie chart visualization */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Cost Distribution</div>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-center h-40">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {analysis.featureCosts.map((feature, idx) => {
                    const startAngle = analysis.featureCosts.slice(0, idx).reduce((sum, f) => sum + (f.percentage / 100) * 360, 0)
                    const endAngle = startAngle + (feature.percentage / 100) * 360
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180

                    const x1 = 50 + 40 * Math.cos(startRad)
                    const y1 = 50 + 40 * Math.sin(startRad)
                    const x2 = 50 + 40 * Math.cos(endRad)
                    const y2 = 50 + 40 * Math.sin(endRad)

                    const largeArc = endAngle - startAngle > 180 ? 1 : 0

                    const colorMap: Record<string, string> = {
                      'bg-blue-500': '#3b82f6',
                      'bg-purple-500': '#a855f7',
                      'bg-green-500': '#22c55e',
                      'bg-amber-500': '#f59e0b',
                      'bg-pink-500': '#ec4899',
                      'bg-indigo-500': '#6366f1',
                      'bg-cyan-500': '#06b6d4',
                      'bg-red-500': '#ef4444',
                      'bg-gray-500': '#6b7280',
                    }

                    return (
                      <path
                        key={feature.id}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={colorMap[feature.color]}
                        stroke="white"
                        strokeWidth="2"
                      />
                    )
                  })}
                </svg>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="space-y-2">
              {analysis.featureCosts.map(feature => (
                <div key={feature.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${feature.color}`}></div>
                  <span className="text-xs font-medium text-gray-700">{feature.name}</span>
                  <span className="text-xs font-bold text-gray-900 ml-auto">{feature.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature details table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Feature</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Load %</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Input Tokens</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Output Tokens</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly Cost</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Cost/Request</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {analysis.featureCosts.map(feature => (
              <tr key={feature.id} className="border-t border-gray-100 hover:bg-blue-50">
                <td className="py-2 px-2 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${feature.color}`}></div>
                    {feature.name}
                  </div>
                </td>
                <td className="py-2 px-2 text-center text-gray-700">{feature.percentage}%</td>
                <td className="py-2 px-2 text-right text-gray-700">{(feature.inputTokens / 1_000_000).toFixed(1)}M</td>
                <td className="py-2 px-2 text-right text-gray-700">{(feature.outputTokens / 1_000_000).toFixed(1)}M</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">{fmtCurrency(feature.monthlyCost)}</td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtCurrency(feature.avgCostPerRequest)}</td>
                <td className="py-2 px-2 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-8 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-green-600 h-1.5 rounded-full"
                        style={{ width: `${feature.efficiencyScore}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feature configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-blue-900 mb-3">Adjust Feature Distribution</div>
          <div className="space-y-3">
            {features.map(feature => (
              <div key={feature.id}>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">{feature.name}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={feature.percentage}
                    onChange={e => updateFeaturePercent(feature.id, parseInt(e.target.value) || 0)}
                    className="w-12 border border-gray-300 rounded px-1 py-0.5 text-xs text-right"
                  />
                  <span className="text-xs text-gray-600">%</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={feature.color.replace('500', '600')}
                      style={{ width: `${feature.percentage}%`, height: '100%', borderRadius: '9999px' }}
                    ></div>
                  </div>
                  <button
                    onClick={() => removeFeature(feature.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-2 bg-white rounded text-xs text-gray-700">
            Total: <span className="font-semibold">{totalPercent}%</span>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-green-900 mb-3">Add Feature</div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Feature name (e.g., Chat, Image Gen)"
              value={newFeatureName}
              onChange={e => setNewFeatureName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="% of workload"
                value={newFeaturePercent}
                onChange={e => setNewFeaturePercent(parseInt(e.target.value) || 0)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs"
              />
              <button
                onClick={addFeature}
                className="px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-4 bg-white rounded p-2 text-xs text-green-800 space-y-1">
            <p><strong>Available:</strong> {Math.max(0, 100 - totalPercent)}%</p>
            <p className="text-xs">Edit percentages to simulate different workload distributions</p>
          </div>
        </div>
      </div>

      {/* Optimization recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {analysis.opportunitiesRanked.slice(0, 3).map((opportunity, idx) => (
          <div key={opportunity.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-xs font-medium text-amber-700 mb-2">
              {idx === 0 ? '🎯' : idx === 1 ? '📌' : '💡'} {opportunity.name}
            </div>
            <div className="text-xs text-amber-800 space-y-1">
              <div className="flex justify-between">
                <span>Monthly Cost:</span>
                <span className="font-semibold">{fmtCurrency(opportunity.monthlyCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Optimization:</span>
                <span className="font-semibold">5-15% savings</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Allocate your workload across features to understand cost distribution. Adjust
          percentages to see how different feature mixes affect total costs. Identify high-cost features for optimization.
        </p>
        <p>
          <strong>Insights:</strong> Focus optimization efforts on features that consume the most resources. Small
          efficiency improvements in high-cost features yield the largest savings.
        </p>
      </div>
    </section>
  )
}
