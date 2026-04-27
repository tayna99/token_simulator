import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface SLATier {
  name: string
  uptime: number
  latencyP99: number
  costMultiplier: number
  description: string
  useCase: string
}

interface Props {
  state: SimState
}

export function SLACostCalculator({ state }: Props) {
  const [selectedUptime, setSelectedUptime] = useState(99.9)
  const [selectedLatency, setSelectedLatency] = useState(500)
  const [redundancyFactor, setRedundancyFactor] = useState(1.0)

  const slaTiers: SLATier[] = [
    {
      name: 'Basic',
      uptime: 99.0,
      latencyP99: 2000,
      costMultiplier: 1.0,
      description: '99.0% uptime, 2s P99 latency',
      useCase: 'Non-critical batch processing',
    },
    {
      name: 'Standard',
      uptime: 99.5,
      latencyP99: 1000,
      costMultiplier: 1.15,
      description: '99.5% uptime, 1s P99 latency',
      useCase: 'Standard API endpoints',
    },
    {
      name: 'Premium',
      uptime: 99.9,
      latencyP99: 500,
      costMultiplier: 1.35,
      description: '99.9% uptime, 500ms P99 latency',
      useCase: 'Production APIs, customer-facing',
    },
    {
      name: 'Enterprise',
      uptime: 99.95,
      latencyP99: 200,
      costMultiplier: 1.65,
      description: '99.95% uptime, 200ms P99 latency',
      useCase: 'Mission-critical systems',
    },
    {
      name: 'Ultra-Premium',
      uptime: 99.99,
      latencyP99: 50,
      costMultiplier: 2.2,
      description: '99.99% uptime, 50ms P99 latency',
      useCase: 'Financial/trading systems',
    },
  ]

  const analysis = useMemo(() => {
    const currentCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    // Find closest SLA tier based on uptime/latency
    const closestTier = slaTiers.reduce((closest, tier) => {
      const uptimeDiff = Math.abs(tier.uptime - selectedUptime)
      const latencyDiff = Math.abs(tier.latencyP99 - selectedLatency)
      const score = uptimeDiff + (latencyDiff / 100)

      const closestScore =
        Math.abs(closest.uptime - selectedUptime) +
        (Math.abs(closest.latencyP99 - selectedLatency) / 100)

      return score < closestScore ? tier : closest
    })

    // Calculate cost multiplier based on custom SLA
    // Uptime: each 0.1% additional uptime = 5% cost increase
    // Latency: each 100ms reduction = 3% cost increase
    const uptimeDiff = selectedUptime - 99.0
    const uptimeCostIncrease = (uptimeDiff / 0.1) * 0.05
    const latencyDiff = Math.max(0, 2000 - selectedLatency)
    const latencyCostIncrease = (latencyDiff / 100) * 0.03
    const customMultiplier = 1.0 + uptimeCostIncrease + latencyCostIncrease

    // Apply redundancy factor
    const finalMultiplier = customMultiplier * redundancyFactor

    const slaCost = currentCost * finalMultiplier
    const costIncrease = slaCost - currentCost
    const costIncreasePercent = (costIncrease / currentCost) * 100

    // Calculate downtime allowed at different SLAs
    const daysPerYear = 365
    const hoursPerYear = daysPerYear * 24
    const minutesPerYear = hoursPerYear * 60

    const downtimeAllowed = {
      99: (1 - 99 / 100) * minutesPerYear,
      99.5: (1 - 99.5 / 100) * minutesPerYear,
      99.9: (1 - 99.9 / 100) * minutesPerYear,
      99.95: (1 - 99.95 / 100) * minutesPerYear,
      99.99: (1 - 99.99 / 100) * minutesPerYear,
    }

    const selectedDowntimeAllowed = (1 - selectedUptime / 100) * minutesPerYear

    // Redundancy cost breakdown
    const activeActiveCost = currentCost * 1.8 // Replicate everything
    const activePassiveCost = currentCost * 1.4 // Standby instance
    const multiRegionCost = currentCost * 2.0 // Multiple regions

    return {
      baseCost: currentCost,
      slaCost,
      costIncrease,
      costIncreasePercent,
      closestTier,
      customMultiplier,
      finalMultiplier,
      downtimeAllowed,
      selectedDowntimeAllowed,
      activeActiveCost,
      activePassiveCost,
      multiRegionCost,
    }
  }, [state, selectedUptime, selectedLatency, redundancyFactor])

  const getRedundancyLabel = (factor: number) => {
    if (factor < 1.1) return 'Single Region'
    if (factor < 1.5) return 'Active-Passive'
    if (factor < 2.0) return 'Active-Active'
    return 'Multi-Region'
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        SLA Cost Calculator
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Target Uptime SLA (%)</label>
          <div className="flex gap-2 items-end">
            <input
              type="range"
              min="99"
              max="99.99"
              step="0.05"
              value={selectedUptime}
              onChange={e => setSelectedUptime(parseFloat(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min="99"
              max="99.99"
              step="0.05"
              value={selectedUptime}
              onChange={e => setSelectedUptime(parseFloat(e.target.value))}
              className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-xs"
            />
            <span className="text-xs text-gray-600">%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">P99 Latency (ms)</label>
          <div className="flex gap-2 items-end">
            <input
              type="range"
              min="50"
              max="2000"
              step="50"
              value={selectedLatency}
              onChange={e => setSelectedLatency(parseInt(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min="50"
              max="2000"
              step="50"
              value={selectedLatency}
              onChange={e => setSelectedLatency(parseInt(e.target.value))}
              className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-xs"
            />
            <span className="text-xs text-gray-600">ms</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Redundancy Level</label>
          <select
            value={redundancyFactor}
            onChange={e => setRedundancyFactor(parseFloat(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs"
          >
            <option value={1.0}>Single Region (1.0x)</option>
            <option value={1.4}>Active-Passive (1.4x)</option>
            <option value={1.8}>Active-Active (1.8x)</option>
            <option value={2.0}>Multi-Region (2.0x)</option>
          </select>
        </div>
      </div>

      {/* Cost summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Base Cost</div>
          <div className="text-2xl font-bold text-blue-900">{fmtCurrency(analysis.baseCost)}</div>
          <div className="text-xs text-blue-700 mt-1">No SLA requirements</div>
        </div>

        <div className={`rounded-lg p-3 border-2 ${
          analysis.costIncreasePercent < 20
            ? 'bg-green-50 border-green-200'
            : analysis.costIncreasePercent < 50
              ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
        }`}>
          <div className={`text-xs font-medium mb-1 ${
            analysis.costIncreasePercent < 20
              ? 'text-green-600'
              : analysis.costIncreasePercent < 50
                ? 'text-amber-600'
                : 'text-red-600'
          }`}>
            SLA Cost
          </div>
          <div className={`text-2xl font-bold ${
            analysis.costIncreasePercent < 20
              ? 'text-green-900'
              : analysis.costIncreasePercent < 50
                ? 'text-amber-900'
                : 'text-red-900'
          }`}>
            {fmtCurrency(analysis.slaCost)}
          </div>
          <div className={`text-xs mt-1 ${
            analysis.costIncreasePercent < 20
              ? 'text-green-700'
              : analysis.costIncreasePercent < 50
                ? 'text-amber-700'
                : 'text-red-700'
          }`}>
            +{analysis.costIncreasePercent.toFixed(1)}%
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Allowed Downtime/Year</div>
          <div className="text-2xl font-bold text-purple-900">{analysis.selectedDowntimeAllowed.toFixed(1)}</div>
          <div className="text-xs text-purple-700 mt-1">minutes per year</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-600 font-medium mb-1">Redundancy</div>
          <div className="text-lg font-bold text-amber-900">{redundancyFactor}x</div>
          <div className="text-xs text-amber-700 mt-1">{getRedundancyLabel(redundancyFactor)}</div>
        </div>
      </div>

      {/* SLA tier comparison */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">SLA Tier Comparison</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {analysis.closestTier && (
            <div className="md:col-start-2 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
              <div className="text-xs font-medium text-blue-700 mb-2">Closest Tier</div>
              <div className="text-sm font-bold text-blue-900 mb-1">{analysis.closestTier.name}</div>
              <div className="text-xs text-blue-800 space-y-1">
                <div>{analysis.closestTier.uptime}% uptime</div>
                <div>{analysis.closestTier.latencyP99}ms P99</div>
              </div>
            </div>
          )}
          {[0, 1, 2, 3, 4].map(idx => {
            const tier = [
              { name: 'Basic', uptime: 99.0, latency: 2000, cost: analysis.baseCost * 1.0 },
              { name: 'Standard', uptime: 99.5, latency: 1000, cost: analysis.baseCost * 1.15 },
              { name: 'Premium', uptime: 99.9, latency: 500, cost: analysis.baseCost * 1.35 },
              { name: 'Enterprise', uptime: 99.95, latency: 200, cost: analysis.baseCost * 1.65 },
              { name: 'Ultra', uptime: 99.99, latency: 50, cost: analysis.baseCost * 2.2 },
            ][idx]

            return (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-gray-900 mb-2">{tier.name}</div>
                <div className="text-xs text-gray-700 space-y-1">
                  <div>{tier.uptime}% uptime</div>
                  <div>{tier.latency}ms P99</div>
                  <div className="font-semibold text-gray-900 mt-2">{fmtCurrency(tier.cost)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Downtime allowance */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Annual Downtime Allowance by SLA Level</div>
        <div className="space-y-2">
          {[99.0, 99.5, 99.9, 99.95, 99.99].map(uptime => (
            <div key={uptime}>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">{uptime}% SLA</span>
                <span className="text-xs font-semibold text-gray-900">
                  {analysis.downtimeAllowed[uptime as keyof typeof analysis.downtimeAllowed].toFixed(1)} minutes/year
                  ({(analysis.downtimeAllowed[uptime as keyof typeof analysis.downtimeAllowed] / 60).toFixed(1)} hours)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-gray-600 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (uptime - 99) * 500)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Redundancy options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-green-900 mb-3">Redundancy Options</div>
          <div className="space-y-3 text-xs">
            <div className="bg-white rounded p-2">
              <div className="font-medium text-gray-900">Single Region (1.0x)</div>
              <div className="text-gray-600 mt-1">{fmtCurrency(analysis.baseCost)}</div>
              <div className="text-gray-700 mt-1">One region, no redundancy</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="font-medium text-gray-900">Active-Passive (1.4x)</div>
              <div className="text-gray-600 mt-1">{fmtCurrency(analysis.activePassiveCost)}</div>
              <div className="text-gray-700 mt-1">Standby replica, auto-failover</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="font-medium text-gray-900">Active-Active (1.8x)</div>
              <div className="text-gray-600 mt-1">{fmtCurrency(analysis.activeActiveCost)}</div>
              <div className="text-gray-700 mt-1">Both instances active, load balanced</div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="font-medium text-gray-900">Multi-Region (2.0x)</div>
              <div className="text-gray-600 mt-1">{fmtCurrency(analysis.multiRegionCost)}</div>
              <div className="text-gray-700 mt-1">Full replication across regions</div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-blue-900 mb-3">Cost Breakdown</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">Base LLM Cost:</span>
              <span className="font-semibold">{fmtCurrency(analysis.baseCost)}</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">SLA Overhead:</span>
              <span className="font-semibold text-blue-700">+{((analysis.finalMultiplier - 1) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">SLA Multiplier:</span>
              <span className="font-semibold">{analysis.finalMultiplier.toFixed(2)}x</span>
            </div>
            <div className="border-t border-blue-200 pt-2 flex justify-between font-semibold">
              <span className="text-blue-900">Total SLA Cost:</span>
              <span className="text-blue-900">{fmtCurrency(analysis.slaCost)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Adjust uptime and latency targets to see how SLA requirements affect costs. Each
          0.1% improvement in uptime or 100ms reduction in latency increases costs. Redundancy multiplies the base cost.
        </p>
        <p>
          <strong>Note:</strong> Costs are estimates based on typical infrastructure patterns. Actual costs depend on
          your provider, region, and implementation strategy.
        </p>
      </div>
    </section>
  )
}
