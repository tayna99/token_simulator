import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import { MODELS } from '../../data/models'
import type { SimState } from '../../App'

interface Props {
  state: SimState
  onSelectCandidate: (modelId: string) => void
}

export function ModelSearch({ state, onSelectCandidate }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [priceMax, setPriceMax] = useState(10)
  const [features, setFeatures] = useState({ batch: false, cache: false })
  const [minContext, setMinContext] = useState(0)

  const filteredModels = useMemo(() => {
    let results = MODELS.filter(m => m.id !== state.currentModel.id)

    // Search by name
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      results = results.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
      )
    }

    // Filter by price
    const modelCosts = results.map(m => ({
      model: m,
      cost: calculateCost({
        model: m,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost,
    }))

    const filtered = modelCosts.filter(({ cost }) => cost <= priceMax * 1000)

    // Filter by features
    if (features.batch) {
      results = filtered
        .filter(({ model }) => model.batchDiscount > 0)
        .map(({ model }) => model)
    } else if (features.cache) {
      results = filtered
        .filter(({ model }) => model.cacheDiscount > 0)
        .map(({ model }) => model)
    } else {
      results = filtered.map(({ model }) => model)
    }

    // Filter by context window
    if (minContext > 0) {
      results = results.filter(m => m.contextWindow >= minContext)
    }

    // Sort by cost
    const costMap = new Map(
      modelCosts.map(({ model, cost }) => [model.id, cost])
    )

    return results.sort((a, b) => (costMap.get(a.id) ?? 0) - (costMap.get(b.id) ?? 0)).slice(0, 10)
  }, [searchQuery, priceMax, features, minContext, state])

  const avgCost = useMemo(() => {
    if (filteredModels.length === 0) return 0
    const total = filteredModels.reduce((sum, m) => {
      const cost = calculateCost({
        model: m,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost
      return sum + cost
    }, 0)
    return total / filteredModels.length
  }, [filteredModels, state])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Find a Model
      </h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            placeholder="Model name or provider..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Max Cost: {fmtCurrency(priceMax * 1000)}/month
          </label>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={priceMax}
            onChange={e => setPriceMax(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Min Context Window</label>
          <select
            value={minContext}
            onChange={e => setMinContext(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value={0}>Any</option>
            <option value={8000}>8K+</option>
            <option value={32000}>32K+</option>
            <option value={128000}>128K+</option>
            <option value={200000}>200K+</option>
            <option value={1000000}>1M+</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Features</label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={features.batch}
              onChange={e => setFeatures(f => ({ ...f, batch: e.target.checked }))}
            />
            Batch API Support
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={features.cache}
              onChange={e => setFeatures(f => ({ ...f, cache: e.target.checked }))}
            />
            Prompt Caching Support
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-600 mb-3">
          {filteredModels.length} models found • avg {fmtCurrency(avgCost)}/month
        </div>
        {filteredModels.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            No models match your criteria
          </div>
        ) : (
          filteredModels.map(model => {
            const cost = calculateCost({
              model,
              monthlyInputTokens: state.periodInputTokens,
              monthlyOutputTokens: state.periodOutputTokens,
              cacheHitRate: state.cacheHitRate,
              batchEnabled: state.batchEnabled,
            }).monthlyCost

            return (
              <button
                key={model.id}
                onClick={() => onSelectCandidate(model.id)}
                className="w-full text-left p-3 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.provider}</div>
                  </div>
                  <div className="font-bold text-blue-600">{fmtCurrency(cost)}</div>
                </div>
                <div className="text-xs text-gray-600 flex gap-2 flex-wrap">
                  {model.cacheDiscount > 0 && <span>✓ Cache</span>}
                  {model.batchDiscount > 0 && <span>✓ Batch</span>}
                  <span>{model.contextWindow.toLocaleString()}K context</span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}
