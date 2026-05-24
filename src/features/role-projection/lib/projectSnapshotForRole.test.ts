import { describe, expect, it } from 'vitest'
import { projectSnapshotForRole } from './projectSnapshotForRole'

const snapshot = {
  monthlyCostLabel: '$12,340',
  marginLabel: '34%',
  topAgentShareLabel: '48%',
  featureLabel: 'CS triage',
  customerLabel: 'cust-heavy-01',
  refs: ['tool:team.monthlyCostUsd', 'snapshot:cost:abc', 'risk:model-routing'],
}

describe('projectSnapshotForRole', () => {
  it('returns different primary focus for developer, PM, and CEO roles', () => {
    const developer = projectSnapshotForRole(snapshot, 'developer', 'internal')
    const pm = projectSnapshotForRole(snapshot, 'pm', 'internal')
    const ceo = projectSnapshotForRole(snapshot, 'ceo', 'internal')

    expect(developer.primaryKpis.map(item => item.id)).toEqual(['top_agent_share', 'monthly_cost', 'debug_refs'])
    expect(pm.primaryKpis.map(item => item.id)).toEqual(['feature', 'customer', 'margin'])
    expect(ceo.primaryKpis.map(item => item.id)).toEqual(['monthly_cost', 'margin', 'customer'])
    expect(new Set([developer.assistant.title, pm.assistant.title, ceo.assistant.title]).size).toBe(3)
  })

  it('masks internal refs for customer audience and preserves them for admin audience', () => {
    const customer = projectSnapshotForRole(snapshot, 'developer', 'customer')
    const internal = projectSnapshotForRole(snapshot, 'developer', 'internal')

    expect(customer.assistant.refs).toEqual([])
    expect(customer.panelOrder).not.toContain('debug_refs')
    expect(internal.assistant.refs).toEqual(snapshot.refs)
    expect(internal.panelOrder).toContain('debug_refs')
  })
})
