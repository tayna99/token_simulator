import type { SimState } from '../App'

export interface ConfigExport {
  version: '1.0'
  timestamp: string
  state: {
    role: SimState['role']
    currentModelId: string
    candidateModelId: string
    period: SimState['period']
    periodInputTokens: number
    periodOutputTokens: number
    cacheHitRate: number
    batchEnabled: boolean
    monthlyRequests: number
    activeUsers: number
    monthlyBudgetUsd: number | null
  }
}

export function exportConfig(state: SimState): ConfigExport {
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    state: {
      role: state.role,
      currentModelId: state.currentModel.id,
      candidateModelId: state.candidateModel.id,
      period: state.period,
      periodInputTokens: state.periodInputTokens,
      periodOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
      monthlyRequests: state.monthlyRequests,
      activeUsers: state.activeUsers,
      monthlyBudgetUsd: state.monthlyBudgetUsd,
    },
  }
}

export function exportConfigAsJson(state: SimState): string {
  const config = exportConfig(state)
  return JSON.stringify(config, null, 2)
}

export function exportConfigAsUrl(state: SimState): string {
  const config = exportConfig(state)
  const encoded = encodeURIComponent(JSON.stringify(config))
  return `${window.location.href.split('?')[0]}?config=${encoded}`
}

export function loadConfigFromUrl(): ConfigExport | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const configParam = params.get('config')
  if (!configParam) return null

  try {
    const decoded = JSON.parse(decodeURIComponent(configParam))
    if (validateConfigExport(decoded)) {
      return decoded
    }
  } catch {
    console.warn('Failed to decode config from URL')
  }
  return null
}

export function validateConfigExport(data: unknown): data is ConfigExport {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return !!(
    obj.version === '1.0' &&
    typeof obj.timestamp === 'string' &&
    obj.state &&
    typeof obj.state === 'object'
  )
}
