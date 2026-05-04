import { useTranslation } from 'react-i18next'
import { calculateCost } from '../../../../lib/calculator'
import { fmtCurrency } from '../../../../lib/format'
import { ModelSelector } from '../../../../components/ModelSelector'
import { MetricTile, Surface } from '../../../../shared/ui/primitives'
import type { Model } from '../../../../data/models'
import type { SimState } from '../../../../App'

interface Props {
  state: SimState
  onCurrentModelChange: (model: Model) => void
}

export function CurrentCostPanel({ state, onCurrentModelChange }: Props) {
  const { t } = useTranslation()
  const cost = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    monthlyRequests: state.monthlyRequests,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  return (
    <Surface
      eyebrow={t('currentCost.eyebrow')}
      title={t('currentCost.title')}
      description={t('currentCost.description')}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] gap-4">
        <ModelSelector
          label={t('currentCost.currentModel')}
          value={state.currentModel.id}
          onChange={onCurrentModelChange}
          disabledModelId={state.candidateModel.id}
        />

        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
          <p className="text-xs text-label-alternative">{t('currentCost.pricingSource')}</p>
          <a
            href={state.currentModel.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-normal hover:underline"
          >
            {state.currentModel.sourceLabel}
          </a>
          <p className="mt-1 text-xs text-label-alternative">
            {t('currentCost.verified', { date: state.currentModel.lastVerifiedAt })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        <MetricTile label={t('currentCost.monthlyCost')} value={`${fmtCurrency(cost.monthlyCost)}/mo`} />
        <MetricTile label={t('currentCost.annualCost')} value={`${fmtCurrency(cost.annualCost)}/yr`} />
        <MetricTile label={t('currentCost.costPerRequest')} value={`${fmtCurrency(cost.costPerRequest, 4)}/request`} />
        <MetricTile label={t('currentCost.inputCost')} value={fmtCurrency(cost.inputCost)} />
        <MetricTile label={t('currentCost.outputCost')} value={fmtCurrency(cost.outputCost)} />
      </div>
    </Surface>
  )
}
