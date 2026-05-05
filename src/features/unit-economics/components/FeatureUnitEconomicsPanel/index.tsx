import { useMemo, useState } from 'react'
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
  const [defaultPricePerUnit, setDefaultPricePerUnit] = useState(1)
  const [featurePrices, setFeaturePrices] = useState<Record<string, number>>({})
  const featureSummaries = summary?.featureSummaries ?? []

  const priceInput = useMemo(() => {
    return featureSummaries.reduce<Record<string, number>>((acc, feature) => {
      acc[feature.feature] = featurePrices[feature.feature] ?? defaultPricePerUnit
      return acc
    }, {})
  }, [defaultPricePerUnit, featurePrices, featureSummaries])
  if (!summary) return null

  const rows = calculateFeatureUnitEconomics(featureSummaries, priceInput)
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
                <th className="px-3 py-2 text-right font-medium">{t('unitEconomics.sellingPrice')}</th>
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
                  <td className="px-3 py-3 text-right">
                    <input
                      aria-label={t('unitEconomics.priceForFeature', { feature: row.feature })}
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.pricePerUnitUsd}
                      onChange={event => {
                        const value = Number(event.target.value)
                        setFeaturePrices(prev => ({
                          ...prev,
                          [row.feature]: Number.isFinite(value) ? Math.max(0, value) : 0,
                        }))
                      }}
                      className="w-24 rounded-wds border border-line-solid bg-surface-normal px-2 py-1 text-right text-xs"
                    />
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
              value={defaultPricePerUnit}
              onChange={event => {
                const value = Number(event.target.value)
                setDefaultPricePerUnit(Number.isFinite(value) ? Math.max(0, value) : 0)
              }}
              className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm"
            />
          </Field>
          <button
            type="button"
            onClick={() => setFeaturePrices({})}
            className="rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-xs font-medium text-label-neutral hover:bg-fill-alternative"
          >
            {t('unitEconomics.applyDefaultPrice')}
          </button>
          <MetricTile label={t('unitEconomics.totalRevenue')} value={fmtCurrency(totalRevenue)} />
          <MetricTile label={t('unitEconomics.totalMargin')} value={fmtCurrency(totalMargin)} />
          <MetricTile label={t('unitEconomics.marginRate')} value={fmtPercent(totalMarginPct)} />
        </aside>
      </div>
    </Surface>
  )
}
