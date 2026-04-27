import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MODELS, getModelById, type Model } from './data/models'
import { type WorkloadPreset } from './data/presets'
import { ModelSelector } from './components/ModelSelector'
import { TokenInputs } from './components/TokenInputs'
import { WorkloadBuilder } from './components/WorkloadBuilder'
import { DecisionSummaryStrip } from './components/DecisionSummaryStrip'
import { MigrationPanel } from './components/MigrationPanel'
import { ScenarioPlanner } from './components/ScenarioPlanner'
import { CostBreakdown } from './components/CostBreakdown'
import { BudgetGuardrails } from './components/BudgetGuardrails'
import { BatchAnalyzer } from './components/BatchAnalyzer'
import { CacheAnalyzer } from './components/CacheAnalyzer'
import { ExportAnalysis } from './components/ExportAnalysis'
import { TokenEfficiency } from './components/TokenEfficiency'
import { RequirementsFilter } from './components/RequirementsFilter'
import { CostPerBusinessMetric } from './components/CostPerBusinessMetric'
import { CostOptimizationRoadmap } from './components/CostOptimizationRoadmap'
import { CostAttributionByFeature } from './components/CostAttributionByFeature'
import { ModelComparisonMatrix } from './components/ModelComparisonMatrix'
import { RequestPatternAnalyzer } from './components/RequestPatternAnalyzer'
import { SavingsTracker } from './components/SavingsTracker'
import { SummaryCard } from './components/SummaryCard'
import { RoleSelector } from './components/RoleSelector'
import { PeriodSelector } from './components/PeriodSelector'
import { ConfigPanel } from './components/ConfigPanel'
import { loadConfigFromUrl } from './lib/configManager'
import { toLegacySimState, type PlannerState } from './lib/plannerState'

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
  const [state, setState] = useState<PlannerState>(() => {
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
          inputMode: 'directTokens',
          workload: {
            volumeBasis: 'requestsPerDay',
            activeDaysPerMonth: 30,
            retryRate: 0,
            requestsPerDay: Math.round(urlConfig.state.monthlyRequests / 30),
            activeUsers: urlConfig.state.activeUsers,
            requestsPerUserPerDay: urlConfig.state.activeUsers > 0
              ? urlConfig.state.monthlyRequests / urlConfig.state.activeUsers / 30
              : 0,
            avgInputTokensPerRequest: urlConfig.state.monthlyRequests > 0
              ? urlConfig.state.periodInputTokens / urlConfig.state.monthlyRequests
              : 0,
            avgOutputTokensPerRequest: urlConfig.state.monthlyRequests > 0
              ? urlConfig.state.periodOutputTokens / urlConfig.state.monthlyRequests
              : 0,
          },
          directTokens: {
            monthlyInputTokens: urlConfig.state.periodInputTokens,
            monthlyOutputTokens: urlConfig.state.periodOutputTokens,
            monthlyRequests: urlConfig.state.monthlyRequests,
          },
          cacheHitRate: urlConfig.state.cacheHitRate,
          batchEnabled: urlConfig.state.batchEnabled,
          monthlyBudgetUsd: urlConfig.state.monthlyBudgetUsd,
        }
      }
    }

    return {
      role: 'pm',
      currentModel: getModelById('claude-sonnet-4.6') ?? MODELS[4],
      candidateModel: getModelById('gemini-3.1-flash') ?? MODELS[7],
      period: 'month',
      inputMode: 'workload',
      workload: {
        volumeBasis: 'requestsPerDay',
        activeDaysPerMonth: 30,
        retryRate: 0,
        requestsPerDay: 3333,
        activeUsers: 1000,
        requestsPerUserPerDay: 3.33,
        avgInputTokensPerRequest: 500,
        avgOutputTokensPerRequest: 50,
      },
      directTokens: {
        monthlyInputTokens: 50_000_000,
        monthlyOutputTokens: 5_000_000,
        monthlyRequests: 100_000,
      },
      cacheHitRate: 0.5,
      batchEnabled: false,
      monthlyBudgetUsd: null,
    }
  })

  const handlePreset = (p: WorkloadPreset) => {
    setState(s => ({
      ...s,
      inputMode: 'workload',
      workload: p.workload,
      directTokens: {
        ...s.directTokens,
        monthlyInputTokens: p.monthlyInputTokens,
        monthlyOutputTokens: p.monthlyOutputTokens,
        monthlyRequests: p.monthlyRequestsDefault || s.directTokens.monthlyRequests,
      },
      cacheHitRate: p.defaultCacheHitRate,
      batchEnabled: p.defaultBatchEnabled,
    }))
  }

  const legacyState = toLegacySimState(state)
  const isSameModel = state.currentModel.id === state.candidateModel.id
  const configSummary = t('config.summary', {
    current: state.currentModel.name,
    candidate: state.candidateModel.name,
    cacheRate: `${Math.round(state.cacheHitRate * 100)}%`,
    batchSuffix: state.batchEnabled ? t('config.batchSuffix') : '',
  })

  return (
    <div className="min-h-screen bg-gray-50" translate="no">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-0 mb-4">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">{t('header.title')}</h1>
            <p className="text-xs md:text-sm text-gray-500">{t('header.subtitle')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-start sm:items-end">
            <ConfigPanel
              state={legacyState}
              onLoad={p => setState(s => ({
                ...s,
                role: p.role ?? s.role,
                currentModel: p.currentModel ?? s.currentModel,
                candidateModel: p.candidateModel ?? s.candidateModel,
                period: p.period ?? s.period,
                directTokens: {
                  monthlyInputTokens: p.periodInputTokens ?? s.directTokens.monthlyInputTokens,
                  monthlyOutputTokens: p.periodOutputTokens ?? s.directTokens.monthlyOutputTokens,
                  monthlyRequests: p.monthlyRequests ?? s.directTokens.monthlyRequests,
                },
                cacheHitRate: p.cacheHitRate ?? s.cacheHitRate,
                batchEnabled: p.batchEnabled ?? s.batchEnabled,
                monthlyBudgetUsd: p.monthlyBudgetUsd ?? s.monthlyBudgetUsd,
              }))}
            />
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
              <span className="text-xs text-gray-500" title={t('config.help')}>(?)</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('config.period')}</p>
              <PeriodSelector value={state.period ?? 'month'} onChange={p => setState(s => ({ ...s, period: p }))} />
            </div>
          </div>
          <div className="text-xs bg-gray-50 border border-gray-200 rounded p-3 text-gray-600">
            {!isSameModel ? configSummary : t('errors.sameModel')}
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
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t('inputMode.label')}</p>
            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden mb-4">
              <button
                type="button"
                onClick={() => setState(s => ({ ...s, inputMode: 'workload' }))}
                aria-pressed={state.inputMode === 'workload'}
                className={`px-3 py-1.5 text-xs font-medium ${state.inputMode === 'workload' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
              >
                {t('inputMode.workload')}
              </button>
              <button
                type="button"
                onClick={() => setState(s => ({ ...s, inputMode: 'directTokens' }))}
                aria-pressed={state.inputMode === 'directTokens'}
                className={`border-l border-gray-300 px-3 py-1.5 text-xs font-medium ${state.inputMode === 'directTokens' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
              >
                {t('inputMode.directTokens')}
              </button>
            </div>
            {state.inputMode === 'workload' ? (
              <WorkloadBuilder
                value={state.workload}
                onChange={workload => setState(s => ({ ...s, workload }))}
              />
            ) : (
              <TokenInputs
                periodInputTokens={state.directTokens.monthlyInputTokens}
                periodOutputTokens={state.directTokens.monthlyOutputTokens}
                cacheHitRate={state.cacheHitRate}
                batchEnabled={state.batchEnabled}
                onInputChange={v => setState(s => ({ ...s, inputMode: 'directTokens', directTokens: { ...s.directTokens, monthlyInputTokens: v } }))}
                onOutputChange={v => setState(s => ({ ...s, inputMode: 'directTokens', directTokens: { ...s.directTokens, monthlyOutputTokens: v } }))}
                onCacheChange={v => setState(s => ({ ...s, cacheHitRate: v }))}
                onBatchChange={v => setState(s => ({ ...s, batchEnabled: v }))}
                onPresetSelect={handlePreset}
              />
            )}
          </div>
        </section>

        <DecisionSummaryStrip state={legacyState} />

        <MigrationPanel state={legacyState} />

        <SavingsTracker state={legacyState} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          <CacheAnalyzer state={legacyState} />
          <BatchAnalyzer state={legacyState} />
        </div>

        <ScenarioPlanner state={legacyState} />

        <details className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <summary className="cursor-pointer text-sm md:text-base font-semibold text-gray-800">
            Developer Diagnostics
          </summary>
          <div className="mt-4 flex flex-col gap-4 md:gap-8">
            <RequestPatternAnalyzer state={legacyState} />
            <CostAttributionByFeature state={legacyState} />
            <CostPerBusinessMetric state={legacyState} />
            <ModelComparisonMatrix state={legacyState} />
            <RequirementsFilter
              state={legacyState}
              onSelectCandidate={modelId => {
                const model = getModelById(modelId)
                if (model) {
                  setState(s => ({ ...s, candidateModel: model }))
                }
              }}
            />
            <TokenEfficiency state={legacyState} />
            <CostBreakdown state={legacyState} />
            <CostOptimizationRoadmap state={legacyState} />
          </div>
        </details>

        <details className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <summary className="cursor-pointer text-sm md:text-base font-semibold text-gray-800">
            {t('guardrails.title')}
          </summary>
          <div className="mt-4 flex flex-col gap-4 md:gap-8">
            <BudgetGuardrails state={legacyState} onBudgetChange={v => setState(s => ({ ...s, monthlyBudgetUsd: v }))} />
          </div>
        </details>

        <ExportAnalysis state={legacyState} />
        <SummaryCard state={legacyState} />
      </main>
    </div>
  )
}

export default App
