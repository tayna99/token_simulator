import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface RequestType {
  id: string
  name: string
  percentage: number
  avgInputTokens: number
  avgOutputTokens: number
  color: string
}

interface Props {
  state: SimState
}

export function RequestPatternAnalyzer({ state }: Props) {
  const [requestTypes] = useState<RequestType[]>([
    { id: '1', name: 'Search Query', percentage: 40, avgInputTokens: 100, avgOutputTokens: 200, color: 'bg-blue-500' },
    { id: '2', name: 'Code Generation', percentage: 25, avgInputTokens: 500, avgOutputTokens: 800, color: 'bg-purple-500' },
    { id: '3', name: 'Chat Response', percentage: 20, avgInputTokens: 50, avgOutputTokens: 150, color: 'bg-green-500' },
    { id: '4', name: 'Summarization', percentage: 15, avgInputTokens: 2000, avgOutputTokens: 300, color: 'bg-amber-500' },
  ])


  const analysis = useMemo(() => {
    const currentCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    // Calculate average tokens per request based on distribution
    const avgInputPerRequest = requestTypes.reduce(
      (sum, rt) => sum + (rt.avgInputTokens * rt.percentage) / 100,
      0
    )
    const avgOutputPerRequest = requestTypes.reduce(
      (sum, rt) => sum + (rt.avgOutputTokens * rt.percentage) / 100,
      0
    )
    const totalTokensPerRequest = avgInputPerRequest + avgOutputPerRequest
    const requestCount = state.monthlyRequests || 100000
    const totalMonthlyTokens = totalTokensPerRequest * requestCount
    const costPerRequest = currentCost / requestCount

    // Analyze each request type
    const typeAnalysis = requestTypes.map(rt => {
      const inputTokens = state.periodInputTokens * (rt.percentage / 100)
      const outputTokens = state.periodOutputTokens * (rt.percentage / 100)
      const typeCost = currentCost * (rt.percentage / 100)
      const typeRequestCount = requestCount * (rt.percentage / 100)
      const typeCostPerRequest = typeRequestCount > 0 ? typeCost / typeRequestCount : 0

      // Token efficiency (lower is better)
      const tokensPerRequest = rt.avgInputTokens + rt.avgOutputTokens
      const efficiency = (1 - tokensPerRequest / (avgInputPerRequest + avgOutputPerRequest)) * 100

      // Optimization potential
      const cachePotential = rt.name.includes('Search') || rt.name.includes('Query') ? 0.5 : 0.1
      const batchPotential = rt.name.includes('Summarization') ? 0.3 : 0.05
      const totalOptimizationPotential = cachePotential + batchPotential

      return {
        ...rt,
        inputTokens,
        outputTokens,
        monthlyCost: typeCost,
        requestCount: typeRequestCount,
        costPerRequest: typeCostPerRequest,
        efficiency,
        optimizationPotential: totalOptimizationPotential,
      }
    })

    // Sort by cost
    const sorted = [...typeAnalysis].sort((a, b) => b.monthlyCost - a.monthlyCost)

    // Calculate potential savings
    const totalOptimizableCost = typeAnalysis.reduce(
      (sum, ta) => sum + ta.monthlyCost * ta.optimizationPotential,
      0
    )

    // Request frequency analysis
    const avgRequestsPerDay = requestCount / 30
    const peakHourPercentage = 20 // Assuming 20% of daily traffic in peak hour
    const peakHourRequests = (avgRequestsPerDay * peakHourPercentage) / 24
    const offPeakHourRequests = (avgRequestsPerDay * (100 - peakHourPercentage)) / (24 * 100)

    return {
      typeAnalysis: sorted,
      currentCost,
      costPerRequest,
      avgInputPerRequest,
      avgOutputPerRequest,
      totalTokensPerRequest,
      totalMonthlyTokens,
      requestCount,
      totalOptimizableCost,
      avgRequestsPerDay,
      peakHourRequests,
      offPeakHourRequests,
    }
  }, [state, requestTypes])


  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Request Pattern Analyzer
      </h2>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Requests/Month</div>
          <div className="text-2xl font-bold text-blue-900">{(analysis.requestCount / 1000).toFixed(0)}K</div>
          <div className="text-xs text-blue-700 mt-1">{analysis.avgRequestsPerDay.toFixed(0)}/day avg</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Cost/Request</div>
          <div className="text-2xl font-bold text-purple-900">{fmtCurrency(analysis.costPerRequest)}</div>
          <div className="text-xs text-purple-700 mt-1">{analysis.totalTokensPerRequest.toFixed(0)} tokens avg</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Optimization Potential</div>
          <div className="text-2xl font-bold text-green-900">{fmtCurrency(analysis.totalOptimizableCost)}</div>
          <div className="text-xs text-green-700 mt-1">{((analysis.totalOptimizableCost / analysis.currentCost) * 100).toFixed(0)}% of costs</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-600 font-medium mb-1">Peak Hour</div>
          <div className="text-2xl font-bold text-amber-900">{analysis.peakHourRequests.toFixed(0)}</div>
          <div className="text-xs text-amber-700 mt-1">requests/hour</div>
        </div>

        <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
          <div className="text-xs text-pink-600 font-medium mb-1">Off-Peak Hour</div>
          <div className="text-2xl font-bold text-pink-900">{analysis.offPeakHourRequests.toFixed(0)}</div>
          <div className="text-xs text-pink-700 mt-1">requests/hour</div>
        </div>
      </div>

      {/* Request type distribution */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Request Type Breakdown</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Distribution pie */}
          <div>
            <div className="flex items-center justify-center h-40">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {analysis.typeAnalysis.map((type, idx) => {
                    const startAngle = analysis.typeAnalysis.slice(0, idx).reduce((sum, t) => sum + (t.percentage / 100) * 360, 0)
                    const endAngle = startAngle + (type.percentage / 100) * 360
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180

                    const x1 = 50 + 40 * Math.cos(startRad)
                    const y1 = 50 + 40 * Math.sin(startRad)
                    const x2 = 50 + 40 * Math.cos(endRad)
                    const y2 = 50 + 40 * Math.sin(endRad)

                    const largeArc = endAngle - startAngle > 180 ? 1 : 0

                    const colorMap: Record<string, string> = {
                      'bg-blue-500': '#3b82f6',
                      'bg-purple-500': '#a855f7',
                      'bg-green-500': '#22c55e',
                      'bg-amber-500': '#f59e0b',
                      'bg-pink-500': '#ec4899',
                      'bg-indigo-500': '#6366f1',
                      'bg-cyan-500': '#06b6d4',
                      'bg-red-500': '#ef4444',
                      'bg-gray-500': '#6b7280',
                    }

                    return (
                      <path
                        key={type.id}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={colorMap[type.color]}
                        stroke="white"
                        strokeWidth="2"
                      />
                    )
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div>
            <div className="space-y-2">
              {analysis.typeAnalysis.map(type => (
                <div key={type.id} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                  <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-900">{type.name}</div>
                    <div className="text-xs text-gray-600">{type.percentage}% of requests</div>
                  </div>
                  <div className="text-xs font-semibold text-gray-900">{fmtCurrency(type.monthlyCost)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Request type details table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Request Type</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">% of Traffic</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Avg Input</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Avg Output</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Cost/Request</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly Cost</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Optimization</th>
            </tr>
          </thead>
          <tbody>
            {analysis.typeAnalysis.map(type => (
              <tr key={type.id} className="border-t border-gray-100 hover:bg-blue-50">
                <td className="py-2 px-2 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${type.color}`}></div>
                    {type.name}
                  </div>
                </td>
                <td className="py-2 px-2 text-center text-gray-700">{type.percentage}%</td>
                <td className="py-2 px-2 text-right text-gray-700">{type.avgInputTokens}</td>
                <td className="py-2 px-2 text-right text-gray-700">{type.avgOutputTokens}</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">
                  {fmtCurrency(type.costPerRequest)}
                </td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900">
                  {fmtCurrency(type.monthlyCost)}
                </td>
                <td className="py-2 px-2 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-12 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-green-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, type.optimizationPotential * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold ml-1 min-w-fit">{(type.optimizationPotential * 100).toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optimization recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {analysis.typeAnalysis.slice(0, 3).map((type, idx) => (
          <div key={type.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs font-medium text-blue-700 mb-2">
              {idx === 0 ? '🎯' : idx === 1 ? '📌' : '💡'} {type.name}
            </div>
            <div className="text-xs text-blue-800 space-y-1">
              <div className="flex justify-between">
                <span>Cost:</span>
                <span className="font-semibold">{fmtCurrency(type.monthlyCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Optimization:</span>
                <span className="font-semibold">{(type.optimizationPotential * 100).toFixed(0)}% savings</span>
              </div>
              <div className="flex justify-between">
                <span>Strategy:</span>
                <span className="font-semibold text-xs">
                  {type.name.includes('Search') ? 'Increase cache' :
                   type.name.includes('Summarization') ? 'Enable batch' :
                   'Prompt tuning'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Define your request types and their token characteristics. The analyzer shows which
          request types drive the most cost and where optimization efforts will have the greatest impact.
        </p>
        <p>
          <strong>Optimization opportunities:</strong> Search queries benefit from caching, summarization benefits from batch
          processing, and all types benefit from prompt engineering to reduce token count.
        </p>
      </div>
    </section>
  )
}
