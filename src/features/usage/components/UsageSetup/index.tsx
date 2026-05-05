import { useTranslation } from 'react-i18next'
import { USE_CASE_PRESETS, type UseCasePresetId } from '../../../../data/workloadPresets'
import { deriveFeatureMixUsage, deriveMonthlyWorkload, type FeatureMixItem, type WorkloadInputs } from '../../../../lib/workload'
import { fmtPercent, fmtTokens } from '../../../../lib/format'
import { WorkloadBuilder } from '../WorkloadBuilder'
import { Field, MetricTile, Surface } from '../../../../shared/ui/primitives'
import { UsageImportPanel } from '../UsageImportPanel'
import type { PlannerState } from '../../../../lib/plannerState'
import type { UsageImportSummary } from '../../../../lib/usageImport'

interface Props {
  selectedPresetId: UseCasePresetId
  state: PlannerState
  featureMix: FeatureMixItem[]
  onPresetChange: (id: UseCasePresetId) => void
  importedSummary?: UsageImportSummary | null
  onUsageImport?: (summary: UsageImportSummary) => void
  onWorkloadChange: (workload: WorkloadInputs) => void
  onCacheChange: (value: number) => void
  onBatchChange: (value: boolean) => void
}

function toPercentValue(value: number): number {
  return Math.round(value * 100)
}

function toRatio(raw: string): number {
  const value = Number(raw)
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value / 100)) : 0
}

function featureLabel(t: ReturnType<typeof useTranslation>['t'], feature: FeatureMixItem): string {
  return t(`usageSetup.featureNames.${feature.id}`, { defaultValue: feature.name })
}

export function UsageSetup({
  selectedPresetId,
  state,
  featureMix,
  onPresetChange,
  importedSummary,
  onUsageImport,
  onWorkloadChange,
  onCacheChange,
  onBatchChange,
}: Props) {
  const { t } = useTranslation()
  const monthlyRequests = state.inputMode === 'workload'
    ? deriveMonthlyWorkload(state.workload).monthlyRequests
    : state.directTokens.monthlyRequests
  const featureUsage = deriveFeatureMixUsage(monthlyRequests, featureMix)

  return (
    <Surface
      eyebrow={t('usageSetup.eyebrow')}
      title={t('usageSetup.title')}
      description={t('usageSetup.description')}
    >
      <UsageImportPanel importedSummary={importedSummary} onImport={onUsageImport ?? (() => undefined)} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-4">
        <div className="flex flex-col gap-4">
          <Field label={t('usageSetup.presetLabel')} htmlFor="use-case-preset">
            <select
              id="use-case-preset"
              value={selectedPresetId}
              onChange={event => onPresetChange(event.target.value as UseCasePresetId)}
              className="w-full rounded-wds border border-line-solid bg-surface-normal px-3 py-2 text-sm text-label-normal"
            >
              {USE_CASE_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </Field>

          <WorkloadBuilder value={state.workload} onChange={onWorkloadChange} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('usageSetup.cacheTarget')} htmlFor="cacheable-input-target" help={fmtPercent(state.cacheHitRate)}>
              <input
                id="cacheable-input-target"
                type="number"
                min={0}
                max={100}
                value={toPercentValue(state.cacheHitRate)}
                onChange={event => onCacheChange(toRatio(event.target.value))}
                className="w-full rounded-wds border border-line-solid px-3 py-2 text-sm text-label-normal"
              />
            </Field>
            <label className="flex items-center gap-2 rounded-wds border border-line-neutral bg-fill-alternative px-3 py-2 text-sm font-semibold text-label-neutral">
              <input
                type="checkbox"
                checked={state.batchEnabled}
                onChange={event => onBatchChange(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              {t('usageSetup.batchEligible')}
            </label>
          </div>
        </div>

        <aside className="rounded-wds-lg border border-line-neutral bg-fill-alternative p-3">
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <MetricTile label={t('usageSetup.cacheableInput')} value={fmtPercent(featureUsage.cacheableShare, 0)} />
            <MetricTile label={t('usageSetup.batchableRequests')} value={fmtPercent(featureUsage.batchableShare, 0)} />
            <MetricTile label={t('usageSetup.featureInput')} value={fmtTokens(featureUsage.monthlyInputTokens)} />
            <MetricTile label={t('usageSetup.featureOutput')} value={fmtTokens(featureUsage.monthlyOutputTokens)} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 pr-2 font-medium">{t('usageSetup.feature')}</th>
                  <th className="py-1 px-2 text-right font-medium">{t('usageSetup.share')}</th>
                  <th className="py-1 px-2 text-right font-medium">{t('usageSetup.qualityFloor')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {featureMix.map(feature => (
                  <tr key={feature.id}>
                    <td className="py-2 pr-2 font-medium text-gray-800">{featureLabel(t, feature)}</td>
                    <td className="py-2 px-2 text-right text-gray-700">{fmtPercent(feature.requestShare, 0)}</td>
                    <td className="py-2 px-2 text-right text-gray-700">{feature.qualityFloor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </Surface>
  )
}
