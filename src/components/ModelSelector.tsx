import { MODELS, type Model } from '../data/models'
import { fmtPricePerMillion } from '../lib/format'

interface Props {
  label: string
  value: string
  onChange: (model: Model) => void
}

export function ModelSelector({ label, value, onChange }: Props) {
  const id = `model-select-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      <select
        id={id}
        value={value}
        onChange={e => {
          const m = MODELS.find(m => m.id === e.target.value)
          if (m) onChange(m)
        }}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {MODELS.map(m => (
          <option key={m.id} value={m.id}>
            {m.name} — {fmtPricePerMillion(m.inputPrice, m.outputPrice)}
          </option>
        ))}
      </select>
    </div>
  )
}
