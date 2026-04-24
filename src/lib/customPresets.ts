export interface CustomPreset {
  id: string
  name: string
  inputTokens: number
  outputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
  createdAt: string
}

const STORAGE_KEY = 'llm-cost-custom-presets'

export function getCustomPresets(): CustomPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveCustomPreset(preset: CustomPreset): void {
  const presets = getCustomPresets()
  const existing = presets.findIndex(p => p.id === preset.id)
  if (existing >= 0) {
    presets[existing] = preset
  } else {
    presets.push(preset)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

export function deleteCustomPreset(id: string): void {
  const presets = getCustomPresets()
  const filtered = presets.filter(p => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function createPresetFromCurrent(
  name: string,
  inputTokens: number,
  outputTokens: number,
  cacheHitRate: number,
  batchEnabled: boolean
): CustomPreset {
  return {
    id: `custom-${Date.now()}`,
    name,
    inputTokens,
    outputTokens,
    cacheHitRate,
    batchEnabled,
    createdAt: new Date().toISOString(),
  }
}
