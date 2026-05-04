import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateDecisionMetrics, type QualityAssumptions } from '../../../../lib/decisionMetrics'
import { calculateBusinessMetricUnitCosts } from '../../../../lib/businessMetrics'
import { fmtCurrency, fmtNumber, fmtPercent } from '../../../../lib/format'
import { Button, Field, Surface } from '../../../../shared/ui/primitives'
import type { SimState } from '../../../../App'

interface BusinessMetric {
  name: string
  denominator: number
}

interface Props {
  state: SimState
}

function parsePositiveNumber(raw: string): number | null {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function fmtUnitCost(value: number): string {
  return fmtCurrency(value, value < 1 ? 4 : 2)
}

const CURRENT_ASSUMPTIONS: QualityAssumptions = {
  qualityScore: 86,
  latencyScore: 78,
  riskScore: 28,
  toolCallReliabilityScore: 84,
  retryRate: 0.04,
  humanReviewRate: 0.015,
  csEscalationRate: 0.002,
  reviewCostPerRequestUsd: 0.12,
  csCostPerEscalationUsd: 3,
}

const CANDIDATE_ASSUMPTIONS: QualityAssumptions = {
  qualityScore: 74,
  latencyScore: 84,
  riskScore: 46,
  toolCallReliabilityScore: 76,
  retryRate: 0.09,
  humanReviewRate: 0.035,
  csEscalationRate: 0.006,
  reviewCostPerRequestUsd: 0.12,
  csCostPerEscalationUsd: 3,
}

export function CostPerBusinessMetric({ state }: Props) {
  const { t } = useTranslation()
  const [metricName, setMetricName] = useState('')
  const [denominator, setDenominator] = useState('')
  const [metrics, setMetrics] = useState<BusinessMetric[]>([])
  const [error, setError] = useState('')

  const costs = useMemo(() => {
    const current = calculateDecisionMetrics({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      monthlyRequests: state.monthlyRequests,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
      assumptions: CURRENT_ASSUMPTIONS,
    })

    const candidate = calculateDecisionMetrics({
      model: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      monthlyRequests: state.monthlyRequests,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
      assumptions: CANDIDATE_ASSUMPTIONS,
    })

    return { current, candidate }
  }, [state])

  const addMetric = () => {
    const parsed = parsePositiveNumber(denominator)
    const name = metricName.trim()

    if (!name || parsed === null) {
      setError(t('businessMetric.validation'))
      return
    }

    setMetrics(prev => [...prev, { name, denominator: parsed }])
    setMetricName('')
    setDenominator('')
    setError('')
  }

  const removeMetric = (index: number) => {
    setMetrics(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Surface
      eyebrow={t('businessMetric.eyebrow')}
      title={t('businessMetric.title')}
      description={t('businessMetric.description')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            {t('businessMetric.intro')}
          </p>
          <p className="text-xs text-gray-600">
            {t('businessMetric.qualityHelp')}
          </p>
          <Field label={t('businessMetric.metricName')} htmlFor="business-metric-name">
            <input
              id="business-metric-name"
              type="text"
              placeholder="Support tickets"
              value={metricName}
              onChange={e => setMetricName(e.target.value)}
              className="w-full rounded-wds border border-line-solid px-3 py-2 text-xs"
            />
          </Field>
          <div className="flex gap-2">
            <Field label={t('businessMetric.denominator')} htmlFor="business-metric-denominator">
              <input
                id="business-metric-denominator"
                type="number"
                min="0"
                step="1"
                placeholder="1000"
                value={denominator}
                onChange={e => setDenominator(e.target.value)}
                className="w-full rounded-wds border border-line-solid px-3 py-2 text-xs"
              />
            </Field>
            <Button variant="primary" size="sm" onClick={addMetric} className="mt-6 shrink-0">
              {t('businessMetric.addMetric')}
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="rounded-wds-lg border border-primary-normal/20 bg-primary-normal/10 p-3">
          <div className="text-xs font-semibold text-primary-normal mb-2">{t('businessMetric.configured')}</div>
          {metrics.length === 0 ? (
            <div className="text-xs text-blue-600">{t('businessMetric.emptyConfigured')}</div>
          ) : (
            <div className="space-y-1">
              {metrics.map((metric, idx) => (
                <div key={`${metric.name}-${idx}`} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-blue-800">
                    {metric.name} ({fmtNumber(metric.denominator)})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMetric(idx)}
                    className="text-xs text-status-negative hover:underline"
                  >
                    {t('businessMetric.remove')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          {t('businessMetric.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-line-solid bg-fill-alternative">
                <th className="text-left py-2 px-2 font-semibold text-gray-700">{t('businessMetric.metric')}</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">{t('businessMetric.denominator')}</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">{t('businessMetric.currentRaw', { model: state.currentModel.name })}</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">{t('businessMetric.candidateRaw', { model: state.candidateModel.name })}</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">{t('businessMetric.effectiveUnitCost')}</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">{t('businessMetric.qualityBurden')}</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">{t('businessMetric.difference')}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, idx) => {
                const currentUnits = calculateBusinessMetricUnitCosts({
                  denominator: metric.denominator,
                  rawMonthlyCost: costs.current.rawMonthlyCost,
                  effectiveMonthlyCost: costs.current.effectiveMonthlyCost,
                  retryCost: costs.current.retryCost,
                  humanReviewCost: costs.current.humanReviewCost,
                  csEscalationCost: costs.current.csEscalationCost,
                })
                const candidateUnits = calculateBusinessMetricUnitCosts({
                  denominator: metric.denominator,
                  rawMonthlyCost: costs.candidate.rawMonthlyCost,
                  effectiveMonthlyCost: costs.candidate.effectiveMonthlyCost,
                  retryCost: costs.candidate.retryCost,
                  humanReviewCost: costs.candidate.humanReviewCost,
                  csEscalationCost: costs.candidate.csEscalationCost,
                })
                const diff = currentUnits.rawCostPerMetric - candidateUnits.rawCostPerMetric
                const diffPct = currentUnits.rawCostPerMetric > 0 ? diff / currentUnits.rawCostPerMetric : 0
                const saves = diff > 0

                return (
                  <tr key={`${metric.name}-${idx}`} className="border-t border-gray-100 hover:bg-blue-50">
                    <td className="py-2 px-2 font-medium text-gray-900">{metric.name}</td>
                    <td className="py-2 px-2 text-right text-gray-700">{fmtNumber(metric.denominator)}</td>
                    <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                      <span className="sr-only">{t('businessMetric.rawUnitCostCurrent')} </span>
                      {fmtUnitCost(currentUnits.rawCostPerMetric)}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                      <span className="sr-only">{t('businessMetric.rawUnitCostCandidate')} </span>
                      {fmtUnitCost(candidateUnits.rawCostPerMetric)}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-900 font-semibold">
                      <span className="sr-only">{t('businessMetric.effectiveUnitCost')} </span>
                      {fmtUnitCost(candidateUnits.effectiveCostPerMetric)}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      <span className="sr-only">{t('businessMetric.qualityBurden')} </span>
                      {fmtUnitCost(candidateUnits.qualityBurdenPerMetric)}
                    </td>
                    <td className={`py-2 px-2 text-right font-semibold ${saves ? 'text-green-700' : 'text-red-700'}`}>
                      {saves ? '-' : '+'}{fmtUnitCost(Math.abs(diff))}
                      <div className={`text-xs ${saves ? 'text-green-600' : 'text-red-600'}`}>
                        {saves ? '-' : '+'}{fmtPercent(Math.abs(diffPct), 1)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Surface>
  )
}
