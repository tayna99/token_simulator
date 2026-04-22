import { PRESETS, type WorkloadPreset } from '../data/presets'

interface Props {
  monthlyInputTokens: number
  monthlyOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
  onInputChange: (v: number) => void
  onOutputChange: (v: number) => void
  onCacheChange: (v: number) => void
  onBatchChange: (v: boolean) => void
  onPresetSelect: (p: WorkloadPreset) => void
}

export function TokenInputs({
  monthlyInputTokens, monthlyOutputTokens,
  cacheHitRate, batchEnabled,
  onInputChange, onOutputChange, onCacheChange, onBatchChange, onPresetSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Workload Preset</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => onPresetSelect(p)}
              className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-400 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Monthly Input Tokens</label>
          <input
            type="number"
            value={monthlyInputTokens}
            onChange={e => onInputChange(Number(e.target.value))}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Monthly Output Tokens</label>
          <input
            type="number"
            value={monthlyOutputTokens}
            onChange={e => onOutputChange(Number(e.target.value))}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-6 items-center">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">
            Cache Hit Rate: {Math.round(cacheHitRate * 100)}%
          </label>
          <input
            type="range" min={0} max={100}
            value={Math.round(cacheHitRate * 100)}
            onChange={e => onCacheChange(Number(e.target.value) / 100)}
            className="mt-1 w-full"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={batchEnabled}
            onChange={e => onBatchChange(e.target.checked)}
            className="w-4 h-4"
          />
          Batch Mode
        </label>
      </div>
    </div>
  )
}
