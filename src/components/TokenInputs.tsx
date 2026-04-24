import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PRESETS, type WorkloadPreset } from '../data/presets'
import { fmtTokens } from '../lib/format'
import { Tooltip } from './ui/Tooltip'

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
const EXTREME_THRESHOLD = 1_000_000_000 // 1 billion warning threshold

function sanitize(raw: string): number {
  // Keep digits only; reject negatives, decimals, letters.
  const cleaned = raw.replace(/[^\d]/g, '')
  if (cleaned === '') return 0
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return 0
  return Math.min(MAX_TOKENS, Math.max(0, n))
}

function isExtremeValue(n: number): boolean {
  return n > EXTREME_THRESHOLD
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

function presetMatches(p: WorkloadPreset, input: number, output: number, cache: number, batch: boolean): boolean {
  const cacheTolerance = 0.05 // Allow ±5% tolerance for cache
  return (
    p.monthlyInputTokens === input &&
    p.monthlyOutputTokens === output &&
    Math.abs(p.defaultCacheHitRate - cache) <= cacheTolerance &&
    p.defaultBatchEnabled === batch
  )
}

export function TokenInputs({
  periodInputTokens, periodOutputTokens,
  cacheHitRate, batchEnabled,
  onInputChange, onOutputChange, onCacheChange, onBatchChange, onPresetSelect,
}: Props) {
  const { t } = useTranslation()
  const [inputStr, setInputStr] = useState(() => formatInput(periodInputTokens))
  const [outputStr, setOutputStr] = useState(() => formatInput(periodOutputTokens))
  const [showInputInvalidMsg, setShowInputInvalidMsg] = useState(false)
  const [showOutputInvalidMsg, setShowOutputInvalidMsg] = useState(false)

  useEffect(() => { setInputStr(formatInput(periodInputTokens)) }, [periodInputTokens])
  useEffect(() => { setOutputStr(formatInput(periodOutputTokens)) }, [periodOutputTokens])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">{t('tokenInputs.preset')}</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => {
            const isActive = presetMatches(p, periodInputTokens, periodOutputTokens, cacheHitRate, batchEnabled)
            return (
              <Tooltip key={p.id} content={presetTooltip(p)}>
                <button
                  onClick={() => onPresetSelect(p)}
                  aria-pressed={isActive}
                  className={`px-3 py-1 text-xs border rounded-full transition-colors ${
                    isActive
                      ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium'
                      : 'border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                  }`}
                >
                  {p.name}
                  {isActive && ' ✓'}
                </button>
              </Tooltip>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="monthly-input-tokens" className="text-sm font-medium text-gray-700">
              {t('tokenInputs.inputTokens')}
            </label>
            <span className="text-xs text-gray-500" title="Tokens you send to the model (includes prompts and context)">(?)</span>
          </div>
          <input
            id="monthly-input-tokens"
            type="text"
            inputMode="numeric"
            value={inputStr}
            onChange={e => {
              const hasInvalidChars = /[^\d]/.test(e.target.value) && e.target.value !== ''
              setShowInputInvalidMsg(hasInvalidChars)
              const n = sanitize(e.target.value)
              setInputStr(formatInput(n))
              onInputChange(n)
            }}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          {showInputInvalidMsg && (
            <p className="text-xs text-red-600 mt-1">Numbers only</p>
          )}
          {isExtremeValue(periodInputTokens) && (
            <p className="text-xs text-amber-600 mt-1">{t('tokenInputs.extremeWarning')}</p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="monthly-output-tokens" className="text-sm font-medium text-gray-700">
              {t('tokenInputs.outputTokens')}
            </label>
            <span className="text-xs text-gray-500" title="Tokens the model generates in responses">(?)</span>
          </div>
          <input
            id="monthly-output-tokens"
            type="text"
            inputMode="numeric"
            value={outputStr}
            onChange={e => {
              const hasInvalidChars = /[^\d]/.test(e.target.value) && e.target.value !== ''
              setShowOutputInvalidMsg(hasInvalidChars)
              const n = sanitize(e.target.value)
              setOutputStr(formatInput(n))
              onOutputChange(n)
            }}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          {showOutputInvalidMsg && (
            <p className="text-xs text-red-600 mt-1">Numbers only</p>
          )}
          {isExtremeValue(periodOutputTokens) && (
            <p className="text-xs text-amber-600 mt-1">{t('tokenInputs.extremeWarning')}</p>
          )}
        </div>
      </div>
      <div className="flex gap-6 items-end">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <label htmlFor="cache-hit-rate" className="text-sm font-medium text-gray-700">
              {t('tokenInputs.cacheHitRate')}
            </label>
            <span className="text-xs text-gray-500" title="Percentage of requests that hit the cache (cheaper tokens)">(?)</span>
          </div>
          <div className="flex gap-2 mt-1 items-center">
            <input
              id="cache-hit-rate"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(cacheHitRate * 100)}
              onChange={e => onCacheChange(Number(e.target.value) / 100)}
              className="flex-1"
              aria-label="Cache hit rate slider (0-100%)"
            />
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(cacheHitRate * 100)}
              onChange={e => {
                const v = Math.min(100, Math.max(0, Number(e.target.value)))
                onCacheChange(v / 100)
              }}
              className="w-14 border border-gray-300 rounded px-2 py-1 text-sm"
              aria-label="Cache hit rate percentage input"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={batchEnabled}
            onChange={e => onBatchChange(e.target.checked)}
            aria-label="Enable batch mode API for cost savings"
            className="w-4 h-4"
          />
          {t('tokenInputs.batchMode')}
        </label>
      </div>
    </div>
  )
}
