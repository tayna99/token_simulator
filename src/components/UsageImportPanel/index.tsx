import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MODELS } from '../../data/models'
import { parseUsageCsv, type UsageImportSummary } from '../../lib/usageImport'
import { Button, Field, MetricTile } from '../ui/primitives'
import { fmtCurrency, fmtTokens } from '../../lib/format'

const SAMPLE_USAGE_CSV = [
  'timestamp,feature,model,input_tokens,output_tokens,total_cost,latency_ms,customer_id',
  '2026-05-01,rag_chat,claude-sonnet-4.6,1200,450,0.010,1800,acme',
  '2026-05-01,rag_chat,claude-sonnet-4.6,1800,620,0.016,2100,acme',
  '2026-05-01,summary,gemini-3.1-flash,3000,800,0.004,900,globex',
  '2026-05-01,classify,gemini-3.1-flash,600,120,0.001,520,globex',
].join('\n')

interface Props {
  importedSummary?: UsageImportSummary | null
  onImport: (summary: UsageImportSummary) => void
}

export function UsageImportPanel({ importedSummary, onImport }: Props) {
  const { t } = useTranslation()
  const [rawCsv, setRawCsv] = useState(SAMPLE_USAGE_CSV)
  const [error, setError] = useState('')

  const applyCsv = () => {
    const summary = parseUsageCsv(rawCsv, MODELS)
    if (summary.requestCount === 0) {
      setError(t('usageImport.error'))
      return
    }

    setError('')
    onImport(summary)
  }

  const loadFile = async (file: File | undefined) => {
    if (!file) return
    setRawCsv(await file.text())
    setError('')
  }

  return (
    <div className="rounded-wds-lg border border-primary-normal/20 bg-primary-normal/10 p-4">
      <div className="mb-3 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">{t('usageImport.eyebrow')}</p>
        <h3 className="text-sm font-semibold text-label-normal">{t('usageImport.title')}</h3>
        <p className="text-xs leading-relaxed text-label-alternative">{t('usageImport.description')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-3">
          <Field label={t('usageImport.csvLabel')} htmlFor="usage-import-csv" help={t('usageImport.csvHelp')}>
            <textarea
              id="usage-import-csv"
              value={rawCsv}
              onChange={event => setRawCsv(event.target.value)}
              rows={5}
              className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 font-mono text-xs text-label-normal"
            />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button variant="primary" size="sm" onClick={applyCsv}>
              {t('usageImport.apply')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setRawCsv(SAMPLE_USAGE_CSV)}>
              {t('usageImport.sample')}
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-wds border border-line-solid bg-surface-normal px-3 text-xs font-semibold text-label-normal hover:bg-fill-alternative">
              {t('usageImport.upload')}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={event => void loadFile(event.currentTarget.files?.[0])}
              />
            </label>
          </div>
          {error && <p className="text-xs text-status-negative">{error}</p>}
          <p className="text-xs text-label-alternative">{t('usageImport.noManualTokens')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <MetricTile
            label={t('usageImport.requests')}
            value={importedSummary ? fmtTokens(importedSummary.requestCount) : '0'}
          />
          <MetricTile
            label={t('usageImport.importedCost')}
            value={importedSummary ? fmtCurrency(importedSummary.totalCostUsd, importedSummary.totalCostUsd < 1 ? 3 : 0) : '$0'}
          />
          <MetricTile
            label={t('usageImport.inputTokens')}
            value={importedSummary ? fmtTokens(importedSummary.totalInputTokens) : '0'}
          />
          <MetricTile
            label={t('usageImport.outputTokens')}
            value={importedSummary ? fmtTokens(importedSummary.totalOutputTokens) : '0'}
          />
        </div>
      </div>
    </div>
  )
}
