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
  monthlyCostLabel: string
  marginLabel: string
  topAgentShareLabel: string
  featureLabel: string
  customerLabel: string
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
  panelOrder: RoleProjectionPanelKey[]
  assistant: RoleAssistantProjection
}

function visibleRefs(snapshot: RoleProjectionSnapshot, audience: RoleProjectionAudience): string[] {
  return audience === 'internal' ? [...snapshot.refs] : []
}

export function projectSnapshotForRole(
  snapshot: RoleProjectionSnapshot,
  role: RoleProjectionRole,
  audience: RoleProjectionAudience,
): RoleViewModel {
  const refs = visibleRefs(snapshot, audience)
  const debugPanel: RoleProjectionPanelKey[] = audience === 'internal' ? ['debug_refs'] : []

  if (role === 'developer') {
    return {
      role,
      audience,
      title: 'Developer projection',
      primaryKpis: [
        { id: 'top_agent_share', label: 'Top agent share', value: snapshot.topAgentShareLabel },
        { id: 'monthly_cost', label: 'Monthly AI cost', value: snapshot.monthlyCostLabel },
        { id: 'debug_refs', label: 'Trace refs', value: refs.length > 0 ? `${refs.length} refs` : 'Stored in admin view' },
      ],
      panelOrder: [
        'operational_signals',
        'cost_attribution',
        'team_forecast',
        'report_output',
        'optimization_review',
        'team_cost_simulator',
        ...debugPanel,
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
        { id: 'monthly_cost', label: 'Monthly AI cost', value: snapshot.monthlyCostLabel },
        { id: 'margin', label: 'Margin', value: snapshot.marginLabel },
        { id: 'customer', label: 'Customer at risk', value: snapshot.customerLabel },
      ],
      panelOrder: [
        'margin_risk',
        'one_page_report',
        'decision_log',
        'optimization_review',
        'pricing_simulator',
        'cost_attribution',
        ...debugPanel,
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
      { id: 'feature', label: 'Feature driver', value: snapshot.featureLabel },
      { id: 'customer', label: 'Customer segment', value: snapshot.customerLabel },
      { id: 'margin', label: 'Margin', value: snapshot.marginLabel },
    ],
    panelOrder: [
      'cost_attribution',
      'pricing_simulator',
      'optimization_review',
      'margin_risk',
      'operating_ledger',
      'decision_log',
      ...debugPanel,
    ],
    assistant: {
      title: 'PM feature economics',
      focus: 'Feature, customer, and plan economics are prioritized for product pricing decisions.',
      refs,
    },
  }
}
