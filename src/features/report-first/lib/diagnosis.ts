import { fmtCurrency, fmtNumber, fmtPercent, fmtTokens } from '../../../lib/format'
import { isCostCalculableModel, MODELS } from '../../../data/models'
import { projectSnapshotForRole, type RoleProjectionRole, type RoleViewModel } from '../../role-projection/lib/projectSnapshotForRole'
import { rollupUsageByAxis, type AttributionRow } from '../../usage/lib/attribution'
import type { UsageImportSummary } from '../../usage/lib/usageImport'
import {
  CUSTOMER_MONTHLY_REVENUE,
  CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS,
  CUSTOMER_TOKEN_ALLOWANCE,
  PLAN_MONTHLY_REVENUE,
  PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS,
  PLAN_TOKEN_ALLOWANCE,
} from '../../usage/data/agentPayrollSample'
import { customerProfitability, heavyUserDetection, marginByPlan } from '../../unit-economics/lib/margin'
import { calculatePricingScenario, type PricingPolicy, type ScenarioResult } from '../../pricing/lib/pricingScenario'
import type { OnePageReportArtifactInput } from '../../report/lib/reportArtifacts'
import {
  deterministicPreviewRuntimeProof,
  humanApprovalFromDecisionChoice,
} from '../../provenance/lib/runtimeApprovalMetadata'
import {
  buildConnectorReadinessReport,
  connectorReadinessStatusLabel,
  type ConnectorReadinessReport,
} from './connectorContracts'
import {
  outcomeVerificationStatusLabel,
  verifyFeatureOutcomeMeasurements,
  type FeatureMeasurementContract,
  type FeatureOutcomeMeasurement,
  type OutcomeEventRow,
} from './outcomeMeasurement'

export type MoneyLeakDecisionChoice = 'adopt' | 'reject' | 'hold'
export type DiagnosisInsightKind = 'loss_customers' | 'margin_breaking_feature' | 'policy_candidate' | 'outcome_leak'
export type ReportGateStatus = 'preview_ready' | 'needs_mapping' | 'blocked'
export type DiagnosisDecisionKind = 'usage_limit' | 'pricing_policy' | 'model_routing'
export type LeakBreakdownStatus = 'detected' | 'not_detected' | 'needs_data'

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

export interface DiagnosisRoiProof {
  monthlyLossUsd: number
  topDecileSubsidyUsd: number
  bestPolicyMarginDeltaUsd: number
  paybackHint: string
}

export interface TokenLeakCustomer {
  customerId: string
  customerName?: string | null
  usedTokens: number
  includedTokens: number
  overageTokens: number
  allowanceMultiple: number
  aiCogsUsd: number
  revenueCollectedUsd: number
  unrecoveredCostUsd: number
  cogsToRevenuePct: number
  overageRateUsdPer1kTokens: number
  potentialOverageRevenueUsd: number
}

export interface TokenLeakFeature {
  feature: string
  usedTokens: number
  totalCostUsd: number
  shareOfTokens: number
  shareOfCost: number
  featureCostShare: number
  affectedPlanId: string | null
  planFeatureCostUsd: number
  planRevenueUsd: number
  featureCostToPlanRevenuePct: number
  planGrossMarginPct: number
}

export interface TokenPolicyRecommendation {
  title: string
  body: string
  expectedRecoveredUsd: number
  includedTokens: number
  overageRateUsdPer1kTokens: number
}

export interface TokenLeakProof {
  topCustomer: TokenLeakCustomer | null
  topFeature: TokenLeakFeature | null
  recommendedPolicy: TokenPolicyRecommendation | null
}

export interface LeakBreakdownItem {
  status: LeakBreakdownStatus
  label: string
  detail: string
}

export interface DiagnosisLeakBreakdown {
  policyLeak: LeakBreakdownItem
  operationalLeak: LeakBreakdownItem
  outcomeLeak: LeakBreakdownItem
}

export interface DiagnosisSnapshot {
  workspaceId: string
  snapshotRef: string | null
  reportGate: ReportGate
  roiProof: DiagnosisRoiProof
  tokenLeakProof: TokenLeakProof
  measurementContracts: FeatureMeasurementContract[]
  outcomeVerification: FeatureOutcomeMeasurement[]
  leakBreakdown: DiagnosisLeakBreakdown
  sourceCoverage: ConnectorReadinessReport
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
  customerIncludedTokens?: Record<string, number>
  planIncludedTokens?: Record<string, number>
  customerOverageRateUsdPer1kTokens?: Record<string, number>
  planOverageRateUsdPer1kTokens?: Record<string, number>
  measurementContracts?: FeatureMeasurementContract[]
  outcomeEvents?: OutcomeEventRow[]
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

function customerDisplayName(customer: Pick<TokenLeakCustomer, 'customerId' | 'customerName'>): string {
  return customer.customerName?.trim() || customer.customerId
}

function hasUsageIdentityMappingGap(summary: UsageImportSummary): boolean {
  const missing = summary.importHealthReport?.missingDimensionCounts
  return Boolean(missing && missing.customer > 0)
}

function mapHasKey(map: Record<string, number> | undefined, key: string): boolean {
  return Boolean(map && Object.prototype.hasOwnProperty.call(map, key))
}

function externalRevenueCoversUsage(
  summary: UsageImportSummary,
  customerRevenueUsd: Record<string, number> | undefined,
): boolean {
  const customerIds = unique(summary.rows.map(row => row.customerId ?? ''))

  return customerIds.length > 0
    && customerIds.every(customerId => mapHasKey(customerRevenueUsd, customerId))
}

function externalTokenAllowanceCoversUsage(
  summary: UsageImportSummary,
  customerIncludedTokens: Record<string, number> | undefined,
): boolean {
  const customerIds = unique(summary.rows.map(row => row.customerId ?? ''))

  return customerIds.length > 0
    && customerIds.every(customerId => mapHasKey(customerIncludedTokens, customerId))
}

function reportGateFrom(
  summary: UsageImportSummary,
  options: {
    hasExternalRevenue: boolean
    externalRevenueMappingGap: boolean
    hasTokenAllowance: boolean
    tokenAllowanceMappingGap: boolean
  },
): ReportGate {
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

  const keepUsageMappingGap = hasUsageIdentityMappingGap(summary)
  const mappingWarnings = unique([
    ...inspection.analysisScope.blocked,
    ...(summary.importHealthReport?.status === 'needs_mapping' ? ['mapping_gap'] : []),
    ...(inspection.status === 'needs_mapping' ? inspection.warnings : []),
    ...(options.externalRevenueMappingGap ? ['external_revenue_mapping_gap'] : []),
    ...(options.tokenAllowanceMappingGap ? ['external_token_allowance_mapping_gap'] : []),
  ]).filter(warning => (
    options.hasExternalRevenue && options.hasTokenAllowance
      ? warning !== 'revenue_missing'
        && warning !== 'loss_customer'
        && warning !== 'customer_profitability'
        && warning !== 'plan_margin'
        && warning !== 'plan_id_missing'
        && (warning !== 'mapping_gap' || keepUsageMappingGap)
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

const DEFAULT_OVERAGE_RATE_USD_PER_1K_TOKENS = 0.18

function usageTokens(row: UsageImportSummary['rows'][number]): number {
  return Math.max(0, row.inputTokens) + Math.max(0, row.outputTokens)
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function featureDisplayName(feature: string): string {
  if (feature === 'report_generation') return 'Report Generator'
  if (feature === 'faq_summary') return 'FAQ Summary'
  return feature
}

function allowanceTierLabel(planId: string | null): string {
  if (!planId) return '매핑된 요금제'
  return `${planId.charAt(0).toUpperCase()}${planId.slice(1)} 요금제`
}

function revenueForPlanFromCustomers(
  planRows: UsageImportSummary['rows'],
  customerRevenueUsd: Record<string, number>,
): number {
  return unique(planRows.map(row => row.customerId ?? '')).reduce((sum, customerId) => (
    sum + finiteNonNegative(customerRevenueUsd[customerId] ?? 0)
  ), 0)
}

function featurePlanImpactFrom(input: {
  rows: UsageImportSummary['rows']
  feature: string
  planRevenueUsd: Record<string, number>
  customerRevenueUsd: Record<string, number>
}): Pick<TokenLeakFeature, 'affectedPlanId' | 'planFeatureCostUsd' | 'planRevenueUsd' | 'featureCostToPlanRevenuePct' | 'planGrossMarginPct'> {
  const featurePlanIds = Array.from(new Set(input.rows
    .filter(row => row.feature === input.feature)
    .map(row => row.planId ?? '')))
  const impacts = featurePlanIds.map(planId => {
    const planRows = input.rows.filter(row => (row.planId ?? '') === planId)
    const featurePlanRows = planRows.filter(row => row.feature === input.feature)
    const planFeatureCostUsd = featurePlanRows.reduce((sum, row) => sum + finiteNonNegative(row.totalCostUsd), 0)
    const planTotalCostUsd = planRows.reduce((sum, row) => sum + finiteNonNegative(row.totalCostUsd), 0)
    const planRevenueUsd = mapHasKey(input.planRevenueUsd, planId)
      ? finiteNonNegative(input.planRevenueUsd[planId] ?? 0)
      : revenueForPlanFromCustomers(planRows, input.customerRevenueUsd)

    return {
      affectedPlanId: planId || null,
      planFeatureCostUsd,
      planRevenueUsd,
      featureCostToPlanRevenuePct: planRevenueUsd > 0 ? planFeatureCostUsd / planRevenueUsd : 0,
      planGrossMarginPct: planRevenueUsd > 0 ? (planRevenueUsd - planTotalCostUsd) / planRevenueUsd : 0,
    }
  })

  return impacts.sort((left, right) => (
    right.featureCostToPlanRevenuePct - left.featureCostToPlanRevenuePct
      || right.planFeatureCostUsd - left.planFeatureCostUsd
  ))[0] ?? {
    affectedPlanId: null,
    planFeatureCostUsd: 0,
    planRevenueUsd: 0,
    featureCostToPlanRevenuePct: 0,
    planGrossMarginPct: 0,
  }
}

function valueForCustomerOrPlan(
  customerMap: Record<string, number>,
  planMap: Record<string, number>,
  customerId: string,
  planId: string | null,
): number {
  if (mapHasKey(customerMap, customerId)) return customerMap[customerId] ?? 0
  if (planId && mapHasKey(planMap, planId)) return planMap[planId] ?? 0
  return 0
}

function rateForCustomerOrPlan(
  customerMap: Record<string, number>,
  planMap: Record<string, number>,
  customerId: string,
  planId: string | null,
): number {
  if (mapHasKey(customerMap, customerId)) return customerMap[customerId] ?? DEFAULT_OVERAGE_RATE_USD_PER_1K_TOKENS
  if (planId && mapHasKey(planMap, planId)) return planMap[planId] ?? DEFAULT_OVERAGE_RATE_USD_PER_1K_TOKENS
  return DEFAULT_OVERAGE_RATE_USD_PER_1K_TOKENS
}

function tokenLeakProofFrom(input: {
  summary: UsageImportSummary
  customerRevenueUsd: Record<string, number>
  planRevenueUsd: Record<string, number>
  customerIncludedTokens: Record<string, number>
  planIncludedTokens: Record<string, number>
  customerOverageRateUsdPer1kTokens: Record<string, number>
  planOverageRateUsdPer1kTokens: Record<string, number>
}): TokenLeakProof {
  const customerRows = input.summary.rows.reduce<Map<string, {
    customerId: string
    customerName: string | null
    planId: string | null
    usedTokens: number
    aiCogsUsd: number
  }>>((map, row) => {
    if (!row.customerId) return map
    const existing = map.get(row.customerId) ?? {
      customerId: row.customerId,
      customerName: row.customerName ?? null,
      planId: row.planId,
      usedTokens: 0,
      aiCogsUsd: 0,
    }
    existing.customerName = existing.customerName ?? row.customerName ?? null
    existing.planId = existing.planId ?? row.planId
    existing.usedTokens += usageTokens(row)
    existing.aiCogsUsd += Math.max(0, row.totalCostUsd)
    map.set(row.customerId, existing)
    return map
  }, new Map())

  const tokenCustomers: TokenLeakCustomer[] = [...customerRows.values()].map(customer => {
    const includedTokens = valueForCustomerOrPlan(
      input.customerIncludedTokens,
      input.planIncludedTokens,
      customer.customerId,
      customer.planId,
    )
    const revenueCollectedUsd = valueForCustomerOrPlan(
      input.customerRevenueUsd,
      input.planRevenueUsd,
      customer.customerId,
      customer.planId,
    )
    const overageRateUsdPer1kTokens = rateForCustomerOrPlan(
      input.customerOverageRateUsdPer1kTokens,
      input.planOverageRateUsdPer1kTokens,
      customer.customerId,
      customer.planId,
    )
    const overageTokens = Math.max(0, customer.usedTokens - includedTokens)
    const allowanceMultiple = includedTokens > 0 ? customer.usedTokens / includedTokens : 0
    const potentialOverageRevenueUsd = (overageTokens / 1_000) * overageRateUsdPer1kTokens
    const unrecoveredCostUsd = Math.max(0, customer.aiCogsUsd - revenueCollectedUsd)

    return {
      customerId: customer.customerId,
      customerName: customer.customerName,
      usedTokens: customer.usedTokens,
      includedTokens,
      overageTokens,
      allowanceMultiple,
      aiCogsUsd: customer.aiCogsUsd,
      revenueCollectedUsd,
      unrecoveredCostUsd,
      cogsToRevenuePct: revenueCollectedUsd > 0 ? customer.aiCogsUsd / revenueCollectedUsd : 0,
      overageRateUsdPer1kTokens,
      potentialOverageRevenueUsd,
    }
  })

  const topCustomer = tokenCustomers.sort((left, right) => (
    right.unrecoveredCostUsd - left.unrecoveredCostUsd
      || right.overageTokens - left.overageTokens
      || right.aiCogsUsd - left.aiCogsUsd
  ))[0] ?? null

  const totalTokens = input.summary.rows.reduce((sum, row) => sum + usageTokens(row), 0)
  const topFeatureSummary = [...input.summary.featureSummaries]
    .sort((left, right) => (
      right.totalCostUsd - left.totalCostUsd
        || (right.inputTokens + right.outputTokens) - (left.inputTokens + left.outputTokens)
    ))[0]
  const topFeature = topFeatureSummary
    ? (() => {
        const planImpact = featurePlanImpactFrom({
          rows: input.summary.rows,
          feature: topFeatureSummary.feature,
          planRevenueUsd: input.planRevenueUsd,
          customerRevenueUsd: input.customerRevenueUsd,
        })

        return {
          feature: topFeatureSummary.feature,
          usedTokens: topFeatureSummary.inputTokens + topFeatureSummary.outputTokens,
          totalCostUsd: topFeatureSummary.totalCostUsd,
          shareOfTokens: totalTokens > 0 ? (topFeatureSummary.inputTokens + topFeatureSummary.outputTokens) / totalTokens : 0,
          shareOfCost: topFeatureSummary.shareOfCost,
          featureCostShare: topFeatureSummary.shareOfCost,
          ...planImpact,
        }
      })()
    : null

  const recommendedPolicy = topCustomer
    ? (() => {
        const expectedRecoveredUsd = Math.max(topCustomer.unrecoveredCostUsd, topCustomer.potentialOverageRevenueUsd)
        const customerName = customerDisplayName(topCustomer)
        return {
          title: '포함 토큰 + 초과 과금 정책 후보',
          body: `${customerName} 기준으로 월 ${fmtTokens(topCustomer.includedTokens)} 토큰 포함 + 초과 1K 토큰당 ${fmtCurrency(topCustomer.overageRateUsdPer1kTokens, 2)} 과금을 검토하세요. 초과 사용량은 ${fmtTokens(topCustomer.overageTokens)} 토큰이고 예상 회수 후보: ${fmtCurrency(expectedRecoveredUsd)}.`,
          expectedRecoveredUsd,
          includedTokens: topCustomer.includedTokens,
          overageRateUsdPer1kTokens: topCustomer.overageRateUsdPer1kTokens,
        }
      })()
    : null

  return {
    topCustomer,
    topFeature,
    recommendedPolicy,
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

function bestGrossMarginScenario(scenarios: ScenarioResult[]): ScenarioResult | null {
  return [...scenarios].sort((left, right) => right.grossMarginUsd - left.grossMarginUsd)[0] ?? null
}

function roiProofFrom(input: {
  lossCustomers: ReturnType<typeof customerProfitability>
  heavyUsers: ReturnType<typeof heavyUserDetection>
  scenarios: ScenarioResult[]
}): DiagnosisRoiProof {
  const monthlyLossUsd = input.lossCustomers.reduce((sum, customer) => (
    sum + Math.max(0, -customer.grossMarginUsd)
  ), 0)
  const topDecileCount = input.heavyUsers.customers.length > 0
    ? Math.max(1, Math.ceil(input.heavyUsers.customers.length * 0.1))
    : 0
  const topDecileSubsidyUsd = Math.max(
    0,
    input.heavyUsers.topDecileCostUsd - (input.heavyUsers.medianCustomerCostUsd * topDecileCount),
  )
  const currentScenario = input.scenarios.find(scenario => scenario.policy === 'flat')
  const bestScenarioByMargin = bestGrossMarginScenario(input.scenarios)
  const bestPolicyMarginDeltaUsd = Math.max(
    0,
    (bestScenarioByMargin?.grossMarginUsd ?? 0) - (currentScenario?.grossMarginUsd ?? 0),
  )

  return {
    monthlyLossUsd,
    topDecileSubsidyUsd,
    bestPolicyMarginDeltaUsd,
    paybackHint: monthlyLossUsd > 0
      ? `이번 달 미회수 AI 원가 ${fmtCurrency(monthlyLossUsd)}부터 회수할 수 있는지 확인하세요.`
      : bestPolicyMarginDeltaUsd > 0
        ? `정책 변경 시 ${fmtCurrency(bestPolicyMarginDeltaUsd)} 개선 여지가 있습니다.`
        : '현재 입력에서는 큰 누수가 보이지 않습니다.',
  }
}

function modelCatalogPrice(modelId: string): number | null {
  const model = MODELS.find(item => item.id === modelId)
  if (!model || !isCostCalculableModel(model)) return null
  const totalPrice = model.inputPrice + model.outputPrice
  return Number.isFinite(totalPrice) && totalPrice > 0 ? totalPrice : null
}

function cheaperModelCandidateFor(modelId: string | undefined | null): {
  sourceModelId: string
  candidateModelId: string
  priceReductionPct: number
} | null {
  if (!modelId) return null
  const sourcePrice = modelCatalogPrice(modelId)
  if (!sourcePrice) return null
  const candidate = MODELS
    .filter(model => model.id !== modelId && isCostCalculableModel(model))
    .map(model => ({
      model,
      totalPrice: model.inputPrice + model.outputPrice,
    }))
    .filter(item => Number.isFinite(item.totalPrice) && item.totalPrice > 0 && item.totalPrice < sourcePrice)
    .sort((a, b) => a.totalPrice - b.totalPrice)[0]
  if (!candidate) return null
  return {
    sourceModelId: modelId,
    candidateModelId: candidate.model.id,
    priceReductionPct: (sourcePrice - candidate.totalPrice) / sourcePrice,
  }
}

function emptyLeakBreakdown(): DiagnosisLeakBreakdown {
  return {
    policyLeak: {
      status: 'needs_data',
      label: '정책 누수',
      detail: '매출, 포함량, 초과 과금 기준이 필요합니다.',
    },
    operationalLeak: {
      status: 'needs_data',
      label: '운영 누수',
      detail: '실패, 재시도, 지연, 모델 사용 패턴이 필요합니다.',
    },
    outcomeLeak: {
      status: 'needs_data',
      label: '성과 누수',
      detail: '성과 기준과 outcome CSV가 필요합니다.',
    },
  }
}

function primaryOutcomeVerification(verifications: FeatureOutcomeMeasurement[]): FeatureOutcomeMeasurement | null {
  return verifications.find(item => item.leakStatus === 'outcome_leak')
    ?? verifications.find(item => item.verificationStatus === 'partial')
    ?? verifications[0]
    ?? null
}

function outcomeVerificationOverallStatus(verifications: FeatureOutcomeMeasurement[]): string {
  if (verifications.length === 0) return '성과 기준 미설정'
  if (verifications.some(item => item.verificationStatus === 'verifiable')) return '검증 가능'
  if (verifications.some(item => item.verificationStatus === 'partial')) return '부분 검증'
  return '성과 기준 미설정'
}

function buildLeakBreakdown(input: {
  topTokenCustomer: TokenLeakCustomer | null
  failedOrRetryCount: number
  failedOrRetryCostUsd: number
  outcomeVerification: FeatureOutcomeMeasurement[]
}): DiagnosisLeakBreakdown {
  const outcome = primaryOutcomeVerification(input.outcomeVerification)
  return {
    policyLeak: input.topTokenCustomer && (input.topTokenCustomer.unrecoveredCostUsd > 0 || input.topTokenCustomer.potentialOverageRevenueUsd > 0)
      ? {
          status: 'detected',
          label: '정책 누수',
          detail: '고객 매출, 포함량, 초과 과금 기준에서 회수되지 않은 비용이 있습니다.',
        }
      : {
          status: input.topTokenCustomer ? 'not_detected' : 'needs_data',
          label: '정책 누수',
          detail: input.topTokenCustomer ? '현재 입력 기준 회수되지 않은 정책 누수가 뚜렷하지 않습니다.' : '고객별 매출과 포함량 매핑이 필요합니다.',
        },
    operationalLeak: input.failedOrRetryCount > 0
      ? {
          status: 'detected',
          label: '운영 누수',
          detail: `실패/재시도 ${fmtNumber(input.failedOrRetryCount)}건, 비용 ${fmtCurrency(input.failedOrRetryCostUsd)}가 보입니다.`,
        }
      : {
          status: 'not_detected',
          label: '운영 누수',
          detail: '현재 CSV에서는 실패/재시도 비용이 뚜렷하지 않습니다.',
        },
    outcomeLeak: outcome
      ? {
          status: outcome.leakStatus === 'outcome_leak'
            ? 'detected'
            : outcome.leakStatus === 'needs_outcome_data'
              ? 'needs_data'
              : 'not_detected',
          label: '성과 누수',
          detail: outcome.summary,
        }
      : {
          status: 'needs_data',
          label: '성과 누수',
          detail: '성과 기준 미설정 상태입니다.',
        },
  }
}

function sourceCoverageRecommendation(report: ConnectorReadinessReport): string {
  const sections = report.sections
    .map(section => `${section.label}: ${connectorReadinessStatusLabel(section.status)}`)
    .join(' / ')
  const usageSection = report.sections.find(section => section.kind === 'llm_usage')
  const usageSummary = usageSection?.status === 'csv_contract_ready' ? '사용량 CSV 계약 준비' : '사용량 샘플 지원'
  const columns = report.verifiedColumns.length > 0
    ? `확인 컬럼: ${report.verifiedColumns.slice(0, 10).join(', ')}`
    : '확인 컬럼: 샘플 또는 매핑 필요'
  return `데이터 출처 검증: ${usageSummary}. ${sections}. ${columns}. Live API는 ${connectorReadinessStatusLabel(report.liveConnectorStatus)}입니다.`
}

function roleViewsFor(input: {
  monthlyCostUsd: number
  grossMarginPct: number
  topFeature: string
  lossCustomerCount: number
  refs: string[]
  topTokenCustomer?: TokenLeakCustomer | null
  topTokenFeature?: TokenLeakFeature | null
  tokenPolicy?: TokenPolicyRecommendation | null
  topModel?: AttributionRow | null
  topSession?: AttributionRow | null
  topAgentRun?: AttributionRow | null
  p95OutputTokens?: number
  slowestRequest?: {
    requestId: string
    latencyMs: number
    status: string
  } | null
  failedOrRetryCount?: number
  failedOrRetryCostUsd?: number
  cheaperModelCandidate?: {
    sourceModelId: string
    candidateModelId: string
    priceReductionPct: number
  } | null
}): Record<RoleProjectionRole, RoleViewModel> {
  const base = {
    monthlyCostUsd: input.monthlyCostUsd,
    grossMarginPct: input.grossMarginPct,
    topAgentShare: 0,
    topFeature: input.topFeature,
    lossCustomerCount: input.lossCustomerCount,
    refs: input.refs,
  }
  const developer = projectSnapshotForRole(base, 'developer', 'customer')
  const pm = projectSnapshotForRole(base, 'pm', 'customer')
  const ceo = projectSnapshotForRole(base, 'ceo', 'customer')
  const topCustomer = input.topTokenCustomer
  const topFeature = input.topTokenFeature
  const tokenPolicy = input.tokenPolicy
  const topModel = input.topModel
  const topSession = input.topSession
  const topAgentRun = input.topAgentRun
  const slowestRequest = input.slowestRequest
  const cheaperModelCandidate = input.cheaperModelCandidate
  const topCustomerName = topCustomer ? customerDisplayName(topCustomer) : ''

  return {
    developer: {
      ...developer,
      assistant: {
        ...developer.assistant,
        focus: '모델, 토큰, 재시도, 캐시, 지연 시간을 먼저 보면서 비용 급증 원인을 찾습니다.',
      },
      cards: [
        {
          id: 'top_model',
          title: '고비용 모델',
          value: topModel?.label ?? '모델 매핑 필요',
          body: topModel
            ? `${fmtCurrency(topModel.totalCostUsd)} 비용, 전체 비용의 ${fmtPercent(topModel.shareOfCost)}입니다.`
            : 'model 컬럼이 있어야 모델별 비용을 볼 수 있습니다.',
        },
        {
          id: 'top_session',
          title: '비용이 튄 세션',
          value: topSession?.label ?? '세션 매핑 필요',
          body: topSession
            ? `${fmtCurrency(topSession.totalCostUsd)} 비용, 요청 ${fmtNumber(topSession.requestCount)}건이 묶였습니다.`
            : 'session_id 컬럼이 있어야 세션 단위 비용을 볼 수 있습니다.',
        },
        {
          id: 'top_agent_run',
          title: '비용이 튄 실행 기록',
          value: topAgentRun?.label ?? '실행 기록 매핑 필요',
          body: topAgentRun
            ? `${fmtCurrency(topAgentRun.totalCostUsd)} 비용, 출력 토큰 평균 ${fmtTokens(topAgentRun.avgOutputTokensPerRequest)}입니다.`
            : 'agent_run_id 컬럼이 있어야 실행 기록 단위 비용을 볼 수 있습니다.',
        },
        {
          id: 'token_latency_status',
          title: '출력 토큰/지연/상태',
          value: input.p95OutputTokens !== undefined ? `${fmtTokens(input.p95OutputTokens)} p95 출력` : '검토 필요',
          body: slowestRequest
            ? `가장 느린 요청은 ${slowestRequest.requestId}, ${fmtNumber(slowestRequest.latencyMs)}ms, 상태 ${slowestRequest.status}입니다. 실패/재시도 ${fmtNumber(input.failedOrRetryCount ?? 0)}건을 함께 봅니다.`
            : `실패/재시도 ${fmtNumber(input.failedOrRetryCount ?? 0)}건을 함께 봅니다.`,
        },
        {
          id: 'retry_waste',
          title: '실패/재시도 낭비 비용',
          value: `${fmtCurrency(input.failedOrRetryCostUsd ?? 0)} / ${fmtNumber(input.failedOrRetryCount ?? 0)}건`,
          body: input.failedOrRetryCount
            ? '실패/재시도 행을 세션과 실행 기록에 묶어 재호출 원인을 먼저 확인합니다.'
            : '현재 CSV에서는 실패/재시도 status가 보이지 않습니다.',
        },
        {
          id: 'cheaper_model_candidate',
          title: '저렴한 모델 후보',
          value: cheaperModelCandidate?.candidateModelId ?? '후보 검토 필요',
          body: cheaperModelCandidate
            ? `${cheaperModelCandidate.sourceModelId} 대신 ${cheaperModelCandidate.candidateModelId}를 같은 기능에서 품질 검증 후보로 비교합니다. 가격표 기준 단가가 ${fmtPercent(cheaperModelCandidate.priceReductionPct)} 낮습니다.`
            : '현재 고비용 모델보다 낮은 가격표 단가 후보를 찾지 못했습니다.',
        },
      ],
      actions: ['출력 길이 제한', '캐시 검토', '모델 교체 검토', '특정 기능의 호출 횟수 제한'],
    },
    pm: {
      ...pm,
      assistant: {
        ...pm.assistant,
        focus: '기능, 고객, 요금제 기준으로 제공 방식과 가격 정책을 다시 판단합니다.',
      },
      cards: [
        {
          id: 'feature_cost',
          title: '비용을 태우는 기능',
          value: topFeature ? topFeature.feature : input.topFeature,
          body: topFeature
            ? `전체 AI 비용의 ${fmtPercent(topFeature.featureCostShare)}를 만들고 있습니다.`
            : 'feature 컬럼 기준으로 비용을 다시 확인합니다.',
        },
        {
          id: 'customer_plan_impact',
          title: '영향 고객/요금제',
          value: topCustomer ? `${topCustomerName} / ${allowanceTierLabel(topFeature?.affectedPlanId ?? null)}` : '매핑 필요',
          body: topCustomer
            ? `회수된 매출 ${fmtCurrency(topCustomer.revenueCollectedUsd)} 대비 AI 원가 ${fmtCurrency(topCustomer.aiCogsUsd)}입니다.`
            : 'customer_id와 revenue_collected 매핑이 필요합니다.',
        },
        {
          id: 'packaging_choice',
          title: '제공 방식 판단',
          value: '기본 제공/유료화/제한/초과 과금',
          body: tokenPolicy?.body ?? '포함 토큰과 초과 과금 정책 후보를 먼저 계산합니다.',
        },
        {
          id: 'customer_copy',
          title: '고객에게 설명할 문장',
          value: '포함 사용량을 넘는 AI 작업은 별도 정책으로 안내',
          body: topFeature
            ? `${featureDisplayName(topFeature.feature)} 사용량이 포함 토큰을 빠르게 소진하므로, 기본 제공 범위와 초과 사용 기준을 분리해 안내합니다.`
            : '기능별 사용량을 확인한 뒤 고객 안내 문장을 확정합니다.',
        },
      ],
      actions: ['기능 기본 제공 유지 여부 검토', '유료 기능 분리', '사용량 제한', '초과 과금 문구 정리'],
    },
    ceo: {
      ...ceo,
      assistant: {
        ...ceo.assistant,
        focus: '확정 손실, 회수 후보, 검증 부족, 다음 달 필요한 데이터를 먼저 봅니다.',
      },
      cards: [
        {
          id: 'unrecovered_cost',
          title: '이번 달 미회수 AI 비용',
          value: fmtCurrency(topCustomer?.unrecoveredCostUsd ?? 0),
          body: topCustomer
            ? `${topCustomerName}에서 회수되지 않은 AI 원가가 가장 큽니다.`
            : '손해 고객 매핑이 준비되면 미회수 원가를 확정합니다.',
        },
        {
          id: 'loss_customer',
          title: '가장 손해 보는 고객',
          value: topCustomerName || '매핑 필요',
          body: topCustomer
            ? `포함 토큰의 ${fmtNumber(topCustomer.allowanceMultiple, 1)}배를 사용했습니다.`
            : 'customer_id, revenue_collected, included_tokens 연결이 필요합니다.',
        },
        {
          id: 'recommended_policy',
          title: '추천 정책',
          value: tokenPolicy?.title ?? '정책 후보 필요',
          body: tokenPolicy?.body ?? '포함 사용량 조정, 초과 사용 요금, 사용량 제한 중 하나를 검토합니다.',
        },
        {
          id: 'report_review',
          title: '리포트 생성과 다음 달 검산',
          value: '결정 기록 후 리포트 생성',
          body: '채택/보류/거절을 남기고 다음 달 같은 사용량, 매출, 성과 이벤트 CSV로 회수 여부와 검증 부족 항목을 다시 확인합니다.',
        },
      ],
      actions: ['정책 후보 선택', '채택/보류/거절 기록', '리포트 생성', '다음 달 검산일 지정'],
    },
  }
}

export function buildDiagnosisSnapshot(input: DiagnosisSnapshotInput): DiagnosisSnapshot {
  const hasExternalRevenueCoverage = externalRevenueCoversUsage(
    input.summary,
    input.customerRevenueUsd,
  )
  const hasTokenAllowanceCoverage = externalTokenAllowanceCoversUsage(
    input.summary,
    input.customerIncludedTokens,
  )
  const gate = reportGateFrom(input.summary, {
    hasExternalRevenue: hasExternalRevenueCoverage,
    externalRevenueMappingGap: Boolean(input.customerRevenueUsd || input.planRevenueUsd) && !hasExternalRevenueCoverage,
    hasTokenAllowance: hasTokenAllowanceCoverage,
    tokenAllowanceMappingGap: Boolean(input.customerIncludedTokens || input.planIncludedTokens) && !hasTokenAllowanceCoverage,
  })
  const sourceCoverage = buildConnectorReadinessReport({
    usageColumns: input.summary.schemaMappingProfile?.sourceColumns ?? [],
    hasRevenueMapping: hasExternalRevenueCoverage,
    hasOutcomeEvents: (input.outcomeEvents?.length ?? 0) > 0,
    hasPolicyDecision: false,
  })
  const refs = unique([
    'tool:usage.import',
    'tool:diagnosis.token_leak_customer',
    'tool:diagnosis.token_burning_feature',
    'tool:diagnosis.token_policy_candidate',
    'connector:source_coverage',
    input.snapshotRef ?? 'diagnosis_preview',
  ])

  if (!gate.canPreview) {
    return {
      workspaceId: input.workspaceId,
      snapshotRef: input.snapshotRef ?? null,
      reportGate: gate,
      roiProof: {
        monthlyLossUsd: 0,
        topDecileSubsidyUsd: 0,
        bestPolicyMarginDeltaUsd: 0,
        paybackHint: '분석 가능한 snapshot이 필요합니다.',
      },
      tokenLeakProof: {
        topCustomer: null,
        topFeature: null,
        recommendedPolicy: null,
      },
      measurementContracts: input.measurementContracts ?? [],
      outcomeVerification: [],
      leakBreakdown: emptyLeakBreakdown(),
      sourceCoverage,
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
  const customerIncludedTokens = input.customerIncludedTokens ?? CUSTOMER_TOKEN_ALLOWANCE
  const planIncludedTokens = input.planIncludedTokens ?? PLAN_TOKEN_ALLOWANCE
  const customerOverageRateUsdPer1kTokens = input.customerOverageRateUsdPer1kTokens ?? CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS
  const planOverageRateUsdPer1kTokens = input.planOverageRateUsdPer1kTokens ?? PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS
  const featureRollup = rollupUsageByAxis(input.summary.rows, 'feature')
  const modelRollup = rollupUsageByAxis(input.summary.rows, 'model')
  const sessionRollup = rollupUsageByAxis(input.summary.rows, 'session')
  const agentRunRollup = rollupUsageByAxis(input.summary.rows, 'agent_run')
  const topFeature = featureRollup.rows[0]
  const topModel = modelRollup.rows[0]
  const topSession = sessionRollup.rows[0]
  const topAgentRun = agentRunRollup.rows[0]
  const slowestRow = [...input.summary.rows]
    .filter(row => typeof row.latencyMs === 'number' && Number.isFinite(row.latencyMs))
    .sort((a, b) => (b.latencyMs ?? 0) - (a.latencyMs ?? 0))[0]
  const failedOrRetryRows = input.summary.rows.filter(row => {
    const status = row.status?.toLowerCase() ?? ''
    return status.includes('fail') || status.includes('retry') || status.includes('error')
  })
  const failedOrRetryCount = failedOrRetryRows.length
  const failedOrRetryCostUsd = failedOrRetryRows.reduce((total, row) => total + (Number.isFinite(row.totalCostUsd) ? Math.max(0, row.totalCostUsd) : 0), 0)
  const cheaperModelCandidate = cheaperModelCandidateFor(topModel?.label)
  const customers = customerProfitability(input.summary.rows, customerRevenueUsd)
  const heavyUsers = heavyUserDetection(input.summary.rows, customerRevenueUsd)
  const planMargins = marginByPlan(input.summary.rows, planRevenueUsd)
  const scenarios = scenarioSet(input.summary, customerRevenueUsd)
  const selectedScenario = bestScenario(scenarios)
  const weakestPlan = planMargins[0]
  const lossCustomers = customers.filter(row => row.marginRisk === 'loss')
  const grossMarginPct = weakestPlan?.grossMarginPct ?? selectedScenario?.grossMarginPct ?? 0
  const roiProof = roiProofFrom({ lossCustomers, heavyUsers, scenarios })
  const tokenLeakProof = tokenLeakProofFrom({
    summary: input.summary,
    customerRevenueUsd,
    planRevenueUsd,
    customerIncludedTokens,
    planIncludedTokens,
    customerOverageRateUsdPer1kTokens,
    planOverageRateUsdPer1kTokens,
  })
  const topTokenCustomer = tokenLeakProof.topCustomer
  const topTokenFeature = tokenLeakProof.topFeature
  const tokenPolicy = tokenLeakProof.recommendedPolicy
  const topTokenCustomerName = topTokenCustomer ? customerDisplayName(topTokenCustomer) : ''
  const measurementContracts = input.measurementContracts ?? []
  const outcomeVerification = measurementContracts.length > 0
    ? verifyFeatureOutcomeMeasurements({
        summary: input.summary,
        contracts: measurementContracts,
        outcomeEvents: input.outcomeEvents ?? [],
      })
    : []
  const primaryOutcome = primaryOutcomeVerification(outcomeVerification)
  const leakBreakdown = buildLeakBreakdown({
    topTokenCustomer,
    failedOrRetryCount,
    failedOrRetryCostUsd,
    outcomeVerification,
  })

  const insights: DiagnosisInsight[] = [
    {
      kind: 'loss_customers',
      title: '손해 고객',
      value: topTokenCustomer ? fmtCurrency(topTokenCustomer.unrecoveredCostUsd) : fmtCurrency(0),
      body: topTokenCustomer
        ? `${topTokenCustomerName} 고객은 이번 달 ${fmtTokens(topTokenCustomer.usedTokens)} 토큰을 사용해 포함 ${fmtTokens(topTokenCustomer.includedTokens)} 토큰의 ${fmtNumber(topTokenCustomer.allowanceMultiple, 1)}배를 썼습니다. 회수된 매출은 ${fmtCurrency(topTokenCustomer.revenueCollectedUsd)}인데 AI 토큰 원가는 ${fmtCurrency(topTokenCustomer.aiCogsUsd)}이라 미회수 AI 원가 ${fmtCurrency(topTokenCustomer.unrecoveredCostUsd)}가 보입니다.`
        : 'customer_id와 포함 토큰 매핑이 있으면 손해 고객을 계산할 수 있습니다.',
      refs: ['tool:diagnosis.token_leak_customer'],
    },
    {
      kind: 'margin_breaking_feature',
      title: '마진을 깨는 기능',
      value: topTokenFeature ? fmtTokens(topTokenFeature.usedTokens) : fmtTokens(0),
      body: topTokenFeature
        ? `${featureDisplayName(topTokenFeature.feature)}(${topTokenFeature.feature}) 기능이 전체 AI 비용의 ${fmtPercent(topTokenFeature.featureCostShare)}를 만들고, ${allowanceTierLabel(topTokenFeature.affectedPlanId)} 매출 대비 ${fmtPercent(topTokenFeature.featureCostToPlanRevenuePct)}를 태워 마진을 깎고 있습니다.`
        : '기능별 토큰 원가를 계산할 수 없습니다.',
      refs: ['tool:diagnosis.token_burning_feature'],
    },
    {
      kind: 'policy_candidate',
      title: '토큰 정책 후보',
      value: tokenPolicy ? fmtCurrency(tokenPolicy.expectedRecoveredUsd) : '—',
      body: tokenPolicy
        ? tokenPolicy.body
        : '포함 토큰과 매출 매핑이 있어야 정책 후보를 계산할 수 있습니다.',
      refs: ['tool:diagnosis.token_policy_candidate'],
    },
  ]

  if (measurementContracts.length > 0) {
    insights.push({
      kind: 'outcome_leak',
      title: '성과 누수',
      value: primaryOutcome ? outcomeVerificationStatusLabel(primaryOutcome.verificationStatus) : '성과 기준 미설정',
      body: primaryOutcome
        ? `${primaryOutcome.feature} 기능은 ${primaryOutcome.outcomeCriteriaLabel} 기준으로 봅니다. ${primaryOutcome.summary}`
        : '성과 기준이 선택되지 않아 성과 누수는 확정하지 않습니다.',
      refs: ['tool:diagnosis.outcome_measurement_contract'],
    })
  }

  const decisionCandidates: DiagnosisDecisionCandidate[] = [
    {
      id: 'decision:diagnosis:usage-limit',
      kind: 'usage_limit',
      title: '고객별 토큰 cap 검토',
      body: topTokenCustomer
        ? `${topTokenCustomerName} 고객이 포함 토큰을 ${fmtNumber(topTokenCustomer.allowanceMultiple, 1)}배 사용했습니다. cap, credit 전환, enterprise bundle 중 하나를 검토합니다.`
        : `${fmtTokens(lossCustomers.length)} 손해 고객과 top-decile 비용 share ${fmtPercent(heavyUsers.topDecileShare)}를 기준으로 제한 정책을 검토합니다.`,
      refs: ['tool:diagnosis.token_leak_customer'],
    },
    {
      id: 'decision:diagnosis:pricing-policy',
      kind: 'pricing_policy',
      title: '포함 토큰 + 초과 과금 정책 후보',
      body: tokenPolicy
        ? tokenPolicy.body
        : selectedScenario
          ? `${selectedScenario.policy} 정책 후보 적용 시 revenue_collected 대비 AI 토큰 원가를 줄일 여지가 있습니다.`
          : '토큰 정책 후보를 계산할 수 없습니다.',
      refs: ['tool:diagnosis.token_policy_candidate'],
    },
    {
      id: 'decision:diagnosis:model-routing',
      kind: 'model_routing',
      title: '고비용 토큰 라우팅 재검토',
      body: topModel
        ? `${topModel.label} 모델이 ${fmtCurrency(topModel.totalCostUsd)}의 토큰 원가를 만들고 있습니다. 품질/지연 시간 검증 후 더 저렴한 모델 A/B 테스트를 보류로 검토합니다.`
        : '모델별 비용을 계산할 수 없습니다.',
      refs: ['tool:diagnosis.model_routing'],
    },
  ]

  const metrics: DiagnosisMetric[] = [
    { id: 'monthly_loss', label: '미회수 AI 원가', value: fmtCurrency(topTokenCustomer?.unrecoveredCostUsd ?? roiProof.monthlyLossUsd), help: '회수된 매출 대비 AI 토큰 원가 초과분' },
    { id: 'ai_cogs', label: 'AI 토큰 원가', value: fmtCurrency(input.summary.totalCostUsd) },
    { id: 'loss_customers', label: '손해 고객', value: topTokenCustomer ? topTokenCustomerName : fmtTokens(lossCustomers.length) },
    { id: 'policy_margin_delta', label: '초과 과금 회수 후보', value: fmtCurrency(tokenPolicy?.expectedRecoveredUsd ?? roiProof.bestPolicyMarginDeltaUsd), help: tokenPolicy?.title },
    { id: 'top_feature_cost', label: '최고 token 기능', value: topTokenFeature ? fmtTokens(topTokenFeature.usedTokens) : fmtCurrency(topFeature?.totalCostUsd ?? 0), help: topTokenFeature?.feature ?? topFeature?.label },
    { id: 'weakest_margin', label: 'COGS/매출 비율', value: fmtPercent(topTokenCustomer?.cogsToRevenuePct ?? grossMarginPct), help: topTokenCustomerName || 'customer allowance / revenue_collected 기준' },
  ]

  if (measurementContracts.length > 0) {
    metrics.push({
      id: 'outcome_verification',
      label: '성과 검증 등급',
      value: outcomeVerificationOverallStatus(outcomeVerification),
      help: primaryOutcome?.summary,
    })
    metrics.push({
      id: 'outcome_unit_cost',
      label: '성과 1건당 AI 원가',
      value: primaryOutcome?.costPerSuccessfulOutcomeUsd !== null && primaryOutcome?.costPerSuccessfulOutcomeUsd !== undefined
        ? fmtCurrency(primaryOutcome.costPerSuccessfulOutcomeUsd)
        : '검증 필요',
      help: primaryOutcome?.outcomeCriteriaLabel,
    })
  }

  return {
      workspaceId: input.workspaceId,
      snapshotRef: input.snapshotRef ?? null,
      reportGate: gate,
      roiProof,
      tokenLeakProof,
      measurementContracts,
      outcomeVerification,
      leakBreakdown,
      sourceCoverage,
      metrics,
      insights,
      decisionCandidates,
    roleViews: roleViewsFor({
      monthlyCostUsd: input.summary.totalCostUsd,
      grossMarginPct,
      topFeature: topFeature?.label ?? 'unknown',
      lossCustomerCount: lossCustomers.length,
      refs,
      topTokenCustomer,
      topTokenFeature,
      tokenPolicy,
      topModel,
      topSession,
      topAgentRun,
      p95OutputTokens: input.summary.p95OutputTokens,
      slowestRequest: slowestRow
        ? {
            requestId: slowestRow.requestId ?? 'request_id 없음',
            latencyMs: slowestRow.latencyMs ?? 0,
            status: slowestRow.status ?? 'unknown',
          }
        : null,
      failedOrRetryCount,
      failedOrRetryCostUsd,
      cheaperModelCandidate,
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
  const outcome = primaryOutcomeVerification(snapshot.outcomeVerification)
  const outcomeRecommendation = outcome
    ? `성과 기준: ${outcome.outcomeCriteriaLabel} / 원가 기준: ${outcome.costCriteriaLabel} / 누수 기준: ${outcome.leakCriteriaLabel} / 검증 등급: ${outcomeVerificationStatusLabel(outcome.verificationStatus)}`
    : '성과 기준 미설정: 기능별 성과 기준을 선택하지 않아 성과 누수는 확정하지 않습니다.'
  const sourceCoverage = sourceCoverageRecommendation(snapshot.sourceCoverage)
  const risks = [
    ...(snapshot.reportGate.warnings.length > 0 ? snapshot.reportGate.warnings : ['저장된 artifact 생성 전에는 PDF 공유를 완료로 표시하지 않습니다.']),
    ...(outcome?.verificationStatus === 'partial' ? ['성과 이벤트 CSV가 없어 성과 누수로 확정하지 않습니다.'] : []),
  ]

  return {
    title: 'AI 비용 누수 리포트',
    executiveSummary: snapshot.insights.map(insight => `${insight.title}: ${insight.body}`).join(' '),
    metrics: snapshot.metrics.map(metric => ({ label: metric.label, value: metric.value })),
    recommendations: [candidate.body, outcomeRecommendation, sourceCoverage, snapshot.roiProof.paybackHint],
    risks,
    refs: snapshot.refs,
    trust: {
      status: snapshot.reportGate.status,
      dataLimitations: snapshot.reportGate.warnings,
      retentionNote: 'Raw prompt와 API key는 받지 않고, 업로드 원본은 30일 안에 삭제 또는 재확인해야 합니다.',
    },
    formulaVersion: 'token_leak_formula_v0.1',
    providerRegistryVersion: 'provider_registry_v0.4',
    snapshotVersion: snapshot.snapshotRef ?? 'diagnosis_preview',
    decisionRefs: [candidate.id],
    decisionChoice,
    runtimeProof: deterministicPreviewRuntimeProof(),
    humanApproval: humanApprovalFromDecisionChoice(decisionChoice),
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
      title: '손해 고객',
      plainLanguageSummary: lossInsight
        ? lossInsight.body
        : 'customer_id, included_tokens, revenue_collected 매핑이 있어야 누수 고객을 확인할 수 있습니다.',
      metricLabel: lossInsight?.value ?? '—',
      severity: lossInsight && lossInsight.value !== fmtTokens(0) ? 'critical' : 'watch',
      customerSafeEvidenceLabel: evidenceState,
      internalRefs: lossInsight?.refs ?? [],
    },
    marginBreakingFeature: {
      title: '마진을 깨는 기능',
      plainLanguageSummary: featureInsight
        ? featureInsight.body
        : '기능별 토큰 원가 근거가 아직 준비되지 않았습니다.',
      metricLabel: featureInsight?.value ?? '—',
      severity: featureInsight && featureInsight.value !== fmtCurrency(0) ? 'caution' : 'watch',
      customerSafeEvidenceLabel: evidenceState,
      internalRefs: featureInsight?.refs ?? [],
    },
    recommendedDecision: {
      title: '토큰 정책 후보',
      plainLanguageSummary: selectedDecision
        ? `${selectedDecision.body} 포함 토큰, 초과 과금, cap 중 어떤 정책을 바꿀지 검토합니다.`
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
