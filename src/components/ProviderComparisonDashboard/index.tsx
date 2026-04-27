import { useMemo } from 'react'
import { MODELS } from '../../data/models'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function ProviderComparisonDashboard({ state }: Props) {
  const providerStats = useMemo(() => {
    const providers = Array.from(new Set(MODELS.map(m => m.provider)))

    return providers.map(provider => {
      const providerModels = MODELS.filter(m => m.provider === provider)

      const costs = providerModels.map(m =>
        calculateCost({
          model: m,
          monthlyInputTokens: state.periodInputTokens,
          monthlyOutputTokens: state.periodOutputTokens,
          cacheHitRate: state.cacheHitRate,
          batchEnabled: state.batchEnabled,
        }).monthlyCost
      )

      const modelsWithCache = providerModels.filter(m => m.cacheDiscount > 0).length
      const modelsWithBatch = providerModels.filter(m => m.batchDiscount > 0).length

      // Quality scores based on model capabilities (simplified)
      const qualityScores: Record<string, number> = {
        'Anthropic': 90,
        'OpenAI': 88,
        'Google': 82,
        'Meta': 75,
      }

      // Reliability scores based on SLA/uptime (simplified)
      const reliabilityScores: Record<string, number> = {
        'Anthropic': 99.5,
        'OpenAI': 99.9,
        'Google': 99.8,
        'Meta': 99.0,
      }

      return {
        name: provider.charAt(0).toUpperCase() + provider.slice(1),
        provider: provider,
        modelCount: providerModels.length,
        avgInputPrice: providerModels.reduce((sum, m) => sum + m.inputPrice, 0) / providerModels.length,
        avgOutputPrice: providerModels.reduce((sum, m) => sum + m.outputPrice, 0) / providerModels.length,
        avgContextWindow: providerModels.reduce((sum, m) => sum + m.contextWindow, 0) / providerModels.length,
        avgCost: costs.reduce((sum, c) => sum + c, 0) / costs.length,
        minCost: Math.min(...costs),
        maxCost: Math.max(...costs),
        modelsWithCache,
        modelsWithBatch,
        cachePercentage: (modelsWithCache / providerModels.length) * 100,
        batchPercentage: (modelsWithBatch / providerModels.length) * 100,
        qualityScore: qualityScores[provider] || 80,
        reliabilityScore: reliabilityScores[provider] || 99.0,
      }
    }).sort((a, b) => a.avgCost - b.avgCost)
  }, [state])

  const cheapestProvider = providerStats[0]
  const bestQuality = [...providerStats].sort((a, b) => b.qualityScore - a.qualityScore)[0]
  const bestReliability = [...providerStats].sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0]
  const bestValue = [...providerStats].sort((a, b) => (b.qualityScore / b.avgCost) - (a.qualityScore / a.avgCost))[0]

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Provider Comparison Dashboard
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Lowest Cost</div>
          <div className="font-semibold text-gray-900">{cheapestProvider.name}</div>
          <div className="text-xs text-green-700 mt-1">
            {fmtCurrency(cheapestProvider.avgCost)}/month avg
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Highest Quality</div>
          <div className="font-semibold text-gray-900">{bestQuality.name}</div>
          <div className="text-xs text-purple-700 mt-1">
            {bestQuality.qualityScore}% score
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Best Reliability</div>
          <div className="font-semibold text-gray-900">{bestReliability.name}</div>
          <div className="text-xs text-blue-700 mt-1">
            {bestReliability.reliabilityScore.toFixed(2)}% uptime
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-600 font-medium mb-1">Best Value</div>
          <div className="font-semibold text-gray-900">{bestValue.name}</div>
          <div className="text-xs text-amber-700 mt-1">
            {(bestValue.qualityScore / bestValue.avgCost).toFixed(2)}x quality per $
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Provider</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Models</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Avg Cost</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Cost Range</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Avg Context</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Cache</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Batch</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Quality</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Reliability</th>
            </tr>
          </thead>
          <tbody>
            {providerStats.map(provider => (
              <tr key={provider.provider} className="border-t border-gray-100 hover:bg-blue-50">
                <td className="py-2 px-2 font-medium text-gray-900">{provider.name}</td>
                <td className="py-2 px-2 text-center text-gray-700">{provider.modelCount}</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">
                  {fmtCurrency(provider.avgCost)}
                </td>
                <td className="py-2 px-2 text-right text-gray-700">
                  {fmtCurrency(provider.minCost)} - {fmtCurrency(provider.maxCost)}
                </td>
                <td className="py-2 px-2 text-right text-gray-700">
                  {(provider.avgContextWindow / 1000).toFixed(0)}K tokens
                </td>
                <td className="py-2 px-2 text-center">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    provider.cachePercentage === 100
                      ? 'bg-green-100 text-green-900'
                      : provider.cachePercentage >= 50
                        ? 'bg-yellow-100 text-yellow-900'
                        : 'bg-gray-100 text-gray-900'
                  }`}>
                    {provider.cachePercentage.toFixed(0)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-center">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    provider.batchPercentage === 100
                      ? 'bg-green-100 text-green-900'
                      : provider.batchPercentage >= 50
                        ? 'bg-yellow-100 text-yellow-900'
                        : 'bg-gray-100 text-gray-900'
                  }`}>
                    {provider.batchPercentage.toFixed(0)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-12 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full"
                        style={{ width: `${provider.qualityScore}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold ml-1 min-w-fit">{provider.qualityScore}%</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-center text-gray-700">
                  {provider.reliabilityScore.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-blue-900 mb-2">Provider Strengths</div>
          <ul className="text-xs text-blue-800 space-y-1">
            {providerStats.map(provider => {
              let strength = ''
              if (provider.avgCost === Math.min(...providerStats.map(p => p.avgCost))) {
                strength = 'Most cost-effective'
              } else if (provider.qualityScore === Math.max(...providerStats.map(p => p.qualityScore))) {
                strength = 'Best quality/reasoning'
              } else if (provider.cachePercentage === 100) {
                strength = 'Universal cache support'
              } else if (provider.modelCount === Math.max(...providerStats.map(p => p.modelCount))) {
                strength = 'Widest model selection'
              }

              return strength ? (
                <li key={provider.provider}>
                  <strong>{provider.name}:</strong> {strength}
                </li>
              ) : null
            })}
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-green-900 mb-2">Selection Guide</div>
          <ul className="text-xs text-green-800 space-y-1">
            <li>✓ <strong>Budget-conscious:</strong> Focus on lowest-cost provider</li>
            <li>✓ <strong>Quality-first:</strong> Choose highest quality score provider</li>
            <li>✓ <strong>Optimization:</strong> Select provider with 100% cache/batch support</li>
            <li>✓ <strong>Best value:</strong> Choose quality-per-dollar leader</li>
            <li>✓ <strong>Reliability:</strong> Mission-critical apps need highest uptime</li>
          </ul>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>Metrics Explained:</strong> Quality score is overall capability (reasoning, code gen, etc.).
          Reliability is typical SLA uptime. Cache/Batch show percentage of models supporting these optimizations.
        </p>
        <p>
          <strong>Note:</strong> Quality and reliability scores are simplified estimates. Consult official documentation
          and SLAs for definitive information.
        </p>
      </div>
    </section>
  )
}
