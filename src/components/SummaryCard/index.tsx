// src/components/SummaryCard/index.tsx
import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { calculateCost, calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency, fmtTokens, fmtPercent } from '../../lib/format'
import { useToast } from '../../hooks/useToast'
import { Toast } from '../ui/Toast'
import type { SimState } from '../../App'

type Tone = 'executive' | 'technical'

interface Props {
  state: SimState
}

function buildSummaryText(state: SimState, tone: Tone = 'executive'): string {
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

  const isSaving = migration.monthlyDelta < 0

  if (tone === 'executive') {
    const direction = isSaving ? 'save' : 'increase spend by'
    const absDelta = fmtCurrency(Math.abs(migration.monthlyDelta))
    const percent = fmtPercent(Math.abs(migration.savingPercent) / 100, 1)
    return `${state.currentModel.name} costs ${fmtCurrency(current.monthlyCost)}/month (${fmtCurrency(current.annualCost)}/yr). ` +
      `Migrating to ${state.candidateModel.name} would ${direction} ${absDelta}/month—a ${percent} ${isSaving ? 'saving' : 'increase'}.`
  }

  const cacheText = state.cacheHitRate > 0
    ? `, ${fmtPercent(state.cacheHitRate)} cache hit`
    : ''
  const batchText = state.batchEnabled ? ', batch enabled' : ''
  const direction = isSaving ? 'save' : 'cost an additional'
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
  const [tone, setTone] = useState<Tone>('executive')
  const cardRef = useRef<HTMLDivElement>(null)
  const { toast, show: showToast, hide: hideToast } = useToast()
  const summaryText = buildSummaryText(state, tone)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      showToast('Copied to clipboard!')
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
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Try again or use a screenshot.')
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold text-gray-800">Board-Ready Summary</h2>
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setTone('executive')}
              aria-pressed={tone === 'executive'}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                tone === 'executive'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Executive
            </button>
            <button
              onClick={() => setTone('technical')}
              aria-pressed={tone === 'technical'}
              className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-300 ${
                tone === 'technical'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Technical
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Copy
          </button>
          <button
            onClick={handleExportPng}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Export PNG
          </button>
        </div>
      </div>

      <div
        ref={cardRef}
        lang="en"
        className="bg-gray-50 border border-gray-200 rounded-lg p-5"
      >
        <p className="text-gray-800 leading-relaxed text-sm">{summaryText}</p>
        <p className="text-xs text-gray-400 mt-3">
          Prices based on official API docs · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>
      <Toast toast={toast} onClose={hideToast} />
    </section>
  )
}
