import { fmtCurrency, fmtNumber, fmtPercent } from '../../../lib/format'

export type RoleProjectionRole = 'developer' | 'pm' | 'ceo'
export type RoleProjectionAudience = 'customer' | 'internal'
export type RoleProjectionPanelKey =
  | 'import_workflow'
  | 'team_cost_simulator'
  | 'operational_signals'
  | 'cost_attribution'
  | 'margin_risk'
  | 'team_forecast'
  | 'pricing_simulator'
  | 'optimization_review'
  | 'report_output'
  | 'decision_log'
  | 'operating_ledger'
  | 'one_page_report'
  | 'debug_refs'

export const ROLE_PROJECTION_PANEL_LABELS: Record<RoleProjectionPanelKey, string> = {
  import_workflow: 'Import workflow',
  team_cost_simulator: 'Team cost simulator',
  operational_signals: 'Operational signals',
  cost_attribution: 'Cost attribution',
  margin_risk: 'Margin risk',
  team_forecast: 'Team forecast',
  pricing_simulator: 'Pricing simulator',
  optimization_review: 'Optimization review',
  report_output: 'Report output',
  decision_log: 'Decision log',
  operating_ledger: 'Operating ledger',
  one_page_report: 'One-page report',
  debug_refs: 'Admin refs',
}

export interface RoleProjectionSnapshot {
  monthlyCostUsd: number
  grossMarginPct: number
  topAgentShare: number
  topFeature: string
  lossCustomerCount: number
  refs: string[]
}

export interface RoleProjectionKpi {
  id: string
  label: string
  value: string
}

export interface RoleAssistantProjection {
  title: string
  focus: string
  refs: string[]
}

export interface RoleViewModel {
  role: RoleProjectionRole
  audience: RoleProjectionAudience
  title: string
  primaryKpis: RoleProjectionKpi[]
  assistant: RoleAssistantProjection
}

function visibleRefs(snapshot: RoleProjectionSnapshot, audience: RoleProjectionAudience): string[] {
  return audience === 'internal' ? [...snapshot.refs] : []
}

function fmtCustomerCount(count: number): string {
  const formatted = fmtNumber(count)
  if (!Number.isFinite(count)) return formatted
  return `${formatted} ${count === 1 ? 'customer' : 'customers'}`
}

export function projectSnapshotForRole(
  snapshot: RoleProjectionSnapshot,
  role: RoleProjectionRole,
  audience: RoleProjectionAudience,
): RoleViewModel {
  const refs = visibleRefs(snapshot, audience)
  const monthlyCostValue = fmtCurrency(snapshot.monthlyCostUsd)
  const marginValue = fmtPercent(snapshot.grossMarginPct)
  const topAgentShareValue = fmtPercent(snapshot.topAgentShare)
  const customerValue = fmtCustomerCount(snapshot.lossCustomerCount)

  if (role === 'developer') {
    return {
      role,
      audience,
      title: 'Developer projection',
      primaryKpis: [
        { id: 'top_agent_share', label: 'Top agent share', value: topAgentShareValue },
        { id: 'monthly_cost', label: 'Monthly AI cost', value: monthlyCostValue },
        { id: 'debug_refs', label: 'Trace refs', value: refs.length > 0 ? `${refs.length} refs` : 'Stored in admin view' },
      ],
      assistant: {
        title: 'Developer cost trace',
        focus: 'Model, token, retry, and cache behavior are prioritized for debugging cost spikes.',
        refs,
      },
    }
  }

  if (role === 'ceo') {
    return {
      role,
      audience,
      title: 'CEO projection',
      primaryKpis: [
        { id: 'monthly_cost', label: 'Monthly AI cost', value: monthlyCostValue },
        { id: 'margin', label: 'Margin', value: marginValue },
        { id: 'customer', label: 'Customer at risk', value: customerValue },
      ],
      assistant: {
        title: 'CEO operating decision',
        focus: 'Margin, loss customers, and operating decision readiness are prioritized for executive review.',
        refs,
      },
    }
  }

  return {
    role,
    audience,
    title: 'PM projection',
    primaryKpis: [
      { id: 'feature', label: 'Feature driver', value: snapshot.topFeature },
      { id: 'customer', label: 'Customer segment', value: customerValue },
      { id: 'margin', label: 'Margin', value: marginValue },
    ],
    assistant: {
      title: 'PM feature economics',
      focus: 'Feature, customer, and plan economics are prioritized for product pricing decisions.',
      refs,
    },
  }
}
