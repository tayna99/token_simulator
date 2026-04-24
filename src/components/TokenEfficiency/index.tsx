import { useMemo } from 'react'
import { calculateCost } from '../../lib/calculator'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function TokenEfficiency({ state }: Props) {
  const metrics = useMemo(() => {
    const current = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    const candidate = calculateCost({
      model: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    const totalInputTokens = state.periodInputTokens + (state.periodInputTokens * state.cacheHitRate)
    const totalOutputTokens = state.periodOutputTokens
    const totalTokens = totalInputTokens + totalOutputTokens

    const currentMetrics = {
      costPerMToken: (current.monthlyCost / totalTokens) * 1_000_000,
      costPerOutputToken: current.monthlyCost / Math.max(totalOutputTokens, 1),
      costPerRequest: current.monthlyCost / Math.max(state.monthlyRequests, 1),
      costPerUser: current.monthlyCost / Math.max(state.activeUsers, 1),
      requestsPerDollar: Math.max(state.monthlyRequests, 1) / current.monthlyCost,
      tokensPerDollar: totalTokens / current.monthlyCost,
    }

    const candidateMetrics = {
      costPerMToken: (candidate.monthlyCost / totalTokens) * 1_000_000,
      costPerOutputToken: candidate.monthlyCost / Math.max(totalOutputTokens, 1),
      costPerRequest: candidate.monthlyCost / Math.max(state.monthlyRequests, 1),
      costPerUser: candidate.monthlyCost / Math.max(state.activeUsers, 1),
      requestsPerDollar: Math.max(state.monthlyRequests, 1) / candidate.monthlyCost,
      tokensPerDollar: totalTokens / candidate.monthlyCost,
    }

    return {
      current: currentMetrics,
      candidate: candidateMetrics,
      totalTokens,
      totalOutputTokens,
    }
  }, [state])

  const ComparisonRow = ({ label, current, candidate, format, better }: {
    label: string
    current: number
    candidate: number
    format: (v: number) => string
    better: 'higher' | 'lower'
  }) => {
    const currentIsBetter = better === 'lower' ? current < candidate : current > candidate
    return (
      <tr className="border-t border-gray-100">
        <td className="py-3 px-3 text-sm font-medium text-gray-700">{label}</td>
        <td className={`py-3 px-3 text-right font-semibold ${currentIsBetter ? 'bg-green-50' : ''}`}>
          {format(current)}
        </td>
        <td className={`py-3 px-3 text-right font-semibold ${!currentIsBetter && candidate !== 0 ? 'bg-green-50' : ''}`}>
          {format(candidate)}
        </td>
        <td className="py-3 px-3 text-right text-sm">
          {currentIsBetter ? (
            <span className="text-green-600">✓ Current</span>
          ) : (
            <span className="text-blue-600">✓ Candidate</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Token Efficiency Metrics
      </h2>

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 px-3 font-semibold text-gray-700">Metric</th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700">
                {state.currentModel.name}
              </th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700">
                {state.candidateModel.name}
              </th>
              <th className="text-right py-3 px-3 font-semibold text-gray-700">Best</th>
            </tr>
          </thead>
          <tbody>
            <ComparisonRow
              label="Cost per 1M Tokens"
              current={metrics.current.costPerMToken}
              candidate={metrics.candidate.costPerMToken}
              format={v => `$${v.toFixed(2)}`}
              better="lower"
            />
            <ComparisonRow
              label="Cost per Output Token"
              current={metrics.current.costPerOutputToken}
              candidate={metrics.candidate.costPerOutputToken}
              format={v => `$${(v * 1_000_000).toFixed(2)}/M`}
              better="lower"
            />
            {state.monthlyRequests > 0 && (
              <ComparisonRow
                label="Cost per Request"
                current={metrics.current.costPerRequest}
                candidate={metrics.candidate.costPerRequest}
                format={v => `$${v.toFixed(4)}`}
                better="lower"
              />
            )}
            {state.activeUsers > 0 && (
              <ComparisonRow
                label="Cost per Active User"
                current={metrics.current.costPerUser}
                candidate={metrics.candidate.costPerUser}
                format={v => `$${v.toFixed(2)}`}
                better="lower"
              />
            )}
            {state.monthlyRequests > 0 && (
              <ComparisonRow
                label="Requests per Dollar"
                current={metrics.current.requestsPerDollar}
                candidate={metrics.candidate.requestsPerDollar}
                format={v => `${Math.round(v).toLocaleString()}`}
                better="higher"
              />
            )}
            <ComparisonRow
              label="Tokens per Dollar"
              current={metrics.current.tokensPerDollar}
              candidate={metrics.candidate.tokensPerDollar}
              format={v => `${Math.round(v).toLocaleString()}`}
              better="higher"
            />
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-gray-700 mb-2">
          <strong>Total workload:</strong> {(metrics.totalTokens / 1_000_000).toFixed(1)}M tokens/month
          ({(metrics.totalOutputTokens / 1_000_000).toFixed(1)}M output)
        </p>
        <p className="text-xs text-gray-600">
          <strong>Interpretation:</strong> Lower cost per token/request = more efficient. Higher tokens/requests per dollar = better value.
        </p>
      </div>
    </section>
  )
}
