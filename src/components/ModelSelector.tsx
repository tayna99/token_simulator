import { MODELS, type Model, type Provider } from '../data/models'
import { fmtPricePerMillion } from '../lib/format'

interface Props {
  label: string
  value: string
  onChange: (model: Model) => void
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

export function ModelSelector({ label, value, onChange }: Props) {
  const id = `model-select-${label.replace(/\s+/g, '-').toLowerCase()}`

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
              <option key={m.id} value={m.id}>
                {m.name} — {fmtPricePerMillion(m.inputPrice, m.outputPrice)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
