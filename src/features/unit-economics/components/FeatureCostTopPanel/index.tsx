import { useTranslation } from 'react-i18next'
import { calculateCost } from '../../../../lib/calculator'
import { fmtCurrency, fmtPercent, fmtTokens } from '../../../../lib/format'
import { Badge, MetricTile, Surface } from '../../../../shared/ui/primitives'
import type { SimState } from '../../../../App'
import type { FeatureMixItem } from '../../../../lib/workload'
import type { UsageImportSummary } from '../../../../lib/usageImport'

interface Props {
  state: SimState
  featureMix: FeatureMixItem[]
  importedSummary: UsageImportSummary | null
}

interface FeatureCostRow {
  id: string | null
  feature: string
  requestCount: number
  inputTokens: number
  outputTokens: number
  totalCostUsd: number
  shareOfCost: number
  source: 'logs' | 'preset'
}

function fromImported(summary: UsageImportSummary): FeatureCostRow[] {
  return summary.featureSummaries.map(feature => ({
    id: null,
    feature: feature.feature,
    requestCount: feature.requestCount,
    inputTokens: feature.inputTokens,
    outputTokens: feature.outputTokens,
    totalCostUsd: feature.totalCostUsd,
    shareOfCost: feature.shareOfCost,
    source: 'logs',
  }))
}

function fromPreset(state: SimState, featureMix: FeatureMixItem[]): FeatureCostRow[] {
  const rows = featureMix.map(feature => {
    const requestCount = Math.round(state.monthlyRequests * feature.requestShare)
    const inputTokens = requestCount * feature.avgInputTokensPerRequest
    const outputTokens = requestCount * feature.avgOutputTokensPerRequest
    const cost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: inputTokens,
      monthlyOutputTokens: outputTokens,
      monthlyRequests: requestCount,
      cacheHitRate: state.cacheHitRate * feature.cacheableShare,
      batchEnabled: state.batchEnabled && feature.batchableShare > 0,
    })

    return {
      id: feature.id,
      feature: feature.name,
      requestCount,
      inputTokens,
      outputTokens,
      totalCostUsd: cost.monthlyCost,
      shareOfCost: 0,
      source: 'preset' as const,
    }
  })
  const total = rows.reduce((sum, row) => sum + row.totalCostUsd, 0)
  return rows.map(row => ({
    ...row,
    shareOfCost: total > 0 ? row.totalCostUsd / total : 0,
  }))
}

function sortByCost(rows: FeatureCostRow[]): FeatureCostRow[] {
  return [...rows].sort((a, b) => b.totalCostUsd - a.totalCostUsd)
}

function topFeature(rows: FeatureCostRow[]): FeatureCostRow | null {
  return sortByCost(rows)[0] ?? null
}

function featureLabel(t: ReturnType<typeof useTranslation>['t'], row: FeatureCostRow): string {
  return row.id ? t(`usageSetup.featureNames.${row.id}`, { defaultValue: row.feature }) : row.feature
}

export function FeatureCostTopPanel({ state, featureMix, importedSummary }: Props) {
  const { t } = useTranslation()
  const rows = sortByCost(importedSummary ? fromImported(importedSummary) : fromPreset(state, featureMix))
  const top = topFeature(rows)
  const source = top?.source ?? 'preset'
  const topLabel = top ? featureLabel(t, top) : ''

  return (
    <Surface
      eyebrow={t('featureCost.eyebrow')}
      title={t('featureCost.title')}
      description={t('featureCost.description')}
    >
      {top && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricTile
            label={t('featureCost.topFeature')}
            value={topLabel}
            help={t(`featureCost.source.${source}`)}
          />
          <MetricTile
            label={t('featureCost.topShare')}
            value={fmtPercent(top.shareOfCost, 1)}
            help={t('featureCost.topShareHelp', { feature: topLabel })}
          />
          <MetricTile
            label={t('featureCost.topCost')}
            value={fmtCurrency(top.totalCostUsd)}
            help={t('featureCost.topCostHelp')}
          />
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-wds-lg border border-line-neutral">
        <table className="w-full text-xs md:text-sm">
          <thead className="bg-fill-alternative text-xs uppercase tracking-wide text-label-alternative">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('featureCost.feature')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('featureCost.monthlyCost')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('featureCost.costShare')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('featureCost.requests')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('featureCost.tokens')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('featureCost.sourceLabel')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.feature}>
                <td className="px-3 py-3 font-semibold text-label-normal">{featureLabel(t, row)}</td>
                <td className="px-3 py-3 text-right font-semibold text-label-normal" translate="no">
                  {fmtCurrency(row.totalCostUsd, row.totalCostUsd < 1 ? 3 : 0)}
                </td>
                <td className="px-3 py-3 text-right text-label-neutral">{fmtPercent(row.shareOfCost, 1)}</td>
                <td className="px-3 py-3 text-right text-label-neutral">{fmtTokens(row.requestCount)}</td>
                <td className="px-3 py-3 text-right text-label-neutral">
                  {fmtTokens(row.inputTokens + row.outputTokens)}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={row.source === 'logs' ? 'positive' : 'caution'}>
                    {t(`featureCost.source.${row.source}`)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  )
}
