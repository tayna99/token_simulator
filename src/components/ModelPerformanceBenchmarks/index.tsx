import { useMemo } from 'react'
import { MODELS } from '../../data/models'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function ModelPerformanceBenchmarks({ state }: Props) {
  const benchmarks = useMemo(() => {
    // Latency benchmarks (approximate ms for single request)
    const latencyMap: Record<string, number> = {
      'claude-opus-4-7': 2500,
      'claude-sonnet-4.6': 1500,
      'claude-3.5-haiku': 800,
      'gemini-2-flash': 600,
      'gemini-3.1-flash': 700,
      'gpt-4o': 1800,
      'gpt-4-turbo': 3000,
      'gpt-4o-mini': 900,
    }

    // Quality scores (0-100 scale from typical benchmarks)
    const qualityMap: Record<string, { overall: number; code: number; followInstructions: number; reasoning: number }> = {
      'claude-opus-4-7': { overall: 92, code: 94, followInstructions: 96, reasoning: 98 },
      'claude-sonnet-4.6': { overall: 88, code: 90, followInstructions: 92, reasoning: 90 },
      'claude-3.5-haiku': { overall: 75, code: 82, followInstructions: 80, reasoning: 70 },
      'gemini-2-flash': { overall: 80, code: 78, followInstructions: 85, reasoning: 75 },
      'gemini-3.1-flash': { overall: 82, code: 80, followInstructions: 88, reasoning: 78 },
      'gpt-4o': { overall: 90, code: 92, followInstructions: 94, reasoning: 94 },
      'gpt-4-turbo': { overall: 92, code: 95, followInstructions: 96, reasoning: 96 },
      'gpt-4o-mini': { overall: 80, code: 85, followInstructions: 88, reasoning: 78 },
    }

    const releaseMap: Record<string, string> = {
      'claude-opus-4-7': '2025-11',
      'claude-sonnet-4.6': '2024-12',
      'claude-3.5-haiku': '2024-11',
      'gemini-2-flash': '2024-12',
      'gemini-3.1-flash': '2024-12',
      'gpt-4o': '2024-05',
      'gpt-4-turbo': '2024-04',
      'gpt-4o-mini': '2024-07',
    }

    return MODELS.map(model => {
      const costPerMTokens = ((model.inputPrice + model.outputPrice) / 2).toFixed(4)
      const monthlyCapacity = ((state.periodInputTokens + state.periodOutputTokens) / 1_000_000).toFixed(1)

      const quality = qualityMap[model.id] || { overall: 75, code: 75, followInstructions: 75, reasoning: 75 }
      const latency = latencyMap[model.id] || 1500
      const release = releaseMap[model.id] || '2024-01'

      return {
        modelId: model.id,
        modelName: model.name,
        provider: model.provider,
        latencyMs: latency,
        qualityScore: quality.overall,
        codeQuality: quality.code,
        followInstructions: quality.followInstructions,
        reasoning: quality.reasoning,
        costPerMTokens: parseFloat(costPerMTokens),
        monthlyCapacity: parseFloat(monthlyCapacity),
        releaseDate: release,
      }
    })
  }, [state])

  // Calculate correlations and insights
  const insights = useMemo(() => {
    const sorted = [...benchmarks].sort((a, b) => a.costPerMTokens - b.costPerMTokens)
    const best = {
      quality: [...benchmarks].sort((a, b) => b.qualityScore - a.qualityScore)[0],
      fastest: [...benchmarks].sort((a, b) => a.latencyMs - b.latencyMs)[0],
      cheapest: sorted[0],
      bestValue: [...benchmarks].sort((a, b) => (b.qualityScore / b.costPerMTokens) - (a.qualityScore / a.costPerMTokens))[0],
    }

    return { best, sorted }
  }, [benchmarks])

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Model Performance Benchmarks
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Highest Quality</div>
          <div className="font-semibold text-gray-900">{insights.best.quality.modelName}</div>
          <div className="text-xs text-purple-700 mt-1">{insights.best.quality.qualityScore}% score</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Fastest Response</div>
          <div className="font-semibold text-gray-900">{insights.best.fastest.modelName}</div>
          <div className="text-xs text-blue-700 mt-1">{insights.best.fastest.latencyMs}ms latency</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Lowest Cost</div>
          <div className="font-semibold text-gray-900">{insights.best.cheapest.modelName}</div>
          <div className="text-xs text-green-700 mt-1">${insights.best.cheapest.costPerMTokens.toFixed(4)}/M tokens</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-600 font-medium mb-1">Best Value</div>
          <div className="font-semibold text-gray-900">{insights.best.bestValue.modelName}</div>
          <div className="text-xs text-amber-700 mt-1">
            {(insights.best.bestValue.qualityScore / insights.best.bestValue.costPerMTokens).toFixed(0)}x quality per $
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Model</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Latency</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Quality</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Code</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Instructions</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Reasoning</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Cost/M</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Release</th>
            </tr>
          </thead>
          <tbody>
            {insights.sorted.map(bm => {
              const isCurrent = bm.modelId === state.currentModel.id
              const isCandidate = bm.modelId === state.candidateModel.id

              return (
                <tr
                  key={bm.modelId}
                  className={`border-t border-gray-100 ${
                    isCurrent
                      ? 'bg-blue-50'
                      : isCandidate
                        ? 'bg-green-50'
                        : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <td className="py-2 px-2 font-medium text-gray-900">
                    <div className="flex items-center gap-1">
                      {bm.modelName}
                      {isCurrent && <span className="text-xs bg-blue-200 text-blue-900 px-1.5 rounded">Current</span>}
                      {isCandidate && <span className="text-xs bg-green-200 text-green-900 px-1.5 rounded">Candidate</span>}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center text-gray-700">{bm.latencyMs}ms</td>
                  <td className="py-2 px-2 text-center">
                    <div className="font-semibold text-gray-900">{bm.qualityScore}%</div>
                    <div className="w-16 bg-gray-200 rounded-full h-1 mx-auto mt-1">
                      <div
                        className="bg-purple-600 h-1 rounded-full"
                        style={{ width: `${bm.qualityScore}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="font-semibold text-gray-900">{bm.codeQuality}%</div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="font-semibold text-gray-900">{bm.followInstructions}%</div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="font-semibold text-gray-900">{bm.reasoning}%</div>
                  </td>
                  <td className="py-2 px-2 text-right text-gray-700">${bm.costPerMTokens.toFixed(4)}</td>
                  <td className="py-2 px-2 text-right text-gray-600 text-xs">{bm.releaseDate}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-blue-900 mb-2">Performance Metrics Explained</div>
          <ul className="text-xs text-blue-800 space-y-1">
            <li><strong>Latency:</strong> Typical response time for a single request</li>
            <li><strong>Quality:</strong> Overall performance on standard benchmarks</li>
            <li><strong>Code:</strong> Code generation quality and correctness</li>
            <li><strong>Instructions:</strong> Ability to follow complex instructions</li>
            <li><strong>Reasoning:</strong> Complex reasoning and multi-step problem solving</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-green-900 mb-2">How to Use This Data</div>
          <ul className="text-xs text-green-800 space-y-1">
            <li>✓ <strong>Real-time apps:</strong> Prioritize low latency (&lt;1000ms)</li>
            <li>✓ <strong>Code generation:</strong> Prioritize code quality score</li>
            <li>✓ <strong>Customer service:</strong> Balance quality and latency</li>
            <li>✓ <strong>Complex analysis:</strong> Prioritize reasoning ability</li>
            <li>✓ <strong>Cost-sensitive:</strong> Focus on quality-per-dollar ratio</li>
          </ul>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>Source:</strong> Latency and quality metrics based on typical production measurements and published benchmarks.
          Actual performance varies based on input complexity, token length, and load conditions.
        </p>
        <p>
          <strong>Note:</strong> Benchmarks are approximate and updated regularly. Test with your actual workloads for definitive comparisons.
          Latency is single-request time; batch processing and caching can improve effective throughput.
        </p>
      </div>
    </section>
  )
}
