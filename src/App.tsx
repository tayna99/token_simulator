import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MODELS, getModelById, type Model } from './data/models'
import { USE_CASE_PRESETS, type UseCasePresetId } from './data/workloadPresets'
import { getQualityProfile } from './data/qualityProfiles'
import { UsageSetup } from './components/UsageSetup'
import { CurrentCostPanel } from './components/CurrentCostPanel'
import { AlternativeComparison } from './components/AlternativeComparison'
import { SavingsLeverTable } from './components/SavingsLeverTable'
import { CostBreakdown } from './components/CostBreakdown'
import { BudgetGuardrails } from './components/BudgetGuardrails'
import { ExportAnalysis } from './components/ExportAnalysis'
import { TokenEfficiency } from './components/TokenEfficiency'
import { RequirementsFilter } from './components/RequirementsFilter'
import { CostPerBusinessMetric } from './components/CostPerBusinessMetric'
import { CostOptimizationRoadmap } from './components/CostOptimizationRoadmap'
import { CostAttributionByFeature } from './components/CostAttributionByFeature'
import { ModelComparisonMatrix } from './components/ModelComparisonMatrix'
import { RequestPatternAnalyzer } from './components/RequestPatternAnalyzer'
import { SummaryCard } from './components/SummaryCard'
import { FeatureUnitEconomicsPanel } from './components/FeatureUnitEconomicsPanel'
import { RoleSelector } from './components/RoleSelector'
import { PeriodSelector } from './components/PeriodSelector'
import { ConfigPanel } from './components/ConfigPanel'
import { loadConfigFromUrl } from './lib/configManager'
import { toLegacySimState, type PlannerState } from './lib/plannerState'
import type { UsageImportSummary } from './lib/usageImport'

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
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<UseCasePresetId>('rag-chatbot')
  const [importedUsage, setImportedUsage] = useState<UsageImportSummary | null>(null)
  const [state, setState] = useState<PlannerState>(() => {
    const defaultPreset = USE_CASE_PRESETS[0]
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
        requestsPerDay: Math.round(defaultPreset.monthlyRequests / 30),
        activeUsers: 1000,
        requestsPerUserPerDay: defaultPreset.monthlyRequests / 1000 / 30,
        avgInputTokensPerRequest: defaultPreset.avgInputTokensPerRequest,
        avgOutputTokensPerRequest: defaultPreset.avgOutputTokensPerRequest,
      },
      directTokens: {
        monthlyInputTokens: defaultPreset.monthlyRequests * defaultPreset.avgInputTokensPerRequest,
        monthlyOutputTokens: defaultPreset.monthlyRequests * defaultPreset.avgOutputTokensPerRequest,
        monthlyRequests: defaultPreset.monthlyRequests,
      },
      cacheHitRate: defaultPreset.defaultCacheHitRate,
      batchEnabled: defaultPreset.defaultBatchEnabled,
      monthlyBudgetUsd: null,
    }
  })

  const legacyState = toLegacySimState(state)
  const isSameModel = state.currentModel.id === state.candidateModel.id
  const configSummary = t('config.summary', {
    current: state.currentModel.name,
    candidate: state.candidateModel.name,
    cacheRate: `${Math.round(state.cacheHitRate * 100)}%`,
    batchSuffix: state.batchEnabled ? t('config.batchSuffix') : '',
  })
  const selectedUseCase = USE_CASE_PRESETS.find(preset => preset.id === selectedUseCaseId) ?? USE_CASE_PRESETS[0]
  const qualityProfile = getQualityProfile(selectedUseCase.id)

  const handleCostQualityPreset = (id: UseCasePresetId) => {
    const preset = USE_CASE_PRESETS.find(item => item.id === id) ?? USE_CASE_PRESETS[0]
    setSelectedUseCaseId(preset.id)
    setState(s => ({
      ...s,
      inputMode: 'workload',
      workload: {
        volumeBasis: 'requestsPerDay',
        activeDaysPerMonth: 30,
        retryRate: 0,
        requestsPerDay: Math.round(preset.monthlyRequests / 30),
        activeUsers: s.workload.activeUsers || 1000,
        requestsPerUserPerDay: preset.monthlyRequests / (s.workload.activeUsers || 1000) / 30,
        avgInputTokensPerRequest: preset.avgInputTokensPerRequest,
        avgOutputTokensPerRequest: preset.avgOutputTokensPerRequest,
      },
      directTokens: {
        monthlyInputTokens: preset.monthlyRequests * preset.avgInputTokensPerRequest,
        monthlyOutputTokens: preset.monthlyRequests * preset.avgOutputTokensPerRequest,
        monthlyRequests: preset.monthlyRequests,
      },
      cacheHitRate: preset.defaultCacheHitRate,
      batchEnabled: preset.defaultBatchEnabled,
    }))
  }

  const handleUsageImport = (summary: UsageImportSummary) => {
    setImportedUsage(summary)
    setState(s => ({
      ...s,
      inputMode: 'directTokens',
      directTokens: {
        monthlyInputTokens: summary.totalInputTokens,
        monthlyOutputTokens: summary.totalOutputTokens,
        monthlyRequests: summary.requestCount,
      },
      workload: {
        ...s.workload,
        requestsPerDay: Math.round(summary.requestCount / Math.max(1, s.workload.activeDaysPerMonth || 30)),
        avgInputTokensPerRequest: summary.avgInputTokensPerRequest,
        avgOutputTokensPerRequest: summary.avgOutputTokensPerRequest,
      },
    }))
  }

  return (
    <div
      data-testid="app-shell"
      className="min-h-screen bg-surface-alternative font-sans text-label-normal"
      translate="no"
    >
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
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8 flex flex-col gap-4 md:gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <div>
            <p className="text-xs text-gray-500">{t('workspace.eyebrow')}</p>
            <p className="text-sm text-gray-700">
              {!isSameModel ? configSummary : t('errors.sameModel')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('config.period')}</p>
            <PeriodSelector value={state.period ?? 'month'} onChange={p => setState(s => ({ ...s, period: p }))} />
          </div>
        </div>

        <UsageSetup
          selectedPresetId={selectedUseCase.id}
          state={state}
          featureMix={selectedUseCase.featureMix}
          importedSummary={importedUsage}
          onPresetChange={handleCostQualityPreset}
          onUsageImport={handleUsageImport}
          onWorkloadChange={workload => setState(s => ({ ...s, inputMode: 'workload', workload }))}
          onCacheChange={cacheHitRate => setState(s => ({ ...s, cacheHitRate }))}
          onBatchChange={batchEnabled => setState(s => ({ ...s, batchEnabled }))}
        />

        <FeatureUnitEconomicsPanel summary={importedUsage} />

        <CurrentCostPanel
          state={legacyState}
          onCurrentModelChange={currentModel => setState(s => ({ ...s, currentModel }))}
        />

        <AlternativeComparison
          state={legacyState}
          currentAssumptions={qualityProfile.current}
          candidateAssumptions={qualityProfile.candidate}
          onCandidateModelChange={candidateModel => setState(s => ({ ...s, candidateModel }))}
        />

        <SavingsLeverTable
          state={legacyState}
          cacheableShare={selectedUseCase.cacheableShare}
          batchableShare={selectedUseCase.batchableShare}
          outputReductionRate={0.25}
          routingEligibleShare={0.5}
        />

        <details className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <summary className="cursor-pointer text-sm md:text-base font-semibold text-gray-800">
            {t('workspace.diagnostics')}
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
