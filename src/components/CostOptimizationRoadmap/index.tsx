import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Recommendation {
  id: string
  title: string
  description: string
  category: 'optimization' | 'migration' | 'infrastructure' | 'architecture'
  estimatedMonthlySavings: number
  estimatedEffort: 'low' | 'medium' | 'high'
  effortMonths: number
  priority: number
  prerequisites: string[]
  roi: number
}

interface Props {
  state: SimState
}

export function CostOptimizationRoadmap({ state }: Props) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['optimization', 'migration', 'infrastructure', 'architecture'])

  const recommendations = useMemo((): Recommendation[] => {
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

    const recs: Recommendation[] = [
      {
        id: 'cache-hit-rate',
        title: 'Improve Cache Hit Rate',
        description: 'Increase cache hit rate from 50% to 70%+ through architectural improvements and smarter caching strategies',
        category: 'optimization',
        estimatedMonthlySavings: currentCost * 0.15,
        estimatedEffort: 'medium',
        effortMonths: 2,
        priority: 1,
        prerequisites: [],
        roi: (currentCost * 0.15 * 10) / (2 * 40000), // 10 months of savings / 2 months effort cost
      },
      {
        id: 'batch-mode',
        title: 'Enable Batch Processing',
        description: 'Use batch mode for non-time-sensitive workloads to get 50% discount on input tokens',
        category: 'optimization',
        estimatedMonthlySavings: (currentCost * 0.3 * 0.5) * 0.4, // 30% of load in batch, 50% savings, 40% of budget impact
        estimatedEffort: 'low',
        effortMonths: 1,
        priority: 2,
        prerequisites: [],
        roi: (currentCost * 0.3 * 0.5 * 0.4 * 12) / (1 * 20000),
      },
      {
        id: 'model-switch',
        title: `Switch to ${state.candidateModel.name}`,
        description: `Migrate workload to ${state.candidateModel.name} for ${((currentCost - candidateCost) / currentCost * 100).toFixed(0)}% cost reduction`,
        category: 'migration',
        estimatedMonthlySavings: currentCost - candidateCost,
        estimatedEffort: 'high',
        effortMonths: 3,
        priority: currentCost - candidateCost > 0 ? 0 : 5,
        prerequisites: [],
        roi: ((currentCost - candidateCost) * 9) / (3 * 80000),
      },
      {
        id: 'request-dedup',
        title: 'Implement Request Deduplication',
        description: 'Cache and reuse results for identical requests to eliminate redundant API calls',
        category: 'architecture',
        estimatedMonthlySavings: currentCost * 0.1,
        estimatedEffort: 'medium',
        effortMonths: 3,
        priority: 3,
        prerequisites: [],
        roi: (currentCost * 0.1 * 9) / (3 * 40000),
      },
      {
        id: 'smart-routing',
        title: 'Implement Smart Model Routing',
        description: 'Route simple requests to cheaper models, complex requests to capable models',
        category: 'architecture',
        estimatedMonthlySavings: currentCost * 0.12,
        estimatedEffort: 'high',
        effortMonths: 4,
        priority: 4,
        prerequisites: ['model-switch'],
        roi: (currentCost * 0.12 * 8) / (4 * 60000),
      },
      {
        id: 'prompt-engineering',
        title: 'Invest in Prompt Engineering',
        description: 'Optimize prompts to reduce tokens needed per request and improve first-time accuracy',
        category: 'optimization',
        estimatedMonthlySavings: currentCost * 0.08,
        estimatedEffort: 'low',
        effortMonths: 2,
        priority: 2,
        prerequisites: [],
        roi: (currentCost * 0.08 * 10) / (2 * 20000),
      },
      {
        id: 'load-shedding',
        title: 'Implement Load Shedding',
        description: 'During peak usage, defer non-critical requests to batch processing',
        category: 'infrastructure',
        estimatedMonthlySavings: currentCost * 0.06,
        estimatedEffort: 'medium',
        effortMonths: 2,
        priority: 4,
        prerequisites: ['batch-mode'],
        roi: (currentCost * 0.06 * 10) / (2 * 30000),
      },
      {
        id: 'volume-discount',
        title: 'Negotiate Volume Discount',
        description: 'Leverage your usage volume to negotiate 10-15% discount with provider',
        category: 'infrastructure',
        estimatedMonthlySavings: currentCost * 0.12,
        estimatedEffort: 'low',
        effortMonths: 1,
        priority: 1,
        prerequisites: [],
        roi: (currentCost * 0.12 * 11) / (1 * 10000),
      },
      {
        id: 'multi-region',
        title: 'Optimize Regional Distribution',
        description: 'Route requests to cheapest regions where latency allows',
        category: 'infrastructure',
        estimatedMonthlySavings: currentCost * 0.08,
        estimatedEffort: 'high',
        effortMonths: 4,
        priority: 3,
        prerequisites: [],
        roi: (currentCost * 0.08 * 8) / (4 * 50000),
      },
      {
        id: 'token-compression',
        title: 'Implement Token Compression',
        description: 'Use techniques like summarization and compression to reduce token usage',
        category: 'optimization',
        estimatedMonthlySavings: currentCost * 0.05,
        estimatedEffort: 'medium',
        effortMonths: 2,
        priority: 3,
        prerequisites: [],
        roi: (currentCost * 0.05 * 10) / (2 * 30000),
      },
    ]

    return recs.sort((a, b) => a.priority - b.priority)
  }, [state])

  const filteredRecommendations = recommendations.filter(r => selectedCategories.includes(r.category))

  const totalMonthlySavings = filteredRecommendations.reduce((sum, r) => sum + r.estimatedMonthlySavings, 0)
  const totalEffort = filteredRecommendations.reduce((sum, r) => sum + r.effortMonths, 0)
  const averageROI = filteredRecommendations.length > 0
    ? filteredRecommendations.reduce((sum, r) => sum + r.roi, 0) / filteredRecommendations.length
    : 0

  const categoryLabels: Record<string, string> = {
    optimization: 'Optimization',
    migration: 'Migration',
    infrastructure: 'Infrastructure',
    architecture: 'Architecture',
  }

  const categoryColors: Record<string, string> = {
    optimization: 'bg-blue-100 text-blue-800 border-blue-300',
    migration: 'bg-purple-100 text-purple-800 border-purple-300',
    infrastructure: 'bg-green-100 text-green-800 border-green-300',
    architecture: 'bg-amber-100 text-amber-800 border-amber-300',
  }

  const effortColors = {
    low: 'bg-green-50 text-green-900',
    medium: 'bg-amber-50 text-amber-900',
    high: 'bg-red-50 text-red-900',
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Optimization Roadmap
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Potential Monthly Savings</div>
          <div className="text-2xl font-bold text-green-900">{fmtCurrency(totalMonthlySavings)}</div>
          <div className="text-xs text-green-700 mt-1">Annual: {fmtCurrency(totalMonthlySavings * 12)}</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Total Implementation Effort</div>
          <div className="text-2xl font-bold text-blue-900">{totalEffort}</div>
          <div className="text-xs text-blue-700 mt-1">person-months</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Average ROI</div>
          <div className="text-2xl font-bold text-purple-900">{averageROI.toFixed(1)}x</div>
          <div className="text-xs text-purple-700 mt-1">Return per $ invested</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-600 font-medium mb-1">Recommendations</div>
          <div className="text-2xl font-bold text-amber-900">{filteredRecommendations.length}</div>
          <div className="text-xs text-amber-700 mt-1">initiatives</div>
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-700 mb-2">Filter by Category</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryLabels).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setSelectedCategories(prev =>
                prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
              )}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategories.includes(code)
                  ? `${categoryColors[code]} border`
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div className="space-y-3 mb-6">
        {filteredRecommendations.map((rec) => {
          const urgency = rec.priority === 0 ? 'critical' : rec.priority <= 2 ? 'high' : 'medium'

          return (
            <div key={rec.id} className={`rounded-lg p-4 border-2 ${
              urgency === 'critical' ? 'border-red-300 bg-red-50' :
              urgency === 'high' ? 'border-amber-300 bg-amber-50' :
              'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${categoryColors[rec.category]}`}>
                      {categoryLabels[rec.category]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mt-1">{rec.description}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${effortColors[rec.estimatedEffort]}`}>
                  {rec.estimatedEffort === 'low' ? '⚡ Low' : rec.estimatedEffort === 'medium' ? '⚙ Medium' : '🔧 High'} Effort
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs mt-3">
                <div className="bg-white rounded p-2">
                  <div className="text-gray-600 font-medium">Monthly Savings</div>
                  <div className="font-bold text-green-700 text-lg">{fmtCurrency(rec.estimatedMonthlySavings)}</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-gray-600 font-medium">Effort</div>
                  <div className="font-bold text-gray-900 text-lg">{rec.effortMonths}mo</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-gray-600 font-medium">ROI</div>
                  <div className="font-bold text-blue-700 text-lg">{rec.roi.toFixed(1)}x</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-gray-600 font-medium">Priority</div>
                  <div className={`font-bold text-lg ${
                    rec.priority === 0 ? 'text-red-700' :
                    rec.priority <= 2 ? 'text-amber-700' :
                    'text-blue-700'
                  }`}>
                    P{rec.priority}
                  </div>
                </div>
              </div>

              {rec.prerequisites.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  <strong>Prerequisites:</strong> {rec.prerequisites.join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Implementation timeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-green-900 mb-2">Quick Wins (This Month)</div>
          <ul className="text-xs text-green-800 space-y-1">
            {filteredRecommendations.filter(r => r.estimatedEffort === 'low').slice(0, 3).map(r => (
              <li key={r.id}>✓ {r.title}</li>
            ))}
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-amber-900 mb-2">Medium Term (3-6 Months)</div>
          <ul className="text-xs text-amber-800 space-y-1">
            {filteredRecommendations.filter(r => r.estimatedEffort === 'medium').slice(0, 3).map(r => (
              <li key={r.id}>→ {r.title}</li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-blue-900 mb-2">Long Term (6+ Months)</div>
          <ul className="text-xs text-blue-800 space-y-1">
            {filteredRecommendations.filter(r => r.estimatedEffort === 'high').slice(0, 3).map(r => (
              <li key={r.id}>⟿ {r.title}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Prioritize recommendations by ROI and effort. Start with quick wins (low effort,
          high savings) before tackling longer-term initiatives. Each recommendation includes estimated savings and
          implementation effort.
        </p>
        <p>
          <strong>Note:</strong> Estimates are based on typical implementations. Actual results depend on your specific
          workload, team capacity, and technical constraints. Validate assumptions before committing resources.
        </p>
      </div>
    </section>
  )
}
