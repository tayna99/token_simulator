import type { RiskCard } from '../../agent/lib/riskCards'
import type { Decision } from '../../decision-log/lib/decisionLog'
import type { CorpusChunk } from './corpusTypes'
import { unique } from './corpusTypes'

type LedgerLike = {
  id?: string
  workstream?: string
  agentUsed?: string
  humanDecision?: string
  artifactUpdated?: string
}

type SnapshotLike = {
  snapshotVersion?: string
  activeStage?: string
}

export interface DecisionHistoryBuildInput {
  decisions: Array<Partial<Decision> & { id: string }>
  riskCards: RiskCard[]
  operatingLedger: LedgerLike[]
  snapshot?: SnapshotLike | null
}

function chunk(input: {
  id: string
  text: string
  refs: string[]
}): CorpusChunk {
  return {
    id: input.id,
    corpusId: 'decision_history',
    text: input.text,
    sourceUrl: input.id,
    refs: unique(input.refs),
    mayOverrideFacts: false,
    metadata: {
      sourceKind: input.id.startsWith('risk:') ? 'risk_card' : input.id.startsWith('snapshot:') ? 'snapshot' : 'decision',
      corpusTrust: 'internal_authoritative',
      ownerAgentIds: ['knowledge_release_ops', 'finance_ops'],
      consumerAgentIds: ['cost_engine_qa', 'customer_diagnostic_pricing', 'pricing_revenue_ops', 'finance_ops', 'knowledge_release_ops'],
      cadence: 'on_write',
    },
  }
}

export function buildDecisionHistoryCorpusRecords(input: DecisionHistoryBuildInput): CorpusChunk[] {
  const decisionRecords = input.decisions.map(decision => chunk({
    id: `decision:${decision.id}`,
    text: [
      decision.what,
      decision.why,
      decision.status ? `status: ${decision.status}` : '',
      ...(decision.riskCards ?? []),
      ...(decision.toolResultRefs ?? []),
    ].filter(Boolean).join(' '),
    refs: [
      `decision:${decision.id}`,
      ...(decision.riskCards ?? []).map(ref => ref.startsWith('risk:') ? ref : `risk:${ref}`),
      ...(decision.toolResultRefs ?? []),
    ],
  }))

  const riskRecords = input.riskCards.map(card => chunk({
    id: `risk:${card.id}`,
    text: `${card.title}. ${card.impact} ${card.mitigation}`,
    refs: [`risk:${card.id}`, `evidence:${card.evidenceId}`],
  }))

  const ledgerRecords = input.operatingLedger.map((ledger, index) => {
    const id = ledger.id ? `decision:${ledger.id}` : `decision:operating-ledger-${index + 1}`
    const assetRef = ledger.artifactUpdated ? `asset:${ledger.artifactUpdated.split(/\s+/)[0].replace(/^asset:/, '')}` : ''
    return chunk({
      id,
      text: [ledger.workstream, ledger.agentUsed, ledger.humanDecision, ledger.artifactUpdated].filter(Boolean).join(' '),
      refs: [id, assetRef].filter(Boolean),
    })
  })

  const snapshotRecords = input.snapshot?.snapshotVersion
    ? [chunk({
        id: input.snapshot.snapshotVersion,
        text: `Agent snapshot ${input.snapshot.snapshotVersion} ${input.snapshot.activeStage ?? ''}`.trim(),
        refs: [input.snapshot.snapshotVersion],
      })]
    : []

  return [...decisionRecords, ...riskRecords, ...ledgerRecords, ...snapshotRecords]
}

export function decisionHistoryRecordsAsP1RagRecords(records: CorpusChunk[]) {
  return records.map(record => ({
    id: record.id,
    text: record.text,
    sourceUrl: record.sourceUrl ?? undefined,
    refs: [...record.refs],
    corpusTrust: record.metadata.corpusTrust,
    ownerAgentIds: [...record.metadata.ownerAgentIds],
    consumerAgentIds: [...record.metadata.consumerAgentIds],
  }))
}
