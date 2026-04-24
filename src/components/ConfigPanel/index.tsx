import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getModelById } from '../../data/models'
import { exportConfigAsJson, validateConfigExport, type ConfigExport } from '../../lib/configManager'
import { useToast } from '../../hooks/useToast'
import { Toast } from '../ui/Toast'
import type { SimState } from '../../App'

interface Props {
  state: SimState
  onLoad: (state: Partial<SimState>) => void
}

export function ConfigPanel({ state, onLoad }: Props) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPanel, setShowPanel] = useState(false)
  const { toast, show: showToast, hide: hideToast } = useToast()

  const handleExport = () => {
    const json = exportConfigAsJson(state)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `llm-cost-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast(t('config.exported'))
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const data = JSON.parse(content) as ConfigExport

        if (!validateConfigExport(data)) {
          showToast(t('config.invalidFormat'))
          return
        }

        const currentModel = getModelById(data.state.currentModelId)
        const candidateModel = getModelById(data.state.candidateModelId)

        if (!currentModel || !candidateModel) {
          showToast(t('config.modelNotFound'))
          return
        }

        onLoad({
          role: data.state.role,
          currentModel,
          candidateModel,
          period: data.state.period,
          periodInputTokens: data.state.periodInputTokens,
          periodOutputTokens: data.state.periodOutputTokens,
          cacheHitRate: data.state.cacheHitRate,
          batchEnabled: data.state.batchEnabled,
          monthlyRequests: data.state.monthlyRequests,
          activeUsers: data.state.activeUsers,
          monthlyBudgetUsd: data.state.monthlyBudgetUsd,
        })

        showToast(t('config.imported'))
        setShowPanel(false)
      } catch {
        showToast(t('config.importFailed'))
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        title="Save and load configuration snapshots"
      >
        {t('config.saveLoad')}
      </button>

      {showPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">{t('config.manage')}</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <p className="text-xs text-gray-600">{t('config.description')}</p>

              <button
                onClick={handleExport}
                className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('config.exportJson')}
              </button>

              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  aria-label="Import configuration"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {t('config.importJson')}
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
              <p className="font-medium mb-1">{t('config.tipTitle')}</p>
              <p>{t('config.tipContent')}</p>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={hideToast} />
    </>
  )
}
