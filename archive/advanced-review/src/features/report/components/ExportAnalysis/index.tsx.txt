import { useRef } from 'react'
import { calculateCost, calculateMigrationDelta } from '../../../../lib/calculator'
import { MODELS } from '../../../../data/models'
import type { SimState } from '../../../../App'

interface Props {
  state: SimState
}

export function ExportAnalysis({ state }: Props) {
  const linkRef = useRef<HTMLAnchorElement>(null)

  const generateCSV = () => {
    const rows: string[] = []

    // Header
    rows.push('LLM Cost Simulator - Analysis Export')
    rows.push(`Generated: ${new Date().toLocaleString()}`)
    rows.push('')

    // Configuration
    rows.push('CONFIGURATION')
    rows.push(`Current Model,${state.currentModel.name}`)
    rows.push(`Candidate Model,${state.candidateModel.name}`)
    rows.push(`Monthly Input Tokens,"${state.periodInputTokens.toLocaleString()}"`)
    rows.push(`Monthly Output Tokens,"${state.periodOutputTokens.toLocaleString()}"`)
    rows.push(`Cache Hit Rate,${(state.cacheHitRate * 100).toFixed(1)}%`)
    rows.push(`Batch Enabled,${state.batchEnabled ? 'Yes' : 'No'}`)
    rows.push(`Period,${state.period}`)
    rows.push('')

    // Current Model Cost Breakdown
    rows.push('CURRENT MODEL COST BREAKDOWN')
    const current = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    rows.push('Metric,Amount')
    rows.push(`Monthly Cost,"$${current.monthlyCost.toFixed(2)}"`)
    rows.push(`Annual Cost,"$${current.annualCost.toFixed(2)}"`)
    rows.push(`Cost per Request,"$${(current.monthlyCost / Math.max(state.monthlyRequests, 1)).toFixed(4)}"`)
    rows.push('')

    // Candidate Model Cost Breakdown
    rows.push('CANDIDATE MODEL COST BREAKDOWN')
    const candidate = calculateCost({
      model: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    rows.push('Metric,Amount')
    rows.push(`Monthly Cost,"$${candidate.monthlyCost.toFixed(2)}"`)
    rows.push(`Annual Cost,"$${candidate.annualCost.toFixed(2)}"`)
    rows.push(`Cost per Request,"$${(candidate.monthlyCost / Math.max(state.monthlyRequests, 1)).toFixed(4)}"`)
    rows.push('')

    // Migration Analysis
    rows.push('MIGRATION ANALYSIS')
    const migration = calculateMigrationDelta({
      currentModel: state.currentModel,
      candidateModel: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    rows.push('Metric,Amount')
    rows.push(`Monthly Delta,"$${migration.monthlyDelta.toFixed(2)}"`)
    rows.push(`Annual Delta,"$${migration.annualDelta.toFixed(2)}"`)
    rows.push(`Savings Percent,${migration.savingPercent.toFixed(2)}%`)
    const effortCost = 40 * 150 // 40 hours × $150/hr
    if (migration.monthlyDelta < 0) {
      const breakEvenMonths = Math.ceil(effortCost / Math.abs(migration.monthlyDelta))
      rows.push(`Break-Even (40h migration),${breakEvenMonths} months`)
    }
    rows.push('')

    // All Models Comparison
    rows.push('ALL MODELS COST COMPARISON')
    rows.push('Model,Provider,Input Price,Output Price,Monthly Cost,Features')
    MODELS.forEach(model => {
      const cost = calculateCost({
        model,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost
      const features = [
        model.cacheDiscount > 0 ? 'Cache' : '',
        model.batchDiscount > 0 ? 'Batch' : '',
      ]
        .filter(Boolean)
        .join('|')

      rows.push(
        `"${model.name}",${model.provider},$${model.inputPrice.toFixed(4)},$${model.outputPrice.toFixed(4)},"$${cost.toFixed(2)}","${features}"`
      )
    })

    return rows.join('\n')
  }

  const handleExport = () => {
    const csv = generateCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = linkRef.current
    if (link) {
      link.href = url
      link.download = `llm-cost-analysis-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Export Analysis
      </h2>

      <div className="space-y-3">
        <button
          onClick={handleExport}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
        >
          📊 Export to CSV
        </button>

        <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
          <p>
            <strong>Includes:</strong>
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Current configuration and parameters</li>
            <li>Cost breakdown for both models</li>
            <li>Migration analysis and break-even</li>
            <li>Complete model pricing comparison</li>
          </ul>
          <p className="mt-2">
            <strong>Use:</strong> Open in Excel, Google Sheets, or Python for further analysis
          </p>
        </div>
      </div>

      <a ref={linkRef} style={{ display: 'none' }} />
    </section>
  )
}
