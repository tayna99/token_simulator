import { useState, useEffect } from 'react'
import { PRESETS, type WorkloadPreset } from '../data/presets'
import { fmtTokens } from '../lib/format'

interface Props {
  periodInputTokens: number
  periodOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
  onInputChange: (v: number) => void
  onOutputChange: (v: number) => void
  onCacheChange: (v: number) => void
  onBatchChange: (v: boolean) => void
  onPresetSelect: (p: WorkloadPreset) => void
}

const MAX_TOKENS = 10_000_000_000 // 10 billion cap

function sanitize(raw: string): number {
  // Keep digits only; reject negatives, decimals, letters.
  const cleaned = raw.replace(/[^\d]/g, '')
  if (cleaned === '') return 0
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return 0
  return Math.min(MAX_TOKENS, Math.max(0, n))
}

function formatInput(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('en-US')
}

function presetTooltip(p: WorkloadPreset): string {
  const inTokens = fmtTokens(p.monthlyInputTokens)
  const outTokens = fmtTokens(p.monthlyOutputTokens)
  const cachePct = Math.round(p.defaultCacheHitRate * 100)
  const batchPart = p.defaultBatchEnabled ? ' · batch on' : ''
  return `${inTokens} in / ${outTokens} out · cache ${cachePct}%${batchPart}`
}

export function TokenInputs({
  periodInputTokens, periodOutputTokens,
  cacheHitRate, batchEnabled,
  onInputChange, onOutputChange, onCacheChange, onBatchChange, onPresetSelect,
}: Props) {
  // Internal display strings keep the thousand-separator formatting while
  // the parent state stays numeric. Sync back whenever parent changes
  // (e.g., preset selection flips the numeric tokens from outside).
  const [inputStr, setInputStr] = useState(() => formatInput(periodInputTokens))
  const [outputStr, setOutputStr] = useState(() => formatInput(periodOutputTokens))

  useEffect(() => { setInputStr(formatInput(periodInputTokens)) }, [periodInputTokens])
  useEffect(() => { setOutputStr(formatInput(periodOutputTokens)) }, [periodOutputTokens])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Workload Preset</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => onPresetSelect(p)}
              title={presetTooltip(p)}
              className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-400 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="monthly-input-tokens" className="text-sm font-medium text-gray-700">
            Monthly Input Tokens
          </label>
          <input
            id="monthly-input-tokens"
            type="text"
            inputMode="numeric"
            value={inputStr}
            onChange={e => {
              const n = sanitize(e.target.value)
              setInputStr(formatInput(n))
              onInputChange(n)
            }}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="monthly-output-tokens" className="text-sm font-medium text-gray-700">
            Monthly Output Tokens
          </label>
          <input
            id="monthly-output-tokens"
            type="text"
            inputMode="numeric"
            value={outputStr}
            onChange={e => {
              const n = sanitize(e.target.value)
              setOutputStr(formatInput(n))
              onOutputChange(n)
            }}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-6 items-center">
        <div className="flex-1">
          <label htmlFor="cache-hit-rate" className="text-sm font-medium text-gray-700">
            Cache Hit Rate: {Math.round(cacheHitRate * 100)}%
          </label>
          <input
            id="cache-hit-rate"
            type="range" min={0} max={100} step={1}
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
