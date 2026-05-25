import { describe, expect, it } from 'vitest'
import { projectSnapshotForRole } from './projectSnapshotForRole'

const snapshot = {
  monthlyCostUsd: 12340,
  grossMarginPct: 0.34,
  topAgentShare: 0.48,
  topFeature: 'CS triage',
  lossCustomerCount: 3,
  refs: ['tool:team.monthlyCostUsd', 'snapshot:cost:abc', 'risk:model-routing'],
}

describe('projectSnapshotForRole', () => {
  it('keeps shared KPI values identical across role lenses from one snapshot', () => {
    const developer = projectSnapshotForRole(snapshot, 'developer', 'internal')
    const pm = projectSnapshotForRole(snapshot, 'pm', 'internal')
    const ceo = projectSnapshotForRole(snapshot, 'ceo', 'internal')

    const valueFor = (projection: typeof developer, id: string) =>
      projection.primaryKpis.find(item => item.id === id)?.value

    expect(valueFor(developer, 'monthly_cost')).toBe(valueFor(ceo, 'monthly_cost'))
    expect(valueFor(pm, 'margin')).toBe(valueFor(ceo, 'margin'))
    expect(valueFor(pm, 'customer')).toBe(valueFor(ceo, 'customer'))
  })

  it('formats numeric snapshot values through the shared formatters', () => {
    const developer = projectSnapshotForRole(snapshot, 'developer', 'internal')
    const pm = projectSnapshotForRole(snapshot, 'pm', 'internal')
    const ceo = projectSnapshotForRole(snapshot, 'ceo', 'internal')

    expect(developer.primaryKpis.find(item => item.id === 'monthly_cost')?.value).toBe('$12,340')
    expect(developer.primaryKpis.find(item => item.id === 'top_agent_share')?.value).toBe('48%')
    expect(pm.primaryKpis.find(item => item.id === 'margin')?.value).toBe('34%')
    expect(pm.primaryKpis.find(item => item.id === 'feature')?.value).toBe('CS triage')
    expect(ceo.primaryKpis.find(item => item.id === 'customer')?.value).toBe('3 customers')
  })

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
    expect(internal.assistant.refs).toEqual(snapshot.refs)
  })
})
