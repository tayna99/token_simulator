import { describe, expect, it } from 'vitest'
import {
  buildAgentPayrollPdcaInstrumentation,
  evaluateMonthlyReviewReadiness,
  scoreAgentPayrollIcp,
} from './pdcaInstrumentation'

describe('AgentPayroll unit economics PDCA instrumentation', () => {
  it('routes A-grade ICP leads to snapshot or monthly review when decision evidence is present', () => {
    const result = scoreAgentPayrollIcp({
      hasProductionAiFeature: true,
      monthlyLlmSpendKrw: 240_000,
      canExportMetadataWithoutRawPrompt: true,
      availableAxes: ['customer', 'feature', 'plan', 'revenue'],
      hasDecisionOwner: true,
      decisionUrgency: 'pricing_or_margin_now',
    })

    expect(result.grade).toBe('A')
    expect(result.route).toBe('snapshot_or_monthly_review')
    expect(result.qualifiedAxes).toBe(4)
    expect(result.reasons).toContain('decision_owner_present')
  })

  it('keeps weak or slow fit checks out of free analysis and routes them to paid readiness', () => {
    const result = buildAgentPayrollPdcaInstrumentation({
      icp: {
        hasProductionAiFeature: true,
        monthlyLlmSpendKrw: 90_000,
        canExportMetadataWithoutRawPrompt: true,
        availableAxes: ['customer', 'feature'],
        hasDecisionOwner: true,
        decisionUrgency: 'exploratory',
      },
      operations: {
        freeFitMinutes: 12,
        dataReadinessMinutes: 50,
        snapshotMinutes: 240,
        monthlyReviewMinutes: 100,
        operatorTouchCount: 3,
      },
      decisionLoop: {
        decisionChoice: null,
        hasNextReviewDate: false,
        hasDecisionOwner: true,
        attributionAxes: ['customer', 'feature'],
        hasPersistedReportArtifact: false,
      },
    })

    expect(result.icp.grade).toBe('B')
    expect(result.icp.route).toBe('paid_data_readiness')
    expect(result.operations.freeFit.status).toBe('exceeded')
    expect(result.operations.dataReadiness.status).toBe('exceeded')
    expect(result.operations.snapshot.status).toBe('exceeded')
    expect(result.operations.operatorTouch.status).toBe('exceeded')
    expect(result.recommendedNextActions).toContain('stop_free_analysis_and_route_to_paid_readiness')
  })

  it('requires an adopt/reject/hold decision before monthly review is eligible', () => {
    const blocked = evaluateMonthlyReviewReadiness({
      decisionChoice: null,
      hasNextReviewDate: true,
      hasDecisionOwner: true,
      attributionAxes: ['customer', 'plan'],
      hasPersistedReportArtifact: true,
    })

    expect(blocked.eligible).toBe(false)
    expect(blocked.blockingReasons).toContain('decision_required')

    const ready = evaluateMonthlyReviewReadiness({
      decisionChoice: 'hold',
      hasNextReviewDate: true,
      hasDecisionOwner: true,
      attributionAxes: ['customer', 'plan'],
      hasPersistedReportArtifact: true,
    })

    expect(ready.eligible).toBe(true)
    expect(ready.blockingReasons).toEqual([])
    expect(ready.followUpIntent).toBe('monthly_decision_review')
  })
})
