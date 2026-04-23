import { useState } from 'react'
import { MODELS, getModelById, type Model } from './data/models'
import { type WorkloadPreset } from './data/presets'
import { ModelSelector } from './components/ModelSelector'
import { TokenInputs } from './components/TokenInputs'
import { MigrationPanel } from './components/MigrationPanel'
import { ScenarioPlanner } from './components/ScenarioPlanner'
import { CostBreakdown } from './components/CostBreakdown'
import { BudgetCap } from './components/BudgetCap'
import { SummaryCard } from './components/SummaryCard'

export type Role = 'developer' | 'pm' | 'ceo'
export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface SimState {
  role: Role
  currentModel: Model
  candidateModel: Model
  period: Period
  periodInputTokens: number
  periodOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
  monthlyRequests: number
  activeUsers: number
  monthlyBudgetUsd: number | null
}

function App() {
  const [state, setState] = useState<SimState>({
    role: 'pm',
    currentModel: getModelById('claude-sonnet-4.6') ?? MODELS[4],
    candidateModel: getModelById('gemini-3.1-flash') ?? MODELS[7],
    period: 'month',
    periodInputTokens: 50_000_000,
    periodOutputTokens: 5_000_000,
    cacheHitRate: 0.5,
    batchEnabled: false,
    monthlyRequests: 100_000,
    activeUsers: 1000,
    monthlyBudgetUsd: null,
  })

  const handlePreset = (p: WorkloadPreset) => {
    setState(s => ({
      ...s,
      periodInputTokens: p.monthlyInputTokens,
      periodOutputTokens: p.monthlyOutputTokens,
      cacheHitRate: p.defaultCacheHitRate,
      batchEnabled: p.defaultBatchEnabled,
      monthlyRequests: p.monthlyRequestsDefault || s.monthlyRequests,
      activeUsers: p.activeUsersDefault || s.activeUsers,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50" translate="no">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">LLM Cost Planner</h1>
        <p className="text-sm text-gray-500">Migration ROI · Scenario Planning · Stakeholder Export</p>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        <section className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-6">
          <h2 className="text-base font-semibold text-gray-800">Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <ModelSelector
              label="Current Model"
              value={state.currentModel.id}
              onChange={m => setState(s => ({ ...s, currentModel: m }))}
            />
            <ModelSelector
              label="Candidate Model"
              value={state.candidateModel.id}
              onChange={m => setState(s => ({ ...s, candidateModel: m }))}
            />
          </div>
          <TokenInputs
            periodInputTokens={state.periodInputTokens}
            periodOutputTokens={state.periodOutputTokens}
            cacheHitRate={state.cacheHitRate}
            batchEnabled={state.batchEnabled}
            onInputChange={v => setState(s => ({ ...s, periodInputTokens: v }))}
            onOutputChange={v => setState(s => ({ ...s, periodOutputTokens: v }))}
            onCacheChange={v => setState(s => ({ ...s, cacheHitRate: v }))}
            onBatchChange={v => setState(s => ({ ...s, batchEnabled: v }))}
            onPresetSelect={handlePreset}
          />
        </section>

        <MigrationPanel state={state} />
        <CostBreakdown state={state} />
        <BudgetCap state={state} onBudgetChange={v => setState(s => ({ ...s, monthlyBudgetUsd: v }))} />
        <ScenarioPlanner state={state} />
        <SummaryCard state={state} />
      </main>
    </div>
  )
}

export default App
