import { useMemo } from 'react'
import { calculateCost } from '../../../../lib/calculator'
import { fmtCurrency } from '../../../../lib/format'
import type { SimState } from '../../../../App'

interface Lever {
  id: string
  title: string
  description: string
  estimatedMonthlySavings: number
}

interface Props {
  state: SimState
}

export function CostOptimizationRoadmap({ state }: Props) {
  const levers = useMemo((): Lever[] => {
    const current = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      monthlyRequests: state.monthlyRequests,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    const candidate = calculateCost({
      model: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      monthlyRequests: state.monthlyRequests,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    const cacheTarget = Math.max(state.cacheHitRate, 0.8)
    const withCache = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      monthlyRequests: state.monthlyRequests,
      cacheHitRate: cacheTarget,
      batchEnabled: state.batchEnabled,
    })

    const withBatch = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      monthlyRequests: state.monthlyRequests,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: true,
    })

    const withInputReduction = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens * 0.9,
      monthlyOutputTokens: state.periodOutputTokens,
      monthlyRequests: state.monthlyRequests,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    const withOutputReduction = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens * 0.9,
      monthlyRequests: state.monthlyRequests,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    return [
      {
        id: 'model-switch',
        title: `Switch to ${state.candidateModel.name}`,
        description: 'Compare the same workload on the selected candidate model.',
        estimatedMonthlySavings: current.monthlyCost - candidate.monthlyCost,
      },
      {
        id: 'cache-target',
        title: `Raise cache hit rate to ${Math.round(cacheTarget * 100)}%`,
        description: 'Applies the selected model catalog cache discount to cached input tokens.',
        estimatedMonthlySavings: current.monthlyCost - withCache.monthlyCost,
      },
      {
        id: 'batch-mode',
        title: 'Enable batch mode',
        description: 'Applies the selected model catalog batch discount where supported.',
        estimatedMonthlySavings: current.monthlyCost - withBatch.monthlyCost,
      },
      {
        id: 'input-reduction',
        title: 'Reduce input tokens by 10%',
        description: 'Models prompt/context trimming while holding requests and output fixed.',
        estimatedMonthlySavings: current.monthlyCost - withInputReduction.monthlyCost,
      },
      {
        id: 'output-reduction',
        title: 'Reduce output tokens by 10%',
        description: 'Models shorter completions while holding requests and input fixed.',
        estimatedMonthlySavings: current.monthlyCost - withOutputReduction.monthlyCost,
      },
    ]
      .filter(lever => lever.estimatedMonthlySavings > 0)
      .sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings)
  }, [state])

  const totalTopThreeSavings = levers.slice(0, 3).reduce((sum, lever) => sum + lever.estimatedMonthlySavings, 0)

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Optimization Roadmap
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Top 3 Monthly Savings</div>
          <div className="text-2xl font-bold text-green-900">{fmtCurrency(totalTopThreeSavings)}</div>
          <div className="text-xs text-green-700 mt-1">not de-duplicated</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Ranked Levers</div>
          <div className="text-2xl font-bold text-blue-900">{levers.length}</div>
          <div className="text-xs text-blue-700 mt-1">calculator-derived</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Largest Lever</div>
          <div className="text-sm font-bold text-purple-900">{levers[0]?.title ?? 'None'}</div>
          <div className="text-xs text-purple-700 mt-1">{levers[0] ? fmtCurrency(levers[0].estimatedMonthlySavings) : '$0'}/month</div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {levers.map((lever, index) => (
          <div key={lever.id} data-testid="optimization-lever" className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-gray-500">Rank {index + 1}</div>
                <h3 className="font-semibold text-gray-900">{lever.title}</h3>
                <p className="text-xs text-gray-700 mt-1">{lever.description}</p>
              </div>
              <div className="md:text-right">
                <div className="text-xs text-gray-500">Estimated monthly savings</div>
                <div className="text-lg font-bold text-green-700">{fmtCurrency(lever.estimatedMonthlySavings)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
        Savings are independent what-if calculations against the current selected workload. They should not be summed
        as a guaranteed combined result without modeling interactions.
      </div>
    </section>
  )
}
