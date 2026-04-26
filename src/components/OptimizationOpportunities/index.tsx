import { useMemo } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import { MODELS } from '../../data/models'
import type { SimState } from '../../App'

interface Opportunity {
  id: string
  title: string
  description: string
  category: 'optimization' | 'model-switch' | 'discount' | 'feature'
  currentAnnualCost: number
  optimizedAnnualCost: number
  annualSavings: number
  savingsPercentage: number
  implementationEffort: 'low' | 'medium' | 'high'
  estimatedDaysToImplement: number
  roiRatio: number
}

interface Props {
  state: SimState
}

export function OptimizationOpportunities({ state }: Props) {
  const opportunities = useMemo(() => {
    const currentCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    const currentAnnualCost = currentCost * 12
    const opps: Opportunity[] = []

    // Opportunity 1: Increase cache hit rate
    if (state.cacheHitRate < 0.8 && state.currentModel.cacheDiscount > 0) {
      const targetCacheRate = Math.min(state.cacheHitRate + 0.2, 0.8)
      const costAtTargetCache = calculateCost({
        model: state.currentModel,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: targetCacheRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost

      const savings = currentCost - costAtTargetCache
      opps.push({
        id: 'cache-improvement',
        title: `Increase Cache Hit Rate from ${Math.round(state.cacheHitRate * 100)}% to ${Math.round(targetCacheRate * 100)}%`,
        description: `Optimize prompt caching to reuse more cached tokens. Cache saves ${(state.currentModel.cacheDiscount * 100).toFixed(1)}% on input tokens.`,
        category: 'optimization',
        currentAnnualCost,
        optimizedAnnualCost: costAtTargetCache * 12,
        annualSavings: savings * 12,
        savingsPercentage: (savings / currentCost) * 100,
        implementationEffort: 'medium',
        estimatedDaysToImplement: 5,
        roiRatio: (savings * 12) / (5 * 250), // ROI per day of engineer effort
      })
    }

    // Opportunity 2: Enable batch mode
    if (!state.batchEnabled && state.currentModel.batchDiscount > 0 && state.periodOutputTokens > 0) {
      const costWithBatch = calculateCost({
        model: state.currentModel,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: true,
      }).monthlyCost

      const savings = currentCost - costWithBatch
      opps.push({
        id: 'batch-mode',
        title: `Enable Batch API for ${(state.currentModel.batchDiscount * 100).toFixed(1)}% Savings`,
        description: `Use batch API for non-time-sensitive requests. Requires asynchronous processing (jobs completed within 24h).`,
        category: 'optimization',
        currentAnnualCost,
        optimizedAnnualCost: costWithBatch * 12,
        annualSavings: savings * 12,
        savingsPercentage: (savings / currentCost) * 100,
        implementationEffort: 'medium',
        estimatedDaysToImplement: 7,
        roiRatio: (savings * 12) / (7 * 250),
      })
    }

    // Opportunity 3: Switch to cheaper model
    const cheaperModels = MODELS
      .filter(m => m.id !== state.currentModel.id)
      .map(m => {
        const cost = calculateCost({
          model: m,
          monthlyInputTokens: state.periodInputTokens,
          monthlyOutputTokens: state.periodOutputTokens,
          cacheHitRate: state.cacheHitRate,
          batchEnabled: state.batchEnabled,
        }).monthlyCost

        return { model: m, cost }
      })
      .filter(({ cost }) => cost < currentCost)
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 2)

    cheaperModels.forEach(({ model, cost }) => {
      const savings = currentCost - cost
      opps.push({
        id: `switch-to-${model.id}`,
        title: `Switch to ${model.name}`,
        description: `${model.name} offers ${((savings / currentCost) * 100).toFixed(1)}% cost savings. Context: ${(model.contextWindow / 1000).toFixed(0)}K tokens.`,
        category: 'model-switch',
        currentAnnualCost,
        optimizedAnnualCost: cost * 12,
        annualSavings: savings * 12,
        savingsPercentage: (savings / currentCost) * 100,
        implementationEffort: 'high',
        estimatedDaysToImplement: 10,
        roiRatio: (savings * 12) / (10 * 250),
      })
    })

    // Opportunity 4: Volume discount (simplified)
    const discountScenarios = [
      { name: '10% volume discount', discount: 0.1, effort: 3 },
      { name: '15% volume discount', discount: 0.15, effort: 5 },
      { name: '20% annual commitment', discount: 0.2, effort: 7 },
    ]

    discountScenarios.forEach(scenario => {
      const costAfterDiscount = currentCost * (1 - scenario.discount)
      const savings = currentCost - costAfterDiscount
      opps.push({
        id: `discount-${scenario.discount}`,
        title: `Negotiate ${(scenario.discount * 100).toFixed(0)}% Volume Discount`,
        description: `Contact your provider to negotiate volume discounts based on your usage level.`,
        category: 'discount',
        currentAnnualCost,
        optimizedAnnualCost: costAfterDiscount * 12,
        annualSavings: savings * 12,
        savingsPercentage: (savings / currentCost) * 100,
        implementationEffort: 'low',
        estimatedDaysToImplement: scenario.effort,
        roiRatio: (savings * 12) / (scenario.effort * 250),
      })
    })

    // Opportunity 5: Combined optimization (cache + batch)
    if (!state.batchEnabled && state.cacheHitRate < 0.8) {
      const targetCacheRate = Math.min(state.cacheHitRate + 0.15, 0.8)
      const costCombined = calculateCost({
        model: state.currentModel,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: targetCacheRate,
        batchEnabled: true,
      }).monthlyCost

      const savings = currentCost - costCombined
      opps.push({
        id: 'combined-optimization',
        title: 'Combined: Improve Cache + Enable Batch',
        description: 'Layer multiple optimizations for maximum savings while keeping current model.',
        category: 'optimization',
        currentAnnualCost,
        optimizedAnnualCost: costCombined * 12,
        annualSavings: savings * 12,
        savingsPercentage: (savings / currentCost) * 100,
        implementationEffort: 'high',
        estimatedDaysToImplement: 12,
        roiRatio: (savings * 12) / (12 * 250),
      })
    }

    // Sort by ROI (highest first)
    return opps.sort((a, b) => b.roiRatio - a.roiRatio)
  }, [state])

  const highRoiOpportunities = opportunities.filter(opp => opp.roiRatio > 100)
  const maxSavings = opportunities.length > 0 ? Math.max(...opportunities.map(opp => opp.annualSavings)) : 0

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Optimization Opportunities
      </h2>

      {opportunities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Your configuration is already well-optimized!</p>
          <p className="text-xs text-gray-400 mt-2">Cache is at {Math.round(state.cacheHitRate * 100)}%, Batch enabled: {state.batchEnabled ? 'Yes' : 'No'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-xs text-green-600 font-medium mb-1">Max Potential Savings</div>
              <div className="text-2xl font-bold text-green-900">{fmtCurrency(maxSavings)}/year</div>
              <div className="text-xs text-green-700 mt-1">From highest-impact opportunity</div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-600 font-medium mb-1">High-ROI Opportunities</div>
              <div className="text-2xl font-bold text-blue-900">{highRoiOpportunities.length}/{opportunities.length}</div>
              <div className="text-xs text-blue-700 mt-1">{fmtCurrency(highRoiOpportunities.reduce((s, o) => s + o.annualSavings, 0))}/year combined</div>
            </div>
          </div>

          <div className="space-y-3">
            {opportunities.map((opp, idx) => (
              <div
                key={opp.id}
                className={`border rounded-lg p-4 ${
                  opp.roiRatio > 100
                    ? 'border-green-200 bg-green-50'
                    : opp.roiRatio > 50
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-lg font-bold text-gray-400 min-w-fit">#{idx + 1}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{opp.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{opp.description}</p>
                    </div>
                  </div>
                  <div className="text-right min-w-fit">
                    <div className="text-lg font-bold text-green-700">{fmtCurrency(opp.annualSavings)}</div>
                    <div className="text-xs text-gray-600">{opp.savingsPercentage.toFixed(1)}% savings</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs mb-3">
                  <div className="bg-white rounded p-2">
                    <div className="text-gray-600 font-medium">Category</div>
                    <div className="text-gray-900 font-semibold capitalize">{opp.category.replace('-', ' ')}</div>
                  </div>

                  <div className="bg-white rounded p-2">
                    <div className="text-gray-600 font-medium">Effort</div>
                    <div className={`font-semibold ${
                      opp.implementationEffort === 'low'
                        ? 'text-green-700'
                        : opp.implementationEffort === 'medium'
                          ? 'text-blue-700'
                          : 'text-orange-700'
                    }`}>
                      {opp.implementationEffort} ({opp.estimatedDaysToImplement}d)
                    </div>
                  </div>

                  <div className="bg-white rounded p-2">
                    <div className="text-gray-600 font-medium">ROI Ratio</div>
                    <div className={`font-semibold ${opp.roiRatio > 100 ? 'text-green-700' : 'text-gray-700'}`}>
                      {opp.roiRatio.toFixed(0)}x return
                    </div>
                  </div>

                  <div className="bg-white rounded p-2">
                    <div className="text-gray-600 font-medium">Annual Cost</div>
                    <div className="text-gray-900 font-semibold">
                      {fmtCurrency(opp.currentAnnualCost)} → {fmtCurrency(opp.optimizedAnnualCost)}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  {opp.roiRatio > 100 && (
                    <span className="text-green-700 font-semibold">✓ Excellent ROI - prioritize this</span>
                  )}
                  {opp.roiRatio > 50 && opp.roiRatio <= 100 && (
                    <span className="text-blue-700 font-semibold">✓ Good ROI - worth implementing</span>
                  )}
                  {opp.roiRatio <= 50 && (
                    <span className="text-gray-600">Consider based on strategic priorities</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-blue-900 mb-2">Implementation Priority</div>
            <ol className="text-xs text-blue-800 space-y-1">
              <li>1. Start with <strong>low-effort, high-ROI opportunities</strong> (quick wins)</li>
              <li>2. Layer in <strong>medium-effort optimizations</strong> while ROI remains strong</li>
              <li>3. Consider <strong>model switches</strong> only if savings justify migration risk</li>
              <li>4. Negotiate <strong>volume discounts</strong> as your usage scales</li>
            </ol>
          </div>
        </>
      )}

      <div className="mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How ROI is calculated:</strong> Annual savings ÷ (implementation days × $250/day engineer cost).
          A 100x ROI means $100 saved for every $1 of engineer time invested.
        </p>
        <p>
          <strong>Note:</strong> ROI calculations assume standard costs. Your actual costs and effort may vary.
          Test optimizations in staging before production rollout.
        </p>
      </div>
    </section>
  )
}
