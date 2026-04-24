// src/components/SummaryCard/index.tsx
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toPng } from 'html-to-image'
import { calculateCost, calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency, fmtTokens, fmtPercent } from '../../lib/format'
import { useToast } from '../../hooks/useToast'
import { Toast } from '../ui/Toast'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

function buildSummaryText(state: SimState): string {
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

  const cacheText = state.cacheHitRate > 0
    ? `, ${fmtPercent(state.cacheHitRate)} cache hit`
    : ''
  const batchText = state.batchEnabled ? ', batch enabled' : ''

  const direction = migration.monthlyDelta < 0 ? 'save' : 'cost an additional'
  const absDelta = fmtCurrency(Math.abs(migration.monthlyDelta))
  const absAnnual = fmtCurrency(Math.abs(migration.annualDelta))
  const percent = fmtPercent(Math.abs(migration.savingPercent) / 100, 1)

  return `On ${state.currentModel.name} with ${fmtTokens(state.periodInputTokens)} input / ${fmtTokens(state.periodOutputTokens)} output tokens/month` +
    `${cacheText}${batchText}, estimated monthly cost is ${fmtCurrency(current.monthlyCost)} ` +
    `(${fmtCurrency(current.annualCost)}/yr). ` +
    `Switching to ${state.candidateModel.name} would ${direction} ${absDelta}/month ` +
    `(${percent}), annualized ${absAnnual}.`
}

export function SummaryCard({ state }: Props) {
  const { t } = useTranslation()
  const cardRef = useRef<HTMLDivElement>(null)
  const { toast, show: showToast, hide: hideToast } = useToast()
  const summaryText = buildSummaryText(state)

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
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm md:text-base font-semibold text-gray-800">{t('summary.title')}</h2>
          <span className="text-xs text-gray-500" title="AI-generated summary with verified pricing sources for stakeholder presentation">(?)</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 text-xs md:text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            {t('summary.copy')}
          </button>
          <button
            onClick={handleExportPng}
            className="px-2.5 py-1.5 text-xs md:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            {t('summary.exportPng')}
          </button>
        </div>
      </div>

      <div
        ref={cardRef}
        lang="en"
        className="bg-gray-50 border border-gray-200 rounded-lg p-3 md:p-5"
      >
        <p className="text-gray-800 leading-relaxed text-sm">{summaryText}</p>
        <p className="text-xs text-gray-400 mt-3">
          {t('summary.sourceLabel')} · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          {state.currentModel.priceSourceUrl && (
            <>
              {' '}· <a
                href={state.currentModel.priceSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {state.currentModel.name} pricing
              </a>
            </>
          )}
        </p>
      </div>
      <Toast toast={toast} onClose={hideToast} />
    </section>
  )
}
