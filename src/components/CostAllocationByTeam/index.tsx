import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Team {
  id: string
  name: string
  percentage: number
  color: string
  requestsPerMonth: number
}

interface Props {
  state: SimState
}

export function CostAllocationByTeam({ state }: Props) {
  const [teams] = useState<Team[]>([
    { id: '1', name: 'AI Search', percentage: 40, color: 'bg-blue-500', requestsPerMonth: 40000 },
    { id: '2', name: 'Code Gen', percentage: 30, color: 'bg-purple-500', requestsPerMonth: 30000 },
    { id: '3', name: 'Chat Bot', percentage: 20, color: 'bg-green-500', requestsPerMonth: 20000 },
    { id: '4', name: 'Analytics', percentage: 10, color: 'bg-amber-500', requestsPerMonth: 10000 },
  ])

  const [showChargeback, setShowChargeback] = useState(true)

  const analysis = useMemo(() => {
    const currentCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    // Calculate costs by team
    const teamCosts = teams.map(team => {
      const teamCost = currentCost * (team.percentage / 100)
      const costPerRequest = team.requestsPerMonth > 0 ? teamCost / team.requestsPerMonth : 0
      const yearlyBudget = teamCost * 12

      return {
        ...team,
        monthlyCost: teamCost,
        costPerRequest,
        yearlyBudget,
        requestsPerMonth: team.requestsPerMonth,
      }
    })

    // Sort by cost
    const sorted = [...teamCosts].sort((a, b) => b.monthlyCost - a.monthlyCost)

    // Calculate statistics
    const totalTeamCost = teamCosts.reduce((sum, t) => sum + t.monthlyCost, 0)
    const totalRequests = teamCosts.reduce((sum, t) => sum + t.requestsPerMonth, 0)
    const avgCostPerRequest = totalRequests > 0 ? totalTeamCost / totalRequests : 0

    // Top consumer
    const topConsumer = sorted[0]
    const topConsumerShare = (topConsumer.monthlyCost / totalTeamCost) * 100

    // ROI by team
    const teamROI = teamCosts.map(t => ({
      ...t,
      roi: t.requestsPerMonth > 0 ? t.monthlyCost / t.requestsPerMonth * 1000 : 0, // Cost per 1000 requests
    }))

    return {
      teamCosts: sorted,
      totalTeamCost,
      totalRequests,
      avgCostPerRequest,
      topConsumer,
      topConsumerShare,
      teamROI,
    }
  }, [state, teams])


  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Allocation by Team/Project
      </h2>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Total Team Cost</div>
          <div className="text-2xl font-bold text-blue-900">{fmtCurrency(analysis.totalTeamCost)}</div>
          <div className="text-xs text-blue-700 mt-1">/month</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-purple-900">{(analysis.totalRequests / 1000).toFixed(0)}K</div>
          <div className="text-xs text-purple-700 mt-1">per month</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Avg Cost/Request</div>
          <div className="text-2xl font-bold text-green-900">{fmtCurrency(analysis.avgCostPerRequest)}</div>
          <div className="text-xs text-green-700 mt-1">across all teams</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-600 font-medium mb-1">Top Consumer</div>
          <div className="text-lg font-bold text-amber-900">{analysis.topConsumer?.name}</div>
          <div className="text-xs text-amber-700 mt-1">{analysis.topConsumerShare.toFixed(0)}% of costs</div>
        </div>
      </div>

      {/* Chargeback model toggle */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showChargeback}
            onChange={e => setShowChargeback(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-800">Show Chargeback Model (Actual vs Fair Share)</span>
        </label>
      </div>

      {/* Team allocation table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Team</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Load %</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly Cost</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Requests</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Cost/Req</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Annual</th>
              {showChargeback && <th className="text-right py-2 px-2 font-semibold text-gray-700">Chargeback</th>}
            </tr>
          </thead>
          <tbody>
            {analysis.teamCosts.map(team => {
              const fairShareCost = (team.percentage / 100) * analysis.totalTeamCost
              const difference = team.monthlyCost - fairShareCost

              return (
                <tr key={team.id} className="border-t border-gray-100 hover:bg-blue-50">
                  <td className="py-2 px-2 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${team.color}`}></div>
                      {team.name}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center text-gray-700">{team.percentage}%</td>
                  <td className="py-2 px-2 text-right font-semibold text-gray-900">
                    {fmtCurrency(team.monthlyCost)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-700">{(team.requestsPerMonth / 1000).toFixed(0)}K</td>
                  <td className="py-2 px-2 text-right text-gray-700">{fmtCurrency(team.costPerRequest)}</td>
                  <td className="py-2 px-2 text-right font-semibold text-gray-900">
                    {fmtCurrency(team.yearlyBudget)}
                  </td>
                  {showChargeback && (
                    <td className={`py-2 px-2 text-right font-semibold ${
                      difference > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      {difference > 0 ? '+' : '−'}{fmtCurrency(Math.abs(difference))}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cost distribution pie */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Cost Distribution</div>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-center h-40">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {analysis.teamCosts.map((team, idx) => {
                    const startAngle = analysis.teamCosts.slice(0, idx).reduce((sum, t) => sum + (t.percentage / 100) * 360, 0)
                    const endAngle = startAngle + (team.percentage / 100) * 360
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
                    }

                    return (
                      <path
                        key={team.id}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={colorMap[team.color]}
                        stroke="white"
                        strokeWidth="2"
                      />
                    )
                  })}
                </svg>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {analysis.teamCosts.map(team => (
              <div key={team.id} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                <div className={`w-3 h-3 rounded-full ${team.color}`}></div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900">{team.name}</div>
                  <div className="text-xs text-gray-600">{team.percentage}% of costs</div>
                </div>
                <div className="text-xs font-semibold text-gray-900">{fmtCurrency(team.monthlyCost)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showChargeback && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-800 mb-3">Chargeback Analysis</div>
          <div className="bg-gray-50 rounded-lg p-4 text-xs">
            <p className="text-gray-700 mb-3">
              Chargeback shows the difference between actual cost allocation (by load %) and fair share allocation based on actual request volume.
            </p>
            <div className="space-y-2">
              {analysis.teamCosts.map(team => {
                const fairShareCost = (team.percentage / 100) * analysis.totalTeamCost
                const difference = team.monthlyCost - fairShareCost
                const differencePercent = fairShareCost > 0 ? (difference / fairShareCost) * 100 : 0

                return (
                  <div key={team.id} className="bg-white rounded p-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{team.name}</div>
                      <div className="text-gray-600">Fair share: {fmtCurrency(fairShareCost)}</div>
                    </div>
                    <div className={`text-right ${difference > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      <div className="font-bold">{difference > 0 ? '+' : '−'}{fmtCurrency(Math.abs(difference))}</div>
                      <div className="text-xs">{difference > 0 ? 'Overcharge' : 'Undercharge'} {Math.abs(differencePercent).toFixed(0)}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Allocate costs by team or project to track spending by organizational unit. Use the
          chargeback model to bill teams based on actual usage vs allocation percentage.
        </p>
        <p>
          <strong>Chargeback:</strong> Positive values mean the team is using more than their allocation suggests, negative
          means they're underutilizing. This helps identify which teams are most cost-efficient.
        </p>
      </div>
    </section>
  )
}
