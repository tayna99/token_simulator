import { fmtCurrency, fmtPercent, fmtTokens } from '../../../lib/format'
import { projectSnapshotForRole, type RoleProjectionRole, type RoleViewModel } from '../../role-projection/lib/projectSnapshotForRole'
import { rollupUsageByAxis } from '../../usage/lib/attribution'
import type { UsageImportSummary } from '../../usage/lib/usageImport'
import { CUSTOMER_MONTHLY_REVENUE, PLAN_MONTHLY_REVENUE } from '../../usage/data/sparkClawSample'
import { customerProfitability, heavyUserDetection, marginByPlan } from '../../unit-economics/lib/margin'
import { calculatePricingScenario, type PricingPolicy, type ScenarioResult } from '../../pricing/lib/pricingScenario'
import type { OnePageReportArtifactInput } from '../../report/lib/reportArtifacts'

export type MoneyLeakDecisionChoice = 'adopt' | 'reject' | 'hold'
export type DiagnosisInsightKind = 'loss_customers' | 'margin_breaking_feature' | 'policy_candidate'
export type ReportGateStatus = 'preview_ready' | 'needs_mapping' | 'blocked'
export type DiagnosisDecisionKind = 'usage_limit' | 'pricing_policy' | 'model_routing'

export interface DiagnosisMetric {
  id: string
  label: string
  value: string
  help?: string
}

export interface DiagnosisInsight {
  kind: DiagnosisInsightKind
  title: string
  value: string
  body: string
  refs: string[]
}

export interface DiagnosisDecisionCandidate {
  id: string
  kind: DiagnosisDecisionKind
  title: string
  body: string
  refs: string[]
}

export interface ReportGate {
  status: ReportGateStatus
  canPreview: boolean
  canCreateArtifact: boolean
  reason: string
  warnings: string[]
}

export interface DiagnosisSnapshot {
  workspaceId: string
  snapshotRef: string | null
  reportGate: ReportGate
  metrics: DiagnosisMetric[]
  insights: DiagnosisInsight[]
  decisionCandidates: DiagnosisDecisionCandidate[]
  roleViews: Record<RoleProjectionRole, RoleViewModel>
  refs: string[]
}

export interface DiagnosisSnapshotInput {
  workspaceId: string
  summary: UsageImportSummary
  customerRevenueUsd?: Record<string, number>
  planRevenueUsd?: Record<string, number>
  snapshotRef?: string | null
}

export type MarginDiagnosisStatus = 'complete' | 'needs_data' | 'needs_review'
export type MarginDiagnosisAction = 'view_evidence' | 'draft_rate_card' | 'export_pdf'
export type MarginDiagnosisSeverity = 'watch' | 'caution' | 'critical'
export type CustomerSafeEvidenceLabel = '근거 있음' | '검토 필요' | 'baseline unavailable'

export interface MarginDiagnosisFinding {
  title: string
  plainLanguageSummary: string
  metricLabel: string
  severity: MarginDiagnosisSeverity
  customerSafeEvidenceLabel: CustomerSafeEvidenceLabel
  internalRefs: string[]
}

export interface MarginDiagnosisSummary {
  status: MarginDiagnosisStatus
  topLeak: MarginDiagnosisFinding
  marginBreakingFeature: MarginDiagnosisFinding
  recommendedDecision: MarginDiagnosisFinding
  evidenceState: CustomerSafeEvidenceLabel
  availableActions: MarginDiagnosisAction[]
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function reportGateFrom(summary: UsageImportSummary, options: { hasExternalRevenue: boolean }): ReportGate {
  const inspection = summary.trustInspection
  if (!inspection) {
    return {
      status: 'blocked',
      canPreview: false,
      canCreateArtifact: false,
      reason: 'summary_trust_inspection_missing',
      warnings: ['summary_trust_inspection_missing'],
    }
  }

  if (!inspection.allowedForSnapshot || inspection.status === 'blocked') {
    return {
      status: 'blocked',
      canPreview: false,
      canCreateArtifact: false,
      reason: inspection.warnings.join(', ') || 'trust_inspection_blocked',
      warnings: inspection.warnings,
    }
  }

  const mappingWarnings = unique([
    ...inspection.analysisScope.blocked,
    ...(summary.importHealthReport?.status === 'needs_mapping' ? ['mapping_gap'] : []),
    ...(inspection.status === 'needs_mapping' ? inspection.warnings : []),
  ]).filter(warning => (
    options.hasExternalRevenue
      ? warning !== 'revenue_missing'
        && warning !== 'loss_customer'
        && warning !== 'customer_profitability'
      : true
  ))

  if (mappingWarnings.length > 0) {
    return {
      status: 'needs_mapping',
      canPreview: true,
      canCreateArtifact: false,
      reason: mappingWarnings.join(', '),
      warnings: mappingWarnings,
    }
  }

  return {
    status: 'preview_ready',
    canPreview: true,
    canCreateArtifact: true,
    reason: 'ready',
    warnings: [],
  }
}

function scenarioSet(summary: UsageImportSummary, currentRevenueByCustomer: Record<string, number>): ScenarioResult[] {
  const policies: Array<{ policy: PricingPolicy; baseSubscriptionUsd?: number; includedRequests?: number; overagePricePerRequest?: number; usagePricePerRequest?: number; capCostUsdPerCustomer?: number }> = [
    { policy: 'flat' },
    { policy: 'credit', baseSubscriptionUsd: 99, includedRequests: 1, overagePricePerRequest: 45 },
    { policy: 'usage', usagePricePerRequest: 60 },
    { policy: 'cap', capCostUsdPerCustomer: Math.max(1, summary.totalCostUsd / Math.max(1, summary.requestCount)) },
  ]

  return policies.map(policy => calculatePricingScenario(summary.rows, {
    ...policy,
    currentRevenueByCustomer,
  }))
}

function bestScenario(scenarios: ScenarioResult[]): ScenarioResult | null {
  return [...scenarios].sort((left, right) => right.grossMarginPct - left.grossMarginPct)[0] ?? null
}

function roleViewsFor(input: {
  monthlyCostUsd: number
  grossMarginPct: number
  topFeature: string
  lossCustomerCount: number
  refs: string[]
}): Record<RoleProjectionRole, RoleViewModel> {
  const base = {
    monthlyCostUsd: input.monthlyCostUsd,
    grossMarginPct: input.grossMarginPct,
    topAgentShare: 0,
    topFeature: input.topFeature,
    lossCustomerCount: input.lossCustomerCount,
    refs: input.refs,
  }
  return {
    developer: projectSnapshotForRole(base, 'developer', 'customer'),
    pm: projectSnapshotForRole(base, 'pm', 'customer'),
    ceo: projectSnapshotForRole(base, 'ceo', 'customer'),
  }
}

export function buildDiagnosisSnapshot(input: DiagnosisSnapshotInput): DiagnosisSnapshot {
  const gate = reportGateFrom(input.summary, {
    hasExternalRevenue: Boolean(input.customerRevenueUsd) && Boolean(input.planRevenueUsd),
  })
  const refs = unique([
    'tool:usage.import',
    'tool:diagnosis.loss_customers',
    'tool:diagnosis.feature_margin',
    'tool:diagnosis.policy_candidate',
    input.snapshotRef ?? 'diagnosis_preview',
  ])

  if (!gate.canPreview) {
    return {
      workspaceId: input.workspaceId,
      snapshotRef: input.snapshotRef ?? null,
      reportGate: gate,
      metrics: [],
      insights: [],
      decisionCandidates: [],
      roleViews: roleViewsFor({
        monthlyCostUsd: 0,
        grossMarginPct: Number.NaN,
        topFeature: 'unknown',
        lossCustomerCount: 0,
        refs,
      }),
      refs,
    }
  }

  const customerRevenueUsd = input.customerRevenueUsd ?? CUSTOMER_MONTHLY_REVENUE
  const planRevenueUsd = input.planRevenueUsd ?? PLAN_MONTHLY_REVENUE
  const featureRollup = rollupUsageByAxis(input.summary.rows, 'feature')
  const modelRollup = rollupUsageByAxis(input.summary.rows, 'model')
  const topFeature = featureRollup.rows[0]
  const topModel = modelRollup.rows[0]
  const customers = customerProfitability(input.summary.rows, customerRevenueUsd)
  const heavyUsers = heavyUserDetection(input.summary.rows, customerRevenueUsd)
  const planMargins = marginByPlan(input.summary.rows, planRevenueUsd)
  const scenarios = scenarioSet(input.summary, customerRevenueUsd)
  const selectedScenario = bestScenario(scenarios)
  const weakestPlan = planMargins[0]
  const lossCustomers = customers.filter(row => row.marginRisk === 'loss')
  const grossMarginPct = weakestPlan?.grossMarginPct ?? selectedScenario?.grossMarginPct ?? 0

  const insights: DiagnosisInsight[] = [
    {
      kind: 'loss_customers',
      title: '손해 고객',
      value: fmtTokens(lossCustomers.length),
      body: lossCustomers.length > 0
        ? `${lossCustomers[0].customerId} 고객부터 원가가 매출을 넘습니다.`
        : '현재 입력에서는 손해 고객이 없습니다.',
      refs: ['tool:diagnosis.loss_customers'],
    },
    {
      kind: 'margin_breaking_feature',
      title: '마진 깨는 기능',
      value: topFeature ? fmtCurrency(topFeature.totalCostUsd) : fmtCurrency(0),
      body: topFeature
        ? `${topFeature.label} 기능이 전체 비용의 ${fmtPercent(topFeature.shareOfCost)}를 차지합니다.`
        : '기능별 비용을 계산할 수 없습니다.',
      refs: ['tool:diagnosis.feature_margin'],
    },
    {
      kind: 'policy_candidate',
      title: '모델/요금제/제한 정책 후보',
      value: selectedScenario ? fmtPercent(selectedScenario.grossMarginPct) : '—',
      body: selectedScenario
        ? `${selectedScenario.policy} 정책 후보가 현재 입력에서 가장 높은 gross margin을 만듭니다.`
        : '정책 후보를 계산할 사용량이 없습니다.',
      refs: ['tool:diagnosis.policy_candidate'],
    },
  ]

  const decisionCandidates: DiagnosisDecisionCandidate[] = [
    {
      id: 'decision:diagnosis:usage-limit',
      kind: 'usage_limit',
      title: '손해 고객 사용량 제한 검토',
      body: `${fmtTokens(lossCustomers.length)} 손해 고객과 top-decile 비용 share ${fmtPercent(heavyUsers.topDecileShare)}를 기준으로 제한 정책을 검토합니다.`,
      refs: ['tool:diagnosis.loss_customers'],
    },
    {
      id: 'decision:diagnosis:pricing-policy',
      kind: 'pricing_policy',
      title: '요금제/credit 정책 변경 후보',
      body: selectedScenario
        ? `${selectedScenario.policy} 정책 후보의 예상 gross margin은 ${fmtPercent(selectedScenario.grossMarginPct)}입니다.`
        : '요금제 후보를 계산할 수 없습니다.',
      refs: ['tool:diagnosis.policy_candidate'],
    },
    {
      id: 'decision:diagnosis:model-routing',
      kind: 'model_routing',
      title: '고비용 모델 라우팅 재검토',
      body: topModel
        ? `${topModel.label} 모델 비용이 ${fmtCurrency(topModel.totalCostUsd)}입니다. 품질 검증 후 라우팅 변경을 검토합니다.`
        : '모델별 비용을 계산할 수 없습니다.',
      refs: ['tool:diagnosis.model_routing'],
    },
  ]

  const metrics: DiagnosisMetric[] = [
    { id: 'ai_cogs', label: 'AI 원가', value: fmtCurrency(input.summary.totalCostUsd) },
    { id: 'loss_customers', label: '손해 고객', value: fmtTokens(lossCustomers.length) },
    { id: 'top_feature_cost', label: '최고 비용 기능', value: topFeature ? fmtCurrency(topFeature.totalCostUsd) : fmtCurrency(0), help: topFeature?.label },
    { id: 'weakest_margin', label: '최저 플랜 마진', value: fmtPercent(grossMarginPct), help: weakestPlan?.planId },
  ]

  return {
    workspaceId: input.workspaceId,
    snapshotRef: input.snapshotRef ?? null,
    reportGate: gate,
    metrics,
    insights,
    decisionCandidates,
    roleViews: roleViewsFor({
      monthlyCostUsd: input.summary.totalCostUsd,
      grossMarginPct,
      topFeature: topFeature?.label ?? 'unknown',
      lossCustomerCount: lossCustomers.length,
      refs,
    }),
    refs,
  }
}

export function reportFirstPayloadFromDiagnosis(
  snapshot: DiagnosisSnapshot,
  decisionCandidateId: string,
  decisionChoice: MoneyLeakDecisionChoice,
): OnePageReportArtifactInput {
  const candidate = snapshot.decisionCandidates.find(item => item.id === decisionCandidateId)
  if (!candidate) {
    throw new Error('money_leak_decision_candidate_missing')
  }

  return {
    title: 'AgentPayroll AI SaaS 마진 진단 리포트',
    executiveSummary: snapshot.insights.map(insight => `${insight.title}: ${insight.body}`).join(' '),
    metrics: snapshot.metrics.map(metric => ({ label: metric.label, value: metric.value })),
    recommendations: [candidate.body],
    risks: snapshot.reportGate.warnings.length > 0 ? snapshot.reportGate.warnings : ['저장된 artifact 생성 전에는 PDF 공유를 완료로 표시하지 않습니다.'],
    refs: snapshot.refs,
    trust: {
      status: snapshot.reportGate.status,
      dataLimitations: snapshot.reportGate.warnings,
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
    },
    formulaVersion: 'cost_formula_v0.3',
    providerRegistryVersion: 'provider_registry_v0.4',
    snapshotVersion: snapshot.snapshotRef ?? 'diagnosis_preview',
    decisionRefs: [candidate.id],
    decisionChoice,
  }
}

export function buildMarginDiagnosisSummary(snapshot: DiagnosisSnapshot): MarginDiagnosisSummary {
  const lossInsight = snapshot.insights.find(insight => insight.kind === 'loss_customers')
  const featureInsight = snapshot.insights.find(insight => insight.kind === 'margin_breaking_feature')
  const policyInsight = snapshot.insights.find(insight => insight.kind === 'policy_candidate')
  const selectedDecision = snapshot.decisionCandidates[0]
  const evidenceState: CustomerSafeEvidenceLabel = snapshot.refs.length > 0 && snapshot.reportGate.canPreview ? '근거 있음' : '검토 필요'
  const status: MarginDiagnosisStatus = snapshot.reportGate.status === 'preview_ready'
    ? 'complete'
    : snapshot.reportGate.status === 'needs_mapping'
      ? 'needs_review'
      : 'needs_data'

  return {
    status,
    topLeak: {
      title: '가장 위험한 비용 누수',
      plainLanguageSummary: lossInsight
        ? `${lossInsight.body} 고객 단위 손해와 비용 누수를 먼저 확인해야 합니다.`
        : '손해 고객과 비용 누수를 확인할 데이터가 아직 부족합니다.',
      metricLabel: lossInsight?.value ?? '—',
      severity: lossInsight && lossInsight.value !== fmtTokens(0) ? 'critical' : 'watch',
      customerSafeEvidenceLabel: evidenceState,
      internalRefs: lossInsight?.refs ?? [],
    },
    marginBreakingFeature: {
      title: '마진을 깨는 기능',
      plainLanguageSummary: featureInsight
        ? featureInsight.body
        : '기능별 원가/마진 근거가 아직 준비되지 않았습니다.',
      metricLabel: featureInsight?.value ?? '—',
      severity: featureInsight && featureInsight.value !== fmtCurrency(0) ? 'caution' : 'watch',
      customerSafeEvidenceLabel: evidenceState,
      internalRefs: featureInsight?.refs ?? [],
    },
    recommendedDecision: {
      title: '추천 결정',
      plainLanguageSummary: selectedDecision
        ? `${selectedDecision.body} 가격, credit, cap, overage, 라우팅 중 어떤 결정을 바꿀지 검토합니다.`
        : (policyInsight?.body ?? '결정 후보를 만들 수 없습니다.'),
      metricLabel: policyInsight?.value ?? '검토 필요',
      severity: status === 'complete' ? 'caution' : 'watch',
      customerSafeEvidenceLabel: evidenceState,
      internalRefs: unique([...(selectedDecision?.refs ?? []), ...(policyInsight?.refs ?? [])]),
    },
    evidenceState,
    availableActions: snapshot.reportGate.canCreateArtifact
      ? ['view_evidence', 'draft_rate_card', 'export_pdf']
      : snapshot.reportGate.canPreview
        ? ['view_evidence', 'draft_rate_card']
        : [],
  }
}
