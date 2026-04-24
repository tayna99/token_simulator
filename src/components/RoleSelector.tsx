import { useTranslation } from 'react-i18next'
import type { Role } from '../App'

interface Props {
  value: Role
  onChange: (r: Role) => void
}

export function RoleSelector({ value, onChange }: Props) {
  const { t } = useTranslation()
  const roles: Array<[Role, string]> = [
    ['developer', t('roles.developer')],
    ['pm', t('roles.pm')],
    ['ceo', t('roles.ceo')],
  ]

  return (
    <div
      className="inline-flex rounded-md border border-gray-300 overflow-hidden"
      role="tablist"
    >
      {roles.map(([r, label]) => (
        <button
          key={r}
          role="tab"
          aria-pressed={value === r}
          onClick={() => onChange(r)}
          className={`px-3 py-1.5 text-sm transition-colors ${
            value === r
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
