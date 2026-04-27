import { useMemo } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import { MODELS } from '../../data/models'
import type { SimState } from '../../App'

interface Tier {
  name: string
  emoji: string
  description: string
  icon: string
  models: typeof MODELS
  avgCost: number
  priceRange: [number, number]
}

interface Props {
  state: SimState
  onSelectCandidate: (modelId: string) => void
}

export function PerformanceTiers({ state, onSelectCandidate }: Props) {
  const tiers = useMemo(() => {
    const modelCosts = MODELS.map(m => ({
      model: m,
      cost: calculateCost({
        model: m,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost,
    }))

    // Classify models by characteristics
    const tiers: Record<string, typeof MODELS> = {
      fast: [],
      balanced: [],
      premium: [],
    }

    modelCosts.forEach(({ model }) => {
      // Fast: Small models with low cost
      if (model.inputPrice < 0.5 || model.name.toLowerCase().includes('flash') || model.name.toLowerCase().includes('mini')) {
        tiers.fast.push(model)
      }
      // Premium: Reasoning or large models with high capability
      else if (model.contextWindow > 100000 || model.name.toLowerCase().includes('opus') || model.name.toLowerCase().includes('4.7')) {
        tiers.premium.push(model)
      }
      // Balanced: Everything else
      else {
        tiers.balanced.push(model)
      }
    })

    // Calculate stats for each tier
    const tiersData: Tier[] = [
      {
        name: 'Fast',
        emoji: '⚡',
        icon: 'bolt',
        description: 'Optimized for speed & cost. Best for: real-time apps, high-volume tasks, latency-critical workloads',
        models: tiers.fast,
        avgCost: tiers.fast.length > 0
          ? tiers.fast.reduce((sum, m) => {
              const cost = modelCosts.find(mc => mc.model.id === m.id)?.cost || 0
              return sum + cost
            }, 0) / tiers.fast.length
          : 0,
        priceRange: tiers.fast.length > 0
          ? [
              Math.min(...tiers.fast.map(m => m.inputPrice)),
              Math.max(...tiers.fast.map(m => m.outputPrice)),
            ]
          : [0, 0],
      },
      {
        name: 'Balanced',
        emoji: '⚖️',
        icon: 'balance',
        description: 'Good balance of cost & quality. Best for: general-purpose tasks, most production apps, prototyping',
        models: tiers.balanced,
        avgCost: tiers.balanced.length > 0
          ? tiers.balanced.reduce((sum, m) => {
              const cost = modelCosts.find(mc => mc.model.id === m.id)?.cost || 0
              return sum + cost
            }, 0) / tiers.balanced.length
          : 0,
        priceRange: tiers.balanced.length > 0
          ? [
              Math.min(...tiers.balanced.map(m => m.inputPrice)),
              Math.max(...tiers.balanced.map(m => m.outputPrice)),
            ]
          : [0, 0],
      },
      {
        name: 'Premium',
        emoji: '👑',
        icon: 'crown',
        description: 'Highest quality & capability. Best for: complex reasoning, code generation, long context, mission-critical',
        models: tiers.premium,
        avgCost: tiers.premium.length > 0
          ? tiers.premium.reduce((sum, m) => {
              const cost = modelCosts.find(mc => mc.model.id === m.id)?.cost || 0
              return sum + cost
            }, 0) / tiers.premium.length
          : 0,
        priceRange: tiers.premium.length > 0
          ? [
              Math.min(...tiers.premium.map(m => m.inputPrice)),
              Math.max(...tiers.premium.map(m => m.outputPrice)),
            ]
          : [0, 0],
      },
    ]

    return tiersData
  }, [state])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Model Performance Tiers
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map(tier => (
          <div key={tier.name} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
              <div className="text-2xl mb-1">{tier.emoji}</div>
              <h3 className="font-semibold text-gray-900">{tier.name}</h3>
              <p className="text-xs text-gray-600 mt-2">{tier.description}</p>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Average Monthly Cost</div>
                <div className="text-xl font-bold text-gray-900">{fmtCurrency(tier.avgCost)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Price Range (per 1M tokens)</div>
                <div className="text-sm text-gray-700">
                  Input: ${tier.priceRange[0].toFixed(2)} - ${tier.priceRange[1].toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Models in tier ({tier.models.length})</div>
                <div className="space-y-1">
                  {tier.models.slice(0, 4).map(model => (
                    <button
                      key={model.id}
                      onClick={() => onSelectCandidate(model.id)}
                      className="block w-full text-left text-xs py-1 px-2 rounded bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors border border-transparent hover:border-blue-200"
                    >
                      {model.name}
                    </button>
                  ))}
                  {tier.models.length > 4 && (
                    <div className="text-xs text-gray-500 py-1 px-2">
                      +{tier.models.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-gray-700">
          <strong>How to choose:</strong> Fast tier for high-volume, real-time applications • Balanced tier for most production workloads • Premium tier for complex reasoning, long context, or highest quality
        </p>
      </div>
    </section>
  )
}
