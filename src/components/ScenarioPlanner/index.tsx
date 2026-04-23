// src/components/ScenarioPlanner/index.tsx
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface ScenarioDef {
  label: 'Best' | 'Base' | 'Worst'
  trafficMultiplier: number
  cacheHitRate: (base: number) => number
  batchEnabled: (base: boolean) => boolean
}

const SCENARIOS: ScenarioDef[] = [
  { label: 'Best',  trafficMultiplier: 0.7, cacheHitRate: () => 0.8, batchEnabled: () => true },
  { label: 'Base',  trafficMultiplier: 1.0, cacheHitRate: b => b,     batchEnabled: b => b },
  { label: 'Worst', trafficMultiplier: 2.0, cacheHitRate: () => 0.2, batchEnabled: () => false },
]

interface Props {
  state: SimState
}

export function ScenarioPlanner({ state }: Props) {
  const results = SCENARIOS.map(s => {
    const cacheHitRate = s.cacheHitRate(state.cacheHitRate)
    const batchEnabled = s.batchEnabled(state.batchEnabled)
    return {
      ...s,
      cacheHitRate,
      batchEnabled,
      result: calculateCost({
        model: state.currentModel,
        monthlyInputTokens: state.periodInputTokens * s.trafficMultiplier,
        monthlyOutputTokens: state.periodOutputTokens * s.trafficMultiplier,
        cacheHitRate,
        batchEnabled,
      }),
    }
  })

  const colColors: Record<string, string> = {
    Best:  'text-green-700 bg-green-50',
    Base:  'text-gray-700 bg-gray-50',
    Worst: 'text-red-700 bg-red-50',
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Scenario Planner</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-gray-500 font-medium py-2 pr-4">Parameter</th>
              {SCENARIOS.map(s => (
                <th key={s.label} className={`text-center py-2 px-4 rounded-t-lg ${colColors[s.label]}`}>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 pr-4 text-gray-600">Traffic</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`}>
                  {r.trafficMultiplier < 1
                    ? `−${Math.round((1 - r.trafficMultiplier) * 100)}%`
                    : r.trafficMultiplier === 1 ? 'Current'
                    : `+${Math.round((r.trafficMultiplier - 1) * 100)}%`}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Cache Hit Rate</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`}>
                  {fmtPercent(r.cacheHitRate)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Batch Mode</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`}>
                  {r.batchEnabled ? 'On' : 'Off'}
                </td>
              ))}
            </tr>
            <tr className="border-t-2 border-gray-300">
              <td className="py-3 pr-4 font-semibold text-gray-800">Monthly Cost</td>
              {results.map(r => (
                <td
                  key={r.label}
                  data-testid="monthly-cost"
                  className={`text-center py-3 px-4 font-bold text-lg ${colColors[r.label]}`}
                >
                  {fmtCurrency(r.result.monthlyCost)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Annualized</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`}>
                  {fmtCurrency(r.result.annualCost)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
