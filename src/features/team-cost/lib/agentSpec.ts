export type HumanReviewGate = 'none' | 'sample' | 'all'

export type Frequency =
  | { unit: 'day'; count: number }
  | { unit: 'week'; count: number }
  | { unit: 'month'; count: number }
  | { unit: 'customer'; count: number; denominatorCount: number }
  | { unit: 'document'; count: number; denominatorCount: number }

export interface Artifact {
  id: string
  name: string
  kind: string
  estTokens: number
  reusedEachRun: boolean
  size: 'short' | 'medium' | 'long'
}

export interface AgentSpec {
  id: string
  role: string
  modelId: string
  inputs: Artifact[]
  outputs: Artifact[]
  callsPerRun: number
  retryRate: number
  cacheHitRate: number
  batchEnabled: boolean
  humanReviewGate: HumanReviewGate
  assignedTasks: string[]
  frequency: Frequency
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function finiteRatio(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

function sanitizeFrequency(frequency: Frequency): Frequency {
  if (frequency.unit === 'customer' || frequency.unit === 'document') {
    return {
      ...frequency,
      count: finiteNonNegative(frequency.count),
      denominatorCount: finiteNonNegative(frequency.denominatorCount),
    }
  }

  return { ...frequency, count: finiteNonNegative(frequency.count) }
}

export function sanitizeArtifact(artifact: Artifact): Artifact {
  return {
    ...artifact,
    estTokens: finiteNonNegative(artifact.estTokens),
  }
}

export function sanitizeAgentSpec(spec: AgentSpec): AgentSpec {
  return {
    ...spec,
    inputs: spec.inputs.map(sanitizeArtifact),
    outputs: spec.outputs.map(sanitizeArtifact),
    callsPerRun: finiteNonNegative(spec.callsPerRun),
    retryRate: finiteRatio(spec.retryRate),
    cacheHitRate: finiteRatio(spec.cacheHitRate),
    frequency: sanitizeFrequency(spec.frequency),
  }
}

export function normalizeFrequencyToMonthlyRuns(frequency: Frequency): number {
  const safe = sanitizeFrequency(frequency)
  if (safe.unit === 'day') return safe.count * 30
  if (safe.unit === 'week') return safe.count * 4
  if (safe.unit === 'month') return safe.count
  return safe.count * safe.denominatorCount
}

export function sumArtifactTokens(artifacts: Artifact[]): number {
  return artifacts.reduce((sum, artifact) => sum + finiteNonNegative(artifact.estTokens), 0)
}
