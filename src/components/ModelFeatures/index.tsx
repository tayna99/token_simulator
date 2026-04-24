import { useTranslation } from 'react-i18next'
import { fmtTokens } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function ModelFeatures({ state }: Props) {
  const { t } = useTranslation()

  const featureRow = (label: string, current: React.ReactNode, candidate: React.ReactNode) => (
    <tr className="border-t border-gray-100">
      <td className="py-3 px-3 text-sm font-medium text-gray-700">{label}</td>
      <td className="py-3 px-3 text-center text-sm text-gray-900">{current}</td>
      <td className="py-3 px-3 text-center text-sm text-gray-900">{candidate}</td>
    </tr>
  )

  const badge = (supported: boolean) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${
      supported
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-600'
    }`}>
      {supported ? '✓ Yes' : '—'}
    </span>
  )

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">Model Features</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-3 px-3 text-gray-500 font-medium">{t('config.parameter')}</th>
              <th className="text-center py-3 px-3 text-gray-700 font-medium">{state.currentModel.name}</th>
              <th className="text-center py-3 px-3 text-gray-700 font-medium">{state.candidateModel.name}</th>
            </tr>
          </thead>
          <tbody>
            {featureRow(
              'Prompt Caching',
              badge(state.currentModel.cacheDiscount > 0),
              badge(state.candidateModel.cacheDiscount > 0)
            )}
            {featureRow(
              'Batch Processing',
              badge(state.currentModel.batchDiscount > 0),
              badge(state.candidateModel.batchDiscount > 0)
            )}
            {featureRow(
              'Context Window',
              fmtTokens(state.currentModel.contextWindow),
              fmtTokens(state.candidateModel.contextWindow)
            )}
            {featureRow(
              'Release Date',
              state.currentModel.releaseDate,
              state.candidateModel.releaseDate
            )}
            {featureRow(
              'Cache Discount',
              `${Math.round(state.currentModel.cacheDiscount * 100)}%`,
              `${Math.round(state.candidateModel.cacheDiscount * 100)}%`
            )}
            {featureRow(
              'Batch Discount',
              `${Math.round(state.currentModel.batchDiscount * 100)}%`,
              `${Math.round(state.candidateModel.batchDiscount * 100)}%`
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
