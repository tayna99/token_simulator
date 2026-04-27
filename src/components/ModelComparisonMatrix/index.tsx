import { useMemo, useState } from 'react'
import { MODELS } from '../../data/models'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function ModelComparisonMatrix({ state }: Props) {
  const [sortBy, setSortBy] = useState<'cost' | 'latency' | 'quality' | 'contextWindow'>('cost')
  const [showOnlyCompetitive, setShowOnlyCompetitive] = useState(true)

  const comparison = useMemo(() => {
    const currentCostPerMonth = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    // Estimate quality scores based on model tier
    const qualityScores: Record<string, number> = {
      'claude-opus-4-7': 95,
      'claude-sonnet-4.6': 88,
      'claude-haiku-4.5': 75,
      'gpt-4o': 92,
      'gpt-4o-mini': 80,
      'gemini-2.0-flash': 85,
      'gemini-3.1-flash': 82,
      'gemini-pro': 80,
      'llama-3.3-70b': 78,
      'llama-3.1-8b': 65,
      'mistral-large': 82,
      'mistral-small': 60,
    }

    // Estimate latency (ms)
    const latencyMs: Record<string, number> = {
      'claude-opus-4-7': 800,
      'claude-sonnet-4.6': 600,
      'claude-haiku-4.5': 400,
      'gpt-4o': 1000,
      'gpt-4o-mini': 500,
      'gemini-2.0-flash': 300,
      'gemini-3.1-flash': 350,
      'gemini-pro': 400,
      'llama-3.3-70b': 1200,
      'llama-3.1-8b': 800,
      'mistral-large': 900,
      'mistral-small': 600,
    }

    const modelComparisons = MODELS.map(model => {
      const monthlyCost = calculateCost({
        model,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost

      const costDifference = monthlyCost - currentCostPerMonth
      const costDifferencePercent = currentCostPerMonth > 0 ? (costDifference / currentCostPerMonth) * 100 : 0
      const quality = qualityScores[model.id] || 70
      const latency = latencyMs[model.id] || 600

      // Value score: quality per dollar (higher is better)
      const valueScore = monthlyCost > 0 ? (quality * 100) / (monthlyCost / 100) : 0

      // Cost-efficiency score
      const efficiencyScore = (100 - (costDifferencePercent > 0 ? costDifferencePercent : 0)) * (quality / 100)

      return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        monthlyCost,
        costDifference,
        costDifferencePercent,
        inputPrice: model.inputPrice,
        outputPrice: model.outputPrice,
        quality,
        latency,
        contextWindow: model.contextWindow,
        cacheDiscount: model.cacheDiscount,
        batchDiscount: model.batchDiscount,
        valueScore,
        efficiencyScore,
        isCurrentModel: model.id === state.currentModel.id,
        isCandidateModel: model.id === state.candidateModel.id,
      }
    })

    // Filter competitive models
    const minCost = Math.min(...modelComparisons.map(m => m.monthlyCost))
    const maxCost = Math.max(...modelComparisons.map(m => m.monthlyCost))
    const costRange = maxCost - minCost

    let filtered = modelComparisons
    if (showOnlyCompetitive) {
      filtered = modelComparisons.filter(m => m.monthlyCost <= minCost * 2)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'cost':
          return a.monthlyCost - b.monthlyCost
        case 'latency':
          return a.latency - b.latency
        case 'quality':
          return b.quality - a.quality
        case 'contextWindow':
          return b.contextWindow - a.contextWindow
        default:
          return 0
      }
    })

    return {
      modelComparisons: sorted,
      currentCostPerMonth,
      minCost,
      maxCost,
      costRange,
    }
  }, [state, sortBy, showOnlyCompetitive])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Model Comparison Matrix
      </h2>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="cost">Cost (Low to High)</option>
            <option value="quality">Quality (High to Low)</option>
            <option value="latency">Latency (Fast to Slow)</option>
            <option value="contextWindow">Context Window (Large to Small)</option>
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
            Show only competitive models (within 2x of cheapest)
          </label>
        </div>
      </div>

      {/* Comprehensive table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Model</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Provider</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">$/Month</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">vs Current</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Quality</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Latency</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Context</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Features</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Value Score</th>
            </tr>
          </thead>
          <tbody>
            {comparison.modelComparisons.map(model => (
              <tr
                key={model.id}
                className={`border-t border-gray-100 ${
                  model.isCurrentModel
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : model.isCandidateModel
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-2 px-2 font-medium text-gray-900">
                  <div>
                    {model.name}
                    {model.isCurrentModel && <span className="ml-1 text-xs bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded">Current</span>}
                    {model.isCandidateModel && <span className="ml-1 text-xs bg-green-200 text-green-900 px-1.5 py-0.5 rounded">Candidate</span>}
                  </div>
                </td>
                <td className="py-2 px-2 text-gray-600">
                  {model.provider.charAt(0).toUpperCase() + model.provider.slice(1)}
                </td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">
                  {fmtCurrency(model.monthlyCost)}
                </td>
                <td className={`py-2 px-2 text-right font-semibold ${
                  model.costDifference > 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  {model.costDifference > 0 ? '+' : '−'}{fmtCurrency(Math.abs(model.costDifference))}
                  <div className={`text-xs ${model.costDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {model.costDifferencePercent > 0 ? '+' : '−'}{Math.abs(model.costDifferencePercent).toFixed(0)}%
                  </div>
                </td>
                <td className="py-2 px-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-12 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full"
                        style={{ width: `${model.quality}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold min-w-fit">{model.quality}%</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-center text-gray-700">
                  {model.latency}ms
                </td>
                <td className="py-2 px-2 text-right text-gray-700">
                  {(model.contextWindow / 1000).toFixed(0)}K
                </td>
                <td className="py-2 px-2 text-center">
                  <div className="flex justify-center gap-1">
                    {model.cacheDiscount > 0 && <span className="text-xs bg-blue-100 text-blue-900 px-1 py-0.5 rounded">Cache</span>}
                    {model.batchDiscount > 0 && <span className="text-xs bg-green-100 text-green-900 px-1 py-0.5 rounded">Batch</span>}
                  </div>
                </td>
                <td className="py-2 px-2 text-right font-bold text-blue-700">
                  {model.valueScore.toFixed(1)}x
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost vs Quality scatter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-sm font-semibold text-gray-800 mb-3">Cost vs Quality Trade-off</div>
          <div className="bg-gray-50 rounded-lg p-4 h-48">
            <svg viewBox="0 0 300 200" className="w-full h-full">
              {/* Axes */}
              <line x1="30" y1="170" x2="280" y2="170" stroke="#ccc" strokeWidth="1" />
              <line x1="30" y1="30" x2="30" y2="170" stroke="#ccc" strokeWidth="1" />
              <text x="150" y="190" textAnchor="middle" className="text-xs fill-gray-600">Monthly Cost →</text>
              <text x="15" y="100" textAnchor="middle" className="text-xs fill-gray-600" transform="rotate(-90 15 100)">Quality →</text>

              {/* Points */}
              {comparison.modelComparisons.map(model => {
                const x = 30 + ((model.monthlyCost - comparison.minCost) / (comparison.costRange || 1)) * 250
                const y = 170 - (model.quality / 100) * 140

                const isCurrentOrCandidate = model.isCurrentModel || model.isCandidateModel
                const size = isCurrentOrCandidate ? 6 : 4
                const fill = model.isCurrentModel ? '#3b82f6' : model.isCandidateModel ? '#22c55e' : '#8b5cf6'

                return (
                  <g key={model.id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={size}
                      fill={fill}
                      opacity={isCurrentOrCandidate ? 1 : 0.6}
                    />
                    <title>{model.name}</title>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="text-xs text-gray-600 mt-2">Larger circles = current/candidate models. Upper-left is ideal (low cost, high quality).</div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">Best in Class</div>
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <div className="text-xs text-green-600 font-medium">Cheapest</div>
                <div className="text-sm font-bold text-green-900">
                  {comparison.modelComparisons[0]?.name}
                </div>
                <div className="text-xs text-green-700">
                  {fmtCurrency(comparison.modelComparisons[0]?.monthlyCost || 0)}/month
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded p-2">
                <div className="text-xs text-purple-600 font-medium">Best Value</div>
                <div className="text-sm font-bold text-purple-900">
                  {comparison.modelComparisons.reduce((best, current) =>
                    current.valueScore > best.valueScore ? current : best
                  )?.name}
                </div>
                <div className="text-xs text-purple-700">
                  {comparison.modelComparisons.reduce((best, current) =>
                    current.valueScore > best.valueScore ? current : best
                  )?.valueScore.toFixed(1)}x value score
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="text-xs text-blue-600 font-medium">Highest Quality</div>
                <div className="text-sm font-bold text-blue-900">
                  {comparison.modelComparisons.reduce((best, current) =>
                    current.quality > best.quality ? current : best
                  )?.name}
                </div>
                <div className="text-xs text-blue-700">
                  {comparison.modelComparisons.reduce((best, current) =>
                    current.quality > best.quality ? current : best
                  )?.quality}% quality score
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capability matrix */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-800 mb-3">Feature Support Matrix</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-gray-50 rounded p-3">
            <div className="font-medium text-gray-800 mb-2">Cache Support</div>
            <div className="space-y-1">
              {comparison.modelComparisons.slice(0, Math.ceil(comparison.modelComparisons.length / 2)).map(model => (
                <div key={model.id} className="flex justify-between">
                  <span className="text-gray-700">{model.name}</span>
                  <span className={model.cacheDiscount > 0 ? 'text-green-700 font-semibold' : 'text-gray-500'}>
                    {model.cacheDiscount > 0 ? `✓ ${(model.cacheDiscount * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded p-3">
            <div className="font-medium text-gray-800 mb-2">Batch Discount</div>
            <div className="space-y-1">
              {comparison.modelComparisons.slice(Math.ceil(comparison.modelComparisons.length / 2)).map(model => (
                <div key={model.id} className="flex justify-between">
                  <span className="text-gray-700">{model.name}</span>
                  <span className={model.batchDiscount > 0 ? 'text-green-700 font-semibold' : 'text-gray-500'}>
                    {model.batchDiscount > 0 ? `✓ ${(model.batchDiscount * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Compare all models across cost, quality, latency, and features. Sort by your
          priority metric. Use the scatter plot to visualize cost-quality trade-offs. Value score combines price and quality.
        </p>
        <p>
          <strong>Competitive models:</strong> Toggle to show only models within 2x the cost of the cheapest option, making
          comparisons more focused.
        </p>
      </div>
    </section>
  )
}
