// src/components/ScenarioPlanner/index.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface Scenario {
  label: 'Best' | 'Base' | 'Worst'
  trafficMultiplier: number
  cacheHitRate: number
  batchEnabled: boolean
}

const DEFAULT_SCENARIOS: Scenario[] = [
  { label: 'Best', trafficMultiplier: 0.7, cacheHitRate: 0.8, batchEnabled: true },
  { label: 'Base', trafficMultiplier: 1.0, cacheHitRate: 0.5, batchEnabled: false },
  { label: 'Worst', trafficMultiplier: 2.0, cacheHitRate: 0.2, batchEnabled: false },
]

interface Props {
  state: SimState
}

export function ScenarioPlanner({ state }: Props) {
  const { t } = useTranslation()
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS)

  const results = scenarios.map(s => {
    // Use scenario values, but "Base" can inherit from state
    const cacheHitRate = s.label === 'Base' ? state.cacheHitRate : s.cacheHitRate
    const batchEnabled = s.label === 'Base' ? state.batchEnabled : s.batchEnabled
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

  const handleScenarioChange = (label: 'Best' | 'Base' | 'Worst', key: keyof Scenario, value: number | boolean) => {
    setScenarios(prev =>
      prev.map(s => (s.label === label ? { ...s, [key]: value } : s))
    )
  }

  const resetScenarios = () => {
    setScenarios(DEFAULT_SCENARIOS)
  }

  const colColors: Record<string, string> = {
    Best:  'text-green-700 bg-green-50',
    Base:  'text-gray-700 bg-gray-50',
    Worst: 'text-red-700 bg-red-50',
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">{t('scenario.title')}</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-gray-500 font-medium py-2 pr-4">{t('scenario.parameter')}</th>
              {scenarios.map(s => (
                <th
                  key={s.label}
                  className={`text-center py-2 px-4 rounded-t-lg ${colColors[s.label]}`}
                  title={`${s.label}: Traffic ${(s.trafficMultiplier * 100).toFixed(0)}%, Cache ${(s.cacheHitRate * 100).toFixed(0)}%, Batch ${s.batchEnabled ? 'On' : 'Off'}. Click cells to edit.`}
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 pr-4 text-gray-600">{t('scenario.traffic')}</td>
              {scenarios.map(s => (
                <td key={s.label} className={`text-center py-2 px-4 ${colColors[s.label]}`}>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={s.trafficMultiplier}
                    onChange={e => handleScenarioChange(s.label, 'trafficMultiplier', parseFloat(e.target.value))}
                    className="w-16 text-center border border-gray-300 rounded px-1 py-0.5 text-xs"
                    aria-label={`${s.label} traffic multiplier`}
                  />
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">{t('scenario.cache')}</td>
              {scenarios.map(s => (
                <td key={s.label} className={`text-center py-2 px-4 ${colColors[s.label]}`}>
                  {s.label === 'Base' ? (
                    <span title="Base inherits from current config">{fmtPercent(results.find(r => r.label === s.label)?.cacheHitRate ?? 0)}</span>
                  ) : (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={s.cacheHitRate * 100}
                      onChange={e => handleScenarioChange(s.label, 'cacheHitRate', parseFloat(e.target.value) / 100)}
                      className="w-24"
                      aria-label={`${s.label} cache hit rate`}
                    />
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">{t('scenario.batch')}</td>
              {scenarios.map(s => (
                <td key={s.label} className={`text-center py-2 px-4 ${colColors[s.label]}`}>
                  {s.label === 'Base' ? (
                    <span title="Base inherits from current config">{results.find(r => r.label === s.label)?.batchEnabled ? t('scenario.on') : t('scenario.off')}</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={s.batchEnabled}
                      onChange={e => handleScenarioChange(s.label, 'batchEnabled', e.target.checked)}
                      aria-label={`${s.label} batch mode`}
                    />
                  )}
                </td>
              ))}
            </tr>
            <tr className="border-t-2 border-gray-300">
              <td className="py-3 pr-4 font-semibold text-gray-800">{t('scenario.monthlyCost')}</td>
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
              <td className="py-2 pr-4 text-gray-600">{t('scenario.annualized')}</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`}>
                  {fmtCurrency(r.result.annualCost)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={resetScenarios}
          className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          {t('scenario.reset')}
        </button>
      </div>
    </section>
  )
}
