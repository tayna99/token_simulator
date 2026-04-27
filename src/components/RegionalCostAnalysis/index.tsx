import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Region {
  name: string
  code: string
  description: string
  pricingMultiplier: number
  latency: string
  dataResidency: string
}

interface Props {
  state: SimState
}

export function RegionalCostAnalysis({ state }: Props) {
  const [analysisYears, setAnalysisYears] = useState(1)
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['us-east', 'us-west', 'eu-west', 'apac-sg'])

  const regions: Region[] = [
    { name: 'US East', code: 'us-east', description: 'Northern Virginia', pricingMultiplier: 1.0, latency: '50ms avg', dataResidency: 'US' },
    { name: 'US West', code: 'us-west', description: 'Oregon/California', pricingMultiplier: 1.05, latency: '60ms avg', dataResidency: 'US' },
    { name: 'EU West', code: 'eu-west', description: 'Ireland/London', pricingMultiplier: 1.15, latency: '80ms avg', dataResidency: 'EU' },
    { name: 'EU Central', code: 'eu-central', description: 'Frankfurt', pricingMultiplier: 1.20, latency: '90ms avg', dataResidency: 'EU' },
    { name: 'APAC Singapore', code: 'apac-sg', description: 'Singapore', pricingMultiplier: 1.30, latency: '150ms avg', dataResidency: 'APAC' },
    { name: 'APAC Tokyo', code: 'apac-tokyo', description: 'Tokyo', pricingMultiplier: 1.35, latency: '140ms avg', dataResidency: 'APAC' },
    { name: 'APAC Sydney', code: 'apac-sydney', description: 'Sydney', pricingMultiplier: 1.40, latency: '180ms avg', dataResidency: 'APAC' },
  ]

  const analysis = useMemo(() => {
    const currentBaseCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    const candidateBaseCost = calculateCost({
      model: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    const months = analysisYears * 12

    // Calculate costs for each region
    const regionalAnalysis = regions.map(region => {
      const currentCost = currentBaseCost * region.pricingMultiplier
      const candidateCost = candidateBaseCost * region.pricingMultiplier
      const monthlySavings = currentCost - candidateCost
      const annualCost = currentCost * 12
      const annualSavings = monthlySavings * 12
      const totalAnalysisCost = currentCost * months
      const totalAnalysisSavings = monthlySavings * months

      return {
        ...region,
        currentMonthlyCost: currentCost,
        candidateMonthlyCost: candidateCost,
        monthlySavings,
        annualCost,
        annualSavings,
        totalAnalysisCost,
        totalAnalysisSavings,
      }
    })

    // Filter to selected regions
    const selectedAnalysis = regionalAnalysis.filter(r => selectedRegions.includes(r.code))

    // Calculate global totals
    const globalCurrentMonthly = selectedAnalysis.reduce((sum, r) => sum + r.currentMonthlyCost, 0)
    const globalCandidateMonthly = selectedAnalysis.reduce((sum, r) => sum + r.candidateMonthlyCost, 0)
    const globalMonthlySavings = globalCurrentMonthly - globalCandidateMonthly
    const globalAnnualSavings = globalMonthlySavings * 12
    const globalAnalysisSavings = globalMonthlySavings * months

    // Find cheapest and most expensive
    const sortedByPrice = [...regionalAnalysis].sort((a, b) => a.currentMonthlyCost - b.currentMonthlyCost)
    const cheapestRegion = sortedByPrice[0]
    const mostExpensiveRegion = sortedByPrice[sortedByPrice.length - 1]
    const priceDifference = mostExpensiveRegion.currentMonthlyCost - cheapestRegion.currentMonthlyCost
    const priceDifferencePercent = (priceDifference / cheapestRegion.currentMonthlyCost) * 100

    // Data residency summary
    const dataResidencies = Array.from(new Set(selectedAnalysis.map(r => r.dataResidency)))
    const hasMultipleResidencies = dataResidencies.length > 1

    return {
      regions: regionalAnalysis,
      selectedRegions: selectedAnalysis,
      cheapestRegion,
      mostExpensiveRegion,
      priceDifference,
      priceDifferencePercent,
      globalCurrentMonthly,
      globalCandidateMonthly,
      globalMonthlySavings,
      globalAnnualSavings,
      globalAnalysisSavings,
      dataResidencies,
      hasMultipleResidencies,
    }
  }, [state, analysisYears, selectedRegions])

  const toggleRegion = (code: string) => {
    setSelectedRegions(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Regional Cost Analysis
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Analysis Period</label>
          <select
            value={analysisYears}
            onChange={e => setAnalysisYears(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={1}>1 year</option>
            <option value={3}>3 years</option>
            <option value={5}>5 years</option>
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-700">Global Analysis</div>
          <div className="space-y-1 mt-2 text-xs">
            <div className="flex justify-between">
              <span>Monthly Cost:</span>
              <span className="font-semibold">{fmtCurrency(analysis.globalCurrentMonthly)}</span>
            </div>
            <div className="flex justify-between">
              <span>Annual Savings:</span>
              <span className="font-semibold text-green-700">{fmtCurrency(analysis.globalAnnualSavings)}</span>
            </div>
            <div className="flex justify-between">
              <span>{analysisYears}-Year Savings:</span>
              <span className="font-semibold text-green-700">{fmtCurrency(analysis.globalAnalysisSavings)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Region selector */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-700 mb-2">Select Regions</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {analysis.regions.map(region => (
            <button
              key={region.code}
              onClick={() => toggleRegion(region.code)}
              className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                selectedRegions.includes(region.code)
                  ? 'bg-blue-600 text-white border border-blue-600'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400'
              }`}
            >
              {region.name}
            </button>
          ))}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs font-medium text-green-700 mb-1">Cheapest Region</div>
          <div className="font-semibold text-gray-900">{analysis.cheapestRegion.name}</div>
          <div className="text-xs text-green-800 mt-1">{fmtCurrency(analysis.cheapestRegion.currentMonthlyCost)}/month</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs font-medium text-red-700 mb-1">Most Expensive Region</div>
          <div className="font-semibold text-gray-900">{analysis.mostExpensiveRegion.name}</div>
          <div className="text-xs text-red-800 mt-1">{fmtCurrency(analysis.mostExpensiveRegion.currentMonthlyCost)}/month</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs font-medium text-amber-700 mb-1">Price Spread</div>
          <div className="font-semibold text-gray-900">{fmtCurrency(analysis.priceDifference)}</div>
          <div className="text-xs text-amber-800 mt-1">{analysis.priceDifferencePercent.toFixed(0)}% difference</div>
        </div>
      </div>

      {/* Regional comparison table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Region</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Details</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Latency</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">{state.currentModel.name}</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">{state.candidateModel.name}</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly Savings</th>
            </tr>
          </thead>
          <tbody>
            {analysis.selectedRegions.map(region => (
              <tr key={region.code} className="border-t border-gray-100 hover:bg-blue-50">
                <td className="py-2 px-2 font-medium text-gray-900">{region.name}</td>
                <td className="py-2 px-2 text-gray-600">
                  <div>{region.description}</div>
                  <div className="text-xs text-gray-500 mt-1">{region.dataResidency}</div>
                </td>
                <td className="py-2 px-2 text-center text-gray-700">{region.latency}</td>
                <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                  {fmtCurrency(region.currentMonthlyCost)}
                </td>
                <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                  {fmtCurrency(region.candidateMonthlyCost)}
                </td>
                <td className="py-2 px-2 text-right font-semibold text-green-700">
                  {fmtCurrency(region.monthlySavings)}
                </td>
              </tr>
            ))}
            {analysis.selectedRegions.length > 1 && (
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td colSpan={3} className="py-2 px-2 text-gray-900">
                  Global Total
                </td>
                <td className="py-2 px-2 text-right text-gray-900">
                  {fmtCurrency(analysis.globalCurrentMonthly)}
                </td>
                <td className="py-2 px-2 text-right text-gray-900">
                  {fmtCurrency(analysis.globalCandidateMonthly)}
                </td>
                <td className="py-2 px-2 text-right text-green-700">
                  {fmtCurrency(analysis.globalMonthlySavings)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Regional distribution */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Cost Distribution by Region</div>
        <div className="space-y-2">
          {analysis.selectedRegions
            .sort((a, b) => b.currentMonthlyCost - a.currentMonthlyCost)
            .map(region => {
              const total = analysis.globalCurrentMonthly
              const percentage = (region.currentMonthlyCost / total) * 100

              return (
                <div key={region.code}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{region.name}</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {percentage.toFixed(1)}% ({fmtCurrency(region.currentMonthlyCost)})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-blue-900 mb-2">Cost Optimization Tips</div>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>✓ Consolidate to {analysis.cheapestRegion.name} where possible</li>
            <li>✓ Use CDN/caching for distant regions</li>
            <li>✓ Negotiate volume discounts per region</li>
            <li>✓ Consider local API gateways for latency-sensitive apps</li>
          </ul>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-purple-900 mb-2">Compliance Considerations</div>
          <ul className="text-xs text-purple-800 space-y-1">
            <li>• EU data must stay in EU regions (GDPR)</li>
            <li>• Verify data residency requirements</li>
            <li>• Check latency SLAs for real-time services</li>
            <li>• Plan for regional failover/redundancy</li>
          </ul>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>About regional pricing:</strong> Pricing multipliers are typical market rates relative to US East
          (baseline 1.0x). Actual costs may vary by model and provider. Check official pricing for exact rates.
        </p>
        <p>
          <strong>Use this for:</strong> Multi-region deployment planning, cost optimization, compliance planning, and
          understanding the cost of serving global customers from different geographic locations.
        </p>
      </div>
    </section>
  )
}
