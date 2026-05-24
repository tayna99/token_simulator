# AgentCost Front Operating System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/AgentCost_AI_Native_Front_Operating_System.md`의 9개 앞단 운영 장치를 AgentCost 웹앱 안에 고객 선별, 데이터 게이트, 유료 진입, 샘플 리포트, 승인, 학습 루프까지 이어지는 P0 운영 흐름으로 구현한다.

**Architecture:** 비용과 마진 계산은 계속 `src/lib/calculator.ts`와 기존 usage/pricing/domain 모듈이 소유한다. 새 front-operating 모듈은 ICP 점수, Self-Assessment, Data Readiness, 상품 사다리, 운영 자산, 승인 게이트, 학습 기록만 순수 TypeScript 규칙으로 만든다. UI는 기존 `CustomerDashboardEntryPanel` 아래에 붙는 운영 앞문 패널로 시작하고, 실제 CSV 분석은 기존 `UsageImportPanel`, `ImportTrustCheckPanel`, Decision/Approval Log로 연결한다.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Tailwind CSS 3, Vitest 4, Testing Library, 기존 `src/shared/ui/primitives`, 기존 `src/lib/format.ts`.

---

## Spec Coverage

이 계획은 스펙의 9개 장치를 다음 P0 산출물로 매핑한다.

- ICP 필터: `scoreLeadFit()` 순수 함수와 UI 점수 카드.
- Lead Magnet: P0에서는 콘텐츠 생성 자동화가 아니라 전환용 메시지/CTA 카탈로그로 구현한다.
- Self-Assessment: 8개 질문과 결과 판정 함수, UI 체크리스트.
- Data Readiness Gate: 받는 컬럼, 받지 않는 데이터, 분석 가능/제한 범위, Trust check 연결.
- 샘플 리포트: 공개 더미 기반 `AI Cost Snapshot` 섹션 목록과 기존 `OnePageReportPanel` 진입.
- 유료 진입 상품 사다리: Free Fit Check, Data Readiness Check, AI Cost Snapshot, Monthly Review.
- Operating Asset Registry: 앞단 운영 자산 카탈로그와 localStorage 기록 저장소.
- Human Approval Gate: AI 가능 작업과 사람 승인 필수 작업의 명시적 matrix.
- Learning Loop: 고객 종료 후 9개 질문 기록과 제품화 backlog 후보 생성.

구현하지 않는 범위는 명시적으로 P1이다.

- 실제 결제, 이메일 발송, LinkedIn 발행, Notion/Airtable 동기화.
- LLM이 홈페이지를 크롤링해 ICP를 자동 판정하는 기능.
- 서버/DB 기반 리드 관리. 현재 프로젝트 헌법상 클라이언트 사이드 only를 유지한다.

## File Structure

- Create: `src/features/front-operating/lib/frontOperatingSystem.ts`
  - ICP, Self-Assessment, Data Readiness, Offer Ladder, Approval Gate, Learning Loop 순수 규칙.
  - 비용 계산을 하지 않으며, 표시용 숫자는 UI에서 `format.ts` helper만 사용한다.

- Create: `src/features/front-operating/lib/frontOperatingSystem.test.ts`
  - A/B/C ICP, Self-Assessment 결과, Data Readiness scope, 운영 자산, 승인 게이트, Learning Loop를 검증한다.

- Create: `src/features/front-operating/lib/frontOperatingStore.ts`
  - client-only localStorage 저장소. 리드 intake, self-assessment, learning loop 기록을 저장/로드/내보내기한다.

- Create: `src/features/front-operating/lib/frontOperatingStore.test.ts`
  - invalid JSON drop, stable export filename, append 저장을 검증한다.

- Create: `src/features/front-operating/components/FrontOperatingSystemPanel.tsx`
  - 고객용 앞문 패널. ICP fit, Self-Assessment, Data Gate, Sample Report, Offer Ladder, Approval Gate, Learning Loop를 한 화면에서 보여준다.

- Create: `src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx`
  - 렌더, `rerender` state sync, 체크박스 변경, CTA callback을 검증한다.

- Modify: `src/lib/format.ts`
  - KRW 상품 사다리 표시를 위한 `fmtKrw`, `fmtKrwRange`를 추가한다. 컴포넌트에서 `₩`, `toLocaleString`, 숫자 문자열 조합을 직접 하지 않는다.

- Modify: `src/lib/format.test.ts`
  - KRW formatter와 NaN guard 테스트를 추가한다.

- Modify: `src/features/trust/lib/dataIntakePolicy.ts`
  - Data Readiness Gate의 권장 컬럼과 금지 컬럼을 상수로 노출한다.

- Modify: `src/features/trust/lib/securityMiddleware.test.ts`
  - raw prompt/API key/PII 금지와 recommended attribution column 경고를 유지 검증한다.

- Modify: `src/app/App.tsx`
  - `CustomerDashboardEntryPanel` 아래에 `FrontOperatingSystemPanel`을 배치한다.
  - CTA는 기존 flow만 연다: sample/report는 기존 SparkClaw/report 경로, data gate는 existing import stage, decision log는 existing decision-log stage.

- Modify: `src/app/App.test.tsx`
  - app shell에서 front operating panel이 보이는지, SparkClaw sample/report/data gate CTA가 기존 stage를 여는지 검증한다.

---

### Task 1: KRW Formatting Boundary

**Files:**
- Modify: `src/lib/format.ts`
- Modify: `src/lib/format.test.ts`

- [ ] **Step 1: Write failing formatter tests**

Append these tests to `src/lib/format.test.ts` and update the import.

```ts
import { fmtCurrency, fmtPercent, fmtTokens, fmtPricePerMillion, fmtDelta, fmtNumber, fmtKrw, fmtKrwRange } from './format'

describe('fmtKrw', () => {
  it('formats Korean won with grouping and no decimal places', () => {
    expect(fmtKrw(50_000)).toBe('₩50,000')
    expect(fmtKrw(1_500_000)).toBe('₩1,500,000')
  })

  it('returns "—" for invalid KRW values', () => {
    expect(fmtKrw(NaN)).toBe('—')
    expect(fmtKrw(Infinity)).toBe('—')
  })
})

describe('fmtKrwRange', () => {
  it('formats a low-high KRW range through the shared formatter', () => {
    expect(fmtKrwRange(50_000, 150_000)).toBe('₩50,000~₩150,000')
  })

  it('returns "—" when either side is invalid', () => {
    expect(fmtKrwRange(50_000, NaN)).toBe('—')
  })
})
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm run test:run -- src/lib/format.test.ts`

Expected: FAIL with missing `fmtKrw` / `fmtKrwRange` exports.

- [ ] **Step 3: Add format helpers in the shared boundary**

Append this code to `src/lib/format.ts`.

```ts
export function fmtKrw(n: number): string {
  if (!isValid(n)) return INVALID
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('ko-KR', {
    maximumFractionDigits: 0,
  })
  return n < 0 ? `-₩${formatted}` : `₩${formatted}`
}

export function fmtKrwRange(min: number, max: number): string {
  if (!isValid(min) || !isValid(max)) return INVALID
  return `${fmtKrw(min)}~${fmtKrw(max)}`
}
```

- [ ] **Step 4: Run the focused test and confirm pass**

Run: `npm run test:run -- src/lib/format.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add KRW formatting helpers"
```

---

### Task 2: Front Operating Domain Rules

**Files:**
- Create: `src/features/front-operating/lib/frontOperatingSystem.ts`
- Create: `src/features/front-operating/lib/frontOperatingSystem.test.ts`

- [ ] **Step 1: Write failing domain tests**

Create `src/features/front-operating/lib/frontOperatingSystem.test.ts`.

```ts
import { describe, expect, it } from 'vitest'
import {
  FRONT_OPERATING_ASSETS,
  HUMAN_APPROVAL_GATES,
  OFFER_LADDER,
  SAMPLE_REPORT_SECTIONS,
  SELF_ASSESSMENT_QUESTIONS,
  createLearningLoopRecord,
  evaluateDataReadinessHeaders,
  evaluateSelfAssessment,
  scoreLeadFit,
} from './frontOperatingSystem'

describe('frontOperatingSystem', () => {
  it('classifies A, B, and C leads from explicit ICP signals', () => {
    expect(scoreLeadFit({
      companyName: 'SparkClaw',
      productType: 'ai_saas',
      aiFeatureLive: true,
      monthlyLlmCostKrw: 700_000,
      hasUsageLogs: true,
      pricingModel: 'hybrid',
      painType: 'margin',
    }).grade).toBe('A')

    expect(scoreLeadFit({
      companyName: 'EarlyAI',
      productType: 'ai_saas',
      aiFeatureLive: true,
      monthlyLlmCostKrw: 120_000,
      hasUsageLogs: false,
      pricingModel: 'flat',
      painType: 'data_readiness',
    }).grade).toBe('B')

    expect(scoreLeadFit({
      companyName: 'IdeaOnly',
      productType: 'idea',
      aiFeatureLive: false,
      monthlyLlmCostKrw: 0,
      hasUsageLogs: false,
      pricingModel: 'unknown',
      painType: 'none',
    }).grade).toBe('C')
  })

  it('evaluates the eight-question self assessment into the paid entry path', () => {
    expect(SELF_ASSESSMENT_QUESTIONS).toHaveLength(8)

    const snapshotReady = evaluateSelfAssessment({
      liveAiFeature: true,
      minimumMonthlyCost: true,
      customerUsageSplit: true,
      featureUsageSplit: true,
      planRevenueJoin: true,
      retryLogs: true,
      metadataOnlyExport: true,
      decisionToChange: true,
    })

    expect(snapshotReady.result).toBe('snapshot_ready')
    expect(snapshotReady.nextAction).toBe('AI Cost Snapshot 제안')

    const readiness = evaluateSelfAssessment({
      liveAiFeature: true,
      minimumMonthlyCost: true,
      customerUsageSplit: false,
      featureUsageSplit: true,
      planRevenueJoin: false,
      retryLogs: false,
      metadataOnlyExport: true,
      decisionToChange: true,
    })

    expect(readiness.result).toBe('readiness_check')
    expect(readiness.blockers).toEqual(expect.arrayContaining(['customer_usage_missing', 'plan_revenue_missing']))
  })

  it('turns CSV headers into readiness scope without guessing missing dimensions', () => {
    const ready = evaluateDataReadinessHeaders([
      'timestamp',
      'customer_id',
      'plan_id',
      'feature',
      'model',
      'input_tokens',
      'output_tokens',
      'total_cost',
      'status',
      'retry_count',
    ])
    const limited = evaluateDataReadinessHeaders(['timestamp', 'feature', 'model', 'input_tokens', 'output_tokens'])

    expect(ready.status).toBe('ready')
    expect(ready.availableAnalysis).toEqual(expect.arrayContaining(['feature_cost', 'customer_cost', 'plan_margin', 'retry_cost']))
    expect(limited.status).toBe('limited')
    expect(limited.blockedAnalysis).toEqual(expect.arrayContaining(['customer_cost', 'plan_margin', 'retry_cost']))
  })

  it('defines operating assets, sample report sections, offer ladder, and human approval gates', () => {
    expect(FRONT_OPERATING_ASSETS.map(asset => asset.id)).toEqual([
      'icp_scorecard',
      'lead_intake_log',
      'self_assessment_rules',
      'data_readiness_checklist',
      'sample_report_template',
      'offer_ladder',
      'approval_matrix',
      'learning_loop_review',
      'productization_backlog',
    ])
    expect(SAMPLE_REPORT_SECTIONS).toHaveLength(8)
    expect(OFFER_LADDER.map(offer => offer.id)).toEqual([
      'free_fit_check',
      'data_readiness_check',
      'ai_cost_snapshot',
      'monthly_ai_cost_review',
    ])
    expect(HUMAN_APPROVAL_GATES.every(gate => gate.required)).toBe(true)
  })

  it('creates a learning loop record from customer exit questions', () => {
    const record = createLearningLoopRecord({
      customerId: 'cust_sparkclaw',
      cameFrom: 'self_assessment',
      availableData: ['feature', 'customer_id', 'plan_id'],
      missingColumns: ['retry_count'],
      mostValuableMetric: 'gross margin by plan',
      paid: true,
      noPayReason: '',
      reportUsedInDecision: true,
      monthlyRepeatIntent: true,
      productizableWork: ['schema mapping', 'monthly review report'],
    })

    expect(record.assetRefs).toEqual(['asset:learning_loop_review', 'asset:productization_backlog'])
    expect(record.productizationBacklog).toEqual(['schema mapping', 'monthly review report'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/features/front-operating/lib/frontOperatingSystem.test.ts`

Expected: FAIL because `frontOperatingSystem.ts` does not exist.

- [ ] **Step 3: Create the pure rule module**

Create `src/features/front-operating/lib/frontOperatingSystem.ts`.

```ts
export type LeadFitGrade = 'A' | 'B' | 'C'
export type ProductType = 'ai_saas' | 'internal_tool' | 'agency' | 'idea'
export type PricingModel = 'seat' | 'usage' | 'flat' | 'hybrid' | 'unknown'
export type LeadPainType = 'margin' | 'pricing' | 'data_readiness' | 'cost_visibility' | 'none'

export interface LeadFitInput {
  companyName: string
  productType: ProductType
  aiFeatureLive: boolean
  monthlyLlmCostKrw: number
  hasUsageLogs: boolean
  pricingModel: PricingModel
  painType: LeadPainType
}

export interface LeadFitResult {
  grade: LeadFitGrade
  nextAction: 'AI Cost Snapshot 제안' | 'Data Readiness Check 제안' | '샘플 리포트 제공'
  reasons: string[]
}

export type SelfAssessmentQuestionId =
  | 'liveAiFeature'
  | 'minimumMonthlyCost'
  | 'customerUsageSplit'
  | 'featureUsageSplit'
  | 'planRevenueJoin'
  | 'retryLogs'
  | 'metadataOnlyExport'
  | 'decisionToChange'

export type SelfAssessmentResult = 'snapshot_ready' | 'readiness_check' | 'sample_report_only'

export type SelfAssessmentAnswers = Record<SelfAssessmentQuestionId, boolean>

export interface SelfAssessmentEvaluation {
  result: SelfAssessmentResult
  nextAction: 'AI Cost Snapshot 제안' | 'Data Readiness Check 제안' | '샘플 리포트 제공'
  blockers: string[]
}

export interface FrontOperatingAsset {
  id:
    | 'icp_scorecard'
    | 'lead_intake_log'
    | 'self_assessment_rules'
    | 'data_readiness_checklist'
    | 'sample_report_template'
    | 'offer_ladder'
    | 'approval_matrix'
    | 'learning_loop_review'
    | 'productization_backlog'
  label: string
  ref: `asset:${FrontOperatingAsset['id']}`
  owner: 'operator' | 'trust_review' | 'finance_ops' | 'knowledge_ops'
}

export interface OfferPackage {
  id: 'free_fit_check' | 'data_readiness_check' | 'ai_cost_snapshot' | 'monthly_ai_cost_review'
  label: string
  minPriceKrw: number
  maxPriceKrw: number
  purpose: string
}

export interface DataReadinessEvaluation {
  status: 'ready' | 'limited'
  acceptedColumns: string[]
  rejectedColumns: string[]
  availableAnalysis: Array<'feature_cost' | 'customer_cost' | 'plan_margin' | 'model_cost' | 'retry_cost'>
  blockedAnalysis: Array<'customer_cost' | 'plan_margin' | 'retry_cost'>
}

export interface LearningLoopInput {
  customerId: string
  cameFrom: string
  availableData: string[]
  missingColumns: string[]
  mostValuableMetric: string
  paid: boolean
  noPayReason: string
  reportUsedInDecision: boolean
  monthlyRepeatIntent: boolean
  productizableWork: string[]
}

export interface LearningLoopRecord extends LearningLoopInput {
  createdAt: string
  assetRefs: ['asset:learning_loop_review', 'asset:productization_backlog']
  productizationBacklog: string[]
}

export const SELF_ASSESSMENT_QUESTIONS: Array<{ id: SelfAssessmentQuestionId; label: string }> = [
  { id: 'liveAiFeature', label: '현재 AI 기능이 실제 고객에게 제공되고 있나요?' },
  { id: 'minimumMonthlyCost', label: '월 LLM/API 비용이 10만 원 이상 나오나요?' },
  { id: 'customerUsageSplit', label: '고객별 사용량을 구분할 수 있나요?' },
  { id: 'featureUsageSplit', label: '기능별 사용량을 구분할 수 있나요?' },
  { id: 'planRevenueJoin', label: '요금제별 매출 정보를 연결할 수 있나요?' },
  { id: 'retryLogs', label: '실패/재시도 로그가 있나요?' },
  { id: 'metadataOnlyExport', label: 'raw prompt 없이 usage metadata만 export할 수 있나요?' },
  { id: 'decisionToChange', label: '이번 분석으로 바꾸고 싶은 의사결정이 있나요?' },
]

export const DATA_READINESS_ACCEPTED_COLUMNS = [
  'timestamp',
  'customer_id',
  'plan_id',
  'feature',
  'model',
  'input_tokens',
  'output_tokens',
  'total_cost',
  'status',
  'retry_count',
] as const

export const DATA_READINESS_REJECTED_COLUMNS = [
  'raw_prompt',
  'conversation',
  'email',
  'phone',
  'name',
  'api_key',
] as const

export const FRONT_OPERATING_ASSETS: FrontOperatingAsset[] = [
  { id: 'icp_scorecard', label: 'ICP Scorecard', ref: 'asset:icp_scorecard', owner: 'operator' },
  { id: 'lead_intake_log', label: 'Lead Intake Log', ref: 'asset:lead_intake_log', owner: 'operator' },
  { id: 'self_assessment_rules', label: 'Self-Assessment Rules', ref: 'asset:self_assessment_rules', owner: 'operator' },
  { id: 'data_readiness_checklist', label: 'Data Readiness Checklist', ref: 'asset:data_readiness_checklist', owner: 'trust_review' },
  { id: 'sample_report_template', label: 'Sample Report Template', ref: 'asset:sample_report_template', owner: 'knowledge_ops' },
  { id: 'offer_ladder', label: 'Offer Ladder', ref: 'asset:offer_ladder', owner: 'finance_ops' },
  { id: 'approval_matrix', label: 'Human Approval Matrix', ref: 'asset:approval_matrix', owner: 'trust_review' },
  { id: 'learning_loop_review', label: 'Learning Loop Review', ref: 'asset:learning_loop_review', owner: 'knowledge_ops' },
  { id: 'productization_backlog', label: 'Productization Backlog', ref: 'asset:productization_backlog', owner: 'knowledge_ops' },
]

export const SAMPLE_REPORT_SECTIONS = [
  'Executive Summary',
  'Feature cost breakdown',
  'Customer cost breakdown',
  'Plan gross margin',
  'Loss customer check',
  'Recommended actions',
  'Decision Log example',
  'Data limitations',
] as const

export const OFFER_LADDER: OfferPackage[] = [
  { id: 'free_fit_check', label: 'Free Fit Check', minPriceKrw: 0, maxPriceKrw: 0, purpose: '진단 가능성 확인' },
  { id: 'data_readiness_check', label: 'Data Readiness Check', minPriceKrw: 50_000, maxPriceKrw: 150_000, purpose: '분석 가능 범위 안내' },
  { id: 'ai_cost_snapshot', label: 'AI Cost Snapshot', minPriceKrw: 300_000, maxPriceKrw: 1_000_000, purpose: '1장 리포트와 리뷰콜' },
  { id: 'monthly_ai_cost_review', label: 'Monthly AI Cost Review', minPriceKrw: 300_000, maxPriceKrw: 1_500_000, purpose: '반복 매출과 월간 decision log' },
]

export const HUMAN_APPROVAL_GATES = [
  { id: 'customer_acceptance', label: '고객 수락 여부', required: true },
  { id: 'analysis_scope', label: '분석 범위 확정', required: true },
  { id: 'security_pii', label: '보안/PII 판단', required: true },
  { id: 'final_numbers', label: '최종 숫자 승인', required: true },
  { id: 'customer_report', label: '고객에게 보낼 리포트 승인', required: true },
  { id: 'price_proposal', label: '가격 제안', required: true },
  { id: 'contract_refund_liability', label: '계약/환불/책임 문구', required: true },
] as const

export function scoreLeadFit(input: LeadFitInput): LeadFitResult {
  const hasMeaningfulCost = Number.isFinite(input.monthlyLlmCostKrw) && input.monthlyLlmCostKrw >= 100_000
  const hasCommercialPain = input.painType === 'margin' || input.painType === 'pricing' || input.painType === 'cost_visibility'
  const reasons = [
    ...(input.aiFeatureLive ? ['live_ai_feature'] : []),
    ...(hasMeaningfulCost ? ['meaningful_llm_cost'] : []),
    ...(input.hasUsageLogs ? ['usage_logs_available'] : ['usage_logs_missing']),
    ...(hasCommercialPain ? ['commercial_decision_pain'] : []),
  ]

  if (input.aiFeatureLive && hasMeaningfulCost && input.hasUsageLogs && hasCommercialPain) {
    return { grade: 'A', nextAction: 'AI Cost Snapshot 제안', reasons }
  }
  if (input.aiFeatureLive && hasMeaningfulCost) {
    return { grade: 'B', nextAction: 'Data Readiness Check 제안', reasons }
  }
  return { grade: 'C', nextAction: '샘플 리포트 제공', reasons }
}

export function evaluateSelfAssessment(answers: SelfAssessmentAnswers): SelfAssessmentEvaluation {
  if (!answers.liveAiFeature || !answers.minimumMonthlyCost || !answers.decisionToChange) {
    return { result: 'sample_report_only', nextAction: '샘플 리포트 제공', blockers: ['problem_intensity_low'] }
  }

  const blockers = [
    ...(!answers.customerUsageSplit ? ['customer_usage_missing'] : []),
    ...(!answers.featureUsageSplit ? ['feature_usage_missing'] : []),
    ...(!answers.planRevenueJoin ? ['plan_revenue_missing'] : []),
    ...(!answers.retryLogs ? ['retry_logs_missing'] : []),
    ...(!answers.metadataOnlyExport ? ['metadata_export_missing'] : []),
  ]

  if (blockers.length > 0) {
    return { result: 'readiness_check', nextAction: 'Data Readiness Check 제안', blockers }
  }
  return { result: 'snapshot_ready', nextAction: 'AI Cost Snapshot 제안', blockers: [] }
}

export function evaluateDataReadinessHeaders(headers: string[]): DataReadinessEvaluation {
  const normalized = headers.map(header => header.trim().toLowerCase()).filter(Boolean)
  const acceptedColumns = DATA_READINESS_ACCEPTED_COLUMNS.filter(column => normalized.includes(column))
  const rejectedColumns = DATA_READINESS_REJECTED_COLUMNS.filter(column => normalized.includes(column))
  const has = (column: string) => normalized.includes(column)
  const availableAnalysis: DataReadinessEvaluation['availableAnalysis'] = [
    ...(has('feature') ? ['feature_cost' as const] : []),
    ...(has('customer_id') ? ['customer_cost' as const] : []),
    ...(has('plan_id') && has('total_cost') ? ['plan_margin' as const] : []),
    ...(has('model') ? ['model_cost' as const] : []),
    ...(has('status') && has('retry_count') ? ['retry_cost' as const] : []),
  ]
  const blockedAnalysis: DataReadinessEvaluation['blockedAnalysis'] = [
    ...(!has('customer_id') ? ['customer_cost' as const] : []),
    ...(!(has('plan_id') && has('total_cost')) ? ['plan_margin' as const] : []),
    ...(!(has('status') && has('retry_count')) ? ['retry_cost' as const] : []),
  ]

  return {
    status: blockedAnalysis.length === 0 && rejectedColumns.length === 0 ? 'ready' : 'limited',
    acceptedColumns,
    rejectedColumns,
    availableAnalysis,
    blockedAnalysis,
  }
}

export function createLearningLoopRecord(input: LearningLoopInput, now = new Date().toISOString()): LearningLoopRecord {
  return {
    ...input,
    createdAt: now,
    assetRefs: ['asset:learning_loop_review', 'asset:productization_backlog'],
    productizationBacklog: input.productizableWork,
  }
}
```

- [ ] **Step 4: Run domain tests**

Run: `npm run test:run -- src/features/front-operating/lib/frontOperatingSystem.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/front-operating/lib/frontOperatingSystem.ts src/features/front-operating/lib/frontOperatingSystem.test.ts
git commit -m "feat: add front operating system rules"
```

---

### Task 3: Local Operating Records Store

**Files:**
- Create: `src/features/front-operating/lib/frontOperatingStore.ts`
- Create: `src/features/front-operating/lib/frontOperatingStore.test.ts`

- [ ] **Step 1: Write failing store tests**

Create `src/features/front-operating/lib/frontOperatingStore.test.ts`.

```ts
import { describe, expect, it } from 'vitest'
import {
  FRONT_OPERATING_STORAGE_KEY,
  appendFrontOperatingRecord,
  exportFrontOperatingFileName,
  loadFrontOperatingRecords,
  serializeFrontOperatingRecords,
} from './frontOperatingStore'

describe('frontOperatingStore', () => {
  it('loads an empty list when local storage is empty or invalid', () => {
    expect(loadFrontOperatingRecords({ getItem: () => null })).toEqual([])
    expect(loadFrontOperatingRecords({ getItem: () => '{broken' })).toEqual([])
  })

  it('appends a front operating record without mutating previous records', () => {
    const storage = new Map<string, string>()
    const io = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }

    appendFrontOperatingRecord({
      id: 'front-1',
      kind: 'lead_fit',
      createdAt: '2026-05-24T00:00:00.000Z',
      summary: 'A급 ICP',
      assetRefs: ['asset:icp_scorecard'],
      payload: { grade: 'A' },
    }, io)

    expect(storage.has(FRONT_OPERATING_STORAGE_KEY)).toBe(true)
    expect(loadFrontOperatingRecords(io)).toHaveLength(1)
  })

  it('serializes stable JSON and creates stable export filenames', () => {
    const json = serializeFrontOperatingRecords([{
      id: 'front-1',
      kind: 'learning_loop',
      createdAt: '2026-05-24T00:00:00.000Z',
      summary: 'Learning loop saved',
      assetRefs: ['asset:learning_loop_review'],
      payload: { customerId: 'cust_1' },
    }])

    expect(json).toContain('"kind": "learning_loop"')
    expect(exportFrontOperatingFileName('2026-05-24T10:00:00.000Z')).toBe('agentcost-front-operating-2026-05-24.json')
  })
})
```

- [ ] **Step 2: Run store tests and confirm failure**

Run: `npm run test:run -- src/features/front-operating/lib/frontOperatingStore.test.ts`

Expected: FAIL because `frontOperatingStore.ts` does not exist.

- [ ] **Step 3: Create client-side store**

Create `src/features/front-operating/lib/frontOperatingStore.ts`.

```ts
export const FRONT_OPERATING_STORAGE_KEY = 'token-simulator:front-operating-records'

export interface FrontOperatingRecord {
  id: string
  kind: 'lead_fit' | 'self_assessment' | 'data_readiness' | 'learning_loop'
  createdAt: string
  summary: string
  assetRefs: string[]
  payload: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function normalizeFrontOperatingRecord(value: unknown): FrontOperatingRecord | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string') return null
  if (value.kind !== 'lead_fit' && value.kind !== 'self_assessment' && value.kind !== 'data_readiness' && value.kind !== 'learning_loop') return null
  if (typeof value.createdAt !== 'string') return null
  if (typeof value.summary !== 'string') return null
  if (!isStringArray(value.assetRefs)) return null
  if (!isRecord(value.payload)) return null
  return value as unknown as FrontOperatingRecord
}

export function serializeFrontOperatingRecords(records: FrontOperatingRecord[]): string {
  return JSON.stringify(records, null, 2)
}

export function loadFrontOperatingRecords(storage: Pick<Storage, 'getItem'> = window.localStorage): FrontOperatingRecord[] {
  const raw = storage.getItem(FRONT_OPERATING_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.map(normalizeFrontOperatingRecord).filter((record): record is FrontOperatingRecord => Boolean(record))
      : []
  } catch {
    return []
  }
}

export function appendFrontOperatingRecord(
  record: FrontOperatingRecord,
  storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage,
): FrontOperatingRecord[] {
  const next = [...loadFrontOperatingRecords(storage), record]
  storage.setItem(FRONT_OPERATING_STORAGE_KEY, serializeFrontOperatingRecords(next))
  return next
}

export function exportFrontOperatingFileName(nowIso = new Date().toISOString()): string {
  return `agentcost-front-operating-${nowIso.slice(0, 10)}.json`
}
```

- [ ] **Step 4: Run store tests**

Run: `npm run test:run -- src/features/front-operating/lib/frontOperatingStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/front-operating/lib/frontOperatingStore.ts src/features/front-operating/lib/frontOperatingStore.test.ts
git commit -m "feat: persist front operating records locally"
```

---

### Task 4: Data Readiness Gate Policy Surface

**Files:**
- Modify: `src/features/trust/lib/dataIntakePolicy.ts`
- Modify: `src/features/trust/lib/securityMiddleware.test.ts`

- [ ] **Step 1: Write failing policy expectations**

Update the imports at the top of `src/features/trust/lib/securityMiddleware.test.ts`.

```ts
import {
  AGENTCOST_ACCEPTED_USAGE_COLUMNS,
  AGENTCOST_REJECTED_USAGE_COLUMNS,
  DEFAULT_DATA_INTAKE_POLICY,
} from './dataIntakePolicy'
```

Then append this test inside the existing `describe('inspectUsageImportSecurity', () => { ... })` block.

```ts
it('documents the AgentCost data readiness gate columns', () => {
  expect(AGENTCOST_ACCEPTED_USAGE_COLUMNS).toEqual([
    'timestamp',
    'customer_id',
    'plan_id',
    'feature',
    'model',
    'input_tokens',
    'output_tokens',
    'total_cost',
    'status',
    'retry_count',
  ])
  expect(AGENTCOST_REJECTED_USAGE_COLUMNS).toEqual([
    'raw_prompt',
    'conversation',
    'email',
    'phone',
    'name',
    'api_key',
  ])
  expect(DEFAULT_DATA_INTAKE_POLICY.allowRawPrompt).toBe(false)
})
```

- [ ] **Step 2: Run trust tests and confirm failure**

Run: `npm run test:run -- src/features/trust/lib/securityMiddleware.test.ts`

Expected: FAIL because the new constants do not exist.

- [ ] **Step 3: Add policy constants**

Modify `src/features/trust/lib/dataIntakePolicy.ts`.

```ts
export const AGENTCOST_ACCEPTED_USAGE_COLUMNS = [
  'timestamp',
  'customer_id',
  'plan_id',
  'feature',
  'model',
  'input_tokens',
  'output_tokens',
  'total_cost',
  'status',
  'retry_count',
] as const

export const AGENTCOST_REJECTED_USAGE_COLUMNS = [
  'raw_prompt',
  'conversation',
  'email',
  'phone',
  'name',
  'api_key',
] as const
```

- [ ] **Step 4: Run trust tests**

Run: `npm run test:run -- src/features/trust/lib/securityMiddleware.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/trust/lib/dataIntakePolicy.ts src/features/trust/lib/securityMiddleware.test.ts
git commit -m "feat: expose AgentCost data readiness policy"
```

---

### Task 5: Front Operating UI Panel

**Files:**
- Create: `src/features/front-operating/components/FrontOperatingSystemPanel.tsx`
- Create: `src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FrontOperatingSystemPanel } from './FrontOperatingSystemPanel'
import type { LeadFitInput } from '../lib/frontOperatingSystem'

const A_LEAD: LeadFitInput = {
  companyName: 'SparkClaw',
  productType: 'ai_saas',
  aiFeatureLive: true,
  monthlyLlmCostKrw: 700_000,
  hasUsageLogs: true,
  pricingModel: 'hybrid',
  painType: 'margin',
}

const C_LEAD: LeadFitInput = {
  companyName: 'IdeaOnly',
  productType: 'idea',
  aiFeatureLive: false,
  monthlyLlmCostKrw: 0,
  hasUsageLogs: false,
  pricingModel: 'unknown',
  painType: 'none',
}

describe('FrontOperatingSystemPanel', () => {
  it('renders the front operating devices and offer ladder', () => {
    render(<FrontOperatingSystemPanel initialLead={A_LEAD} onOpenDataGate={vi.fn()} onOpenSampleReport={vi.fn()} onOpenDecisionLog={vi.fn()} />)

    expect(screen.getByTestId('front-operating-system-panel')).toHaveTextContent(/ICP fit/i)
    expect(screen.getByTestId('front-operating-system-panel')).toHaveTextContent(/A급/)
    expect(screen.getByText(/AI Cost Snapshot/i)).toBeInTheDocument()
    expect(screen.getByText(/₩300,000~₩1,000,000/)).toBeInTheDocument()
    expect(screen.getByText(/raw prompt/i)).toBeInTheDocument()
  })

  it('updates lead fit when props rerender', () => {
    const { rerender } = render(
      <FrontOperatingSystemPanel initialLead={A_LEAD} onOpenDataGate={vi.fn()} onOpenSampleReport={vi.fn()} onOpenDecisionLog={vi.fn()} />,
    )

    expect(screen.getByTestId('front-operating-system-panel')).toHaveTextContent(/A급/)

    rerender(<FrontOperatingSystemPanel initialLead={C_LEAD} onOpenDataGate={vi.fn()} onOpenSampleReport={vi.fn()} onOpenDecisionLog={vi.fn()} />)

    expect(screen.getByTestId('front-operating-system-panel')).toHaveTextContent(/C급/)
    expect(screen.getByTestId('front-operating-system-panel')).toHaveTextContent(/샘플 리포트 제공/)
  })

  it('updates self-assessment result and calls navigation callbacks', async () => {
    const user = userEvent.setup()
    const onOpenDataGate = vi.fn()
    const onOpenSampleReport = vi.fn()
    const onOpenDecisionLog = vi.fn()

    render(
      <FrontOperatingSystemPanel
        initialLead={A_LEAD}
        onOpenDataGate={onOpenDataGate}
        onOpenSampleReport={onOpenSampleReport}
        onOpenDecisionLog={onOpenDecisionLog}
      />,
    )

    await user.click(screen.getByLabelText(/고객별 사용량/i))
    expect(screen.getByTestId('self-assessment-result')).toHaveTextContent(/Data Readiness Check/)

    await user.click(screen.getByRole('button', { name: /Open Data Gate/i }))
    await user.click(screen.getByRole('button', { name: /Open Sample Report/i }))
    await user.click(screen.getByRole('button', { name: /Open Decision Log/i }))

    expect(onOpenDataGate).toHaveBeenCalledTimes(1)
    expect(onOpenSampleReport).toHaveBeenCalledTimes(1)
    expect(onOpenDecisionLog).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run component test and confirm failure**

Run: `npm run test:run -- src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx`

Expected: FAIL because component does not exist.

- [ ] **Step 3: Create the component**

Create `src/features/front-operating/components/FrontOperatingSystemPanel.tsx`.

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Surface } from '../../../shared/ui/primitives'
import { fmtKrwRange } from '../../../lib/format'
import {
  DATA_READINESS_ACCEPTED_COLUMNS,
  DATA_READINESS_REJECTED_COLUMNS,
  FRONT_OPERATING_ASSETS,
  HUMAN_APPROVAL_GATES,
  OFFER_LADDER,
  SAMPLE_REPORT_SECTIONS,
  SELF_ASSESSMENT_QUESTIONS,
  evaluateDataReadinessHeaders,
  evaluateSelfAssessment,
  scoreLeadFit,
  type LeadFitInput,
  type SelfAssessmentAnswers,
  type SelfAssessmentQuestionId,
} from '../lib/frontOperatingSystem'

const DEFAULT_ANSWERS: SelfAssessmentAnswers = {
  liveAiFeature: true,
  minimumMonthlyCost: true,
  customerUsageSplit: true,
  featureUsageSplit: true,
  planRevenueJoin: true,
  retryLogs: true,
  metadataOnlyExport: true,
  decisionToChange: true,
}

function nextAnswers(
  answers: SelfAssessmentAnswers,
  id: SelfAssessmentQuestionId,
): SelfAssessmentAnswers {
  return { ...answers, [id]: !answers[id] }
}

export function FrontOperatingSystemPanel({
  initialLead,
  onOpenDataGate,
  onOpenSampleReport,
  onOpenDecisionLog,
}: {
  initialLead: LeadFitInput
  onOpenDataGate: () => void
  onOpenSampleReport: () => void
  onOpenDecisionLog: () => void
}) {
  const [lead, setLead] = useState(initialLead)
  const [answers, setAnswers] = useState<SelfAssessmentAnswers>(DEFAULT_ANSWERS)

  useEffect(() => {
    setLead(initialLead)
  }, [initialLead])

  const fit = useMemo(() => scoreLeadFit(lead), [lead])
  const assessment = useMemo(() => evaluateSelfAssessment(answers), [answers])
  const readiness = useMemo(() => evaluateDataReadinessHeaders([...DATA_READINESS_ACCEPTED_COLUMNS]), [])

  return (
    <Surface
      data-testid="front-operating-system-panel"
      eyebrow="AgentCost front operating system"
      title="고객 선별 -> 데이터 게이트 -> 유료 진단 -> 운영 자산화"
      description="문의 이후가 아니라 문의 전부터 고객 적합도, 데이터 준비도, 승인, 리포트, 반복 학습을 한 흐름으로 묶습니다."
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-3">
          <section className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-label-normal">ICP fit</p>
              <Badge tone={fit.grade === 'A' ? 'positive' : fit.grade === 'B' ? 'caution' : 'neutral'}>
                {fit.grade}급
              </Badge>
            </div>
            <p className="mt-2 text-sm text-label-neutral">{fit.nextAction}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {fit.reasons.map(reason => <Badge key={reason}>{reason}</Badge>)}
            </div>
          </section>

          <section className="rounded-wds border border-line-neutral bg-surface-normal p-3">
            <p className="text-sm font-semibold text-label-normal">Self-Assessment</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {SELF_ASSESSMENT_QUESTIONS.map(question => (
                <label key={question.id} className="flex gap-2 rounded-wds border border-line-neutral bg-fill-alternative p-2 text-xs text-label-neutral">
                  <input
                    type="checkbox"
                    checked={answers[question.id]}
                    onChange={() => setAnswers(current => nextAnswers(current, question.id))}
                  />
                  <span>{question.label}</span>
                </label>
              ))}
            </div>
            <p data-testid="self-assessment-result" className="mt-3 rounded-wds bg-primary-normal/10 p-2 text-sm font-semibold text-primary-normal">
              {assessment.nextAction}
            </p>
          </section>

          <section className="rounded-wds border border-line-neutral bg-surface-normal p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-label-normal">Data Readiness Gate</p>
              <Button size="sm" onClick={onOpenDataGate}>Open Data Gate</Button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-label-neutral">받는 데이터</p>
                <div className="flex flex-wrap gap-1">
                  {DATA_READINESS_ACCEPTED_COLUMNS.map(column => <Badge key={column} tone="positive">{column}</Badge>)}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-label-neutral">받지 않는 데이터</p>
                <div className="flex flex-wrap gap-1">
                  {DATA_READINESS_REJECTED_COLUMNS.map(column => <Badge key={column} tone="negative">{column}</Badge>)}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-label-alternative">Analysis scope: {readiness.availableAnalysis.join(', ')}</p>
          </section>
        </div>

        <div className="grid gap-3">
          <section className="rounded-wds border border-line-neutral bg-surface-normal p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-label-normal">Sample Report</p>
              <Button size="sm" onClick={onOpenSampleReport}>Open Sample Report</Button>
            </div>
            <div className="mt-2 grid gap-1">
              {SAMPLE_REPORT_SECTIONS.map(section => <p key={section} className="text-xs text-label-neutral">{section}</p>)}
            </div>
          </section>

          <section className="rounded-wds border border-line-neutral bg-surface-normal p-3">
            <p className="text-sm font-semibold text-label-normal">Offer Ladder</p>
            <div className="mt-2 grid gap-2">
              {OFFER_LADDER.map(offer => (
                <div key={offer.id} className="rounded-wds border border-line-neutral bg-fill-alternative p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-label-normal">{offer.label}</p>
                    <Badge>{fmtKrwRange(offer.minPriceKrw, offer.maxPriceKrw)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-label-alternative">{offer.purpose}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-wds border border-line-neutral bg-surface-normal p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-label-normal">Approval + Learning Loop</p>
              <Button size="sm" onClick={onOpenDecisionLog}>Open Decision Log</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {HUMAN_APPROVAL_GATES.slice(0, 4).map(gate => <Badge key={gate.id} tone="caution">{gate.label}</Badge>)}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {FRONT_OPERATING_ASSETS.map(asset => <Badge key={asset.id}>{asset.ref}</Badge>)}
            </div>
          </section>
        </div>
      </div>
    </Surface>
  )
}
```

- [ ] **Step 4: Run component tests**

Run: `npm run test:run -- src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/front-operating/components/FrontOperatingSystemPanel.tsx src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx
git commit -m "feat: add front operating system panel"
```

---

### Task 6: App Shell Integration

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Write failing app-shell test**

Append this test to `src/app/App.test.tsx`.

```tsx
it('renders the AgentCost front operating system and routes its CTAs into the existing workspace', async () => {
  const user = userEvent.setup()
  render(<App />)

  expect(screen.getByTestId('front-operating-system-panel')).toHaveTextContent(/고객 선별/)
  expect(screen.getByTestId('front-operating-system-panel')).toHaveTextContent(/A급/)

  await user.click(screen.getByRole('button', { name: /Open Data Gate/i }))
  expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Design/i)

  await user.click(screen.getByRole('button', { name: /Open Sample Report/i }))
  expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Optimize/i)

  await user.click(screen.getByRole('button', { name: /Open Decision Log/i }))
  expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Decision Log/i)
})
```

- [ ] **Step 2: Run app test and confirm failure**

Run: `npm run test:run -- src/app/App.test.tsx`

Expected: FAIL because the panel is not integrated.

- [ ] **Step 3: Import the panel and lead type**

Add to `src/app/App.tsx` imports.

```ts
import { FrontOperatingSystemPanel } from '../features/front-operating/components/FrontOperatingSystemPanel'
import type { LeadFitInput } from '../features/front-operating/lib/frontOperatingSystem'
```

- [ ] **Step 4: Add default demo lead near existing constants**

Add near the other top-level constants.

```ts
const DEFAULT_AGENTCOST_FRONT_LEAD: LeadFitInput = {
  companyName: 'SparkClaw',
  productType: 'ai_saas',
  aiFeatureLive: true,
  monthlyLlmCostKrw: 700_000,
  hasUsageLogs: true,
  pricingModel: 'hybrid',
  painType: 'margin',
}
```

- [ ] **Step 5: Mount the panel under the customer entry panel**

In the JSX, place this immediately after `CustomerDashboardEntryPanel`.

```tsx
<FrontOperatingSystemPanel
  initialLead={DEFAULT_AGENTCOST_FRONT_LEAD}
  onOpenDataGate={() => {
    setShowTeamCostSimulator(true)
    setActiveDecisionStage('design')
  }}
  onOpenSampleReport={() => {
    setShowTeamCostSimulator(true)
    setActiveDecisionStage('optimize')
  }}
  onOpenDecisionLog={() => setActiveDecisionStage('decision-log')}
/>
```

- [ ] **Step 6: Run the focused app test**

Run: `npm run test:run -- src/app/App.test.tsx`

Expected: PASS. If existing tests fail from text count changes, fix only assertions that are tightly coupled to old first-screen text and keep behavior assertions intact.

- [ ] **Step 7: Commit**

```bash
git add src/app/App.tsx src/app/App.test.tsx
git commit -m "feat: wire front operating flow into app shell"
```

---

### Task 7: Learning Loop Record Action

**Files:**
- Modify: `src/features/front-operating/components/FrontOperatingSystemPanel.tsx`
- Modify: `src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

- [ ] **Step 1: Add failing callback test**

Extend the component test.

```tsx
it('emits a learning loop record for operating asset storage', async () => {
  const user = userEvent.setup()
  const onRecordLearning = vi.fn()

  render(
    <FrontOperatingSystemPanel
      initialLead={A_LEAD}
      onOpenDataGate={vi.fn()}
      onOpenSampleReport={vi.fn()}
      onOpenDecisionLog={vi.fn()}
      onRecordLearning={onRecordLearning}
    />,
  )

  await user.click(screen.getByRole('button', { name: /Record Learning Loop/i }))

  expect(onRecordLearning).toHaveBeenCalledWith(expect.objectContaining({
    customerId: 'sparkclaw-demo',
    assetRefs: ['asset:learning_loop_review', 'asset:productization_backlog'],
  }))
})
```

- [ ] **Step 2: Run component test and confirm failure**

Run: `npm run test:run -- src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx`

Expected: FAIL because `onRecordLearning` is not a prop yet.

- [ ] **Step 3: Add callback prop and record button**

Update component props.

```ts
onRecordLearning?: (record: LearningLoopRecord) => void
```

Import these symbols.

```ts
import { createLearningLoopRecord, type LearningLoopRecord } from '../lib/frontOperatingSystem'
```

Add this handler inside the component.

```ts
const handleRecordLearning = () => {
  onRecordLearning?.(createLearningLoopRecord({
    customerId: 'sparkclaw-demo',
    cameFrom: 'self_assessment',
    availableData: ['feature', 'customer_id', 'plan_id'],
    missingColumns: assessment.blockers,
    mostValuableMetric: 'AI COGS and plan gross margin',
    paid: fit.grade === 'A',
    noPayReason: fit.grade === 'A' ? '' : 'not_snapshot_ready',
    reportUsedInDecision: false,
    monthlyRepeatIntent: fit.grade !== 'C',
    productizableWork: ['schema mapping', 'sample report', 'monthly review decision log'],
  }))
}
```

Add this button in the Approval + Learning Loop section.

```tsx
<Button size="sm" onClick={handleRecordLearning}>Record Learning Loop</Button>
```

- [ ] **Step 4: Wire local storage append in App**

Import store helper.

```ts
import { appendFrontOperatingRecord } from '../features/front-operating/lib/frontOperatingStore'
import type { LearningLoopRecord } from '../features/front-operating/lib/frontOperatingSystem'
```

Add handler inside `App`.

```ts
const handleRecordFrontOperatingLearning = (record: LearningLoopRecord) => {
  appendFrontOperatingRecord({
    id: `front-learning-${record.createdAt.replace(/[^0-9A-Za-z]/g, '-')}`,
    kind: 'learning_loop',
    createdAt: record.createdAt,
    summary: `Learning loop for ${record.customerId}`,
    assetRefs: record.assetRefs,
    payload: record,
  })
}
```

Pass it into the panel.

```tsx
onRecordLearning={handleRecordFrontOperatingLearning}
```

- [ ] **Step 5: Add app-shell storage assertion**

Update `src/app/App.test.tsx` imports.

```ts
import { FRONT_OPERATING_STORAGE_KEY } from '../features/front-operating/lib/frontOperatingStore'
```

Append this test inside `describe('App AI team operations workspace', () => { ... })`.

```tsx
it('records front operating learning loop entries from the app shell', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /Record Learning Loop/i }))

  const stored = window.localStorage.getItem(FRONT_OPERATING_STORAGE_KEY)
  expect(stored).toContain('"kind": "learning_loop"')
  expect(stored).toContain('asset:learning_loop_review')
})

```

- [ ] **Step 6: Run focused tests**

Run: `npm run test:run -- src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx src/features/front-operating/lib/frontOperatingStore.test.ts src/app/App.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/front-operating/components/FrontOperatingSystemPanel.tsx src/features/front-operating/components/FrontOperatingSystemPanel.test.tsx src/app/App.tsx src/app/App.test.tsx
git commit -m "feat: record front operating learning loop"
```

---

### Task 8: Final Verification

**Files:**
- No new source files unless verification finds a scoped regression.

- [ ] **Step 1: Run all tests**

Run: `npm run test:run`

Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS and `dist/` generated.

- [ ] **Step 3: Run preview smoke**

Run: `npm run preview`

Open: `http://127.0.0.1:4173/token_simulator/`

Manual smoke:

- First screen shows customer dashboard and AgentCost front operating system panel.
- ICP fit shows `A급` for SparkClaw demo.
- Self-Assessment checkbox changes the result without page reload.
- Open Data Gate moves to Design/Import.
- Open Sample Report moves to Optimize/report area.
- Open Decision Log moves to Decision Log.
- Admin-only internals still remain hidden unless the existing admin/debug gate is active.
- Browser auto-translate protection remains: root `translate="no"` and existing `notranslate` meta are not removed.

- [ ] **Step 4: Commit verification fixes if any**

```bash
git add <only files changed by this task>
git commit -m "fix: stabilize front operating system verification"
```

---

## Execution Notes

- 현재 작업트리는 dirty 상태일 수 있다. 실행자는 각 task마다 `git status --short`로 스코프를 확인하고, 이 계획에 적힌 파일만 stage한다.
- 컴포넌트 안에서 비용, 마진, 절감액 산술을 추가하지 않는다.
- 컴포넌트 안에서 `toLocaleString`, `toFixed`, `₩${...}`, `$${...}` 직접 조합을 하지 않는다.
- 고객용 화면에는 tool ref, snapshot ref, agent route를 기본 노출하지 않는다. 기존 admin/internal gate 안에서만 노출한다.
- 영어 문장성 블록을 새로 추가하면 `lang="en"`을 붙인다.
- 테스트는 static render만으로 끝내지 않는다. `rerender` 또는 user interaction으로 상태 변경 후 UI가 갱신되는지 검증한다.

## Self-Review

- Spec coverage: 9개 장치가 Task 2, Task 4, Task 5, Task 7에 모두 연결되어 있다.
- Boundary coverage: 계산은 새 모듈이 하지 않고, 표시 숫자는 Task 1의 `format.ts` helper를 통해서만 렌더링한다.
- P0/P1 separation: 실제 발송, 결제, 외부 CRM/DB, LLM 자동 판정은 P1로 남긴다.
- Type consistency: `LeadFitInput`, `SelfAssessmentAnswers`, `LearningLoopRecord`, `FrontOperatingRecord`는 각 task에서 동일한 이름으로 사용한다.
- Placeholder scan: 계획 안에 미정 파일명이나 미정 함수명은 없다.

Plan complete and saved to `docs/superpowers/plans/2026-05-24-agentcost-front-operating-system.md`.

Two execution options:

1. Subagent-Driven (recommended): use `superpowers:subagent-driven-development`, one fresh worker per task, review between tasks.
2. Inline Execution: use `superpowers:executing-plans`, execute tasks in this session with checkpoints.
