import { describe, expect, it } from 'vitest'
import { detectBottlenecks } from './bottleneckAnalysis'

describe('detectBottlenecks', () => {
  it('flags top agent concentration, reused large input, retry, and budget overage', () => {
    const findings = detectBottlenecks({
      monthlyBudgetUsd: 300,
      teamEstimate: { monthlyCostUsd: 610, topAgentId: 'engineering', topAgentShare: 0.48 },
      agents: [
        {
          id: 'engineering',
          role: 'Engineering Agent',
          retryRate: 0.2,
          callsPerRun: 5,
          humanReviewGate: 'sample',
          frequency: { unit: 'week', count: 10 },
          inputs: [{ estTokens: 12000, reusedEachRun: true, name: 'codebase context' }],
          outputs: [{ estTokens: 3000, name: 'implementation plan' }],
        },
      ],
    })

    expect(findings.map(finding => finding.kind)).toEqual(expect.arrayContaining([
      'budget_overage',
      'top_agent_concentration',
      'cache_candidate',
      'agent_loop_depth',
    ]))
    findings.forEach(finding => {
      expect(finding.basisRef.sourceType).toMatch(/rule|self_baseline|peer_benchmark/)
      expect(finding.thresholdUsed).toBeTruthy()
      expect(Number.isFinite(finding.observedValue)).toBe(true)
    })
  })

  it('updates concentration findings when workspace threshold policy changes', () => {
    const baseInput = {
      monthlyBudgetUsd: 1000,
      teamEstimate: { monthlyCostUsd: 610, topAgentId: 'engineering', topAgentShare: 0.42 },
      agents: [
        {
          id: 'engineering',
          role: 'Engineering Agent',
          retryRate: 0,
          callsPerRun: 1,
          humanReviewGate: 'sample' as const,
          frequency: { unit: 'week' as const, count: 1 },
          inputs: [{ estTokens: 1000, reusedEachRun: false, name: 'task' }],
          outputs: [{ estTokens: 300, name: 'reply' }],
        },
      ],
    }

    expect(detectBottlenecks(baseInput).some(finding => finding.kind === 'top_agent_concentration')).toBe(true)
    expect(detectBottlenecks(baseInput, {
      thresholds: { top_agent_concentration_pct: 0.5 },
    }).some(finding => finding.kind === 'top_agent_concentration')).toBe(false)
  })
})
