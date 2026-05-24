# Rate Card Decision Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rate Card 초안, 운영 일지 강제 루프, 가격 신선도, 멀티모달 UsageEvent v2, Decision Header를 하나의 고객용 의사결정 루프로 만든다.

**Architecture:** 숫자와 영향 고객 수는 TypeScript deterministic engine이 계산한다. AI/Python Agent는 초안의 의미, 리스크, 다음 질문만 해석한다. Stripe/Metronome 같은 billing 시스템은 P1에서도 직접 집행하지 않고, `RateCardDraft` export artifact와 Decision/Operating Ledger 기록까지만 만든다.

**Tech Stack:** Vite React TypeScript, Vitest, Testing Library, existing `calculateCost`, `calculatePricingScenario`, `DecisionLog`, `ThresholdPolicy`, `ReportArtifact`, `Official Research Watchtower`.

---

## 현재 검토 결과

이 제안 5개는 모두 맞는 방향이다. 다만 구현 순서는 중요하다. `Decision Header`와 `운영 일지 강제 루프`가 먼저 들어가야 Rate Card Export가 그냥 파일 다운로드가 아니라 “사람이 선택한 운영 결정”이 된다. `Pricing Freshness`와 `UsageEvent v2`는 그 결정의 신뢰성을 지탱한다.

| 제안 | 현재 상태 | 구현 판단 |
| --- | --- | --- |
| Rate Card Draft Export | pricing scenario 계산은 있음. Rate Card artifact는 없음. | P0.5 핵심. Stripe/Metronome 집행이 아니라 초안 export로 구현 |
| 운영 일지 강제 루프 | Adopt/Reject 버튼은 있음. Export hard gate는 없음. | P0.5 핵심. Export 전에 Adopt/Reject/Hold 중 하나 필요 |
| Pricing Freshness 뱃지 | `lastVerifiedAt`, `pricingStatus`, stale warning은 있음. 과거 결정 recheck 연결은 없음. | P0.5 핵심. Decision Log와 연결 |
| 멀티모달 UsageEvent v2 | calculator skeleton은 있음. CSV usage schema는 text 중심 | P0.5 핵심. I/O 2026 / Gemini Omni 대응 기반 |
| Decision Header | `DecisionSummaryStrip`은 metric summary 중심 | P0.5 핵심. “오늘 내려야 할 결정 1개”로 전환 |

---

## 파일 구조

### 새로 만들 파일

- `src/features/pricing/lib/rateCardDraft.ts`
  - `RateCardDraft` 타입과 `buildRateCardDraft()` deterministic builder.
  - included credits, overage, cap, affected customers, basis margin, source refs를 만든다.

- `src/features/pricing/lib/rateCardDraft.test.ts`
  - rate card 초안 필드, 영향 고객 수, 마진 근거, fake execution 금지 테스트.

- `src/features/facts/lib/pricingFreshness.ts`
  - `PricingFreshnessBadgeState`, `buildPricingFreshnessSummary()`, `decisionsNeedingPriceRecheck()`를 담당한다.

- `src/features/facts/lib/pricingFreshness.test.ts`
  - verified/estimated/tbd/source_changed 4-state와 과거 decision recheck 테스트.

- `src/features/usage/lib/usageEventV2.ts`
  - 멀티모달 usage row 타입, header mapping, 비용 계산 입력 변환을 담당한다.

- `src/features/usage/lib/usageEventV2.test.ts`
  - image/audio/video/cache/tool/search 컬럼 파싱과 missing price warning 테스트.

- `src/features/decision-loop/lib/decisionHeader.ts`
  - “오늘 내려야 할 결정 1개”를 생성한다. 기존 metric strip이 이 함수를 사용한다.

- `src/features/decision-loop/lib/decisionHeader.test.ts`
  - margin breach, stale pricing, rate-card-ready 상황별 결정 질문 테스트.

- `src/features/decision-loop/lib/exportGate.ts`
  - Export 전에 `adopt | reject | hold` 기록이 있는지 검사한다.

- `src/features/decision-loop/lib/exportGate.test.ts`
  - decision 없는 export 차단, hold도 유효한 decision으로 인정하는 테스트.

### 수정할 파일

- `src/features/pricing/lib/pricingScenario.ts`
  - `ScenarioResult`에 고객별 before/after 영향 요약을 추가할 수 있게 한다.

- `src/features/decision-log/lib/decisionLog.ts`
  - `DecisionInput`에 `decisionChoice`, `rateCardDraft`, `pricingFreshnessSnapshot`을 추가한다.
  - 기존 `status: superseded`는 유지하되 UI의 `Hold`는 `decisionChoice: 'hold'`로 명확히 저장한다.

- `src/features/report/lib/reportArtifacts.ts`
  - one-page report와 export artifact에 rate card draft, freshness, decision gate 결과를 포함한다.

- `src/features/usage/lib/usageImport.ts`
  - UsageEvent v2 컬럼을 읽고 summary에 multimodal totals를 추가한다.
  - 기존 text-only CSV는 깨지지 않는다.

- `src/components/DecisionSummaryStrip/index.tsx`
  - metric card 6개 나열에서 “오늘 내려야 할 결정” header로 전환한다.

- `src/app/App.tsx`
  - Rate Card Draft panel, Decision Header, Export Gate, Decision Log 기록 연결.
  - 고객 화면에는 쉬운 상태만 보이고 debug/admin에는 source/ref를 보여준다.

- `src/app/App.test.tsx`
  - stage flow, export gate, decision log, freshness badge, rate card 초안 렌더 테스트.

- `docs/PRD.md`, `docs/PRD-v2.md`, `docs/PRODUCT_UX.md`, `docs/PRODUCT_UX_DETAILED.md`
  - Rate Card Draft Export, Decision Header, UsageEvent v2, Pricing Freshness, hard gate를 제품 스펙에 반영한다.

---

## Task 1: Rate Card Draft 모델과 deterministic builder

**Files:**
- Create: `src/features/pricing/lib/rateCardDraft.ts`
- Create: `src/features/pricing/lib/rateCardDraft.test.ts`
- Modify: `src/features/pricing/lib/pricingScenario.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildRateCardDraft } from './rateCardDraft'
import type { UsageImportRow } from '../../usage/lib/usageImport'

const rows: UsageImportRow[] = [
  {
    timestamp: '2026-05-01T00:00:00Z',
    requestId: 'req-1',
    feature: 'support_agent',
    modelId: 'gemini-3.5-flash',
    planId: 'pro',
    sessionId: 'sess-1',
    agentRunId: 'run-1',
    inputTokens: 1000,
    outputTokens: 500,
    totalCostUsd: 12,
    latencyMs: 900,
    customerId: 'cust-heavy',
    status: 'success',
    costSource: 'explicit',
  },
  {
    timestamp: '2026-05-01T00:01:00Z',
    requestId: 'req-2',
    feature: 'support_agent',
    modelId: 'gemini-3.5-flash',
    planId: 'pro',
    sessionId: 'sess-2',
    agentRunId: 'run-2',
    inputTokens: 800,
    outputTokens: 200,
    totalCostUsd: 3,
    latencyMs: 700,
    customerId: 'cust-light',
    status: 'success',
    costSource: 'explicit',
  },
]

describe('buildRateCardDraft', () => {
  it('builds a non-executing rate card draft with included credits, overage, cap, affected customers, and margin basis', () => {
    const draft = buildRateCardDraft({
      id: 'rate-card-credit-pro',
      title: 'Pro credit bundle draft',
      rows,
      currentRevenueByCustomer: {
        'cust-heavy': 10,
        'cust-light': 10,
      },
      policy: {
        type: 'credit',
        includedCredits: 1000,
        includedRequests: 1,
        overagePricePerRequest: 8,
        capUsdPerCustomer: 30,
      },
      basis: {
        scenarioRef: 'tool:pricing.credit.margin',
        marginPct: 0.42,
        thresholdRef: 'basis:rule:gross_margin_thin_pct',
      },
      generatedAt: '2026-05-24T00:00:00.000Z',
    })

    expect(draft.executionMode).toBe('draft_only')
    expect(draft.billingMutationAllowed).toBe(false)
    expect(draft.includedCredits).toBe(1000)
    expect(draft.overagePricePerRequest).toBe(8)
    expect(draft.capUsdPerCustomer).toBe(30)
    expect(draft.affectedCustomerCount).toBe(2)
    expect(draft.lossCustomerCountBefore).toBe(1)
    expect(draft.basisMarginPct).toBe(0.42)
    expect(draft.refs).toContain('tool:pricing.credit.margin')
    expect(draft.refs).toContain('basis:rule:gross_margin_thin_pct')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test:run -- src/features/pricing/lib/rateCardDraft.test.ts
```

Expected: FAIL with module not found for `./rateCardDraft`.

- [ ] **Step 3: Implement `rateCardDraft.ts`**

```ts
import type { UsageImportRow } from '../../usage/lib/usageImport'

export type RateCardPolicyType = 'credit' | 'overage' | 'cap' | 'hybrid'

export interface RateCardDraftPolicy {
  type: RateCardPolicyType
  includedCredits?: number
  includedRequests?: number
  overagePricePerRequest?: number
  capUsdPerCustomer?: number
}

export interface RateCardDraft {
  id: string
  title: string
  executionMode: 'draft_only'
  billingMutationAllowed: false
  policyType: RateCardPolicyType
  includedCredits: number | null
  includedRequests: number | null
  overagePricePerRequest: number | null
  capUsdPerCustomer: number | null
  affectedCustomerCount: number
  lossCustomerCountBefore: number
  basisMarginPct: number
  basisScenarioRef: string
  basisThresholdRef: string
  refs: string[]
  generatedAt: string
}

export interface BuildRateCardDraftInput {
  id: string
  title: string
  rows: UsageImportRow[]
  currentRevenueByCustomer: Record<string, number>
  policy: RateCardDraftPolicy
  basis: {
    scenarioRef: string
    marginPct: number
    thresholdRef: string
  }
  generatedAt: string
}

function finiteNonNegative(value: number | undefined): number | null {
  if (value === undefined) return null
  return Number.isFinite(value) ? Math.max(0, value) : null
}

export function buildRateCardDraft(input: BuildRateCardDraftInput): RateCardDraft {
  const byCustomer = input.rows.reduce<Map<string, number>>((map, row) => {
    const customerId = row.customerId ?? 'unknown'
    map.set(customerId, (map.get(customerId) ?? 0) + Math.max(0, row.totalCostUsd))
    return map
  }, new Map())

  const lossCustomerCountBefore = [...byCustomer.entries()].filter(([customerId, cost]) => {
    const revenue = input.currentRevenueByCustomer[customerId] ?? 0
    return revenue - cost < 0
  }).length

  return {
    id: input.id,
    title: input.title,
    executionMode: 'draft_only',
    billingMutationAllowed: false,
    policyType: input.policy.type,
    includedCredits: finiteNonNegative(input.policy.includedCredits),
    includedRequests: finiteNonNegative(input.policy.includedRequests),
    overagePricePerRequest: finiteNonNegative(input.policy.overagePricePerRequest),
    capUsdPerCustomer: finiteNonNegative(input.policy.capUsdPerCustomer),
    affectedCustomerCount: byCustomer.size,
    lossCustomerCountBefore,
    basisMarginPct: Number.isFinite(input.basis.marginPct) ? input.basis.marginPct : 0,
    basisScenarioRef: input.basis.scenarioRef,
    basisThresholdRef: input.basis.thresholdRef,
    refs: [input.basis.scenarioRef, input.basis.thresholdRef],
    generatedAt: input.generatedAt,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test:run -- src/features/pricing/lib/rateCardDraft.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/pricing/lib/rateCardDraft.ts src/features/pricing/lib/rateCardDraft.test.ts
git commit -m "feat: add rate card draft builder"
```

---

## Task 2: Pricing Freshness 4-state와 과거 결정 recheck 연결

**Files:**
- Create: `src/features/facts/lib/pricingFreshness.ts`
- Create: `src/features/facts/lib/pricingFreshness.test.ts`
- Modify: `src/features/decision-log/lib/decisionLog.ts`
- Modify: `src/features/decision-log/lib/decisionLog.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildPricingFreshnessSummary, decisionsNeedingPriceRecheck } from './pricingFreshness'
import { createDecision } from '../../decision-log/lib/decisionLog'

describe('pricing freshness', () => {
  it('returns Source Changed when a model source changed after a decision snapshot', () => {
    const summary = buildPricingFreshnessSummary({
      modelId: 'gemini-3.5-flash',
      pricingStatus: 'verified',
      lastVerifiedAt: '2026-05-24',
      nowIso: '2026-05-24T12:00:00.000Z',
      staleAfterDays: 30,
      sourceChanged: true,
    })

    expect(summary.state).toBe('source_changed')
    expect(summary.customerLabel).toBe('Source changed')
    expect(summary.requiresDecisionRecheck).toBe(true)
  })

  it('finds decisions that used a changed price source', () => {
    const decision = createDecision({
      what: 'Adopt credit pricing',
      why: 'Margin improves with overage guardrail',
      assumptions: {},
      toolResultRefs: ['tool:pricing.credit.margin'],
      riskCards: ['risk-overage-bill-shock'],
      status: 'adopted',
      createdAt: '2026-05-24T00:00:00.000Z',
      factSourceSnapshot: [
        {
          modelId: 'gemini-3.5-flash',
          provider: 'google',
          name: 'Gemini 3.5 Flash',
          sourceType: 'official_api_doc',
          sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
          sourceLabel: 'Official pricing page',
          lastVerifiedAt: '2026-05-24',
          verificationStatus: 'fresh',
          warning: null,
          capturedAt: '2026-05-24T00:00:00.000Z',
        },
      ],
    })

    expect(decisionsNeedingPriceRecheck({
      decisions: [decision],
      changedSourceUrls: ['https://ai.google.dev/gemini-api/docs/pricing'],
    })).toEqual([decision.id])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test:run -- src/features/facts/lib/pricingFreshness.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement `pricingFreshness.ts`**

```ts
import type { Decision } from '../../decision-log/lib/decisionLog'
import type { Model } from '../../alternatives/data/models'
import { staleFactSourceWarning } from '../../metrics/lib/thresholdPolicy'

export type PricingFreshnessState = 'verified' | 'estimated' | 'tbd' | 'source_changed'

export interface PricingFreshnessSummary {
  modelId: string
  state: PricingFreshnessState
  customerLabel: 'Verified' | 'Estimated' | 'TBD' | 'Source changed'
  requiresDecisionRecheck: boolean
  warning: string | null
}

export function buildPricingFreshnessSummary(input: {
  modelId: string
  pricingStatus: Model['pricingStatus']
  lastVerifiedAt: string
  nowIso: string
  staleAfterDays: number
  sourceChanged: boolean
}): PricingFreshnessSummary {
  if (input.sourceChanged) {
    return {
      modelId: input.modelId,
      state: 'source_changed',
      customerLabel: 'Source changed',
      requiresDecisionRecheck: true,
      warning: 'This price source changed after a prior decision. Recheck affected decisions.',
    }
  }

  const staleWarning = staleFactSourceWarning(input.lastVerifiedAt, input.nowIso, input.staleAfterDays)
  if (input.pricingStatus === 'estimated') {
    return {
      modelId: input.modelId,
      state: 'estimated',
      customerLabel: 'Estimated',
      requiresDecisionRecheck: Boolean(staleWarning),
      warning: staleWarning,
    }
  }

  if (input.pricingStatus === 'tbd' || input.pricingStatus === 'unavailable') {
    return {
      modelId: input.modelId,
      state: 'tbd',
      customerLabel: 'TBD',
      requiresDecisionRecheck: true,
      warning: 'Official API pricing is not available for deterministic decisions.',
    }
  }

  return {
    modelId: input.modelId,
    state: 'verified',
    customerLabel: 'Verified',
    requiresDecisionRecheck: Boolean(staleWarning),
    warning: staleWarning,
  }
}

export function decisionsNeedingPriceRecheck(input: {
  decisions: Decision[]
  changedSourceUrls: string[]
}): string[] {
  const changed = new Set(input.changedSourceUrls)
  return input.decisions
    .filter(decision => decision.factSourceSnapshot.some(source => changed.has(source.sourceUrl)))
    .map(decision => decision.id)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test:run -- src/features/facts/lib/pricingFreshness.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/facts/lib/pricingFreshness.ts src/features/facts/lib/pricingFreshness.test.ts
git commit -m "feat: add pricing freshness recheck"
```

---

## Task 3: 멀티모달 UsageEvent v2

**Files:**
- Create: `src/features/usage/lib/usageEventV2.ts`
- Create: `src/features/usage/lib/usageEventV2.test.ts`
- Modify: `src/features/usage/lib/usageImport.ts`
- Modify: `src/features/usage/lib/usageImport.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { parseUsageEventV2Csv } from './usageEventV2'
import { MODELS } from '../../alternatives/data/models'

describe('UsageEvent v2', () => {
  it('parses multimodal and tool usage dimensions without guessing missing values', () => {
    const csv = [
      'timestamp,request_id,customer_id,feature,model,input_tokens,output_tokens,image_input_tokens,audio_input_seconds,video_input_seconds,video_output_seconds,cache_read_tokens,cache_write_tokens,tool_call_count,web_search_count',
      '2026-05-24T00:00:00Z,req-1,cust-1,video_agent,gemini-omni-flash,1000,500,2000,30,12,6,900,100,3,2',
    ].join('\n')

    const result = parseUsageEventV2Csv(csv, MODELS)

    expect(result.rows[0]).toMatchObject({
      imageInputTokens: 2000,
      audioInputSeconds: 30,
      videoInputSeconds: 12,
      videoOutputSeconds: 6,
      cacheReadTokens: 900,
      cacheWriteTokens: 100,
      toolCallCount: 3,
      webSearchCount: 2,
    })
    expect(result.multimodalTotals.videoOutputSeconds).toBe(6)
    expect(result.warnings).toContain('gemini-omni-flash has unsupported official pricing for video_output_seconds')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test:run -- src/features/usage/lib/usageEventV2.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement `usageEventV2.ts`**

```ts
import { calculateModalityCost } from '../../../domain/cost/calculator'
import type { Model } from '../../alternatives/data/models'

export interface UsageEventV2Row {
  timestamp: string | null
  requestId: string | null
  customerId: string | null
  feature: string
  modelId: string
  inputTokens: number
  outputTokens: number
  imageInputTokens: number
  audioInputSeconds: number
  videoInputSeconds: number
  videoOutputSeconds: number
  cacheReadTokens: number
  cacheWriteTokens: number
  toolCallCount: number
  webSearchCount: number
}

export interface UsageEventV2Summary {
  rows: UsageEventV2Row[]
  multimodalTotals: {
    imageInputTokens: number
    audioInputSeconds: number
    videoInputSeconds: number
    videoOutputSeconds: number
    cacheReadTokens: number
    cacheWriteTokens: number
    toolCallCount: number
    webSearchCount: number
  }
  warnings: string[]
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

function n(value: string | undefined): number {
  const parsed = Number((value ?? '').replace(/[$,\s]/g, ''))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function value(record: Record<string, string>, key: string): string | undefined {
  return record[key] || undefined
}

export function parseUsageEventV2Csv(rawCsv: string, models: Model[]): UsageEventV2Summary {
  const lines = rawCsv.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (lines.length < 2) {
    return {
      rows: [],
      multimodalTotals: {
        imageInputTokens: 0,
        audioInputSeconds: 0,
        videoInputSeconds: 0,
        videoOutputSeconds: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        toolCallCount: 0,
        webSearchCount: 0,
      },
      warnings: [],
    }
  }

  const headers = parseCsvLine(lines[0])
  const warnings: string[] = []
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line)
    const record = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? ''
      return acc
    }, {})

    const modelId = value(record, 'model') ?? value(record, 'model_id') ?? ''
    const model = models.find(item => item.id === modelId || item.name === modelId)
    const row: UsageEventV2Row = {
      timestamp: value(record, 'timestamp') ?? null,
      requestId: value(record, 'request_id') ?? value(record, 'requestId') ?? null,
      customerId: value(record, 'customer_id') ?? value(record, 'customerId') ?? null,
      feature: value(record, 'feature') ?? 'unknown',
      modelId,
      inputTokens: n(value(record, 'input_tokens') ?? value(record, 'inputTokens')),
      outputTokens: n(value(record, 'output_tokens') ?? value(record, 'outputTokens')),
      imageInputTokens: n(value(record, 'image_input_tokens')),
      audioInputSeconds: n(value(record, 'audio_input_seconds')),
      videoInputSeconds: n(value(record, 'video_input_seconds')),
      videoOutputSeconds: n(value(record, 'video_output_seconds')),
      cacheReadTokens: n(value(record, 'cache_read_tokens')),
      cacheWriteTokens: n(value(record, 'cache_write_tokens')),
      toolCallCount: n(value(record, 'tool_call_count')),
      webSearchCount: n(value(record, 'web_search_count')),
    }

    if (model && row.videoOutputSeconds > 0) {
      const priced = calculateModalityCost({
        model,
        modality: 'video_output_seconds',
        quantity: row.videoOutputSeconds,
      })
      if (priced.status === 'unsupported_pricing') {
        warnings.push(`${model.id} has unsupported official pricing for video_output_seconds`)
      }
    }

    return row
  })

  return {
    rows,
    multimodalTotals: rows.reduce((acc, row) => ({
      imageInputTokens: acc.imageInputTokens + row.imageInputTokens,
      audioInputSeconds: acc.audioInputSeconds + row.audioInputSeconds,
      videoInputSeconds: acc.videoInputSeconds + row.videoInputSeconds,
      videoOutputSeconds: acc.videoOutputSeconds + row.videoOutputSeconds,
      cacheReadTokens: acc.cacheReadTokens + row.cacheReadTokens,
      cacheWriteTokens: acc.cacheWriteTokens + row.cacheWriteTokens,
      toolCallCount: acc.toolCallCount + row.toolCallCount,
      webSearchCount: acc.webSearchCount + row.webSearchCount,
    }), {
      imageInputTokens: 0,
      audioInputSeconds: 0,
      videoInputSeconds: 0,
      videoOutputSeconds: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      toolCallCount: 0,
      webSearchCount: 0,
    }),
    warnings: [...new Set(warnings)],
  }
}
```

- [ ] **Step 4: Integrate into `usageImport.ts`**

Add optional v2 fields to `UsageImportRow`:

```ts
  imageInputTokens?: number
  audioInputSeconds?: number
  videoInputSeconds?: number
  videoOutputSeconds?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  toolCallCount?: number
  webSearchCount?: number
```

Then add field keys:

```ts
  image_input_tokens: ['image_input_tokens', 'imageInputTokens'],
  audio_input_seconds: ['audio_input_seconds', 'audioInputSeconds'],
  video_input_seconds: ['video_input_seconds', 'videoInputSeconds'],
  video_output_seconds: ['video_output_seconds', 'videoOutputSeconds'],
  cache_read_tokens: ['cache_read_tokens', 'cacheReadTokens', 'cached_input_tokens'],
  cache_write_tokens: ['cache_write_tokens', 'cacheWriteTokens'],
  tool_call_count: ['tool_call_count', 'toolCallCount'],
  web_search_count: ['web_search_count', 'webSearchCount'],
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npm run test:run -- src/features/usage/lib/usageEventV2.test.ts src/features/usage/lib/usageImport.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/usage/lib/usageEventV2.ts src/features/usage/lib/usageEventV2.test.ts src/features/usage/lib/usageImport.ts src/features/usage/lib/usageImport.test.ts
git commit -m "feat: add multimodal usage event v2"
```

---

## Task 4: Decision Header로 `DecisionSummaryStrip` 전환

**Files:**
- Create: `src/features/decision-loop/lib/decisionHeader.ts`
- Create: `src/features/decision-loop/lib/decisionHeader.test.ts`
- Modify: `src/components/DecisionSummaryStrip/index.tsx`
- Modify: `src/components/DecisionSummaryStrip/DecisionSummaryStrip.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildDecisionHeader } from './decisionHeader'

describe('buildDecisionHeader', () => {
  it('turns a thin margin and rate card draft into one decision question', () => {
    const header = buildDecisionHeader({
      grossMarginPct: 0.31,
      thinMarginThresholdPct: 0.4,
      topRecommendation: 'credit bundle with overage',
      hasRateCardDraft: true,
      stalePricingDecisionCount: 0,
      toolRefs: ['tool:pricing.credit.margin'],
      riskRefs: ['risk-overage-bill-shock'],
    })

    expect(header.question).toBe('Adopt, hold, or reject the credit bundle with overage draft?')
    expect(header.primaryActionLabel).toBe('Review rate card draft')
    expect(header.refs).toContain('tool:pricing.credit.margin')
    expect(header.refs).toContain('risk-overage-bill-shock')
  })

  it('prioritizes source recheck when pricing changed after prior decisions', () => {
    const header = buildDecisionHeader({
      grossMarginPct: 0.65,
      thinMarginThresholdPct: 0.4,
      topRecommendation: 'model routing',
      hasRateCardDraft: false,
      stalePricingDecisionCount: 2,
      toolRefs: ['tool:pricing.freshness'],
      riskRefs: [],
    })

    expect(header.question).toBe('Recheck 2 past decisions affected by changed pricing sources?')
    expect(header.primaryActionLabel).toBe('Open affected decisions')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test:run -- src/features/decision-loop/lib/decisionHeader.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement `decisionHeader.ts`**

```ts
export interface DecisionHeaderInput {
  grossMarginPct: number
  thinMarginThresholdPct: number
  topRecommendation: string
  hasRateCardDraft: boolean
  stalePricingDecisionCount: number
  toolRefs: string[]
  riskRefs: string[]
}

export interface DecisionHeader {
  question: string
  primaryActionLabel: string
  urgency: 'low' | 'medium' | 'high'
  refs: string[]
}

export function buildDecisionHeader(input: DecisionHeaderInput): DecisionHeader {
  if (input.stalePricingDecisionCount > 0) {
    return {
      question: `Recheck ${input.stalePricingDecisionCount} past decisions affected by changed pricing sources?`,
      primaryActionLabel: 'Open affected decisions',
      urgency: 'high',
      refs: input.toolRefs,
    }
  }

  if (input.hasRateCardDraft) {
    return {
      question: `Adopt, hold, or reject the ${input.topRecommendation} draft?`,
      primaryActionLabel: 'Review rate card draft',
      urgency: input.grossMarginPct < input.thinMarginThresholdPct ? 'high' : 'medium',
      refs: [...input.toolRefs, ...input.riskRefs],
    }
  }

  return {
    question: `Which operating decision should we make for ${input.topRecommendation}?`,
    primaryActionLabel: 'Review recommendation',
    urgency: input.grossMarginPct < input.thinMarginThresholdPct ? 'high' : 'low',
    refs: [...input.toolRefs, ...input.riskRefs],
  }
}
```

- [ ] **Step 4: Update `DecisionSummaryStrip`**

Replace the six metric cards with one header card plus compact supporting refs. The component still receives `state`, but the decision question should come from `buildDecisionHeader()`.

```tsx
<section className="rounded-md border border-gray-200 bg-white p-4">
  <p className="text-xs font-semibold uppercase text-gray-500">Decision needed</p>
  <h2 className="mt-2 text-lg font-semibold text-gray-900">{header.question}</h2>
  <div className="mt-3 flex flex-wrap gap-2">
    {header.refs.map(ref => (
      <span key={ref} className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600">
        {ref}
      </span>
    ))}
  </div>
</section>
```

- [ ] **Step 5: Run component tests**

Run:

```powershell
npm run test:run -- src/features/decision-loop/lib/decisionHeader.test.ts src/components/DecisionSummaryStrip/DecisionSummaryStrip.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/decision-loop/lib/decisionHeader.ts src/features/decision-loop/lib/decisionHeader.test.ts src/components/DecisionSummaryStrip/index.tsx src/components/DecisionSummaryStrip/DecisionSummaryStrip.test.tsx
git commit -m "feat: turn decision summary into decision header"
```

---

## Task 5: Export hard gate와 Decision Log 저장 확장

**Files:**
- Create: `src/features/decision-loop/lib/exportGate.ts`
- Create: `src/features/decision-loop/lib/exportGate.test.ts`
- Modify: `src/features/decision-log/lib/decisionLog.ts`
- Modify: `src/features/decision-log/lib/decisionLog.test.ts`
- Modify: `src/features/report/lib/reportArtifacts.ts`
- Modify: `src/features/report/lib/reportArtifacts.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { canExportOperatingArtifact } from './exportGate'

describe('canExportOperatingArtifact', () => {
  it('blocks export until adopt, reject, or hold is recorded', () => {
    expect(canExportOperatingArtifact({ decisionChoice: null }).allowed).toBe(false)
    expect(canExportOperatingArtifact({ decisionChoice: 'hold' }).allowed).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test:run -- src/features/decision-loop/lib/exportGate.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement `exportGate.ts`**

```ts
export type DecisionChoice = 'adopt' | 'reject' | 'hold'

export interface ExportGateResult {
  allowed: boolean
  reason: string | null
}

export function canExportOperatingArtifact(input: { decisionChoice: DecisionChoice | null }): ExportGateResult {
  if (!input.decisionChoice) {
    return {
      allowed: false,
      reason: 'Choose Adopt, Reject, or Hold before exporting this operating artifact.',
    }
  }
  return { allowed: true, reason: null }
}
```

- [ ] **Step 4: Extend Decision Log type**

In `decisionLog.ts`, add:

```ts
export type DecisionChoice = 'adopt' | 'reject' | 'hold'

export interface DecisionInput {
  decisionChoice?: DecisionChoice
  rateCardDraft?: unknown
  pricingFreshnessSnapshot?: unknown
}
```

Then normalize:

```ts
decisionChoice: decision.decisionChoice ?? (
  decision.status === 'adopted' ? 'adopt' : decision.status === 'rejected' ? 'reject' : 'hold'
),
rateCardDraft: isRecord(decision.rateCardDraft) ? decision.rateCardDraft : null,
pricingFreshnessSnapshot: isRecord(decision.pricingFreshnessSnapshot) ? decision.pricingFreshnessSnapshot : null,
```

- [ ] **Step 5: Extend report artifact**

Add optional fields to `OnePageReportArtifactInput`:

```ts
rateCardDraft?: {
  title: string
  includedCredits: number | null
  overagePricePerRequest: number | null
  capUsdPerCustomer: number | null
  affectedCustomerCount: number
  executionMode: 'draft_only'
}
pricingFreshness?: {
  state: string
  label: string
  affectedDecisionCount: number
}
decisionChoice?: 'adopt' | 'reject' | 'hold'
```

Append sections:

```ts
'## Rate card draft',
input.rateCardDraft
  ? `- ${input.rateCardDraft.title}: included credits ${input.rateCardDraft.includedCredits ?? 'none'}, overage ${input.rateCardDraft.overagePricePerRequest ?? 'none'}, cap ${input.rateCardDraft.capUsdPerCustomer ?? 'none'}, affected customers ${input.rateCardDraft.affectedCustomerCount}, mode ${input.rateCardDraft.executionMode}`
  : '- No rate card draft selected.',
'',
'## Decision gate',
`- Decision choice: ${input.decisionChoice ?? 'not selected'}`,
`- Pricing freshness: ${input.pricingFreshness?.label ?? 'not attached'}`,
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm run test:run -- src/features/decision-loop/lib/exportGate.test.ts src/features/decision-log/lib/decisionLog.test.ts src/features/report/lib/reportArtifacts.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/decision-loop/lib/exportGate.ts src/features/decision-loop/lib/exportGate.test.ts src/features/decision-log/lib/decisionLog.ts src/features/decision-log/lib/decisionLog.test.ts src/features/report/lib/reportArtifacts.ts src/features/report/lib/reportArtifacts.test.ts
git commit -m "feat: require operating decision before export"
```

---

## Task 6: App UI 연결

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/features/team-cost/components/OptimizationReviewPanel/index.tsx`
- Modify: `src/features/team-cost/components/OptimizationReviewPanel/OptimizationReviewPanel.test.tsx`

- [ ] **Step 1: Write failing app tests**

Add tests to `src/app/App.test.tsx`:

```ts
it('shows one decision header instead of a metric-only summary strip', () => {
  render(<App />)
  expect(screen.getByText(/Decision needed/i)).toBeInTheDocument()
  expect(screen.getByText(/Adopt|hold|reject|Which operating decision/i)).toBeInTheDocument()
})

it('blocks report export until the user records adopt, reject, or hold', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /Export one-page report/i }))

  expect(screen.getByText(/Choose Adopt, Reject, or Hold before exporting/i)).toBeInTheDocument()
})

it('records hold as a valid operating decision and then allows export', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /Hold top recommendation/i }))
  await user.click(screen.getByRole('button', { name: /Export one-page report/i }))

  expect(screen.queryByText(/Choose Adopt, Reject, or Hold before exporting/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test:run -- src/app/App.test.tsx
```

Expected: FAIL because Hold/export gate UI does not exist.

- [ ] **Step 3: Wire state in App**

Add local state:

```ts
const [lastDecisionChoice, setLastDecisionChoice] = useState<DecisionChoice | null>(null)
const [exportGateError, setExportGateError] = useState<string | null>(null)
```

Build rate card draft:

```ts
const rateCardDraft = useMemo(() => buildRateCardDraft({
  id: 'rate-card-credit-pro',
  title: 'Pro credit bundle draft',
  rows: usageSummary.rows,
  currentRevenueByCustomer,
  policy: {
    type: 'credit',
    includedCredits: 1000,
    includedRequests: 1000,
    overagePricePerRequest: 45,
    capUsdPerCustomer: 500,
  },
  basis: {
    scenarioRef: 'tool:pricing.credit.margin',
    marginPct: pricingScenario.grossMarginPct,
    thresholdRef: 'basis:rule:gross_margin_thin_pct',
  },
  generatedAt: new Date().toISOString(),
}), [usageSummary.rows, currentRevenueByCustomer, pricingScenario.grossMarginPct])
```

Export handler:

```ts
const handleExportOnePageReport = () => {
  const gate = canExportOperatingArtifact({ decisionChoice: lastDecisionChoice })
  if (!gate.allowed) {
    setExportGateError(gate.reason)
    return
  }
  setExportGateError(null)
  // existing export artifact flow continues here
}
```

- [ ] **Step 4: Add Hold button**

In the recommendation decision controls:

```tsx
<Button size="sm" variant="secondary" onClick={handleHoldTeamCostOptimization} disabled={!recommendation}>
  Hold top recommendation
</Button>
```

`handleHoldTeamCostOptimization` should create a decision with:

```ts
status: 'superseded',
decisionChoice: 'hold',
why: `Held for validation: ${recommendation.rationale}`,
rateCardDraft,
pricingFreshnessSnapshot,
```

- [ ] **Step 5: Render Rate Card Draft panel**

Customer-visible content:

```tsx
<section aria-label="Rate card draft">
  <h2>Rate card draft</h2>
  <p>Draft only. No billing changes will be executed.</p>
  <dl>
    <dt>Included credits</dt>
    <dd>{rateCardDraft.includedCredits ?? 'Not set'}</dd>
    <dt>Overage</dt>
    <dd>{rateCardDraft.overagePricePerRequest === null ? 'Not set' : fmtCurrency(rateCardDraft.overagePricePerRequest)}</dd>
    <dt>Affected customers</dt>
    <dd>{rateCardDraft.affectedCustomerCount}</dd>
  </dl>
</section>
```

Admin/debug-only content can include `rateCardDraft.refs`.

- [ ] **Step 6: Run app tests**

Run:

```powershell
npm run test:run -- src/app/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/app/App.tsx src/app/App.test.tsx src/features/team-cost/components/OptimizationReviewPanel/index.tsx src/features/team-cost/components/OptimizationReviewPanel/OptimizationReviewPanel.test.tsx
git commit -m "feat: wire rate card decision loop"
```

---

## Task 7: 문서 갱신

**Files:**
- Modify: `docs/PRD.md`
- Modify: `docs/PRD-v2.md`
- Modify: `docs/PRODUCT_UX.md`
- Modify: `docs/PRODUCT_UX_DETAILED.md`
- Modify: `docs/superpowers/plans/2026-05-23-p1-extension-backlog.md`

- [ ] **Step 1: Update PRD**

Add this Korean section:

```md
## Rate Card Decision Loop

P0.5는 추천을 보여주는 데서 끝나지 않고, 사용자가 운영 결정을 남기게 만든다. 화면 상단은 “오늘 내려야 할 결정 1개”를 보여준다. 추천안이 가격정책 변경이라면 Rate Card Draft를 만든다. 이 초안은 Stripe/Metronome 집행이 아니라 included credits, overage, cap, 영향 고객 수, 근거 마진, risk card를 담은 운영 산출물이다.

Export는 Adopt, Reject, Hold 중 하나의 결정이 Decision/Operating Ledger에 저장된 뒤에만 가능하다. 이 hard gate는 “운영 일지를 한 번도 열지 않음”이라는 안티지표를 제품 구조에서 줄인다.
```

- [ ] **Step 2: Update PRODUCT UX**

Add:

```md
### 고객 화면

- Decision Header: “오늘 내려야 할 결정 1개”
- Pricing Freshness: Verified / Estimated / TBD / Source Changed
- Rate Card Draft: included credits, overage, cap, 영향 고객 수, draft-only 표시
- Export Gate: Adopt / Reject / Hold 전에는 report export 차단

### Admin/debug 화면

- Source URL, changed source, affected decision refs
- Rate Card refs, tool refs, threshold refs
- UsageEvent v2 raw column mapping
```

- [ ] **Step 3: Run doc-oriented tests**

Run:

```powershell
npm run test:run -- src/features/p1/lib/p1ProductDocs.test.ts
```

Expected: PASS after adding assertions for `Rate Card Decision Loop`, `Decision Header`, and `UsageEvent v2`.

- [ ] **Step 4: Commit**

```powershell
git add docs/PRD.md docs/PRD-v2.md docs/PRODUCT_UX.md docs/PRODUCT_UX_DETAILED.md docs/superpowers/plans/2026-05-23-p1-extension-backlog.md src/features/p1/lib/p1ProductDocs.test.ts
git commit -m "docs: add rate card decision loop specification"
```

---

## Task 8: 최종 검증

**Files:**
- No new files.

- [ ] **Step 1: Run targeted tests**

```powershell
npm run test:run -- src/features/pricing/lib/rateCardDraft.test.ts src/features/facts/lib/pricingFreshness.test.ts src/features/usage/lib/usageEventV2.test.ts src/features/decision-loop/lib/decisionHeader.test.ts src/features/decision-loop/lib/exportGate.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run app and full tests**

```powershell
npm run test:run
```

Expected: PASS.

- [ ] **Step 3: Run build**

```powershell
npm run build
```

Expected: PASS. Existing Vite chunk-size warning is acceptable.

- [ ] **Step 4: Browser smoke**

Start dev server:

```powershell
npm run dev
```

Manual checks:

1. Open `http://127.0.0.1:5174/token_simulator/` or the active Vite URL.
2. Load SparkClaw sample.
3. Confirm top header shows one decision question.
4. Open Optimize + Risk.
5. Confirm Rate Card Draft says draft-only and shows included credits, overage, cap, affected customers.
6. Try report export before choosing a decision. It must be blocked.
7. Click Hold. Confirm Decision Log stores a row.
8. Export one-page report. It must include decision choice, rate card draft, pricing freshness, and refs.

- [ ] **Step 5: Commit verification metadata if needed**

Only commit generated artifacts if they are intentionally tracked. Do not stage `.env`.

---

## Self-review

- Spec coverage: all five requested items are covered by Tasks 1-7.
- No billing execution: Rate Card Draft explicitly has `executionMode: 'draft_only'` and `billingMutationAllowed: false`.
- Decision hard gate: Task 5 and Task 6 enforce Adopt/Reject/Hold before export.
- Pricing freshness: Task 2 adds 4-state badge and affected decision recheck.
- UsageEvent v2: Task 3 adds image/audio/video/cache/tool/search dimensions.
- Decision Header: Task 4 changes the top summary from metric-only to decision-first.
- Customer/admin split: Task 6 and Task 7 keep refs/debug details out of customer default view.
