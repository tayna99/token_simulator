export type DecisionStatus = 'adopted' | 'rejected' | 'superseded'
export type OperatingDecisionKind = 'approve' | 'automate' | 'authority' | 'policy' | 'attribution' | 'ownership'

export interface DecisionInput {
  kind?: OperatingDecisionKind
  what: string
  why: string
  assumptions: Record<string, unknown>
  toolResultRefs: string[]
  riskCards: string[]
  status: DecisionStatus
  createdAt?: string
  performanceSnapshot?: Record<string, unknown>
  costSnapshot?: Record<string, unknown>
}

export interface Decision extends DecisionInput {
  id: string
  kind: OperatingDecisionKind
  createdAt: string
  performanceSnapshot: Record<string, unknown>
  costSnapshot: Record<string, unknown>
}

const STORAGE_KEY = 'token-simulator:decision-log'
const DECISION_KINDS = new Set<OperatingDecisionKind>([
  'approve',
  'automate',
  'authority',
  'policy',
  'attribution',
  'ownership',
])

function idFromTimestamp(createdAt: string): string {
  return `decision-${createdAt.replace(/[^0-9A-Za-z]/g, '-')}`
    .replace(/-+/g, '-')
    .replace(/-$/, '')
}

export function createDecision(input: DecisionInput): Decision {
  if (input.status === 'adopted' && input.riskCards.length === 0) {
    throw new Error('Risk card is required before adopting an optimization decision')
  }

  const createdAt = input.createdAt ?? new Date().toISOString()
  return {
    ...input,
    kind: input.kind ?? 'approve',
    createdAt,
    id: idFromTimestamp(createdAt),
    performanceSnapshot: input.performanceSnapshot ?? {},
    costSnapshot: input.costSnapshot ?? {},
  }
}

export function serializeDecisionLog(decisions: Decision[]): string {
  return JSON.stringify(decisions, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isOperatingDecisionKind(value: unknown): value is OperatingDecisionKind {
  return typeof value === 'string' && DECISION_KINDS.has(value as OperatingDecisionKind)
}

function isDecision(value: unknown): value is DecisionInput & { id: string; createdAt: string } {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Decision>
  return typeof candidate.id === 'string'
    && typeof candidate.what === 'string'
    && typeof candidate.why === 'string'
    && typeof candidate.createdAt === 'string'
    && (candidate.status === 'adopted' || candidate.status === 'rejected' || candidate.status === 'superseded')
    && Array.isArray(candidate.toolResultRefs)
    && Array.isArray(candidate.riskCards)
    && (!('kind' in candidate) || isOperatingDecisionKind(candidate.kind))
    && (!('performanceSnapshot' in candidate) || isRecord(candidate.performanceSnapshot))
    && (!('costSnapshot' in candidate) || isRecord(candidate.costSnapshot))
}

function normalizeDecision(decision: DecisionInput & { id: string; createdAt: string }): Decision {
  return {
    ...decision,
    kind: decision.kind ?? 'approve',
    performanceSnapshot: isRecord(decision.performanceSnapshot) ? decision.performanceSnapshot : {},
    costSnapshot: isRecord(decision.costSnapshot) ? decision.costSnapshot : {},
  }
}

export function normalizeDecisionRecord(value: unknown): Decision | null {
  return isDecision(value) ? normalizeDecision(value) : null
}

export function loadDecisionLog(storage: Pick<Storage, 'getItem'> = window.localStorage): Decision[] {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.map(normalizeDecisionRecord).filter((decision): decision is Decision => Boolean(decision))
      : []
  } catch {
    return []
  }
}

export function saveDecisionLog(
  decisions: Decision[],
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  storage.setItem(STORAGE_KEY, serializeDecisionLog(decisions))
}

export function deleteDecision(decisions: Decision[], id: string): Decision[] {
  return decisions.filter(decision => decision.id !== id)
}

export function exportDecisionLogFileName(nowIso = new Date().toISOString()): string {
  return `ai-team-ops-decision-log-${nowIso.slice(0, 10)}.json`
}
