import { MODELS, type Model, type Provider } from '../data/models'
import { fmtPricePerMillion, fmtTokens } from '../lib/format'

interface Props {
  label: string
  value: string
  onChange: (model: Model) => void
  disabledModelId?: string
}

const PROVIDER_NAMES: Record<Provider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  xai: 'xAI',
  microsoft: 'Microsoft',
  meta: 'Meta',
  mistral: 'Mistral',
  deepseek: 'DeepSeek',
  alibaba: 'Alibaba',
  moonshot: 'Moonshot',
}

export function ModelSelector({ label, value, onChange, disabledModelId }: Props) {
  const id = `model-select-${label.replace(/\s+/g, '-').toLowerCase()}`
  const selectedModel = MODELS.find(m => m.id === value)

  // Group models by provider
  const providers = new Map<Provider, Model[]>()
  for (const model of MODELS) {
    if (!providers.has(model.provider)) {
      providers.set(model.provider, [])
    }
    providers.get(model.provider)!.push(model)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-500" title="Prices shown as: input price / output price per 1M tokens">ℹ️</span>
      </div>
      <select
        id={id}
        value={value}
        onChange={e => {
          const m = MODELS.find(m => m.id === e.target.value)
          if (m) onChange(m)
        }}
        aria-label={`Select ${label.toLowerCase()}: model name with input/output prices per 1M tokens`}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {Array.from(providers.entries()).map(([provider, models]) => (
          <optgroup key={provider} label={PROVIDER_NAMES[provider]}>
            {models.map(m => (
              <option key={m.id} value={m.id} disabled={m.id === disabledModelId}>
                {m.name} — {fmtPricePerMillion(m.inputPrice, m.outputPrice)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {selectedModel && (
        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-gray-800">{PROVIDER_NAMES[selectedModel.provider]}</span>
            <span>Context {fmtTokens(selectedModel.contextWindow)}</span>
            <span>{fmtPricePerMillion(selectedModel.inputPrice, selectedModel.outputPrice)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span>Verified {selectedModel.lastVerifiedAt}</span>
            <a
              href={selectedModel.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Pricing source
            </a>
            <span className="rounded border border-gray-300 bg-white px-2 py-0.5">
              {selectedModel.supportsCaching ? 'Cache supported' : 'No cache support'}
            </span>
            <span className="rounded border border-gray-300 bg-white px-2 py-0.5">
              {selectedModel.supportsBatch ? 'Batch supported' : 'No batch support'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
