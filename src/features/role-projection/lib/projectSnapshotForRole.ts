export type RoleProjectionRole = 'developer' | 'pm' | 'ceo'
export type RoleProjectionAudience = 'customer' | 'internal'

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
  panelOrder: string[]
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
  const debugPanel = audience === 'internal' ? ['debug_refs'] : []

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
      panelOrder: ['model_tokens', 'retry_cache', 'tool_refs', ...debugPanel],
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
      panelOrder: ['profitability', 'loss_customers', 'pricing_decision', ...debugPanel],
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
    panelOrder: ['feature_cost', 'customer_impact', 'plan_margin', ...debugPanel],
    assistant: {
      title: 'PM feature economics',
      focus: 'Feature, customer, and plan economics are prioritized for product pricing decisions.',
      refs,
    },
  }
}
