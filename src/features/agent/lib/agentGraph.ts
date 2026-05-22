import { Annotation, END, START, StateGraph } from '@langchain/langgraph'
import { fmtCurrency, fmtPercent } from '../../../lib/format'
import type { AgentEvent } from './agentRuntime'
import type { ToolResultRef, ToolValue } from './toolContract'

export interface AgentGraphState {
  events: AgentEvent[]
  toolRefs: ToolResultRef[]
  toolValues: Partial<Record<ToolResultRef, ToolValue>>
  riskCardIds: string[]
}

const AgentGraphAnnotation = Annotation.Root({
  events: Annotation<AgentEvent[]>({
    value: (_left, right) => right,
    default: () => [],
  }),
  toolRefs: Annotation<ToolResultRef[]>({
    value: (_left, right) => right,
    default: () => [],
  }),
  toolValues: Annotation<Partial<Record<ToolResultRef, ToolValue>>>({
    value: (_left, right) => right,
    default: () => ({}),
  }),
  riskCardIds: Annotation<string[]>({
    value: (_left, right) => right,
    default: () => [],
  }),
})

type GraphState = typeof AgentGraphAnnotation.State

function numberValue(state: GraphState, ref: ToolResultRef): number {
  const value = state.toolValues[ref]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function stringValue(state: GraphState, ref: ToolResultRef): string {
  const value = state.toolValues[ref]
  return typeof value === 'string' && value ? value : 'unknown'
}

function appendEvent(state: GraphState, event: AgentEvent): Partial<AgentGraphState> {
  return { events: [...state.events, event] }
}

function toolSnapshotNode(state: GraphState): Partial<AgentGraphState> {
  return appendEvent(state, {
    type: 'tool_snapshot',
    message: `Tool snapshot received with ${state.toolRefs.length} deterministic fields.`,
    toolResultRefs: state.toolRefs,
    riskCardIds: [],
  })
}

function marginAnalystNode(state: GraphState): Partial<AgentGraphState> {
  return appendEvent(state, {
    type: 'analysis',
    message: `AI COGS is ${fmtCurrency(numberValue(state, 'tool:monthlyAiCogs'))} and the main cost driver is ${stringValue(state, 'tool:topFeature')}. Gross margin is ${fmtPercent(numberValue(state, 'tool:grossMarginPct'))}.`,
    toolResultRefs: state.toolRefs,
    riskCardIds: [],
  })
}

function pricingStrategyNode(state: GraphState): Partial<AgentGraphState> {
  return appendEvent(state, {
    type: 'pricing_strategy',
    message: 'Pricing Strategy compared policy options using deterministic scenario tool refs only.',
    toolResultRefs: state.toolRefs,
    riskCardIds: [],
  })
}

function riskAuditorNode(state: GraphState): Partial<AgentGraphState> {
  return appendEvent(state, {
    type: 'risk_audit',
    message: state.riskCardIds.length > 0
      ? `Risk Auditor attached ${state.riskCardIds.length} risk card(s).`
      : 'Risk Auditor found no matching risk card, so adoption remains blocked.',
    toolResultRefs: [],
    riskCardIds: state.riskCardIds,
  })
}

function cfoReporterNode(state: GraphState): Partial<AgentGraphState> {
  return appendEvent(state, {
    type: 'report_draft',
    message: `Draft report is grounded in ${state.toolRefs.join(', ')}.`,
    toolResultRefs: state.toolRefs,
    riskCardIds: state.riskCardIds,
  })
}

export function createAgentGraph() {
  return new StateGraph(AgentGraphAnnotation)
    .addNode('orchestrator', toolSnapshotNode)
    .addNode('marginAnalyst', marginAnalystNode)
    .addNode('pricingStrategy', pricingStrategyNode)
    .addNode('riskAuditor', riskAuditorNode)
    .addNode('cfoReporter', cfoReporterNode)
    .addEdge(START, 'orchestrator')
    .addEdge('orchestrator', 'marginAnalyst')
    .addEdge('marginAnalyst', 'pricingStrategy')
    .addEdge('pricingStrategy', 'riskAuditor')
    .addEdge('riskAuditor', 'cfoReporter')
    .addEdge('cfoReporter', END)
    .compile()
}
