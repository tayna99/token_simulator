import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import { MODELS } from '../../data/models'
import type { SimState } from '../../App'

type DataResidency = 'US' | 'EU' | 'Global'
type LatencyTier = 'real-time' | 'normal' | 'batch'
type SupportLevel = 'community' | 'professional' | 'enterprise'

interface Requirements {
  dataResidency: DataResidency
  latency: LatencyTier
  minCapability: 'fast' | 'balanced' | 'premium'
  supportLevel: SupportLevel
  maxMonthlyBudget: number | null
}

interface Props {
  state: SimState
  onSelectCandidate: (modelId: string) => void
}

export function RequirementsFilter({ state, onSelectCandidate }: Props) {
  const [requirements, setRequirements] = useState<Requirements>({
    dataResidency: 'Global',
    latency: 'normal',
    minCapability: 'balanced',
    supportLevel: 'community',
    maxMonthlyBudget: null,
  })

  const analysis = useMemo(() => {
    // Model characteristics mapping
    const modelTraits = {
      'claude-opus-4-7': { capability: 'premium', latency: ['real-time', 'normal', 'batch'], residency: 'US', support: 'enterprise' },
      'claude-sonnet-4.6': { capability: 'balanced', latency: ['real-time', 'normal', 'batch'], residency: 'US', support: 'professional' },
      'claude-3.5-haiku': { capability: 'fast', latency: ['real-time', 'normal', 'batch'], residency: 'US', support: 'community' },
      'gemini-2-flash': { capability: 'balanced', latency: ['real-time', 'normal'], residency: 'Global', support: 'professional' },
      'gemini-3.1-flash': { capability: 'fast', latency: ['real-time', 'normal', 'batch'], residency: 'Global', support: 'community' },
      'gpt-4o': { capability: 'premium', latency: ['real-time', 'normal'], residency: 'Global', support: 'professional' },
      'gpt-4-turbo': { capability: 'premium', latency: ['normal', 'batch'], residency: 'Global', support: 'professional' },
      'gpt-4o-mini': { capability: 'balanced', latency: ['real-time', 'normal', 'batch'], residency: 'Global', support: 'community' },
    }

    const capabilityRank = { fast: 1, balanced: 2, premium: 3 }
    const supportRank = { community: 1, professional: 2, enterprise: 3 }

    const modelsCosts = MODELS.map(m => ({
      model: m,
      cost: calculateCost({
        model: m,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost,
      traits: modelTraits[m.id as keyof typeof modelTraits] || {
        capability: 'balanced',
        latency: ['real-time', 'normal', 'batch'],
        residency: 'Global',
        support: 'community',
      },
    }))

    // Filter by requirements
    const matching = modelsCosts.filter(({ cost, traits }) => {
      // Check capability requirement
      if (capabilityRank[traits.capability as keyof typeof capabilityRank] < capabilityRank[requirements.minCapability as keyof typeof capabilityRank]) {
        return false
      }

      // Check latency requirement
      if (!traits.latency.includes(requirements.latency)) {
        return false
      }

      // Check data residency (simplified: US models available everywhere, EU models only in EU, etc.)
      if (requirements.dataResidency === 'EU' && traits.residency !== 'EU' && traits.residency !== 'Global') {
        return false
      }

      // Check support level (community < professional < enterprise)
      if (supportRank[traits.support as keyof typeof supportRank] < supportRank[requirements.supportLevel as keyof typeof supportRank]) {
        return false
      }

      // Check budget
      if (requirements.maxMonthlyBudget !== null && cost > requirements.maxMonthlyBudget) {
        return false
      }

      return true
    }).sort((a, b) => a.cost - b.cost)

    // Find closest alternatives if no exact match
    const relaxedMatching = matching.length > 0 ? null : modelsCosts
      .sort((a, b) => {
        // Score by how many requirements are met
        const aScore = (
          (capabilityRank[a.traits.capability as keyof typeof capabilityRank] >= capabilityRank[requirements.minCapability as keyof typeof capabilityRank] ? 1 : 0) +
          (a.traits.latency.includes(requirements.latency) ? 1 : 0) +
          (requirements.dataResidency === 'Global' || a.traits.residency === requirements.dataResidency || a.traits.residency === 'Global' ? 1 : 0) +
          (supportRank[a.traits.support as keyof typeof supportRank] >= supportRank[requirements.supportLevel as keyof typeof supportRank] ? 1 : 0)
        )
        const bScore = (
          (capabilityRank[b.traits.capability as keyof typeof capabilityRank] >= capabilityRank[requirements.minCapability as keyof typeof capabilityRank] ? 1 : 0) +
          (b.traits.latency.includes(requirements.latency) ? 1 : 0) +
          (requirements.dataResidency === 'Global' || b.traits.residency === requirements.dataResidency || b.traits.residency === 'Global' ? 1 : 0) +
          (supportRank[b.traits.support as keyof typeof supportRank] >= supportRank[requirements.supportLevel as keyof typeof supportRank] ? 1 : 0)
        )
        if (aScore !== bScore) return bScore - aScore
        return a.cost - b.cost
      })
      .slice(0, 3)

    return {
      matching,
      relaxedMatching,
      totalEligible: matching.length,
    }
  }, [state, requirements])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Requirements-Based Model Selection
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Data Residency
          </label>
          <select
            value={requirements.dataResidency}
            onChange={e => setRequirements({ ...requirements, dataResidency: e.target.value as DataResidency })}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
          >
            <option>Global</option>
            <option>US</option>
            <option>EU</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Latency Requirement
          </label>
          <select
            value={requirements.latency}
            onChange={e => setRequirements({ ...requirements, latency: e.target.value as LatencyTier })}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
          >
            <option value="real-time">&lt;100ms (Real-time)</option>
            <option value="normal">&lt;1s (Normal)</option>
            <option value="batch">Batch OK</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Min Capability
          </label>
          <select
            value={requirements.minCapability}
            onChange={e => setRequirements({ ...requirements, minCapability: e.target.value as 'fast' | 'balanced' | 'premium' })}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
          >
            <option value="fast">⚡ Fast</option>
            <option value="balanced">⚖️ Balanced</option>
            <option value="premium">👑 Premium</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Support Level
          </label>
          <select
            value={requirements.supportLevel}
            onChange={e => setRequirements({ ...requirements, supportLevel: e.target.value as SupportLevel })}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
          >
            <option value="community">Community</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Max Budget
          </label>
          <input
            type="number"
            min="0"
            step="500"
            placeholder="∞"
            value={requirements.maxMonthlyBudget ?? ''}
            onChange={e => setRequirements({
              ...requirements,
              maxMonthlyBudget: e.target.value === '' ? null : parseInt(e.target.value),
            })}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs"
          />
        </div>
      </div>

      {analysis.matching.length > 0 ? (
        <div>
          <div className="mb-3 text-sm text-gray-700">
            <strong>{analysis.totalEligible} models</strong> meet your requirements
          </div>
          <div className="space-y-2">
            {analysis.matching.slice(0, 5).map(({ model, cost }) => (
              <button
                key={model.id}
                onClick={() => onSelectCandidate(model.id)}
                className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className="text-xs text-gray-600">{model.provider} • {(model.contextWindow / 1000).toFixed(0)}K context</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{fmtCurrency(cost)}/mo</div>
                    <div className="text-xs text-gray-500">for your workload</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {analysis.matching.length > 5 && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              +{analysis.matching.length - 5} more options
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-3 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
            ⚠️ No models meet all requirements. Showing closest alternatives:
          </div>
          <div className="space-y-2">
            {analysis.relaxedMatching?.slice(0, 3).map(({ model, cost }) => (
              <button
                key={model.id}
                onClick={() => onSelectCandidate(model.id)}
                className="block w-full text-left p-3 border border-orange-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{model.name}</div>
                    <div className="text-xs text-gray-600">{model.provider} • {(model.contextWindow / 1000).toFixed(0)}K context</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{fmtCurrency(cost)}/mo</div>
                    <div className="text-xs text-gray-500">for your workload</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
        <p>
          <strong>How it works:</strong> Specify your operational requirements (data location, response time, support needs) and we'll show you which models qualify and rank them by cost.
        </p>
      </div>
    </section>
  )
}
