import { useState, useEffect } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Scenario {
  id: string
  name: string
  description: string
  state: Omit<SimState, 'role'>
  monthlyCost: number
  createdAt: string
}

interface Props {
  state: SimState
}

export function ScenarioManager({ state }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [scenarioName, setScenarioName] = useState('')
  const [scenarioDescription, setScenarioDescription] = useState('')
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([])

  // Load scenarios from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('costsim-scenarios')
    if (saved) {
      try {
        setScenarios(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load scenarios', e)
      }
    }
  }, [])

  // Save scenarios to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('costsim-scenarios', JSON.stringify(scenarios))
  }, [scenarios])

  const currentMonthlyCost = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  }).monthlyCost

  const saveScenario = () => {
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name')
      return
    }

    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: scenarioName,
      description: scenarioDescription,
      state: {
        currentModel: state.currentModel,
        candidateModel: state.candidateModel,
        period: state.period,
        periodInputTokens: state.periodInputTokens,
        periodOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
        monthlyRequests: state.monthlyRequests,
        activeUsers: state.activeUsers,
        monthlyBudgetUsd: state.monthlyBudgetUsd,
      },
      monthlyCost: currentMonthlyCost,
      createdAt: new Date().toLocaleString(),
    }

    setScenarios([...scenarios, newScenario])
    setScenarioName('')
    setScenarioDescription('')
  }

  const deleteScenario = (id: string) => {
    setScenarios(scenarios.filter(s => s.id !== id))
    setSelectedForComparison(selectedForComparison.filter(sid => sid !== id))
  }

  const duplicateScenario = (scenario: Scenario) => {
    const newScenario = {
      ...scenario,
      id: Date.now().toString(),
      name: `${scenario.name} (Copy)`,
      createdAt: new Date().toLocaleString(),
    }
    setScenarios([...scenarios, newScenario])
  }

  const toggleComparison = (id: string) => {
    setSelectedForComparison(prev =>
      prev.includes(id)
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    )
  }

  const comparisonScenarios = scenarios.filter(s => selectedForComparison.includes(s.id))
  const allComparableScenarios = [
    {
      id: 'current',
      name: 'Current Configuration',
      description: 'Your current setup',
      monthlyCost: currentMonthlyCost,
      state,
    },
    ...comparisonScenarios,
  ]

  const minCost = Math.min(...allComparableScenarios.map(s => s.monthlyCost))
  const maxCost = Math.max(...allComparableScenarios.map(s => s.monthlyCost))
  const costRange = maxCost - minCost

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Scenario Manager & Comparison
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-800">Save Current Configuration</div>
          <input
            type="text"
            placeholder="Scenario name (e.g., 'Optimized Setup')"
            value={scenarioName}
            onChange={e => setScenarioName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={scenarioDescription}
            onChange={e => setScenarioDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-20"
          />
          <button
            onClick={saveScenario}
            className="w-full bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Save Scenario
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-900 mb-2">Current Configuration</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-blue-700">Model:</span>
              <span className="font-medium">{state.currentModel.name} → {state.candidateModel.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Input Tokens:</span>
              <span className="font-medium">{(state.periodInputTokens / 1_000_000).toFixed(1)}M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Output Tokens:</span>
              <span className="font-medium">{(state.periodOutputTokens / 1_000_000).toFixed(1)}M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Cache Rate:</span>
              <span className="font-medium">{Math.round(state.cacheHitRate * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Batch:</span>
              <span className="font-medium">{state.batchEnabled ? 'Yes' : 'No'}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between font-semibold">
              <span className="text-blue-900">Monthly Cost:</span>
              <span className="text-blue-900">{fmtCurrency(currentMonthlyCost)}</span>
            </div>
          </div>
        </div>
      </div>

      {scenarios.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-800 mb-3">
            Saved Scenarios ({scenarios.length})
          </div>
          <div className="space-y-2">
            {scenarios.map(scenario => (
              <div
                key={scenario.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedForComparison.includes(scenario.id)}
                    onChange={() => toggleComparison(scenario.id)}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{scenario.name}</div>
                    {scenario.description && (
                      <div className="text-xs text-gray-600">{scenario.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">{scenario.createdAt}</div>
                  </div>
                </div>
                <div className="text-right mr-3">
                  <div className="font-semibold text-gray-900">{fmtCurrency(scenario.monthlyCost)}</div>
                  <div className="text-xs text-gray-600">/month</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => duplicateScenario(scenario)}
                    className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                    title="Duplicate scenario"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => deleteScenario(scenario.id)}
                    className="px-2 py-1 text-xs rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                    title="Delete scenario"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {comparisonScenarios.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-800 mb-3">
            Scenario Comparison ({selectedForComparison.length + 1} scenarios)
          </div>

          <div className="space-y-3">
            {allComparableScenarios.map((scenario) => {
              const isCurrent = scenario.id === 'current'
              const costDiff = scenario.monthlyCost - minCost
              const savings = currentMonthlyCost - scenario.monthlyCost

              return (
                <div
                  key={scenario.id}
                  className={`rounded-lg p-4 ${
                    isCurrent ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">{scenario.name}</div>
                      {scenario.description && (
                        <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
                      )}
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => deleteScenario(scenario.id)}
                        className="text-xs text-gray-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs mb-3">
                    <div className="bg-white rounded p-2">
                      <div className="text-gray-600 font-medium">Monthly Cost</div>
                      <div className="font-bold text-gray-900 text-lg">{fmtCurrency(scenario.monthlyCost)}</div>
                    </div>
                    {!isCurrent && (
                      <>
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-600 font-medium">Difference</div>
                          <div className={`font-bold ${savings > 0 ? 'text-green-700' : 'text-red-700'} text-lg`}>
                            {savings > 0 ? '−' : '+'}{fmtCurrency(Math.abs(savings))}
                          </div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-600 font-medium">% Change</div>
                          <div className={`font-bold ${savings > 0 ? 'text-green-700' : 'text-red-700'} text-lg`}>
                            {savings > 0 ? '−' : '+'}{((Math.abs(savings) / currentMonthlyCost) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-600 font-medium">Annual Impact</div>
                          <div className={`font-bold ${savings > 0 ? 'text-green-700' : 'text-red-700'} text-lg`}>
                            {savings > 0 ? '−' : '+'}{fmtCurrency(Math.abs(savings * 12))}
                          </div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-600 font-medium">Rank</div>
                          <div className="font-bold text-gray-900 text-lg">
                            #{allComparableScenarios.findIndex(s => s.id === scenario.id) + 1}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Cost bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${isCurrent ? 'bg-blue-600' : 'bg-green-600'}`}
                        style={{ width: `${costRange > 0 ? (costDiff / costRange) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 min-w-fit">
                      {costRange > 0 ? Math.round((costDiff / costRange) * 100) : 0}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Save different configurations (current setup, optimized, model switch, etc.)
          and compare them side-by-side to see which approach saves the most money.
        </p>
        <p>
          <strong>Scenarios are stored locally:</strong> Your saved scenarios persist in your browser. They won't
          be synced across devices.
        </p>
      </div>
    </section>
  )
}
