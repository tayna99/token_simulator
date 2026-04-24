import { useMemo } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import { MODELS } from '../../data/models'
import type { SimState } from '../../App'

interface Props {
  state: SimState
  onSelectModel: (modelId: string) => void
}

export function ModelRecommendation({ state, onSelectModel }: Props) {
  const recommendations = useMemo(() => {
    // Calculate cost for each model with current workload
    const costs = MODELS.map(model => {
      const result = calculateCost({
        model,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      })
      return {
        model,
        cost: result.monthlyCost,
        isCurrent: model.id === state.currentModel.id,
        isCandidate: model.id === state.candidateModel.id,
      }
    })

    // Sort by cost
    const sorted = costs.sort((a, b) => a.cost - b.cost)

    // Get cheapest, and cheapest with caching, and cheapest with batch
    const cheapest = sorted[0]
    const cheapestWithCache = sorted.find(c => c.model.cacheDiscount > 0) || sorted[0]
    const cheapestWithBatch = sorted.find(c => c.model.batchDiscount > 0) || sorted[0]

    return {
      cheapest,
      cheapestWithCache,
      cheapestWithBatch,
      currentCost: calculateCost({
        model: state.currentModel,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost,
    }
  }, [state])

  const RecCard = ({ title, model, cost, savings, highlight }: {
    title: string
    model: typeof MODELS[0]
    cost: number
    savings: number
    highlight: boolean
  }) => (
    <button
      onClick={() => onSelectModel(model.id)}
      className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
        highlight
          ? 'bg-blue-50 border-blue-300 hover:border-blue-400'
          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="font-semibold text-sm text-gray-900">{model.name}</div>
      <div className="text-xs text-gray-600 mt-1">{title}</div>
      <div className="mt-2 flex justify-between items-baseline">
        <div className="text-lg font-bold text-gray-900">{fmtCurrency(cost)}</div>
        {savings > 0 && (
          <div className="text-xs text-green-600 font-medium">
            Save {fmtCurrency(savings)}
          </div>
        )}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        {model.cacheDiscount > 0 && model.batchDiscount > 0 && '✓ Cache & Batch'}
        {model.cacheDiscount > 0 && model.batchDiscount === 0 && '✓ Cache'}
        {model.cacheDiscount === 0 && model.batchDiscount > 0 && '✓ Batch'}
        {model.cacheDiscount === 0 && model.batchDiscount === 0 && '—'}
      </div>
    </button>
  )

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-3">
        💡 Model Recommendations
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RecCard
          title="Cheapest option"
          model={recommendations.cheapest.model}
          cost={recommendations.cheapest.cost}
          savings={recommendations.currentCost - recommendations.cheapest.cost}
          highlight={recommendations.cheapest.cost < recommendations.currentCost}
        />

        {recommendations.cheapestWithCache.model.id !== recommendations.cheapest.model.id && (
          <RecCard
            title="Best with caching"
            model={recommendations.cheapestWithCache.model}
            cost={recommendations.cheapestWithCache.cost}
            savings={recommendations.currentCost - recommendations.cheapestWithCache.cost}
            highlight={
              state.cacheHitRate > 0.3 &&
              recommendations.cheapestWithCache.cost < recommendations.currentCost
            }
          />
        )}

        {recommendations.cheapestWithBatch.model.id !== recommendations.cheapest.model.id && (
          <RecCard
            title="Best with batch"
            model={recommendations.cheapestWithBatch.model}
            cost={recommendations.cheapestWithBatch.cost}
            savings={recommendations.currentCost - recommendations.cheapestWithBatch.cost}
            highlight={
              state.batchEnabled &&
              recommendations.cheapestWithBatch.cost < recommendations.currentCost
            }
          />
        )}
      </div>

      <div className="mt-3 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
        <strong>Tip:</strong> Click any recommendation to switch to that model and see the updated costs.
      </div>
    </section>
  )
}
