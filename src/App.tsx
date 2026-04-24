import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MODELS, getModelById, type Model } from './data/models'
import { type WorkloadPreset } from './data/presets'
import { ModelSelector } from './components/ModelSelector'
import { TokenInputs } from './components/TokenInputs'
import { MigrationPanel } from './components/MigrationPanel'
import { ScenarioPlanner } from './components/ScenarioPlanner'
import { CostBreakdown } from './components/CostBreakdown'
import { BudgetCap } from './components/BudgetCap'
import { OptimizationTips } from './components/OptimizationTips'
import { ModelFeatures } from './components/ModelFeatures'
import { SummaryCard } from './components/SummaryCard'
import { RoleSelector } from './components/RoleSelector'
import { PeriodSelector } from './components/PeriodSelector'
import { ConfigPanel } from './components/ConfigPanel'
import { loadConfigFromUrl } from './lib/configManager'
import { ROLE_PACK } from './lib/roleLanguage'

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
  const { t, i18n } = useTranslation()
  const [state, setState] = useState<SimState>(() => {
    const urlConfig = loadConfigFromUrl()
    if (urlConfig) {
      const current = getModelById(urlConfig.state.currentModelId)
      const candidate = getModelById(urlConfig.state.candidateModelId)
      if (current && candidate) {
        return {
          role: urlConfig.state.role,
          currentModel: current,
          candidateModel: candidate,
          period: urlConfig.state.period,
          periodInputTokens: urlConfig.state.periodInputTokens,
          periodOutputTokens: urlConfig.state.periodOutputTokens,
          cacheHitRate: urlConfig.state.cacheHitRate,
          batchEnabled: urlConfig.state.batchEnabled,
          monthlyRequests: urlConfig.state.monthlyRequests,
          activeUsers: urlConfig.state.activeUsers,
          monthlyBudgetUsd: urlConfig.state.monthlyBudgetUsd,
        }
      }
    }

    return {
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
    }
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

  const isSameModel = state.currentModel.id === state.candidateModel.id
  const configSummary = `Analyzing ${state.currentModel.name} → ${state.candidateModel.name} with ${Math.round(state.cacheHitRate * 100)}% cache hit rate${state.batchEnabled ? ' + batch mode' : ''}`

  return (
    <div className="min-h-screen bg-gray-50" translate="no">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-0 mb-4">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">{t('header.title')}</h1>
            <p className="text-xs md:text-sm text-gray-500">{t('header.subtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-start sm:items-end">
            <ConfigPanel state={state} onLoad={p => setState(s => ({ ...s, ...p }))} />
            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={() => i18n.changeLanguage('en')}
                aria-pressed={i18n.language === 'en'}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  i18n.language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => i18n.changeLanguage('ko')}
                aria-pressed={i18n.language === 'ko'}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 ${
                  i18n.language === 'ko'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                KO
              </button>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">{t('header.role')}</p>
              <RoleSelector value={state.role} onChange={r => setState(s => ({ ...s, role: r }))} />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-8 flex flex-col gap-4 md:gap-8">
        <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 flex flex-col gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-semibold text-gray-800">{t('config.title')}</h2>
              <span className="text-xs text-gray-500" title="Set up your workload: models, token volumes, optimization options, and time period for analysis">(?)</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('config.period')}</p>
              <PeriodSelector value={state.period} onChange={p => setState(s => ({ ...s, period: p }))} />
            </div>
          </div>
          <div className="text-xs bg-gray-50 border border-gray-200 rounded p-3 text-gray-600">
            {!isSameModel ? configSummary : `⚠️ ${t('errors.sameModel')}`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <ModelSelector
              label={t('config.currentModel')}
              value={state.currentModel.id}
              onChange={m => setState(s => ({ ...s, currentModel: m }))}
              disabledModelId={state.candidateModel.id}
            />
            <ModelSelector
              label={t('config.candidateModel')}
              value={state.candidateModel.id}
              onChange={m => setState(s => ({ ...s, candidateModel: m }))}
              disabledModelId={state.currentModel.id}
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

        <ModelFeatures state={state} />

        {/* Role-aware panel ordering */}
        {ROLE_PACK[state.role].emphasisOrder.map(panelName => {
          switch (panelName) {
            case 'migration':
              return <MigrationPanel key="migration" state={state} />
            case 'breakdown':
              return <CostBreakdown key="breakdown" state={state} />
            case 'budget':
              return <BudgetCap key="budget" state={state} onBudgetChange={v => setState(s => ({ ...s, monthlyBudgetUsd: v }))} />
            case 'scenario':
              return <ScenarioPlanner key="scenario" state={state} />
            default:
              return null
          }
        })}

        <OptimizationTips state={state} />

        <SummaryCard state={state} />
      </main>
    </div>
  )
}

export default App
