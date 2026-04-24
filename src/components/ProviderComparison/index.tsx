import { useMemo } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import { MODELS } from '../../data/models'
import type { SimState } from '../../App'

type Provider = typeof MODELS[0]['provider']

interface ProviderStats {
  provider: Provider
  modelCount: number
  cheapestModel: typeof MODELS[0]
  cheapestCost: number
  averageCost: number
  hasCaching: boolean
  hasBatch: boolean
}

const PROVIDER_NAMES: Record<Provider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  xai: 'xAI',
  microsoft: 'Microsoft',
  meta: 'Meta',
  mistral: 'Mistral',
  deepseek: 'DeepSeek',
  alibaba: 'Alibaba',
  moonshot: 'Moonshot',
}

interface Props {
  state: SimState
}

export function ProviderComparison({ state }: Props) {
  const stats = useMemo(() => {
    const providerMap = new Map<Provider, ProviderStats>()

    MODELS.forEach(model => {
      const cost = calculateCost({
        model,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost

      if (!providerMap.has(model.provider)) {
        providerMap.set(model.provider, {
          provider: model.provider,
          modelCount: 0,
          cheapestModel: model,
          cheapestCost: cost,
          averageCost: 0,
          hasCaching: false,
          hasBatch: false,
        })
      }

      const stats = providerMap.get(model.provider)!
      stats.modelCount++
      stats.averageCost = (stats.averageCost * (stats.modelCount - 1) + cost) / stats.modelCount
      stats.hasCaching = stats.hasCaching || model.cacheDiscount > 0
      stats.hasBatch = stats.hasBatch || model.batchDiscount > 0

      if (cost < stats.cheapestCost) {
        stats.cheapestModel = model
        stats.cheapestCost = cost
      }
    })

    return Array.from(providerMap.values()).sort((a, b) => a.cheapestCost - b.cheapestCost)
  }, [state])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">Provider Comparison</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 font-semibold text-gray-700">Provider</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-700">Cheapest Model</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700">Monthly Cost</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-700">Avg Cost</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-700">Features</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((provider, idx) => (
              <tr key={provider.provider} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="py-3 px-3 font-semibold text-gray-900">
                  {PROVIDER_NAMES[provider.provider]}
                  <div className="text-xs text-gray-500 font-normal">
                    {provider.modelCount} model{provider.modelCount !== 1 ? 's' : ''}
                  </div>
                </td>
                <td className="py-3 px-3 text-center text-gray-900">
                  <div className="font-medium text-sm">{provider.cheapestModel.name}</div>
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="font-bold text-lg">{fmtCurrency(provider.cheapestCost)}</div>
                </td>
                <td className="py-3 px-3 text-center text-gray-600">
                  {fmtCurrency(provider.averageCost)}
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex gap-1 justify-center flex-wrap">
                    {provider.hasCaching && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Cache
                      </span>
                    )}
                    {provider.hasBatch && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Batch
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
        <strong>Note:</strong> Costs shown are for current workload configuration. Cheapest models listed are the most cost-effective option from each provider.
      </div>
    </section>
  )
}
