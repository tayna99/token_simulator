import { describe, expect, it } from 'vitest'

import { MODELS } from '../../../data/models'
import {
  CUSTOMER_MONTHLY_REVENUE,
  CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS,
  CUSTOMER_TOKEN_ALLOWANCE,
  PLAN_MONTHLY_REVENUE,
  PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS,
  PLAN_TOKEN_ALLOWANCE,
  SPARK_CLAW_SAMPLE_CSV,
} from '../../usage/data/sparkClawSample'
import { parseUsageCsv } from '../../usage/lib/usageImport'
import { buildDiagnosisSnapshot, buildMarginDiagnosisSummary, reportFirstPayloadFromDiagnosis } from './diagnosis'

describe('buildDiagnosisSnapshot', () => {
  it('summarizes the margin diagnosis as customer-safe findings and actions', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: CUSTOMER_MONTHLY_REVENUE,
      planRevenueUsd: PLAN_MONTHLY_REVENUE,
      customerIncludedTokens: CUSTOMER_TOKEN_ALLOWANCE,
      planIncludedTokens: PLAN_TOKEN_ALLOWANCE,
      customerOverageRateUsdPer1kTokens: CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS,
      planOverageRateUsdPer1kTokens: PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS,
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    const diagnosis = buildMarginDiagnosisSummary(snapshot)

    expect(diagnosis.status).toBe('complete')
    expect(diagnosis.topLeak.title).toBe('토큰 누수 고객')
    expect(diagnosis.topLeak.plainLanguageSummary).toMatch(/tokens|미회수|고객/)
    expect(diagnosis.marginBreakingFeature.title).toBe('토큰을 가장 많이 태우는 기능')
    expect(diagnosis.recommendedDecision.title).toBe('Token policy 후보')
    expect(diagnosis.recommendedDecision.plainLanguageSummary).toMatch(/credit|cap|overage|routing|token/)
    expect(diagnosis.evidenceState).toBe('근거 있음')
    expect(diagnosis.availableActions).toEqual(['view_evidence', 'draft_rate_card', 'export_pdf'])
    expect(diagnosis.topLeak.customerSafeEvidenceLabel).toBe('근거 있음')
    expect(diagnosis.topLeak.internalRefs).toEqual(expect.arrayContaining(['tool:diagnosis.token_leak_customer']))
  })

  it('builds the three report-first insights from SparkClaw usage without inventing numbers', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: CUSTOMER_MONTHLY_REVENUE,
      planRevenueUsd: PLAN_MONTHLY_REVENUE,
      customerIncludedTokens: CUSTOMER_TOKEN_ALLOWANCE,
      planIncludedTokens: PLAN_TOKEN_ALLOWANCE,
      customerOverageRateUsdPer1kTokens: CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS,
      planOverageRateUsdPer1kTokens: PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS,
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    expect(snapshot.reportGate).toMatchObject({
      status: 'preview_ready',
      canPreview: true,
      canCreateArtifact: true,
    })
    expect(snapshot.insights.map(insight => insight.kind)).toEqual([
      'loss_customers',
      'margin_breaking_feature',
      'policy_candidate',
    ])
    expect(snapshot.insights[0].title).toBe('토큰 누수 고객')
    expect(snapshot.insights[1].title).toBe('토큰을 태우는 기능')
    expect(snapshot.insights[2].title).toBe('Token policy 후보')
    expect(snapshot.metrics.map(metric => metric.value).join(' ')).toContain('$')
    expect(snapshot.refs).toEqual(expect.arrayContaining([
      'tool:usage.import',
      'tool:diagnosis.token_leak_customer',
      'usage:p1:workspace-demo:2026-05',
    ]))
    expect(snapshot.decisionCandidates.length).toBeGreaterThanOrEqual(3)
    expect(snapshot.tokenLeakProof.topCustomer).toMatchObject({
      customerId: 'cust_001',
      includedTokens: 185000,
      overageTokens: 445000,
    })
  })

  it('builds buyer-facing ROI proof for monthly leak, heavy-user subsidy, and policy delta', () => {
    const summary = parseUsageCsv([
      'timestamp,request_id,customer_id,plan_id,feature,model,input_tokens,output_tokens,total_cost',
      '2026-05-01,req_1,cus_loss,pro,rag_chat,claude-sonnet-4.6,1000,500,120',
      '2026-05-01,req_2,cus_healthy,pro,summary,claude-sonnet-4.6,1000,500,10',
    ].join('\n'), MODELS)
    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: {
        cus_loss: 50,
        cus_healthy: 200,
      },
      planRevenueUsd: {
        pro: 250,
      },
      customerIncludedTokens: {
        cus_loss: 1000,
        cus_healthy: 5000,
      },
      customerOverageRateUsdPer1kTokens: {
        cus_loss: 0.2,
        cus_healthy: 0.2,
      },
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    expect(snapshot.roiProof).toMatchObject({
      monthlyLossUsd: 70,
      topDecileSubsidyUsd: 55,
      bestPolicyMarginDeltaUsd: expect.any(Number),
    })
    expect(snapshot.roiProof.bestPolicyMarginDeltaUsd).toBeGreaterThanOrEqual(0)
    expect(snapshot.roiProof.paybackHint).toContain('이번 달 미회수 AI 원가')
    expect(snapshot.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'monthly_loss', label: '미회수 AI 원가', value: '$70' }),
      expect.objectContaining({ id: 'policy_margin_delta', label: 'overage 회수 후보' }),
    ]))
  })

  it('does not preselect Adopt Reject or Hold on decision candidates', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: CUSTOMER_MONTHLY_REVENUE,
      planRevenueUsd: PLAN_MONTHLY_REVENUE,
      customerIncludedTokens: CUSTOMER_TOKEN_ALLOWANCE,
      planIncludedTokens: PLAN_TOKEN_ALLOWANCE,
      customerOverageRateUsdPer1kTokens: CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS,
      planOverageRateUsdPer1kTokens: PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS,
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    expect(snapshot.decisionCandidates.length).toBeGreaterThan(0)
    expect(snapshot.decisionCandidates.every(candidate => !('decisionChoice' in candidate))).toBe(true)
  })

  it('requires an explicit user decision choice when building the report-first payload', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: CUSTOMER_MONTHLY_REVENUE,
      planRevenueUsd: PLAN_MONTHLY_REVENUE,
      customerIncludedTokens: CUSTOMER_TOKEN_ALLOWANCE,
      planIncludedTokens: PLAN_TOKEN_ALLOWANCE,
      customerOverageRateUsdPer1kTokens: CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS,
      planOverageRateUsdPer1kTokens: PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS,
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    const payload = reportFirstPayloadFromDiagnosis(
      snapshot,
      'decision:diagnosis:pricing-policy',
      'adopt',
    )

    expect(payload.decisionRefs).toEqual(['decision:diagnosis:pricing-policy'])
    expect(payload.decisionChoice).toBe('adopt')
    expect(payload.humanApproval).toMatchObject({
      required: true,
      decisionChoice: 'adopt',
      approvedBy: 'workspace_user',
      approvalMode: 'explicit_button',
    })
    expect(payload.runtimeProof).toMatchObject({
      status: 'deterministic_preview',
      fallbackReason: 'money_leak_run_deterministic_snapshot_only',
      agentInvocationProof: [],
    })
    expect(payload.title).toBe('AgentPayroll API Token Leakage Report')
    expect(payload.recommendations[0]).toMatch(/token|overage|정책/)
  })

  it('throws a clear error when the selected decision candidate is missing', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({ workspaceId: 'workspace-demo', summary })

    expect(() => reportFirstPayloadFromDiagnosis(
      snapshot,
      'decision:diagnosis:not-found',
      'hold',
    )).toThrow('money_leak_decision_candidate_missing')
  })

  it('keeps mapping gaps as needs_mapping and disables persisted report creation', () => {
    const summary = parseUsageCsv([
      'timestamp,feature,model,input_tokens,output_tokens,total_cost',
      '2026-05-01,rag_chat,claude-sonnet-4.6,1000,500,12',
    ].join('\n'), MODELS)

    const snapshot = buildDiagnosisSnapshot({ workspaceId: 'workspace-demo', summary })

    expect(snapshot.reportGate.status).toBe('needs_mapping')
    expect(snapshot.reportGate.canPreview).toBe(true)
    expect(snapshot.reportGate.canCreateArtifact).toBe(false)
    expect(snapshot.reportGate.reason).toContain('customer_profitability')
  })

  it('does not let external revenue override missing usage customer or plan mapping', () => {
    const summary = parseUsageCsv([
      'timestamp,feature,model,input_tokens,output_tokens,total_cost,customer_id,plan_id',
      '2026-05-01,rag_chat,claude-sonnet-4.6,1000,500,120,,pro',
      '2026-05-01,summary,claude-sonnet-4.6,1000,500,10,cus_healthy,',
    ].join('\n'), MODELS)

    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: {
        cus_loss: 50,
        cus_healthy: 200,
      },
      planRevenueUsd: {
        pro: 250,
      },
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    expect(snapshot.reportGate.status).toBe('needs_mapping')
    expect(snapshot.reportGate.canPreview).toBe(true)
    expect(snapshot.reportGate.canCreateArtifact).toBe(false)
    expect(snapshot.reportGate.reason).toContain('mapping_gap')
  })

  it('does not let unrelated external revenue unlock persisted report creation', () => {
    const summary = parseUsageCsv([
      'timestamp,feature,model,input_tokens,output_tokens,total_cost,customer_id,plan_id',
      '2026-05-01,rag_chat,claude-sonnet-4.6,1000,500,120,cus_loss,pro',
    ].join('\n'), MODELS)

    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: {
        unrelated_customer: 500,
      },
      planRevenueUsd: {
        enterprise: 500,
      },
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    expect(snapshot.reportGate.status).toBe('needs_mapping')
    expect(snapshot.reportGate.canPreview).toBe(true)
    expect(snapshot.reportGate.canCreateArtifact).toBe(false)
    expect(snapshot.reportGate.reason).toContain('external_revenue_mapping_gap')
  })

  it('blocks raw prompt or API key CSVs before diagnosis preview', () => {
    const summary = parseUsageCsv([
      'timestamp,prompt,api_key,feature,model,input_tokens,output_tokens',
      '2026-05-01,"raw customer text",sk-test,classification,gemini-3.1-flash,1000,500',
    ].join('\n'), MODELS)

    const snapshot = buildDiagnosisSnapshot({ workspaceId: 'workspace-demo', summary })

    expect(snapshot.reportGate.status).toBe('blocked')
    expect(snapshot.reportGate.canPreview).toBe(false)
    expect(snapshot.reportGate.canCreateArtifact).toBe(false)
    expect(snapshot.insights).toEqual([])
    expect(snapshot.reportGate.warnings).toEqual(expect.arrayContaining([
      'raw_prompt_detected',
      'api_key_candidate_detected',
    ]))
  })
})
