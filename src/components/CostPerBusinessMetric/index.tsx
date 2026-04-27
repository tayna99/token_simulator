import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Metric {
  name: string
  description: string
  value: number
  costPerMetric: number
}

interface Props {
  state: SimState
}

export function CostPerBusinessMetric({ state }: Props) {
  const [customMetricName, setCustomMetricName] = useState('')
  const [customMetricValue, setCustomMetricValue] = useState('')
  const [customMetrics, setCustomMetrics] = useState<{ name: string; value: number }[]>([])

  const currentMonthlyCost = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  }).monthlyCost

  const candidateMonthlyCost = calculateCost({
    model: state.candidateModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  }).monthlyCost

  const metrics = useMemo((): [Metric[], Metric[]] => {
    const currentMetrics: Metric[] = []
    const candidateMetrics: Metric[] = []

    // Pre-built metrics
    const metricDefinitions = [
      {
        name: 'Cost per Active User',
        description: 'Monthly cost divided by active users',
        value: state.activeUsers > 0 ? currentMonthlyCost / state.activeUsers : 0,
        candidateValue: state.activeUsers > 0 ? candidateMonthlyCost / state.activeUsers : 0,
        enabled: state.activeUsers > 0,
      },
      {
        name: 'Cost per Request',
        description: 'Monthly cost divided by monthly requests',
        value: state.monthlyRequests > 0 ? currentMonthlyCost / state.monthlyRequests : 0,
        candidateValue: state.monthlyRequests > 0 ? candidateMonthlyCost / state.monthlyRequests : 0,
        enabled: state.monthlyRequests > 0,
      },
      {
        name: 'Cost per Million Tokens',
        description: 'Monthly cost per million tokens processed',
        value: (currentMonthlyCost / (state.periodInputTokens + state.periodOutputTokens)) * 1_000_000,
        candidateValue: (candidateMonthlyCost / (state.periodInputTokens + state.periodOutputTokens)) * 1_000_000,
        enabled: true,
      },
      {
        name: 'Cost per Gigabyte Output',
        description: 'Assuming ~4 tokens per GB of text',
        value: (currentMonthlyCost / (state.periodOutputTokens / 4_000_000)) * 1_000_000_000,
        candidateValue: (candidateMonthlyCost / (state.periodOutputTokens / 4_000_000)) * 1_000_000_000,
        enabled: state.periodOutputTokens > 0,
      },
      {
        name: 'Daily Operational Cost',
        description: 'Average cost per day',
        value: currentMonthlyCost / 30,
        candidateValue: candidateMonthlyCost / 30,
        enabled: true,
      },
    ]

    metricDefinitions.filter(m => m.enabled).forEach(m => {
      currentMetrics.push({
        name: m.name,
        description: m.description,
        value: m.value,
        costPerMetric: m.value,
      })
      candidateMetrics.push({
        name: m.name,
        description: m.description,
        value: m.value,
        costPerMetric: m.candidateValue,
      })
    })

    // Custom metrics
    customMetrics.forEach(cm => {
      if (cm.value > 0) {
        currentMetrics.push({
          name: cm.name,
          description: 'Custom metric',
          value: cm.value,
          costPerMetric: currentMonthlyCost / cm.value,
        })
        candidateMetrics.push({
          name: cm.name,
          description: 'Custom metric',
          value: cm.value,
          costPerMetric: candidateMonthlyCost / cm.value,
        })
      }
    })

    return [currentMetrics, candidateMetrics]
  }, [state, currentMonthlyCost, candidateMonthlyCost, customMetrics])

  const [currentMetrics, candidateMetrics] = metrics

  const addCustomMetric = () => {
    if (!customMetricName.trim() || !customMetricValue) {
      alert('Please enter both metric name and value')
      return
    }

    const value = parseFloat(customMetricValue)
    if (value <= 0) {
      alert('Value must be greater than 0')
      return
    }

    setCustomMetrics([...customMetrics, { name: customMetricName, value }])
    setCustomMetricName('')
    setCustomMetricValue('')
  }

  const removeCustomMetric = (index: number) => {
    setCustomMetrics(customMetrics.filter((_, i) => i !== index))
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Per Business Metric
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Add Custom Metric</label>
          <input
            type="text"
            placeholder="e.g., 'Cost per Feature'"
            value={customMetricName}
            onChange={e => setCustomMetricName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="100"
              placeholder="Metric value"
              value={customMetricValue}
              onChange={e => setCustomMetricValue(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs"
            />
            <button
              onClick={addCustomMetric}
              className="px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-700 mb-2">Custom Metrics Added</div>
          {customMetrics.length === 0 ? (
            <div className="text-xs text-blue-600">No custom metrics yet</div>
          ) : (
            <div className="space-y-1">
              {customMetrics.map((metric, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-blue-800">{metric.name} ({metric.value.toLocaleString()})</span>
                  <button
                    onClick={() => removeCustomMetric(idx)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Metric</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Description</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">{state.currentModel.name}</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">{state.candidateModel.name}</th>
              <th className="text-right py-2 px-2 font-semibold text-gray-700">Difference</th>
            </tr>
          </thead>
          <tbody>
            {currentMetrics.map((metric, idx) => {
              const candidateMetric = candidateMetrics[idx]
              const diff = metric.costPerMetric - candidateMetric.costPerMetric
              const diffPct = metric.costPerMetric > 0 ? (diff / metric.costPerMetric) * 100 : 0

              return (
                <tr key={idx} className="border-t border-gray-100 hover:bg-blue-50">
                  <td className="py-2 px-2 font-medium text-gray-900">{metric.name}</td>
                  <td className="py-2 px-2 text-gray-600 text-xs">{metric.description}</td>
                  <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                    {metric.costPerMetric < 1 ? `$${metric.costPerMetric.toFixed(4)}` : fmtCurrency(metric.costPerMetric)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                    {candidateMetric.costPerMetric < 1 ? `$${candidateMetric.costPerMetric.toFixed(4)}` : fmtCurrency(candidateMetric.costPerMetric)}
                  </td>
                  <td className={`py-2 px-2 text-right font-semibold ${
                    diff > 0 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {diff > 0 ? '+' : '−'}{Math.abs(diff) < 1 ? `$${Math.abs(diff).toFixed(4)}` : fmtCurrency(Math.abs(diff))}
                    <div className={`text-xs ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {diff > 0 ? '+' : '−'}{Math.abs(diffPct).toFixed(1)}%
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-blue-900 mb-2">How to Use</div>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>✓ Pre-built metrics track cost per user, request, token</li>
            <li>✓ Add custom metrics for your business (per feature, per transaction, etc.)</li>
            <li>✓ Compare models to see which is more efficient per business metric</li>
            <li>✓ Use to justify LLM investments to stakeholders</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-green-900 mb-2">Example Custom Metrics</div>
          <ul className="text-xs text-green-800 space-y-1">
            <li>• Cost per transaction (if 50K transactions/month)</li>
            <li>• Cost per customer (if 5K customers)</li>
            <li>• Cost per feature (for multi-feature apps)</li>
            <li>• Cost per support ticket (for CS use cases)</li>
          </ul>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>Why this matters:</strong> Understanding cost per business metric helps you understand the ROI of LLM
          features and make data-driven decisions about which use cases to invest in.
        </p>
        <p>
          <strong>Example:</strong> If cost per request is $0.02 and you charge users $0.50 per request, you have a 96%
          gross margin on that feature.
        </p>
      </div>
    </section>
  )
}
