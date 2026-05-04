import { useTranslation } from 'react-i18next'
import { calculateMigrationDelta } from '../../lib/calculator'
import { calculateDecisionMetrics, type QualityAssumptions } from '../../lib/decisionMetrics'
import { fmtCurrency, fmtNumber, fmtPercent, fmtTokens } from '../../lib/format'
import { ModelSelector } from '../ModelSelector'
import { Badge, MetricTile, Surface } from '../ui/primitives'
import type { Model } from '../../data/models'
import type { SimState } from '../../App'

interface Props {
  state: SimState
  currentAssumptions: QualityAssumptions
  candidateAssumptions: QualityAssumptions
  onCandidateModelChange: (model: Model) => void
}

function Score({ label, value, help }: { label: string; value: number; help: string }) {
  return (
    <MetricTile label={label} value={fmtNumber(value)} help={help} />
  )
}

export function AlternativeComparison({
  state,
  currentAssumptions,
  candidateAssumptions,
  onCandidateModelChange,
}: Props) {
  const { t } = useTranslation()
  const migration = calculateMigrationDelta({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    monthlyRequests: state.monthlyRequests,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })
  const candidateMetrics = calculateDecisionMetrics({
    model: state.candidateModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    monthlyRequests: state.monthlyRequests,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
    assumptions: candidateAssumptions,
  })
  const currentMetrics = calculateDecisionMetrics({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    monthlyRequests: state.monthlyRequests,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
    assumptions: currentAssumptions,
  })
  const savingsPercent = migration.currentCost.monthlyCost > 0 && migration.monthlyDelta < 0
    ? Math.abs(migration.monthlyDelta) / migration.currentCost.monthlyCost
    : 0
  const contextDelta = state.candidateModel.contextWindow - state.currentModel.contextWindow

  return (
    <Surface
      eyebrow={t('alternative.eyebrow')}
      title={t('alternative.title')}
      description={t('alternative.description')}
      action={<Badge tone={savingsPercent > 0 ? 'positive' : 'caution'}>{t('alternative.costSignal')}</Badge>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] gap-4 mb-4">
        <ModelSelector
          label={t('alternative.candidateModel')}
          value={state.candidateModel.id}
          onChange={onCandidateModelChange}
          disabledModelId={state.currentModel.id}
        />
        <div className="rounded-wds-lg border border-status-positive/20 bg-status-positive/10 p-4">
          <p className="text-xs font-semibold text-status-positive">{t('alternative.costSignal')}</p>
          <p className="mt-1 text-2xl font-bold text-label-normal" translate="no">
            {t('alternative.savings', { percent: fmtPercent(savingsPercent, 1) })}
          </p>
          <p className="text-sm text-label-neutral" translate="no">
            {t('alternative.monthlyFromTo', {
              current: fmtCurrency(migration.currentCost.monthlyCost),
              candidate: fmtCurrency(migration.candidateCost.monthlyCost),
            })}
          </p>
          <p className="mt-1 text-xs text-label-alternative">
            {t('alternative.annualDelta', { delta: fmtCurrency(Math.abs(migration.annualDelta)) })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Score label={t('alternative.qualityScore')} value={candidateMetrics.qualityScore} help={t('alternative.editableAssumption', { label: candidateMetrics.qualityLabel })} />
        <Score label={t('alternative.latencyScore')} value={candidateMetrics.latencyScore} help={t('alternative.notBenchmark', { label: candidateMetrics.latencyLabel })} />
        <Score label={t('alternative.riskScore')} value={candidateMetrics.riskScore} help={t('alternative.operationalRisk', { label: candidateMetrics.riskLabel })} />
        <Score label={t('alternative.toolReliability')} value={candidateMetrics.toolCallReliabilityScore} help={t('alternative.toolHelp')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <MetricTile
          label={t('alternative.effectiveCost')}
          value={`${fmtCurrency(currentMetrics.effectiveMonthlyCost)} -> ${fmtCurrency(candidateMetrics.effectiveMonthlyCost)}`}
        />
        <MetricTile
          label={t('alternative.burden')}
          value={fmtCurrency(candidateMetrics.retryCost + candidateMetrics.humanReviewCost + candidateMetrics.csEscalationCost)}
        />
        <MetricTile
          label={t('alternative.contextDiff')}
          value={`${contextDelta >= 0 ? '+' : ''}${fmtTokens(contextDelta)}`}
        />
      </div>
    </Surface>
  )
}
