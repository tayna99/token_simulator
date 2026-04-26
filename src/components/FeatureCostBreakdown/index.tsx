import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Feature {
  name: string
  inputAllocation: number
  outputAllocation: number
  revenuePerMonth?: number
}

interface Props {
  state: SimState
}

export function FeatureCostBreakdown({ state }: Props) {
  const [features, setFeatures] = useState<Feature[]>([
    { name: 'Search', inputAllocation: 0.4, outputAllocation: 0.3, revenuePerMonth: 10000 },
    { name: 'Chat', inputAllocation: 0.35, outputAllocation: 0.4, revenuePerMonth: 15000 },
    { name: 'Code Generation', inputAllocation: 0.2, outputAllocation: 0.25, revenuePerMonth: 8000 },
    { name: 'Analysis', inputAllocation: 0.05, outputAllocation: 0.05, revenuePerMonth: 2000 },
  ])

  const breakdown = useMemo(() => {
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

    // Validate allocations
    const totalInputAlloc = features.reduce((sum, f) => sum + f.inputAllocation, 0)
    const totalOutputAlloc = features.reduce((sum, f) => sum + f.outputAllocation, 0)

    const featureBreakdowns = features.map(feature => {
      const inputCostShare = totalInputAlloc > 0 ? feature.inputAllocation / totalInputAlloc : 0
      const outputCostShare = totalOutputAlloc > 0 ? feature.outputAllocation / totalOutputAlloc : 0

      const currentFeatureCost = currentCost * (
        (state.periodInputTokens * inputCostShare * state.currentModel.inputPrice +
         state.periodOutputTokens * outputCostShare * state.currentModel.outputPrice) /
        (state.periodInputTokens * state.currentModel.inputPrice + state.periodOutputTokens * state.currentModel.outputPrice || 1)
      )

      const candidateFeatureCost = candidateCost * (
        (state.periodInputTokens * inputCostShare * state.candidateModel.inputPrice +
         state.periodOutputTokens * outputCostShare * state.candidateModel.outputPrice) /
        (state.periodInputTokens * state.candidateModel.inputPrice + state.periodOutputTokens * state.candidateModel.outputPrice || 1)
      )

      const revenue = feature.revenuePerMonth || 0
      const currentMargin = revenue - currentFeatureCost
      const candidateMargin = revenue - candidateFeatureCost
      const currentMarginPct = revenue > 0 ? (currentMargin / revenue) * 100 : 0
      const candidateMarginPct = revenue > 0 ? (candidateMargin / revenue) * 100 : 0

      return {
        feature,
        currentCost: currentFeatureCost,
        candidateCost: candidateFeatureCost,
        revenue,
        currentMargin,
        candidateMargin,
        currentMarginPct,
        candidateMarginPct,
        costChangeUsd: candidateFeatureCost - currentFeatureCost,
        costChangePct: currentFeatureCost > 0 ? ((candidateFeatureCost - currentFeatureCost) / currentFeatureCost) * 100 : 0,
      }
    })

    return {
      features: featureBreakdowns,
      totalCurrentCost: featureBreakdowns.reduce((sum, f) => sum + f.currentCost, 0),
      totalCandidateCost: featureBreakdowns.reduce((sum, f) => sum + f.candidateCost, 0),
      totalRevenue: featureBreakdowns.reduce((sum, f) => sum + f.revenue, 0),
      allocationsValid: Math.abs(totalInputAlloc - 1.0) < 0.01 && Math.abs(totalOutputAlloc - 1.0) < 0.01,
    }
  }, [state, features])

  const updateFeature = (idx: number, field: keyof Feature, value: number | string) => {
    const updated = [...features]
    if (field === 'name') {
      updated[idx].name = value as string
    } else {
      updated[idx][field] = parseFloat(value as string) || 0
    }
    setFeatures(updated)
  }

  const addFeature = () => {
    setFeatures([...features, { name: 'New Feature', inputAllocation: 0, outputAllocation: 0 }])
  }

  const removeFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Breakdown by Feature
      </h2>

      <div className="mb-6 space-y-3">
        <div className="text-xs font-medium text-gray-700">
          Define your features and their token usage allocation:
        </div>
        {features.map((feature, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end bg-gray-50 p-3 rounded-lg">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Feature</label>
              <input
                type="text"
                value={feature.name}
                onChange={e => updateFeature(idx, 'name', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Input %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={Math.round(feature.inputAllocation * 100)}
                onChange={e => updateFeature(idx, 'inputAllocation', parseInt(e.target.value) / 100)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Output %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={Math.round(feature.outputAllocation * 100)}
                onChange={e => updateFeature(idx, 'outputAllocation', parseInt(e.target.value) / 100)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Monthly Revenue</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={feature.revenuePerMonth ?? 0}
                onChange={e => updateFeature(idx, 'revenuePerMonth', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
              />
            </div>
            <button
              onClick={() => removeFeature(idx)}
              className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-200"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={addFeature}
          className="px-3 py-2 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200 font-medium"
        >
          + Add Feature
        </button>
      </div>

      {!breakdown.allocationsValid && (
        <div className="mb-4 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
          ⚠️ Input and output allocations should sum to 100% for accurate breakdown
        </div>
      )}

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Feature</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly Cost (Current)</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Monthly Cost (Candidate)</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Change</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Revenue</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Margin (Current)</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Margin (Candidate)</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.features.map((fb, idx) => (
              <tr key={idx} className="border-t border-gray-100 hover:bg-blue-50">
                <td className="py-2 px-2 font-medium text-gray-900">{fb.feature.name}</td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtCurrency(fb.currentCost)}</td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtCurrency(fb.candidateCost)}</td>
                <td className={`py-2 px-2 text-right font-semibold ${
                  fb.costChangeUsd < 0 ? 'text-green-700' : fb.costChangeUsd > 0 ? 'text-red-700' : 'text-gray-700'
                }`}>
                  {fb.costChangeUsd < 0 ? '−' : '+'}{fmtCurrency(Math.abs(fb.costChangeUsd))}
                  <div className="text-xs text-gray-600 font-normal">{fb.costChangePct > 0 ? '+' : ''}{fb.costChangePct.toFixed(1)}%</div>
                </td>
                <td className="py-2 px-2 text-right text-gray-700">{fmtCurrency(fb.revenue)}</td>
                <td className={`py-2 px-2 text-right ${fb.currentMarginPct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {fmtCurrency(fb.currentMargin)}
                  <div className="text-xs text-gray-600">{fb.currentMarginPct.toFixed(0)}%</div>
                </td>
                <td className={`py-2 px-2 text-right ${fb.candidateMarginPct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {fmtCurrency(fb.candidateMargin)}
                  <div className="text-xs text-gray-600">{fb.candidateMarginPct.toFixed(0)}%</div>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
              <td className="py-2 px-2 text-gray-900">Total</td>
              <td className="py-2 px-2 text-right text-gray-900">{fmtCurrency(breakdown.totalCurrentCost)}</td>
              <td className="py-2 px-2 text-right text-gray-900">{fmtCurrency(breakdown.totalCandidateCost)}</td>
              <td className={`py-2 px-2 text-right ${
                breakdown.totalCandidateCost < breakdown.totalCurrentCost ? 'text-green-700' : 'text-red-700'
              }`}>
                {breakdown.totalCandidateCost < breakdown.totalCurrentCost ? '−' : '+'}
                {fmtCurrency(Math.abs(breakdown.totalCandidateCost - breakdown.totalCurrentCost))}
              </td>
              <td className="py-2 px-2 text-right text-gray-900">{fmtCurrency(breakdown.totalRevenue)}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Current Model Margin</div>
          <div className="text-2xl font-bold text-blue-900">
            {fmtCurrency(breakdown.totalRevenue - breakdown.totalCurrentCost)}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {breakdown.totalRevenue > 0
              ? `${(((breakdown.totalRevenue - breakdown.totalCurrentCost) / breakdown.totalRevenue) * 100).toFixed(0)}% margin`
              : 'Set feature revenue to calculate'}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Candidate Model Margin</div>
          <div className="text-2xl font-bold text-green-900">
            {fmtCurrency(breakdown.totalRevenue - breakdown.totalCandidateCost)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            {breakdown.totalRevenue > 0
              ? `${(((breakdown.totalRevenue - breakdown.totalCandidateCost) / breakdown.totalRevenue) * 100).toFixed(0)}% margin`
              : 'Set feature revenue to calculate'}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How it works:</strong> Define features that use the LLM and their token allocation. We calculate costs per feature and show margin impact if you migrate models.
        </p>
        <p>
          <strong>Use case:</strong> Understand which features drive profitability and where optimization efforts should focus. Identify features that become unprofitable if costs increase.
        </p>
      </div>
    </section>
  )
}
