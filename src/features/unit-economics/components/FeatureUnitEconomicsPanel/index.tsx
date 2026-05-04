import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateFeatureUnitEconomics } from '../../../../lib/unitEconomics'
import type { UsageImportSummary } from '../../../../lib/usageImport'
import { fmtCurrency, fmtPercent, fmtTokens } from '../../../../lib/format'
import { Field, MetricTile, Surface, Badge } from '../../../../shared/ui/primitives'

interface Props {
  summary: UsageImportSummary | null
}

function unitCost(value: number): string {
  return fmtCurrency(value, value < 1 ? 4 : 2)
}

function riskTone(risk: string): 'positive' | 'caution' | 'negative' {
  if (risk === 'healthy') return 'positive'
  if (risk === 'loss') return 'negative'
  return 'caution'
}

export function FeatureUnitEconomicsPanel({ summary }: Props) {
  const { t } = useTranslation()
  const [pricePerUnit, setPricePerUnit] = useState(1)

  if (!summary) return null

  const rows = calculateFeatureUnitEconomics(summary.featureSummaries, pricePerUnit)
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenueUsd, 0)
  const totalMargin = rows.reduce((sum, row) => sum + row.grossMarginUsd, 0)
  const totalMarginPct = totalRevenue > 0 ? totalMargin / totalRevenue : 0

  return (
    <Surface
      eyebrow={t('unitEconomics.eyebrow')}
      title={t('unitEconomics.title')}
      description={t('unitEconomics.description')}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="overflow-x-auto rounded-wds-lg border border-line-neutral">
          <table className="w-full text-xs md:text-sm">
            <thead className="bg-fill-alternative text-xs uppercase tracking-wide text-label-alternative">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t('unitEconomics.feature')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('unitEconomics.requests')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('unitEconomics.costPerUnit')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('unitEconomics.monthlyCost')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('unitEconomics.margin')}</th>
                <th className="px-3 py-2 text-left font-medium">{t('unitEconomics.risk')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => (
                <tr key={row.feature}>
                  <td className="px-3 py-3 font-semibold text-label-normal">{row.feature}</td>
                  <td className="px-3 py-3 text-right text-label-neutral">{fmtTokens(row.requestCount)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-label-normal" translate="no">
                    {unitCost(row.costPerRequest)}
                  </td>
                  <td className="px-3 py-3 text-right text-label-neutral" translate="no">
                    {fmtCurrency(row.totalCostUsd, row.totalCostUsd < 1 ? 3 : 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-label-normal" translate="no">
                    {fmtCurrency(row.grossMarginUsd)}
                    <div className="text-xs text-label-alternative">{fmtPercent(row.grossMarginPct)}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={riskTone(row.marginRisk)}>{t(`unitEconomics.${row.marginRisk}`)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="flex flex-col gap-3 rounded-wds-lg border border-line-neutral bg-fill-alternative p-3">
          <Field label={t('unitEconomics.pricePerUnit')} htmlFor="price-per-unit" help={t('unitEconomics.priceHelp')}>
            <input
              id="price-per-unit"
              type="number"
              min={0}
              step={0.01}
              value={pricePerUnit}
              onChange={event => setPricePerUnit(Number(event.target.value))}
              className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm"
            />
          </Field>
          <MetricTile label={t('unitEconomics.totalRevenue')} value={fmtCurrency(totalRevenue)} />
          <MetricTile label={t('unitEconomics.totalMargin')} value={fmtCurrency(totalMargin)} />
          <MetricTile label={t('unitEconomics.marginRate')} value={fmtPercent(totalMarginPct)} />
        </aside>
      </div>
    </Surface>
  )
}
