import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface TimelineEvent {
  month: number
  monthName: string
  initiative: string
  category: string
  implementationCost: number
  monthlySavings: number
  cumulativeSavings: number
  paybackMonths: number
  monthsUntilBreakEven: number
  isBreakEven: boolean
  implementationDateMonth: number
}

interface Props {
  state: SimState
}

export function SavingsPaybackTimeline({ state }: Props) {
  const [timelineMonths, setTimelineMonths] = useState(24)

  const timeline = useMemo(() => {
    const currentCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    const events: TimelineEvent[] = []

    // Initiative 1: Cache improvement (starts month 1)
    if (state.cacheHitRate < 0.8 && state.currentModel.cacheDiscount > 0) {
      const targetCache = Math.min(state.cacheHitRate + 0.2, 0.8)
      const costWithCache = calculateCost({
        model: state.currentModel,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: targetCache,
        batchEnabled: state.batchEnabled,
      }).monthlyCost

      const monthlySavings = currentCost - costWithCache
      const implementationCost = 5 * 250 // 5 days of engineering at $250/day
      const paybackMonths = Math.ceil(implementationCost / monthlySavings)

      events.push({
        month: 1,
        monthName: 'Month 1',
        initiative: 'Improve Cache Hit Rate',
        category: 'Optimization',
        implementationCost,
        monthlySavings,
        cumulativeSavings: monthlySavings,
        paybackMonths,
        monthsUntilBreakEven: paybackMonths,
        isBreakEven: true,
        implementationDateMonth: 1,
      })
    }

    // Initiative 2: Batch mode (starts month 2)
    if (!state.batchEnabled && state.currentModel.batchDiscount > 0) {
      const costWithBatch = calculateCost({
        model: state.currentModel,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: true,
      }).monthlyCost

      const monthlySavings = currentCost - costWithBatch
      const implementationCost = 7 * 250 // 7 days
      const paybackMonths = Math.ceil(implementationCost / monthlySavings)

      events.push({
        month: 2,
        monthName: 'Month 2',
        initiative: 'Enable Batch API',
        category: 'Optimization',
        implementationCost,
        monthlySavings,
        cumulativeSavings: monthlySavings,
        paybackMonths,
        monthsUntilBreakEven: paybackMonths,
        isBreakEven: true,
        implementationDateMonth: 2,
      })
    }

    // Initiative 3: Negotiate discount (month 3)
    const discountSavings = currentCost * 0.15
    events.push({
      month: 3,
      monthName: 'Month 3',
      initiative: 'Negotiate Volume Discount (15%)',
      category: 'Negotiation',
      implementationCost: 3 * 250, // 3 days negotiation effort
      monthlySavings: discountSavings,
      cumulativeSavings: discountSavings,
      paybackMonths: 1,
      monthsUntilBreakEven: 1,
      isBreakEven: true,
      implementationDateMonth: 3,
    })

    return events.sort((a, b) => a.month - b.month)
  }, [
    state.batchEnabled,
    state.cacheHitRate,
    state.currentModel,
    state.periodInputTokens,
    state.periodOutputTokens,
  ])

  // Calculate projected costs over time
  const projections = useMemo(() => {
    const baselineCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    const months = []
    let cumulativeSavings = 0
    let cumulativeCost = 0

    for (let m = 1; m <= timelineMonths; m++) {
      const monthEvents = timeline.filter(e => e.implementationDateMonth <= m)
      const totalMonthlySavings = monthEvents.reduce((sum, e) => sum + e.monthlySavings, 0)
      const costThisMonth = Math.max(baselineCost - totalMonthlySavings, 0)

      cumulativeSavings += totalMonthlySavings
      cumulativeCost += costThisMonth

      months.push({
        month: m,
        monthLabel: `M${m}`,
        costThisMonth,
        cumulativeCost,
        monthlySavings: totalMonthlySavings,
        cumulativeSavings,
        roi: cumulativeSavings > 0 ? (cumulativeSavings / (timeline.reduce((s, e) => s + e.implementationCost, 0))) * 100 : 0,
      })
    }

    return months
  }, [timeline, timelineMonths])

  const totalImplementationCost = timeline.reduce((sum, e) => sum + e.implementationCost, 0)
  const finalCumulativeSavings = projections[projections.length - 1]?.cumulativeSavings || 0
  const finalROI = (finalCumulativeSavings / totalImplementationCost) * 100

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm md:text-base font-semibold text-gray-800">
          Savings Payback Timeline
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-700">Projection period:</label>
          <select
            value={timelineMonths}
            onChange={e => setTimelineMonths(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-xs"
          >
            <option value={12}>12 months</option>
            <option value={24}>24 months</option>
            <option value={36}>36 months</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Total Implementation Cost</div>
          <div className="text-2xl font-bold text-blue-900">{fmtCurrency(totalImplementationCost)}</div>
          <div className="text-xs text-blue-700 mt-1">Engineering & negotiation effort</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Total Savings ({timelineMonths}mo)</div>
          <div className="text-2xl font-bold text-green-900">{fmtCurrency(finalCumulativeSavings)}</div>
          <div className="text-xs text-green-700 mt-1">Cumulative across all initiatives</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Overall ROI</div>
          <div className="text-2xl font-bold text-purple-900">{finalROI.toFixed(0)}x</div>
          <div className="text-xs text-purple-700 mt-1">{(finalROI * 100).toFixed(0)}% return on investment</div>
        </div>
      </div>

      {/* Timeline Events */}
      <div className="mb-6 space-y-2">
        <div className="text-sm font-semibold text-gray-800 mb-3">Implementation Schedule</div>
        {timeline.map((event, idx) => (
          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-gray-900">{event.initiative}</div>
                <div className="text-xs text-gray-600">{event.monthName} • {event.category}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-green-700">{fmtCurrency(event.monthlySavings)}</div>
                <div className="text-xs text-gray-600">per month</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <div className="text-gray-600 font-medium">Implementation</div>
                <div className="font-semibold text-gray-900">{fmtCurrency(event.implementationCost)}</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-gray-600 font-medium">Payback Period</div>
                <div className="font-semibold text-gray-900">{event.paybackMonths} months</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-gray-600 font-medium">Break-Even</div>
                <div className="font-semibold text-green-700">M{event.implementationDateMonth + event.paybackMonths}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Projection Chart */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Cost Projection</div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-end justify-between h-48 gap-1">
            {projections.map((proj, idx) => {
              const maxCost = Math.max(...projections.map(p => p.costThisMonth))
              const heightPct = (proj.costThisMonth / maxCost) * 100
              const isMilestone = [3, 6, 12, 18, 24].includes(proj.month)

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className={`w-full rounded-t transition-colors ${
                      proj.monthlySavings > 0 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ height: `${heightPct}%`, minHeight: '2px' }}
                  ></div>
                  {isMilestone && (
                    <div className="text-xs text-gray-600 mt-2 font-medium">{proj.monthLabel}</div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
            <div>Month 1</div>
            <div>Month {timelineMonths}</div>
          </div>
        </div>
      </div>

      {/* Cumulative Savings Table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Month</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly Cost</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly Savings</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Cumulative Savings</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">ROI</th>
            </tr>
          </thead>
          <tbody>
            {projections
              .filter((_, idx) => idx % Math.ceil(timelineMonths / 12) === 0 || idx === timelineMonths - 1)
              .map((proj, idx) => (
                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 font-medium text-gray-900">M{proj.month}</td>
                  <td className="py-2 px-2 text-right text-gray-700">{fmtCurrency(proj.costThisMonth)}</td>
                  <td className="py-2 px-2 text-right text-green-700 font-semibold">
                    {proj.monthlySavings > 0 ? '+' : ''}{fmtCurrency(proj.monthlySavings)}
                  </td>
                  <td className="py-2 px-2 text-right font-semibold text-gray-900">
                    {fmtCurrency(proj.cumulativeSavings)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-700">{proj.roi.toFixed(0)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>Interpretation:</strong> The timeline shows when each optimization initiative should be implemented and when it breaks even.
          Green bars show months with active savings; blue shows baseline costs.
        </p>
        <p>
          <strong>Strategy:</strong> Implement optimizations with shortest payback periods first to build momentum.
          Pursue longer-term initiatives (like model switches) only if long-term ROI is strong.
        </p>
      </div>
    </section>
  )
}
