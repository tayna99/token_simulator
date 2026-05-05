// src/components/SummaryCard/index.tsx
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { toPng } from 'html-to-image'
import { calculateCost, calculateMigrationDelta } from '../../../../lib/calculator'
import { fmtCurrency, fmtTokens, fmtPercent } from '../../../../lib/format'
import { useToast } from '../../../../hooks/useToast'
import { Toast } from '../../../../shared/ui/Toast'
import { Button, Surface } from '../../../../shared/ui/primitives'
import type { SimState } from '../../../../App'

type ReportAudience = 'developer' | 'pm' | 'ceo'

interface Props {
  state: SimState
}

function buildSummaryText(state: SimState, t: TFunction, audience: ReportAudience = 'pm'): string {
  const current = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const migration = calculateMigrationDelta({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const isSameModel = state.currentModel.id === state.candidateModel.id
  const isSaving = migration.monthlyDelta < 0
  const direction = isSaving ? t('report.save') : t('report.costMore')
  const absDelta = fmtCurrency(Math.abs(migration.monthlyDelta))
  const absAnnual = fmtCurrency(Math.abs(migration.annualDelta))
  const percent = fmtPercent(Math.abs(migration.savingPercent) / 100, 1)
  const sameModelText = t('report.sameModel', { zero: fmtCurrency(0) })
  const switchText = t('report.switch', {
    candidate: state.candidateModel.name,
    direction,
    monthlyDelta: absDelta,
    percent,
    annualDelta: absAnnual,
  })

  if (audience === 'developer') {
    const cacheText = state.cacheHitRate > 0 ? t('report.cacheText', { percent: fmtPercent(state.cacheHitRate) }) : ''
    const batchText = state.batchEnabled ? t('report.batchText') : ''
    const deltaText = isSameModel
      ? t('report.developerDeltaSame', { zero: fmtCurrency(0) })
      : t('report.developerDeltaSwitch', {
        direction,
        monthlyDelta: absDelta,
        percent,
        annualDelta: absAnnual,
      })

    return t('report.developer', {
      current: state.currentModel.name,
      candidate: state.candidateModel.name,
      inputTokens: fmtTokens(state.periodInputTokens),
      outputTokens: fmtTokens(state.periodOutputTokens),
      cacheText,
      batchText,
      inputCost: fmtCurrency(current.inputCost),
      outputCost: fmtCurrency(current.outputCost),
      currentMonthly: fmtCurrency(current.monthlyCost),
      currentAnnual: fmtCurrency(current.annualCost),
      candidateMonthly: fmtCurrency(migration.candidateCost.monthlyCost),
      candidateAnnual: fmtCurrency(migration.candidateCost.annualCost),
      deltaText,
    })
  }

  const cacheText = state.cacheHitRate > 0
    ? t('report.cacheText', { percent: fmtPercent(state.cacheHitRate) })
    : ''
  const batchText = state.batchEnabled ? t('report.batchText') : ''

  const baseline = t('report.baseline', {
    current: state.currentModel.name,
    inputTokens: fmtTokens(state.periodInputTokens),
    outputTokens: fmtTokens(state.periodOutputTokens),
    cacheText,
    batchText,
    monthlyCost: fmtCurrency(current.monthlyCost),
    annualCost: fmtCurrency(current.annualCost),
  })

  if (audience === 'ceo') {
    return t('report.ceo', { baseline, decision: isSameModel ? sameModelText : switchText })
  }

  return t('report.pm', { baseline, decision: isSameModel ? sameModelText : switchText })
}

function provenanceText(model: SimState['currentModel']): string {
  return `${model.name} on ${model.lastVerifiedAt}`
}

export function SummaryCard({ state }: Props) {
  const { t, i18n } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const [audience, setAudience] = useState<ReportAudience>(state.role)
  const { toast, show: showToast, hide: hideToast } = useToast()
  const language = i18n.language === 'ko' ? 'ko' : 'en'
  const summaryText = buildSummaryText(state, t, audience)
  const audienceOptions = (['developer', 'pm', 'ceo'] as const)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      showToast(t('summary.copied'))
    } catch {
      window.prompt('Copy the text below:', summaryText)
    }
  }

  const handleExportPng = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true })
      const link = document.createElement('a')
      link.download = 'llm-cost-summary.png'
      link.href = dataUrl
      link.click()
      showToast(t('summary.exported'))
    } catch (err) {
      console.error('Export failed:', err)
      showToast(t('summary.exportFailed'))
    }
  }

  const reportControls = (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div
        className="grid w-full grid-cols-3 overflow-hidden rounded-wds border border-line-solid bg-surface-normal sm:w-auto"
        role="group"
        aria-label={t('summary.audienceSelector')}
      >
        {audienceOptions.map((item, index) => (
          <button
            key={item}
            type="button"
            onClick={() => setAudience(item)}
            aria-pressed={audience === item}
            title={t(`summary.audienceHelp.${item}`)}
            className={`h-9 min-w-0 px-3 text-xs font-semibold transition-colors ${
              index > 0 ? 'border-l border-line-solid' : ''
            } ${
              audience === item
                ? 'bg-primary-normal text-white'
                : 'bg-surface-normal text-label-neutral hover:bg-fill-alternative'
            }`}
          >
            {t(`summary.audience.${item}`)}
          </button>
        ))}
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
        <Button size="sm" onClick={handleCopy} className="w-full sm:w-auto">
          {t('summary.copy')}
        </Button>
        <Button size="sm" variant="primary" onClick={handleExportPng} className="w-full sm:w-auto">
          {t('summary.exportPng')}
        </Button>
      </div>
    </div>
  )

  return (
    <Surface
      eyebrow={t('report.eyebrow')}
      title={t('summary.title')}
      description={t('report.description')}
      action={reportControls}
    >
      <div className="mb-3 rounded-wds border border-primary-normal/20 bg-primary-normal/10 px-3 py-2">
        <p className="text-xs leading-relaxed text-label-neutral">{t('summary.reportHelp')}</p>
      </div>

      <div
        ref={cardRef}
        lang={language}
        data-testid="summary-card-body"
        className="bg-fill-alternative border border-line-neutral rounded-wds-lg p-4 md:p-5"
      >
        <p className="whitespace-pre-wrap text-sm leading-7 text-label-normal">{summaryText}</p>
        <p className="mt-4 text-xs leading-relaxed text-label-alternative">
          {t('report.staticPricing')}
          {state.currentModel.priceSourceUrl && (
            <>
              {' '}· <a
                href={state.currentModel.priceSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-normal hover:underline"
              >
                {provenanceText(state.currentModel)}
              </a>
            </>
          )}
          {state.candidateModel.priceSourceUrl && (
            <>
              {' '}· <a
                href={state.candidateModel.priceSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-normal hover:underline"
              >
                {provenanceText(state.candidateModel)}
              </a>
            </>
          )}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-label-alternative">
          {t('report.qualityAssumption')}
        </p>
      </div>
      <Toast toast={toast} onClose={hideToast} />
    </Surface>
  )
}
