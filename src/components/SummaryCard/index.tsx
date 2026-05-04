// src/components/SummaryCard/index.tsx
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { toPng } from 'html-to-image'
import { calculateCost, calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency, fmtTokens, fmtPercent } from '../../lib/format'
import { useToast } from '../../hooks/useToast'
import { Toast } from '../ui/Toast'
import { Button, Surface } from '../ui/primitives'
import type { SimState } from '../../App'

type SummaryTone = 'executive' | 'technical'

interface Props {
  state: SimState
}

function buildSummaryText(state: SimState, t: TFunction, tone: SummaryTone = 'executive'): string {
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

  if (tone === 'technical' || state.role === 'developer') {
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

  if (state.role === 'ceo') {
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
  const [tone, setTone] = useState<SummaryTone>('executive')
  const { toast, show: showToast, hide: hideToast } = useToast()
  const language = i18n.language === 'ko' ? 'ko' : 'en'
  const summaryText = buildSummaryText(state, t, tone)

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

  return (
    <Surface eyebrow={t('report.eyebrow')} title={t('summary.title')} description={t('report.description')}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500" title="AI-generated summary with verified pricing sources for stakeholder presentation">(?)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-start sm:items-center">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            <Button
              size="sm"
              variant={tone === 'executive' ? 'primary' : 'secondary'}
              onClick={() => setTone('executive')}
              aria-pressed={tone === 'executive'}
              className="rounded-none border-0"
              title="Executive summary: high-level business impact"
            >
              {t('summary.executive')}
            </Button>
            <Button
              size="sm"
              variant={tone === 'technical' ? 'primary' : 'secondary'}
              onClick={() => setTone('technical')}
              aria-pressed={tone === 'technical'}
              className="rounded-none border-0 border-l border-line-solid"
              title="Technical summary: detailed configuration and metrics"
            >
              {t('summary.technical')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCopy}
            >
              {t('summary.copy')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportPng}
            >
              {t('summary.exportPng')}
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={cardRef}
        lang={language}
        data-testid="summary-card-body"
        className="bg-fill-alternative border border-line-neutral rounded-wds-lg p-3 md:p-5"
      >
        <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">{summaryText}</p>
        <p className="text-xs text-gray-400 mt-3">
          {t('report.staticPricing')}
          {state.currentModel.priceSourceUrl && (
            <>
              {' '}· <a
                href={state.currentModel.priceSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
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
                className="text-blue-600 hover:underline"
              >
                {provenanceText(state.candidateModel)}
              </a>
            </>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          {t('report.qualityAssumption')}
        </p>
      </div>
      <Toast toast={toast} onClose={hideToast} />
    </Surface>
  )
}
