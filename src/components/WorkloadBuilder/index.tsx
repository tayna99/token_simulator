import { deriveMonthlyWorkload, type VolumeBasis, type WorkloadInputs } from '../../lib/workload'
import { fmtPercent, fmtTokens } from '../../lib/format'

interface Props {
  value: WorkloadInputs
  onChange: (value: WorkloadInputs) => void
}

function toNumber(raw: string): number {
  const value = Number(raw)
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function WorkloadBuilder({ value, onChange }: Props) {
  const derived = deriveMonthlyWorkload(value)
  const update = (patch: Partial<WorkloadInputs>) => onChange({ ...value, ...patch })
  const setBasis = (volumeBasis: VolumeBasis) => update({ volumeBasis })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Volume basis</p>
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setBasis('requestsPerDay')}
            aria-pressed={value.volumeBasis === 'requestsPerDay'}
            className={`px-3 py-1.5 text-xs font-medium ${
              value.volumeBasis === 'requestsPerDay' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Requests/day
          </button>
          <button
            type="button"
            onClick={() => setBasis('activeUsers')}
            aria-pressed={value.volumeBasis === 'activeUsers'}
            className={`border-l border-gray-300 px-3 py-1.5 text-xs font-medium ${
              value.volumeBasis === 'activeUsers' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Active users
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {value.volumeBasis === 'requestsPerDay' ? (
          <label className="text-sm font-medium text-gray-700">
            Requests/day
            <input
              type="number"
              min={0}
              value={value.requestsPerDay}
              onChange={e => update({ requestsPerDay: toNumber(e.target.value) })}
              className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </label>
        ) : (
          <>
            <label className="text-sm font-medium text-gray-700">
              Active users
              <input
                type="number"
                min={0}
                value={value.activeUsers}
                onChange={e => update({ activeUsers: toNumber(e.target.value) })}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Requests/user/day
              <input
                type="number"
                min={0}
                value={value.requestsPerUserPerDay}
                onChange={e => update({ requestsPerUserPerDay: toNumber(e.target.value) })}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </label>
          </>
        )}

        <label className="text-sm font-medium text-gray-700">
          Active days/month
          <input
            type="number"
            min={0}
            value={value.activeDaysPerMonth}
            onChange={e => update({ activeDaysPerMonth: toNumber(e.target.value) })}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Retry rate
          <input
            type="number"
            min={0}
            value={Math.round(value.retryRate * 100)}
            onChange={e => update({ retryRate: toNumber(e.target.value) / 100 })}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-gray-500">{fmtPercent(value.retryRate)}</span>
        </label>
        <label className="text-sm font-medium text-gray-700">
          Avg input tokens/request
          <input
            type="number"
            min={0}
            value={value.avgInputTokensPerRequest}
            onChange={e => update({ avgInputTokensPerRequest: toNumber(e.target.value) })}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Avg output tokens/request
          <input
            type="number"
            min={0}
            value={value.avgOutputTokensPerRequest}
            onChange={e => update({ avgOutputTokensPerRequest: toNumber(e.target.value) })}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Monthly requests</p>
          <p className="text-lg font-semibold text-gray-900">{fmtTokens(derived.monthlyRequests)}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Monthly input tokens</p>
          <p className="text-lg font-semibold text-gray-900">{fmtTokens(derived.monthlyInputTokens)}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Monthly output tokens</p>
          <p className="text-lg font-semibold text-gray-900">{fmtTokens(derived.monthlyOutputTokens)}</p>
        </div>
      </div>
    </div>
  )
}
