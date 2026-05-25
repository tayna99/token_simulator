import { useTranslation } from 'react-i18next'
import type { AnalysisReadinessReport, MappingNeedId } from '../../usage/lib/analysisReadiness'
import type { TrustInspectionResult } from '../lib/securityMiddleware'

interface Props {
  result: TrustInspectionResult | null | undefined
  readiness?: AnalysisReadinessReport | null | undefined
}

function ScopeChips({ items, tone, empty }: { items: string[]; tone: 'positive' | 'warning' | 'neutral'; empty: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-label-alternative">{empty}</p>
  }
  const className = tone === 'positive'
    ? 'bg-status-positive/10 text-status-positive'
    : tone === 'warning'
      ? 'bg-status-warning/10 text-status-warning'
      : 'bg-fill-alternative text-label-neutral'
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(item => (
        <span key={item} className={`rounded-wds px-2 py-1 text-xs font-semibold ${className}`} translate="no">
          {item}
        </span>
      ))}
    </div>
  )
}

function mappingNeedsFromWarnings(warnings: TrustInspectionResult['warnings']): MappingNeedId[] {
  const needs: MappingNeedId[] = []
  if (warnings.includes('customer_id_missing')) needs.push('customer_id')
  if (warnings.includes('plan_id_missing')) needs.push('plan_id')
  if (warnings.includes('revenue_missing')) needs.push('revenue')
  return needs
}

function fallbackDeferred(result: TrustInspectionResult): string[] {
  if (result.status === 'blocked' || !result.allowedForSnapshot) return ['all_analysis']
  return result.analysisScope.blocked
}

export function ImportTrustCheckPanel({ result, readiness }: Props) {
  const { t } = useTranslation()
  const available = readiness?.availableAnalyses.map(item => item.id)
    ?? result?.analysisScope.available
    ?? []
  const mappingNeeds = readiness?.mappingNeeds.map(item => item.id)
    ?? (result ? mappingNeedsFromWarnings(result.warnings) : [])
  const deferred = readiness?.deferredJudgments.map(item => item.id)
    ?? (result ? fallbackDeferred(result) : [])
  const displayedWarnings = result?.warnings.filter(warning => (
    warning !== 'customer_id_missing'
    && warning !== 'plan_id_missing'
    && warning !== 'revenue_missing'
  )) ?? []

  if (!result) {
    return (
      <section className="rounded-wds border border-line-solid bg-surface-normal p-3 text-xs text-label-alternative">
        <h3 className="text-sm font-semibold text-label-normal">{t('trustCheck.title')}</h3>
        <p className="mt-1">{t('trustCheck.empty')}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <DiagnosisColumn
            title={t('trustCheck.availableTitle')}
            items={[]}
            tone="positive"
            empty={t('trustCheck.emptyAvailable')}
          />
          <DiagnosisColumn
            title={t('trustCheck.mappingTitle')}
            items={[]}
            tone="neutral"
            empty={t('trustCheck.emptyMappingWaiting')}
          />
          <DiagnosisColumn
            title={t('trustCheck.deferredTitle')}
            items={[]}
            tone="warning"
            empty={t('trustCheck.emptyDeferredWaiting')}
          />
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-wds border border-line-solid bg-surface-normal p-3 text-xs text-label-alternative">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-label-normal">{t('trustCheck.title')}</h3>
        <span className="rounded-wds bg-fill-alternative px-2 py-1 font-semibold" translate="no">{result.status}</span>
      </div>
      <div className="mt-2 grid gap-1">
        <p>{t('trustCheck.policy')}</p>
        <p>{t('trustCheck.anonymization')}: <span translate="no">{result.anonymizationStatus}</span></p>
        <p>{t('trustCheck.snapshotAllowed')}: {result.allowedForSnapshot ? t('trustCheck.yes') : t('trustCheck.no')}</p>
        <p>{t('trustCheck.retention')}: {result.retentionNote}</p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <DiagnosisColumn
          title={t('trustCheck.availableTitle')}
          items={available}
          tone="positive"
          empty={t('trustCheck.emptyAvailable')}
        />
        <DiagnosisColumn
          title={t('trustCheck.mappingTitle')}
          items={mappingNeeds}
          tone="neutral"
          empty={t('trustCheck.emptyMapping')}
        />
        <DiagnosisColumn
          title={t('trustCheck.deferredTitle')}
          items={deferred}
          tone="warning"
          empty={t('trustCheck.emptyDeferred')}
        />
      </div>
      {displayedWarnings.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 font-semibold text-label-normal">{t('trustCheck.warnings')}</p>
          <div className="flex flex-wrap gap-1">
            {displayedWarnings.map(item => (
              <span key={item} className="rounded-wds bg-status-negative/10 px-2 py-1 text-xs font-semibold text-status-negative" translate="no">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function DiagnosisColumn({
  title,
  items,
  tone,
  empty,
}: {
  title: string
  items: string[]
  tone: 'positive' | 'warning' | 'neutral'
  empty: string
}) {
  return (
    <div>
      <p className="mb-1 font-semibold text-label-normal">{title}</p>
      <ScopeChips items={items} tone={tone} empty={empty} />
    </div>
  )
}
