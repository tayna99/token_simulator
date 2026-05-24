import type { TrustInspectionResult } from '../lib/securityMiddleware'

interface Props {
  result: TrustInspectionResult | null | undefined
}

function ScopeChips({ items, tone }: { items: string[]; tone: 'positive' | 'warning' }) {
  if (items.length === 0) {
    return <p className="text-xs text-label-alternative">none</p>
  }
  const className = tone === 'positive'
    ? 'bg-status-positive/10 text-status-positive'
    : 'bg-status-warning/10 text-status-warning'
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

export function ImportTrustCheckPanel({ result }: Props) {
  if (!result) {
    return (
      <section className="rounded-wds border border-line-solid bg-surface-normal p-3 text-xs text-label-alternative">
        <h3 className="text-sm font-semibold text-label-normal">Trust check</h3>
        <p className="mt-1">Upload or load sample usage data to inspect file safety, schema health, and analysis scope.</p>
      </section>
    )
  }

  return (
    <section className="rounded-wds border border-line-solid bg-surface-normal p-3 text-xs text-label-alternative">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-label-normal">Trust check</h3>
        <span className="rounded-wds bg-fill-alternative px-2 py-1 font-semibold" translate="no">{result.status}</span>
      </div>
      <div className="mt-2 grid gap-1">
        <p>Data intake policy: no raw prompt / no PII by default</p>
        <p>Anonymization: <span translate="no">{result.anonymizationStatus}</span></p>
        <p>Snapshot allowed: {result.allowedForSnapshot ? 'yes' : 'no'}</p>
        <p>Retention: {result.retentionNote}</p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 font-semibold text-label-normal">Analysis available</p>
          <ScopeChips items={result.analysisScope.available} tone="positive" />
        </div>
        <div>
          <p className="mb-1 font-semibold text-label-normal">Analysis blocked</p>
          <ScopeChips items={result.analysisScope.blocked} tone="warning" />
        </div>
      </div>
      {result.warnings.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 font-semibold text-label-normal">Warnings</p>
          <div className="flex flex-wrap gap-1">
            {result.warnings.map(item => (
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
