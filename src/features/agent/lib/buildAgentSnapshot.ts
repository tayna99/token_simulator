import type { AgentRunStage } from './agentRunRuntime'
import type { TrustInspectionResult } from '../../trust/lib/securityMiddleware'
import type { FrontOperatingSystemContext } from '../../front-operating/lib/frontOperatingContext'

export interface BuildAgentSnapshotInput {
  activeStage: AgentRunStage
  toolResults: Record<string, unknown>
  deterministicEvents: unknown[]
  thresholdPolicy: Record<string, unknown>
  metricFlags: unknown[]
  riskCards: unknown[]
  benchmarkCards: unknown[]
  decisionHistory: unknown[]
  usageLog?: unknown[]
  providerModelPriceRefs?: unknown[]
  costAttribution?: Record<string, unknown>
  marginProfitability?: Record<string, unknown>
  optimizationWhatIfSavings?: unknown[]
  factSources: unknown[]
  operatingAgents: unknown[]
  operatingAssets: unknown[]
  providerRegistry: unknown[]
  modelPerfMatrix: unknown[]
  operatingLedger: unknown[]
  officialSourceRegistry?: unknown[]
  officialSourceSnippets?: unknown[]
  modelReleaseCandidates?: unknown[]
  pricingFactCandidates?: unknown[]
  fxRateSnapshots?: unknown[]
  corpusRegistryVersion?: string
  ragEvidenceCoverage?: unknown
  benchmarkEvidenceRefs?: string[]
  trustInspection?: TrustInspectionResult | null
  formulaVersion?: string
  providerRegistryVersion?: string
  dataLimitations?: string[]
  frontOperatingSystem?: FrontOperatingSystemContext
}

export interface AgentSnapshotPayload extends BuildAgentSnapshotInput {
  snapshotVersion: string
  usageLog: unknown[]
  providerModelPriceRefs: unknown[]
  costAttribution: Record<string, unknown>
  marginProfitability: Record<string, unknown>
  optimizationWhatIfSavings: unknown[]
  decisionHistory: unknown[]
}

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForHash)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, normalizeForHash(item)]),
  )
}

function stableHash(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

export function buildAgentSnapshot(input: BuildAgentSnapshotInput): AgentSnapshotPayload {
  const dataLimitations = input.dataLimitations ?? input.trustInspection?.analysisScope.blocked ?? []
  const snapshotInput = {
    ...input,
    usageLog: input.usageLog ?? [],
    providerModelPriceRefs: input.providerModelPriceRefs ?? [],
    costAttribution: input.costAttribution ?? {},
    marginProfitability: input.marginProfitability ?? {},
    optimizationWhatIfSavings: input.optimizationWhatIfSavings ?? [],
    dataLimitations,
  }
  const normalized = normalizeForHash(snapshotInput)
  return {
    ...snapshotInput,
    snapshotVersion: `snapshot:${input.activeStage}:${stableHash(JSON.stringify(normalized))}`,
  }
}
