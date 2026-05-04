import { useTranslation } from 'react-i18next'
import { rankSavingsLevers } from '../../../../lib/savingsLevers'
import { fmtCurrency } from '../../../../lib/format'
import { Badge, Surface } from '../../../../shared/ui/primitives'
import type { SimState } from '../../../../App'

interface Props {
  state: SimState
  cacheableShare: number
  batchableShare: number
  outputReductionRate: number
  routingEligibleShare: number
}

export function SavingsLeverTable({
  state,
  cacheableShare,
  batchableShare,
  outputReductionRate,
  routingEligibleShare,
}: Props) {
  const { t } = useTranslation()
  const levers = rankSavingsLevers({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    monthlyRequests: state.monthlyRequests,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
    cacheableShare,
    batchableShare,
    outputReductionRate,
    routingEligibleShare,
  })
  const conditionKey = (leverId: string): string => {
    if (leverId === 'prompt-caching' && cacheableShare <= 0) return 'conditionEmpty'
    if (leverId === 'batch-processing' && batchableShare <= 0) return 'conditionEmpty'
    return 'condition'
  }

  return (
    <Surface
      eyebrow={t('savingsLevers.eyebrow')}
      title={t('savingsLevers.title')}
      description={t('savingsLevers.description')}
    >
      <div className="overflow-x-auto rounded-wds-lg border border-line-neutral">
        <table className="w-full text-xs md:text-sm">
          <thead className="bg-fill-alternative text-xs uppercase tracking-wide text-label-alternative">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('savingsLevers.strategy')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('savingsLevers.costEffect')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('savingsLevers.risk')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('savingsLevers.recommendedUse')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('savingsLevers.conditions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {levers.map(lever => (
              <tr key={lever.id} className="align-top">
                <td className="px-3 py-3 font-semibold text-gray-900">
                  {t(`savingsLevers.items.${lever.id}.strategy`, { defaultValue: lever.strategy })}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-green-700" translate="no">
                  {fmtCurrency(lever.monthlySavings)}/mo
                </td>
                <td className="px-3 py-3 text-gray-700">
                  <Badge tone="caution">{t(`savingsLevers.items.${lever.id}.risk`, { defaultValue: lever.riskText })}</Badge>
                </td>
                <td className="px-3 py-3 text-gray-700">
                  {t(`savingsLevers.items.${lever.id}.use`, { defaultValue: lever.recommendedUse })}
                </td>
                <td className="px-3 py-3 text-gray-600">
                  {t(`savingsLevers.items.${lever.id}.${conditionKey(lever.id)}`, { defaultValue: lever.conditionText })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  )
}
