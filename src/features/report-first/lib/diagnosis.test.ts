import { describe, expect, it } from 'vitest'

import { MODELS } from '../../../data/models'
import { CUSTOMER_MONTHLY_REVENUE, PLAN_MONTHLY_REVENUE, SPARK_CLAW_SAMPLE_CSV } from '../../usage/data/sparkClawSample'
import { parseUsageCsv } from '../../usage/lib/usageImport'
import { buildDiagnosisSnapshot, buildMarginDiagnosisSummary } from './diagnosis'

describe('buildDiagnosisSnapshot', () => {
  it('summarizes the margin diagnosis as customer-safe findings and actions', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: CUSTOMER_MONTHLY_REVENUE,
      planRevenueUsd: PLAN_MONTHLY_REVENUE,
      snapshotRef: 'usage:p1:workspace-demo:2026-05',
    })

    const diagnosis = buildMarginDiagnosisSummary(snapshot)

    expect(diagnosis.status).toBe('complete')
    expect(diagnosis.topLeak.title).toBe('가장 위험한 비용 누수')
    expect(diagnosis.topLeak.plainLanguageSummary).toMatch(/손해|비용|고객/)
    expect(diagnosis.marginBreakingFeature.title).toBe('마진을 깨는 기능')
    expect(diagnosis.recommendedDecision.title).toBe('추천 결정')
    expect(diagnosis.recommendedDecision.plainLanguageSummary).toMatch(/가격|credit|cap|overage|라우팅/)
    expect(diagnosis.evidenceState).toBe('근거 있음')
    expect(diagnosis.availableActions).toEqual(['view_evidence', 'draft_rate_card', 'export_pdf'])
    expect(diagnosis.topLeak.customerSafeEvidenceLabel).toBe('근거 있음')
    expect(diagnosis.topLeak.internalRefs).toEqual(expect.arrayContaining(['tool:diagnosis.loss_customers']))
  })

  it('builds the three report-first insights from SparkClaw usage without inventing numbers', () => {
    const summary = parseUsageCsv(SPARK_CLAW_SAMPLE_CSV, MODELS)
    const snapshot = buildDiagnosisSnapshot({
      workspaceId: 'workspace-demo',
      summary,
      customerRevenueUsd: CUSTOMER_MONTHLY_REVENUE,
      planRevenueUsd: PLAN_MONTHLY_REVENUE,
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
    expect(snapshot.insights[0].title).toBe('손해 고객')
    expect(snapshot.insights[1].title).toBe('마진 깨는 기능')
    expect(snapshot.insights[2].title).toBe('모델/요금제/제한 정책 후보')
    expect(snapshot.metrics.map(metric => metric.value).join(' ')).toContain('$')
    expect(snapshot.refs).toEqual(expect.arrayContaining([
      'tool:usage.import',
      'tool:diagnosis.loss_customers',
      'usage:p1:workspace-demo:2026-05',
    ]))
    expect(snapshot.decisionCandidates.length).toBeGreaterThanOrEqual(3)
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
