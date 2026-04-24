import { useMemo, useState } from 'react'
import { calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function ROICalculator({ state }: Props) {
  const [migrationEffort, setMigrationEffort] = useState(40) // hours
  const [engineerRate, setEngineerRate] = useState(150) // per hour
  const [testingEffort, setTestingEffort] = useState(20) // hours
  const [otherCosts, setOtherCosts] = useState(0)

  const isSameModel = state.currentModel.id === state.candidateModel.id

  const roi = useMemo(() => {
    if (isSameModel) return null

    const migration = calculateMigrationDelta({
      currentModel: state.currentModel,
      candidateModel: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    })

    const isSaving = migration.monthlyDelta < 0
    const monthlySavings = Math.abs(migration.monthlyDelta)
    const annualSavings = Math.abs(migration.annualDelta)

    const effortCost = migrationEffort * engineerRate + testingEffort * engineerRate + otherCosts
    const breakEvenMonths = isSaving ? Math.ceil(effortCost / monthlySavings) : Infinity
    const paybackDate = new Date()
    paybackDate.setMonth(paybackDate.getMonth() + Math.min(breakEvenMonths, 60))

    const year1Savings = (12 - Math.min(breakEvenMonths, 12)) * monthlySavings
    const year1ROI = year1Savings > 0 ? ((year1Savings - effortCost) / effortCost) * 100 : -100
    const threeyearSavings = (36 - Math.max(breakEvenMonths - 1, 0)) * monthlySavings
    const threeyearROI = ((threeyearSavings - effortCost) / effortCost) * 100

    return {
      isSaving,
      monthlySavings,
      annualSavings,
      effortCost,
      breakEvenMonths,
      paybackDate,
      year1Savings,
      year1ROI,
      threeyearSavings,
      threeyearROI,
    }
  }, [state, migrationEffort, engineerRate, testingEffort, otherCosts])

  if (isSameModel || !roi) {
    return null
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Migration ROI Calculator
      </h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Migration Effort: {migrationEffort}h
          </label>
          <input
            type="range"
            min="8"
            max="200"
            step="8"
            value={migrationEffort}
            onChange={e => setMigrationEffort(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Engineer Rate: ${engineerRate}/hr
          </label>
          <input
            type="range"
            min="50"
            max="300"
            step="10"
            value={engineerRate}
            onChange={e => setEngineerRate(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Testing Effort: {testingEffort}h
          </label>
          <input
            type="range"
            min="0"
            max="80"
            step="4"
            value={testingEffort}
            onChange={e => setTestingEffort(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Other Costs: {fmtCurrency(otherCosts)}
          </label>
          <input
            type="number"
            min="0"
            step="500"
            value={otherCosts}
            onChange={e => setOtherCosts(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs text-red-600 font-medium mb-1">Migration Cost</div>
          <div className="text-2xl font-bold text-red-900">{fmtCurrency(roi.effortCost)}</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium mb-1">Monthly Savings</div>
          <div className="text-2xl font-bold text-green-900">{fmtCurrency(roi.monthlySavings)}</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Break-Even Point</div>
          <div className="text-xl font-bold text-blue-900">
            {roi.breakEvenMonths === Infinity ? '∞' : `${roi.breakEvenMonths} months`}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {roi.breakEvenMonths !== Infinity &&
              roi.paybackDate.toLocaleDateString()}
          </div>
        </div>

        <div className={`rounded-lg p-3 ${roi.year1ROI >= 0 ? 'bg-amber-50 border border-amber-200' : 'bg-orange-50 border border-orange-200'}`}>
          <div className={`text-xs font-medium mb-1 ${roi.year1ROI >= 0 ? 'text-amber-600' : 'text-orange-600'}`}>
            Year 1 ROI
          </div>
          <div className={`text-2xl font-bold ${roi.year1ROI >= 0 ? 'text-amber-900' : 'text-orange-900'}`}>
            {roi.year1ROI >= 0 ? '+' : ''}{roi.year1ROI.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Year 1 Net Benefit</div>
          <div className="text-lg font-bold text-purple-900">
            {fmtCurrency(roi.year1Savings - roi.effortCost)}
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="text-xs text-indigo-600 font-medium mb-1">3-Year ROI</div>
          <div className="text-lg font-bold text-indigo-900">
            {roi.threeyearROI.toFixed(0)}%
          </div>
          <div className="text-xs text-indigo-600 mt-1">
            {fmtCurrency(roi.threeyearSavings - roi.effortCost)} net benefit
          </div>
        </div>
      </div>
    </section>
  )
}
