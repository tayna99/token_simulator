import { useTranslation } from 'react-i18next'
import type { Period } from '../App'

interface Props {
  value: Period
  onChange: (p: Period) => void
}

const PERIOD_KEYS: Array<[Period, string]> = [
  ['day', 'periods.day'],
  ['week', 'periods.week'],
  ['month', 'periods.month'],
  ['quarter', 'periods.quarter'],
  ['year', 'periods.year'],
]

export function PeriodSelector({ value, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as Period)}
      className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:border-gray-400 focus:outline-none focus:border-blue-500"
    >
      {PERIOD_KEYS.map(([p, key]) => (
        <option key={p} value={p}>
          {t(key)}
        </option>
      ))}
    </select>
  )
}
