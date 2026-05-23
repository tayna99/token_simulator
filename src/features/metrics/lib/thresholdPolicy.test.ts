import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THRESHOLD_POLICY,
  basisLabel,
  createBasisRef,
  createMetricFlag,
  getThreshold,
  mergeThresholdPolicy,
  staleFactSourceWarning,
} from './thresholdPolicy'

describe('threshold policy', () => {
  it('exposes adjustable default thresholds with explicit rule basis', () => {
    const thinMargin = getThreshold(DEFAULT_THRESHOLD_POLICY, 'gross_margin_thin_pct')

    expect(thinMargin).toMatchObject({
      id: 'gross_margin_thin_pct',
      defaultValue: 0.4,
      currentValue: 0.4,
      sourceType: 'rule',
      adjustable: true,
      policyVersion: '2026-05-23.p0',
    })
  })

  it('merges workspace overrides without losing provenance fields', () => {
    const policy = mergeThresholdPolicy(DEFAULT_THRESHOLD_POLICY, {
      gross_margin_thin_pct: 0.5,
    })

    const threshold = getThreshold(policy, 'gross_margin_thin_pct')
    expect(threshold.currentValue).toBe(0.5)
    expect(threshold.defaultValue).toBe(0.4)
    expect(threshold.sourceType).toBe('rule')
    expect(threshold.policyVersion).toBe('2026-05-23.p0')
  })

  it('requires metric flags to carry a rule/self/peer basis', () => {
    const threshold = getThreshold(DEFAULT_THRESHOLD_POLICY, 'retry_rate_pct')
    const basisRef = createBasisRef(threshold, { observedValue: 0.18 })
    const flag = createMetricFlag({
      metricId: 'agent.retryRate',
      severity: 'medium',
      basisRef,
      thresholdUsed: threshold,
      observedValue: 0.18,
    })

    expect(flag.basisRef.sourceType).toBe('rule')
    expect(flag.thresholdUsed.currentValue).toBe(0.1)
    expect(basisLabel(flag.basisRef)).toContain('rule:')
  })

  it('marks old official fact sources as needing verification', () => {
    expect(staleFactSourceWarning('2026-04-22', '2026-05-23')).toBe('Price source should be re-verified')
    expect(staleFactSourceWarning('2026-05-10', '2026-05-23')).toBeNull()
  })
})
