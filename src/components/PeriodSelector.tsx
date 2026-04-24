import type { Period } from '../App'

interface Props {
  value: Period
  onChange: (p: Period) => void
}

const PERIODS: Array<[Period, string]> = [
  ['day', 'Daily'],
  ['week', 'Weekly'],
  ['month', 'Monthly'],
  ['quarter', 'Quarterly'],
  ['year', 'Yearly'],
]

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as Period)}
      className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:border-gray-400 focus:outline-none focus:border-blue-500"
    >
      {PERIODS.map(([p, label]) => (
        <option key={p} value={p}>
          {label}
        </option>
      ))}
    </select>
  )
}
