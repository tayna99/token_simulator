import { calculateBreakdown } from '../../lib/breakdown'
import { topDriverHint } from '../../lib/insights'
import { fmtCurrency } from '../../lib/format'
import { ROLE_PACK } from '../../lib/roleLanguage'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function CostBreakdown({ state }: Props) {
  const br = calculateBreakdown({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const hint = topDriverHint({
    topChannel: br.topChannel,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const perRequest =
    state.monthlyRequests > 0 ? br.totalUsd / state.monthlyRequests : 0
  const heading = ROLE_PACK[state.role].breakdownHeading

  const rows: Array<[string, number]> = [
    ['Uncached input', br.uncachedInputUsd],
    ['Cached input', br.cachedInputUsd],
    ['Output', br.outputUsd],
  ]

  const total = br.totalUsd
  const percent = (usd: number) => (total > 0 ? (usd / total) * 100 : 0)

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3">{heading}</h2>

      <div className="space-y-2 mb-4">
        {rows.map(([label, usd]) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span className="w-36 text-gray-600">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${percent(usd)}%` }}
              />
            </div>
            <span className="w-20 text-right font-medium">
              {fmtCurrency(usd)}
            </span>
            <span className="w-12 text-right text-xs text-gray-500">
              {percent(usd).toFixed(0)}%
            </span>
          </div>
        ))}
        {br.batchSavingsUsd > 0 && (
          <div className="flex items-center gap-3 text-sm text-green-700">
            <span className="w-36">Batch savings</span>
            <span className="flex-1 text-xs italic">vs no-batch baseline</span>
            <span className="w-20 text-right font-medium">
              -{fmtCurrency(br.batchSavingsUsd)}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm">
        <div className="rounded bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Per request</div>
          <div className="font-semibold">
            {fmtCurrency(perRequest, perRequest < 0.01 ? 4 : 2)}
          </div>
        </div>
        <div className="rounded bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Monthly total</div>
          <div className="font-semibold">{fmtCurrency(total)}</div>
        </div>
      </div>

      <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
        💡 {hint}
      </div>
    </section>
  )
}
