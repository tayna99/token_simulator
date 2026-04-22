import { useState } from 'react'
import { MODELS, getModelById, type Model } from './data/models'
import { type WorkloadPreset } from './data/presets'
import { ModelSelector } from './components/ModelSelector'
import { TokenInputs } from './components/TokenInputs'
import { ScenarioPlanner } from './components/ScenarioPlanner'

export interface SimState {
  currentModel: Model
  candidateModel: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
}

function App() {
  const [state, setState] = useState<SimState>({
    currentModel: getModelById('claude-sonnet-4.6') ?? MODELS[4],
    candidateModel: getModelById('gemini-3.1-flash') ?? MODELS[7],
    monthlyInputTokens: 50_000_000,
    monthlyOutputTokens: 5_000_000,
    cacheHitRate: 0.5,
    batchEnabled: false,
  })

  const handlePreset = (p: WorkloadPreset) => {
    setState(s => ({
      ...s,
      monthlyInputTokens: p.monthlyInputTokens,
      monthlyOutputTokens: p.monthlyOutputTokens,
      cacheHitRate: p.defaultCacheHitRate,
      batchEnabled: p.defaultBatchEnabled,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            monthlyInputTokens={state.monthlyInputTokens}
            monthlyOutputTokens={state.monthlyOutputTokens}
            cacheHitRate={state.cacheHitRate}
            batchEnabled={state.batchEnabled}
            onInputChange={v => setState(s => ({ ...s, monthlyInputTokens: v }))}
            onOutputChange={v => setState(s => ({ ...s, monthlyOutputTokens: v }))}
            onCacheChange={v => setState(s => ({ ...s, cacheHitRate: v }))}
            onBatchChange={v => setState(s => ({ ...s, batchEnabled: v }))}
            onPresetSelect={handlePreset}
          />
        </section>

        <div id="migration-panel-mount" />
        <ScenarioPlanner state={state} />
        <div id="summary-card-mount" />
      </main>
    </div>
  )
}

export default App
