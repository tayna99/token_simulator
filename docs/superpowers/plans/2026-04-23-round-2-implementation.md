# LLM Cost Planner — Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** 앱의 thesis를 "토큰 계산기"에서 **"역할별 비용 인텔리전스 대시보드"** 로 전환. 개발자/PM/CEO 각자가 **자기 언어로** 5가지 핵심 질문에 답을 얻게 한다.
1. 지금 얼마 드나 (월/년)
2. 어디서 돈이 빠지나 (input/output/cache/batch 분해)
3. 모델 바꾸면 얼마 절감되나 (델타 + 손익분기)
4. 사용량 늘면 어디서 터지나 (Best/Base/Worst 편집 가능)
5. 예산 한도에서 얼마나 서비스 가능한가 (max users/requests)

**Architecture:** 기존 Vite+React+TS 앱에 3개 신규 순수 함수 모듈(period/breakdown/budget) + 3개 신규 UI 패널 + 역할 프레이밍 레이어 추가. 기존 Migration/Scenario/Summary 3개 패널도 강화. 신규 의존성 없음.

**Tech Stack:** unchanged — Vite 6, React 18, TS 5, Tailwind 3, Recharts, html-to-image, Vitest 4.

**References:**
- `feedback2.md` (라운드 2 외부 피드백, 9개 항목)
- 사용자 전언 (플랜 요청 turn): 5개 핵심 화면 + 역할별 언어 + per-request/per-user/budget-cap/top-driver 추가
- `docs/superpowers/plans/2026-04-23-round-2-backlog.md` (이전 스코핑, 이 플랜이 대체)
- Round 1 SHA `87d71b0` (배포 기준점)

**Ship bar:** 13 tasks, 각 task는 TDD 실패→구현→통과→커밋 리듬. 모든 task 완료 후 `npm run test:run` 전체 + `npm run build` + gstack canary 통과 → `/land-and-deploy`.

---

## Thesis — 왜 이번 라운드가 재구조화인가

Round 1은 "auto-translate 방어 + formatter DRY + 회귀 테스트"로 **보수적 방어**였음. Round 2는 사용자가 제시한 명제에 맞게 **앱의 정보 표면을 재설계**한다.

기존 3개 패널(Migration/Scenario/Summary)은 **좋지만 불완전**. 빠진 것:
- **Cost Breakdown** — input vs output vs cached vs batch 할인. 어디서 돈이 빠지나.
- **Budget Cap** — 내 예산이 $X면 얼마 서비스 가능한가. 역질문.
- **Top Cost Driver** — 지금 가장 큰 비용 drain은 뭔가. 한 줄 인사이트.
- **Per-request / Per-user** — PM/CEO가 실제 쓰는 단위.
- **Role framing** — 동일 데이터를 dev/PM/CEO 언어로 다르게 프레임.

추가로 feedback2.md에서 올린 9개 중 구조적인 것(scenario 편집, 모바일, 입력 검증)도 여기 흡수.

---

## File Structure

```
token_simulator/
├── src/
│   ├── lib/
│   │   ├── calculator.ts           [MODIFY — add breakdown fields]
│   │   ├── period.ts               [NEW — 기간 변환 lib]
│   │   ├── period.test.ts          [NEW]
│   │   ├── breakdown.ts            [NEW — per-channel 비용 계산]
│   │   ├── breakdown.test.ts       [NEW]
│   │   ├── budget.ts               [NEW — 예산 → max 용량 역계산]
│   │   ├── budget.test.ts          [NEW]
│   │   ├── insights.ts             [NEW — top driver + 절감 제안]
│   │   ├── insights.test.ts        [NEW]
│   │   ├── roleLanguage.ts         [NEW — dev/PM/CEO 라벨/템플릿 팩]
│   │   ├── format.ts               [MODIFY — fmtPerUnit 추가]
│   │   └── format.test.ts          [MODIFY — fmtPerUnit 테스트]
│   ├── data/
│   │   ├── models.ts               [MODIFY — +10 모델, +5 프로바이더]
│   │   └── presets.ts              [MODIFY — +6 프리셋, requestsDefault/usersDefault]
│   ├── components/
│   │   ├── RoleSelector.tsx        [NEW]
│   │   ├── PeriodSelector.tsx      [NEW]
│   │   ├── TokenInputs.tsx         [MODIFY — period input, cache numeric pair, requests/users, a11y]
│   │   ├── ModelSelector.tsx       [MODIFY — optgroup by provider]
│   │   ├── MigrationPanel/
│   │   │   ├── index.tsx           [MODIFY — break-even, ▲/▼, responsive]
│   │   │   └── MigrationPanel.test.tsx [MODIFY]
│   │   ├── ScenarioPlanner/
│   │   │   ├── index.tsx           [MODIFY — editable cells, tooltips, responsive]
│   │   │   └── ScenarioPlanner.test.tsx [MODIFY]
│   │   ├── CostBreakdown/
│   │   │   ├── index.tsx           [NEW]
│   │   │   └── CostBreakdown.test.tsx [NEW]
│   │   ├── BudgetCap/
│   │   │   ├── index.tsx           [NEW]
│   │   │   └── BudgetCap.test.tsx  [NEW]
│   │   ├── SummaryCard/
│   │   │   ├── index.tsx           [MODIFY — role-adapted template, copy toast, source links]
│   │   │   └── SummaryCard.test.tsx [MODIFY]
│   │   └── ui/
│   │       └── Toast.tsx           [NEW]
│   ├── hooks/
│   │   └── useToast.ts             [NEW]
│   └── App.tsx                     [MODIFY — SimState 확장 (period, role, requests, users, budget), 패널 배치 역할에 따라]
├── index.html                      [MODIFY — 뷰포트 확인, lang="en" 유지]
└── tailwind.config.js              [MODIFY — breakpoints 활용 확인 / 필요시 커스텀]
```

---

## SimState 확장 (T0, 전 task 공통)

```ts
export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'
export type Role = 'developer' | 'pm' | 'ceo'

export interface SimState {
  role: Role                           // NEW
  currentModel: Model
  candidateModel: Model
  period: Period                       // NEW
  periodInputTokens: number            // RENAMED from monthlyInputTokens
  periodOutputTokens: number           // RENAMED from monthlyOutputTokens
  cacheHitRate: number
  batchEnabled: boolean
  monthlyRequests: number              // NEW (derived defaults from preset)
  activeUsers: number                  // NEW (derived defaults from preset)
  monthlyBudgetUsd: number | null      // NEW (null = not set)
}
```

모든 내부 계산은 **월 기준** 고정. UI 입력은 `period` 선택값 단위로 받고, `period.ts`의 `toMonthly(value, period)` 로 변환.

---

## Tasks

### Task R2.1: Period conversion lib (TDD)

**Files:**
- Create: `src/lib/period.ts`
- Create: `src/lib/period.test.ts`

**Steps:**

- [ ] **Step 1: Failing tests**

```typescript
// src/lib/period.test.ts
import { describe, it, expect } from 'vitest'
import { toMonthly, fromMonthly, periodLabel, PERIOD_DAYS } from './period'

describe('toMonthly', () => {
  it('day → month ≈ x30', () => expect(toMonthly(100, 'day')).toBeCloseTo(3000, 0))
  it('week → month ≈ x4.33', () => expect(toMonthly(100, 'week')).toBeCloseTo(433, 0))
  it('month → month x1', () => expect(toMonthly(100, 'month')).toBe(100))
  it('quarter → month /3', () => expect(toMonthly(300, 'quarter')).toBeCloseTo(100, 0))
  it('year → month /12', () => expect(toMonthly(1200, 'year')).toBeCloseTo(100, 0))
  it('handles NaN', () => expect(toMonthly(NaN, 'day')).toBe(0))
})

describe('fromMonthly', () => {
  it('inverts toMonthly', () => {
    const v = fromMonthly(toMonthly(100, 'day'), 'day')
    expect(v).toBeCloseTo(100, 0)
  })
})

describe('periodLabel', () => {
  it('returns human label', () => {
    expect(periodLabel('day')).toBe('day')
    expect(periodLabel('quarter')).toBe('quarter')
  })
})
```

- [ ] **Step 2: Run → FAIL** (module missing)

`npm run test:run src/lib/period`

- [ ] **Step 3: Implement**

```typescript
// src/lib/period.ts
export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'

export const PERIOD_DAYS: Record<Period, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
}

export function toMonthly(value: number, period: Period): number {
  if (!Number.isFinite(value)) return 0
  const monthsPerPeriod = PERIOD_DAYS[period] / 30
  return value / monthsPerPeriod
}

export function fromMonthly(monthlyValue: number, period: Period): number {
  if (!Number.isFinite(monthlyValue)) return 0
  const monthsPerPeriod = PERIOD_DAYS[period] / 30
  return monthlyValue * monthsPerPeriod
}

export function periodLabel(p: Period): string {
  return p
}
```

- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `feat: period conversion module (TDD)`

---

### Task R2.2: Model catalog expansion (+10 models, +5 providers)

**Files:**
- Modify: `src/data/models.ts`

**Steps:**

- [ ] **Step 1: Extend Provider type**

```typescript
export type Provider =
  | 'openai' | 'anthropic' | 'google' | 'xai' | 'microsoft'
  | 'meta' | 'mistral' | 'deepseek' | 'alibaba' | 'moonshot'
```

- [ ] **Step 2: Append 10 new model entries to `MODELS` array**

```typescript
  // Google Gemma (open-weight, via Vertex)
  { id: 'gemma-4-9b', name: 'Gemma 4 9B', provider: 'google',
    inputPrice: 0.05, outputPrice: 0.15, contextWindow: 128000,
    releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0 },
  { id: 'gemma-4-27b', name: 'Gemma 4 27B', provider: 'google',
    inputPrice: 0.15, outputPrice: 0.60, contextWindow: 128000,
    releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0 },
  // Meta Llama (via Together AI)
  { id: 'llama-4-70b', name: 'Llama 4 70B', provider: 'meta',
    inputPrice: 0.30, outputPrice: 0.80, contextWindow: 256000,
    releaseDate: '2025-09', cacheDiscount: 0, batchDiscount: 0 },
  { id: 'llama-4-405b', name: 'Llama 4 405B', provider: 'meta',
    inputPrice: 1.00, outputPrice: 3.00, contextWindow: 256000,
    releaseDate: '2025-09', cacheDiscount: 0, batchDiscount: 0 },
  // DeepSeek
  { id: 'deepseek-v4', name: 'DeepSeek V4', provider: 'deepseek',
    inputPrice: 0.25, outputPrice: 0.90, contextWindow: 128000,
    releaseDate: '2026-03', cacheDiscount: 0.5, batchDiscount: 0 },
  { id: 'deepseek-r2', name: 'DeepSeek R2 (Reasoning)', provider: 'deepseek',
    inputPrice: 0.50, outputPrice: 1.50, contextWindow: 64000,
    releaseDate: '2026-02', cacheDiscount: 0.5, batchDiscount: 0 },
  // Mistral
  { id: 'mistral-large-3', name: 'Mistral Large 3', provider: 'mistral',
    inputPrice: 2.50, outputPrice: 7.50, contextWindow: 256000,
    releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0.5 },
  { id: 'mistral-small-4', name: 'Mistral Small 4', provider: 'mistral',
    inputPrice: 0.25, outputPrice: 0.75, contextWindow: 128000,
    releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0.5 },
  // Alibaba Qwen
  { id: 'qwen-3-max', name: 'Qwen 3 Max', provider: 'alibaba',
    inputPrice: 1.50, outputPrice: 5.00, contextWindow: 256000,
    releaseDate: '2025-12', cacheDiscount: 0, batchDiscount: 0 },
  // Moonshot Kimi
  { id: 'kimi-k2', name: 'Kimi K2', provider: 'moonshot',
    inputPrice: 0.60, outputPrice: 2.00, contextWindow: 2000000,
    releaseDate: '2025-11', cacheDiscount: 0, batchDiscount: 0 },
```

- [ ] **Step 3: Update MigrationPanel test** — ensure new models don't break existing hard-coded test values (Sonnet 4.6 baseline $225 should still render since test uses exact model ids).

- [ ] **Step 4: Run full test** `npm run test:run` — all 46 pass
- [ ] **Step 5: Commit** `feat: expand model catalog — gemma/llama/deepseek/mistral/qwen/kimi (+10)`

---

### Task R2.3: Preset catalog expansion (+6 presets) + per-preset defaults

**Files:**
- Modify: `src/data/presets.ts`

**Steps:**

- [ ] **Step 1: Extend WorkloadPreset interface**

```typescript
export interface WorkloadPreset {
  id: string
  name: string
  monthlyInputTokens: number
  monthlyOutputTokens: number
  defaultCacheHitRate: number
  defaultBatchEnabled: boolean
  monthlyRequestsDefault: number      // NEW
  activeUsersDefault: number          // NEW
  description: string                 // NEW — shown in preset tooltip (feedback2 UX ①)
}
```

- [ ] **Step 2: Add 6 new entries + backfill existing**

Existing 6 get `monthlyRequestsDefault`, `activeUsersDefault`, `description`.

New 6:
```typescript
  { id: 'coding-agent', name: 'Coding Agent (IDE)',
    monthlyInputTokens: 30_000_000, monthlyOutputTokens: 5_000_000,
    defaultCacheHitRate: 0.4, defaultBatchEnabled: false,
    monthlyRequestsDefault: 500_000, activeUsersDefault: 500,
    description: 'Cursor/Copilot-style autocomplete — 고빈도, 짧은 컨텍스트' },
  { id: 'rag-chatbot', name: 'RAG Chatbot',
    monthlyInputTokens: 200_000_000, monthlyOutputTokens: 10_000_000,
    defaultCacheHitRate: 0.7, defaultBatchEnabled: false,
    monthlyRequestsDefault: 300_000, activeUsersDefault: 5000,
    description: '벡터 retrieval + Q&A — cache 히트가 비용 지배' },
  { id: 'customer-support', name: 'Customer Support',
    monthlyInputTokens: 100_000_000, monthlyOutputTokens: 20_000_000,
    defaultCacheHitRate: 0.6, defaultBatchEnabled: false,
    monthlyRequestsDefault: 200_000, activeUsersDefault: 50_000,
    description: '멀티턴 고객 응대 — 미들 볼륨, 템플릿 응답 캐시' },
  { id: 'meeting-summary', name: 'Meeting Summary',
    monthlyInputTokens: 50_000_000, monthlyOutputTokens: 3_000_000,
    defaultCacheHitRate: 0.1, defaultBatchEnabled: true,
    monthlyRequestsDefault: 2_000, activeUsersDefault: 500,
    description: '긴 트랜스크립트 → 요약, 일일 batch — batch 할인 적합' },
  { id: 'content-moderation', name: 'Content Moderation',
    monthlyInputTokens: 500_000_000, monthlyOutputTokens: 5_000_000,
    defaultCacheHitRate: 0.2, defaultBatchEnabled: true,
    monthlyRequestsDefault: 10_000_000, activeUsersDefault: 0,
    description: '초소형 per-call × 극대량 — 작은 모델이 정답' },
  { id: 'semantic-search', name: 'Semantic Search',
    monthlyInputTokens: 200_000_000, monthlyOutputTokens: 1_000_000,
    defaultCacheHitRate: 0.3, defaultBatchEnabled: false,
    monthlyRequestsDefault: 50_000_000, activeUsersDefault: 100_000,
    description: '검색 re-ranking — input 위주, 출력 tiny' },
```

- [ ] **Step 3: Run tests, no breakage**
- [ ] **Step 4: Commit** `feat: expand preset catalog (+6), add requests/users defaults and descriptions`

---

### Task R2.4: Breakdown engine — per-channel 비용 (TDD)

**Files:**
- Create: `src/lib/breakdown.ts`
- Create: `src/lib/breakdown.test.ts`

**Steps:**

- [ ] **Step 1: Failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { calculateBreakdown } from './breakdown'
import type { Model } from '../data/models'

const MOCK: Model = {
  id: 'm', name: 'M', provider: 'anthropic',
  inputPrice: 3, outputPrice: 15, contextWindow: 100000,
  releaseDate: '2026-01', cacheDiscount: 0.9, batchDiscount: 0.5,
}

describe('calculateBreakdown', () => {
  it('splits input into cached vs uncached', () => {
    const r = calculateBreakdown({
      model: MOCK, monthlyInputTokens: 10_000_000, monthlyOutputTokens: 2_000_000,
      cacheHitRate: 0.5, batchEnabled: false,
    })
    // 5M cached * $3/1M * 0.1 (after 90% discount) = $1.5
    // 5M uncached * $3/1M = $15
    // 2M output * $15/1M = $30
    expect(r.uncachedInputUsd).toBeCloseTo(15, 2)
    expect(r.cachedInputUsd).toBeCloseTo(1.5, 2)
    expect(r.outputUsd).toBeCloseTo(30, 2)
    expect(r.batchSavingsUsd).toBe(0) // batch off
    expect(r.totalUsd).toBeCloseTo(46.5, 2)
  })

  it('computes batch savings as separate channel', () => {
    const r = calculateBreakdown({
      model: MOCK, monthlyInputTokens: 1_000_000, monthlyOutputTokens: 1_000_000,
      cacheHitRate: 0, batchEnabled: true,
    })
    // with batch: input $3 * 0.5 = $1.5, output $15 * 0.5 = $7.5, total $9
    // without batch would be $18; savings $9
    expect(r.totalUsd).toBeCloseTo(9, 2)
    expect(r.batchSavingsUsd).toBeCloseTo(9, 2)
  })

  it('identifies top cost channel', () => {
    const r = calculateBreakdown({
      model: MOCK, monthlyInputTokens: 1_000_000, monthlyOutputTokens: 10_000_000,
      cacheHitRate: 0, batchEnabled: false,
    })
    expect(r.topChannel).toBe('output')
  })

  it('NaN input → zero safe', () => {
    const r = calculateBreakdown({
      model: MOCK, monthlyInputTokens: NaN, monthlyOutputTokens: NaN,
      cacheHitRate: NaN, batchEnabled: false,
    })
    expect(r.totalUsd).toBe(0)
    expect(r.topChannel).toBe('none')
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/lib/breakdown.ts
import type { Model } from '../data/models'

export type CostChannel = 'uncached_input' | 'cached_input' | 'output' | 'none'

export interface BreakdownInput {
  model: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
}

export interface BreakdownResult {
  uncachedInputUsd: number
  cachedInputUsd: number
  outputUsd: number
  batchSavingsUsd: number       // how much batch saved vs no-batch baseline
  totalUsd: number
  topChannel: CostChannel
}

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0
}

export function calculateBreakdown(input: BreakdownInput): BreakdownResult {
  const m = input.model
  const inTok = safe(input.monthlyInputTokens)
  const outTok = safe(input.monthlyOutputTokens)
  const cacheRate = Math.min(1, Math.max(0, safe(input.cacheHitRate)))
  const batchMult = input.batchEnabled ? (1 - m.batchDiscount) : 1

  const uncachedIn = inTok * (1 - cacheRate)
  const cachedIn = inTok * cacheRate
  const uncachedInputUsd = (uncachedIn / 1_000_000) * m.inputPrice * batchMult
  const cachedInputUsd = (cachedIn / 1_000_000) * m.inputPrice * (1 - m.cacheDiscount) * batchMult
  const outputUsd = (outTok / 1_000_000) * m.outputPrice * batchMult

  // hypothetical no-batch total for delta
  const noBatchIn = (uncachedIn / 1_000_000) * m.inputPrice +
                    (cachedIn / 1_000_000) * m.inputPrice * (1 - m.cacheDiscount)
  const noBatchOut = (outTok / 1_000_000) * m.outputPrice
  const noBatchTotal = noBatchIn + noBatchOut
  const batchedTotal = uncachedInputUsd + cachedInputUsd + outputUsd
  const batchSavingsUsd = input.batchEnabled ? (noBatchTotal - batchedTotal) : 0

  const channels: [CostChannel, number][] = [
    ['uncached_input', uncachedInputUsd],
    ['cached_input', cachedInputUsd],
    ['output', outputUsd],
  ]
  const top = channels.reduce((a, b) => b[1] > a[1] ? b : a, ['none', 0] as [CostChannel, number])
  const topChannel = top[1] > 0 ? top[0] : 'none'

  return {
    uncachedInputUsd, cachedInputUsd, outputUsd,
    batchSavingsUsd,
    totalUsd: batchedTotal,
    topChannel,
  }
}
```

- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `feat: cost breakdown engine — per-channel + top driver (TDD)`

---

### Task R2.5: Budget cap engine — 예산→max capacity 역계산 (TDD)

**Files:**
- Create: `src/lib/budget.ts`
- Create: `src/lib/budget.test.ts`

**Steps:**

- [ ] **Step 1: Failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { calculateCapacity } from './budget'
import type { Model } from '../data/models'

const MOCK: Model = {
  id: 'm', name: 'M', provider: 'anthropic',
  inputPrice: 3, outputPrice: 15, contextWindow: 100000,
  releaseDate: '2026-01', cacheDiscount: 0.9, batchDiscount: 0.5,
}

describe('calculateCapacity', () => {
  it('returns max requests given budget + per-request profile', () => {
    // at 10M input + 2M output monthly = $46.5, with 100K requests/mo → $0.000465/req
    // budget $1000 → 1000 / 0.000465 ≈ 2,150,000 requests
    const r = calculateCapacity({
      model: MOCK, monthlyBudgetUsd: 1000,
      avgInputTokensPerRequest: 100,
      avgOutputTokensPerRequest: 20,
      cacheHitRate: 0.5, batchEnabled: false,
    })
    expect(r.maxMonthlyRequests).toBeGreaterThan(2_000_000)
    expect(r.maxMonthlyRequests).toBeLessThan(2_200_000)
  })

  it('handles budget=0', () => {
    const r = calculateCapacity({
      model: MOCK, monthlyBudgetUsd: 0,
      avgInputTokensPerRequest: 100, avgOutputTokensPerRequest: 20,
      cacheHitRate: 0, batchEnabled: false,
    })
    expect(r.maxMonthlyRequests).toBe(0)
  })

  it('handles free model (price=0)', () => {
    const free: Model = { ...MOCK, inputPrice: 0, outputPrice: 0 }
    const r = calculateCapacity({
      model: free, monthlyBudgetUsd: 1000,
      avgInputTokensPerRequest: 100, avgOutputTokensPerRequest: 20,
      cacheHitRate: 0, batchEnabled: false,
    })
    expect(r.maxMonthlyRequests).toBe(Infinity)
  })
})
```

- [ ] **Step 2: Run → FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/lib/budget.ts
import type { Model } from '../data/models'
import { calculateBreakdown } from './breakdown'

export interface CapacityInput {
  model: Model
  monthlyBudgetUsd: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  cacheHitRate: number
  batchEnabled: boolean
}

export interface CapacityResult {
  costPerRequestUsd: number
  maxMonthlyRequests: number
}

export function calculateCapacity(input: CapacityInput): CapacityResult {
  const { model, monthlyBudgetUsd,
    avgInputTokensPerRequest: inPer, avgOutputTokensPerRequest: outPer,
    cacheHitRate, batchEnabled } = input

  // compute cost at 1M requests to find per-request cost (avoids div-by-zero)
  const probeRequests = 1_000_000
  const br = calculateBreakdown({
    model,
    monthlyInputTokens: inPer * probeRequests,
    monthlyOutputTokens: outPer * probeRequests,
    cacheHitRate, batchEnabled,
  })

  const costPerRequestUsd = br.totalUsd / probeRequests
  const maxMonthlyRequests = costPerRequestUsd === 0 ? Infinity
    : Math.floor(Math.max(0, monthlyBudgetUsd) / costPerRequestUsd)

  return { costPerRequestUsd, maxMonthlyRequests }
}
```

- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `feat: budget capacity engine — invert budget to max requests (TDD)`

---

### Task R2.6: Insights + role language packs (TDD)

**Files:**
- Create: `src/lib/insights.ts`
- Create: `src/lib/insights.test.ts`
- Create: `src/lib/roleLanguage.ts`

**Steps:**

- [ ] **Step 1: Failing tests for insights**

```typescript
import { describe, it, expect } from 'vitest'
import { topDriverHint } from './insights'

describe('topDriverHint', () => {
  it('recommends cache increase when uncached_input dominates and cache is low', () => {
    const h = topDriverHint({ topChannel: 'uncached_input', cacheHitRate: 0.2, batchEnabled: false })
    expect(h).toMatch(/cache/i)
  })

  it('recommends batch when output dominates and batch is off', () => {
    const h = topDriverHint({ topChannel: 'output', cacheHitRate: 0.8, batchEnabled: false })
    expect(h).toMatch(/batch/i)
  })

  it('recommends cheaper model when everything already optimized', () => {
    const h = topDriverHint({ topChannel: 'output', cacheHitRate: 0.8, batchEnabled: true })
    expect(h).toMatch(/cheaper|smaller/i)
  })
})
```

- [ ] **Step 2: Implement `insights.ts`**

```typescript
// src/lib/insights.ts
import type { CostChannel } from './breakdown'

export interface HintInput {
  topChannel: CostChannel
  cacheHitRate: number
  batchEnabled: boolean
}

export function topDriverHint(i: HintInput): string {
  if (i.topChannel === 'none') return 'No significant cost yet.'
  if (i.topChannel === 'uncached_input' && i.cacheHitRate < 0.5) {
    return 'Biggest drain: uncached input. Raising cache hit rate from ' +
      `${Math.round(i.cacheHitRate * 100)}% to 70%+ could slash this.`
  }
  if (i.topChannel === 'output' && !i.batchEnabled) {
    return 'Biggest drain: output tokens. If you can accept async, Batch Mode cuts this ~50%.'
  }
  if (i.topChannel === 'cached_input') {
    return 'Biggest drain: even cached input. Likely the prompt is too long — shorten it.'
  }
  return 'Most levers pulled. A cheaper / smaller model is the next step.'
}
```

- [ ] **Step 3: Implement `roleLanguage.ts`**

```typescript
// src/lib/roleLanguage.ts
import type { Role } from '../App'

export interface RoleLabels {
  migrationHeading: string
  scenarioHeading: string
  breakdownHeading: string
  budgetHeading: string
  summaryTone: 'technical' | 'product' | 'executive'
  emphasisOrder: Array<'breakdown' | 'budget' | 'migration' | 'scenario'>
}

export const ROLE_PACK: Record<Role, RoleLabels> = {
  developer: {
    migrationHeading: 'Model Swap Cost',
    scenarioHeading: 'Load Scenarios',
    breakdownHeading: 'Per-Request Cost Breakdown',
    budgetHeading: 'Throughput at Budget',
    summaryTone: 'technical',
    emphasisOrder: ['breakdown', 'migration', 'scenario', 'budget'],
  },
  pm: {
    migrationHeading: 'Migration ROI',
    scenarioHeading: 'Best / Base / Worst',
    breakdownHeading: 'Where the Money Goes',
    budgetHeading: 'Users & Requests Supported',
    summaryTone: 'product',
    emphasisOrder: ['migration', 'budget', 'scenario', 'breakdown'],
  },
  ceo: {
    migrationHeading: 'Switch Savings',
    scenarioHeading: 'Exposure Range',
    breakdownHeading: 'Cost Composition',
    budgetHeading: 'Budget Coverage',
    summaryTone: 'executive',
    emphasisOrder: ['migration', 'scenario', 'budget', 'breakdown'],
  },
}

export function summaryTemplate(
  tone: RoleLabels['summaryTone'],
  ctx: { currentModel: string; candidateModel: string;
         monthlyCost: string; annualCost: string;
         switchSavings: string; switchPct: string;
         perRequest: string; perUser: string;
         maxUsers: string; topDriver: string }
): string {
  if (tone === 'technical') {
    return `At current config, 1 request costs ${ctx.perRequest} on ${ctx.currentModel}. ` +
           `Monthly ${ctx.monthlyCost}. ${ctx.topDriver} ` +
           `Switching to ${ctx.candidateModel} changes per-request cost by ${ctx.switchPct}.`
  }
  if (tone === 'executive') {
    return `Quarterly spend on ${ctx.currentModel}: ${ctx.monthlyCost}/mo (${ctx.annualCost}/yr). ` +
           `Switching to ${ctx.candidateModel} saves ${ctx.switchSavings} (${ctx.switchPct}) annually. ` +
           `Worst case doubled traffic: exposure grows proportionally. ` +
           `${ctx.topDriver}`
  }
  // product (PM)
  return `At ${ctx.maxUsers} users on ${ctx.currentModel}, monthly cost is ${ctx.monthlyCost} ` +
         `(${ctx.perUser} per user). Switching to ${ctx.candidateModel} would save ${ctx.switchSavings}. ` +
         `${ctx.topDriver}`
}
```

- [ ] **Step 4: Run → PASS**
- [ ] **Step 5: Commit** `feat: insights (top driver hint) + role language packs`

---

### Task R2.7: Cost Breakdown panel (TDD)

**Files:**
- Create: `src/components/CostBreakdown/index.tsx`
- Create: `src/components/CostBreakdown/CostBreakdown.test.tsx`

**Steps:**

- [ ] **Step 1: Failing tests**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CostBreakdown } from './index'
import { MODELS } from '../../data/models'

const BASE_STATE = {
  role: 'pm' as const,
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  period: 'month' as const,
  periodInputTokens: 10_000_000, periodOutputTokens: 2_000_000,
  cacheHitRate: 0.5, batchEnabled: false,
  monthlyRequests: 100_000, activeUsers: 1000, monthlyBudgetUsd: null,
}

describe('CostBreakdown', () => {
  it('renders 3 channel rows', () => {
    render(<CostBreakdown state={BASE_STATE} />)
    expect(screen.getByText(/uncached input/i)).toBeInTheDocument()
    expect(screen.getByText(/cached input/i)).toBeInTheDocument()
    expect(screen.getByText(/output/i)).toBeInTheDocument()
  })

  it('shows top driver hint', () => {
    render(<CostBreakdown state={BASE_STATE} />)
    expect(screen.getByText(/drain|biggest/i)).toBeInTheDocument()
  })

  it('renders per-request cost', () => {
    render(<CostBreakdown state={BASE_STATE} />)
    expect(screen.getByText(/per request/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement component**

```tsx
// src/components/CostBreakdown/index.tsx
import { calculateBreakdown } from '../../lib/breakdown'
import { topDriverHint } from '../../lib/insights'
import { fmtCurrency } from '../../lib/format'
import { ROLE_PACK } from '../../lib/roleLanguage'
import type { SimState } from '../../App'

interface Props { state: SimState }

export function CostBreakdown({ state }: Props) {
  const br = calculateBreakdown({
    model: state.currentModel,
    monthlyInputTokens: state.periodInputTokens,  // already normalized by App to monthly via period lib
    monthlyOutputTokens: state.periodOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })
  const hint = topDriverHint({
    topChannel: br.topChannel,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })
  const perRequest = state.monthlyRequests > 0 ? br.totalUsd / state.monthlyRequests : 0
  const heading = ROLE_PACK[state.role].breakdownHeading

  const rows: Array<[string, number, string]> = [
    ['Uncached input', br.uncachedInputUsd, 'Input tokens that miss the cache — full price.'],
    ['Cached input', br.cachedInputUsd, 'Input tokens served from cache — discounted per provider.'],
    ['Output', br.outputUsd, 'Generated tokens — provider output price.'],
  ]

  const total = br.totalUsd
  const percent = (usd: number) => total > 0 ? (usd / total * 100) : 0

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3">{heading}</h2>

      <div className="space-y-2 mb-4">
        {rows.map(([label, usd, desc]) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span className="w-36 text-gray-600">{label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${percent(usd)}%` }} />
            </div>
            <span className="w-20 text-right font-medium">{fmtCurrency(usd)}</span>
            <span className="w-12 text-right text-xs text-gray-500">{percent(usd).toFixed(0)}%</span>
          </div>
        ))}
        {br.batchSavingsUsd > 0 && (
          <div className="flex items-center gap-3 text-sm text-green-700">
            <span className="w-36">Batch savings</span>
            <span className="flex-1 text-xs italic">vs no-batch baseline</span>
            <span className="w-20 text-right font-medium">-{fmtCurrency(br.batchSavingsUsd)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="rounded bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Per request</div>
          <div className="font-semibold">{fmtCurrency(perRequest, perRequest < 0.01 ? 4 : 2)}</div>
        </div>
        <div className="rounded bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Monthly total</div>
          <div className="font-semibold">{fmtCurrency(total)}</div>
        </div>
      </div>

      <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
        💡 {hint}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Run → PASS**
- [ ] **Step 4: Commit** `feat: cost breakdown panel with top driver hint + per-request`

---

### Task R2.8: Budget Cap panel (TDD)

**Files:**
- Create: `src/components/BudgetCap/index.tsx`
- Create: `src/components/BudgetCap/BudgetCap.test.tsx`

**Steps:**

- [ ] **Step 1: Failing tests**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BudgetCap } from './index'
import { MODELS } from '../../data/models'

const STATE = {
  role: 'pm' as const,
  currentModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  candidateModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  period: 'month' as const,
  periodInputTokens: 10_000_000, periodOutputTokens: 2_000_000,
  cacheHitRate: 0, batchEnabled: false,
  monthlyRequests: 100_000, activeUsers: 1000, monthlyBudgetUsd: 500,
}

describe('BudgetCap', () => {
  it('shows max requests supported by budget', () => {
    render(<BudgetCap state={STATE} onBudgetChange={() => {}} />)
    expect(screen.getByText(/max requests/i)).toBeInTheDocument()
  })

  it('renders nothing helpful when budget is null', () => {
    render(<BudgetCap state={{ ...STATE, monthlyBudgetUsd: null }} onBudgetChange={() => {}} />)
    expect(screen.getByPlaceholderText(/monthly budget/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement**

```tsx
// src/components/BudgetCap/index.tsx
import { calculateCapacity } from '../../lib/budget'
import { fmtCurrency } from '../../lib/format'
import { ROLE_PACK } from '../../lib/roleLanguage'
import type { SimState } from '../../App'

interface Props {
  state: SimState
  onBudgetChange: (v: number | null) => void
}

export function BudgetCap({ state, onBudgetChange }: Props) {
  const heading = ROLE_PACK[state.role].budgetHeading
  const avgIn = state.monthlyRequests > 0
    ? state.periodInputTokens / state.monthlyRequests : 0
  const avgOut = state.monthlyRequests > 0
    ? state.periodOutputTokens / state.monthlyRequests : 0

  const cap = state.monthlyBudgetUsd !== null ? calculateCapacity({
    model: state.currentModel,
    monthlyBudgetUsd: state.monthlyBudgetUsd,
    avgInputTokensPerRequest: avgIn,
    avgOutputTokensPerRequest: avgOut,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  }) : null

  const maxUsers = cap && state.monthlyRequests > 0 && state.activeUsers > 0
    ? Math.floor(cap.maxMonthlyRequests / (state.monthlyRequests / state.activeUsers))
    : 0

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3">{heading}</h2>
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1">
          <label htmlFor="monthly-budget" className="text-sm text-gray-600 block mb-1">
            Monthly budget (USD)
          </label>
          <input
            id="monthly-budget"
            type="number" min={0}
            placeholder="e.g. 500"
            value={state.monthlyBudgetUsd ?? ''}
            onChange={e => {
              const v = e.target.value
              onBudgetChange(v === '' ? null : Math.max(0, Number(v)))
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        {cap && state.monthlyBudgetUsd !== null && (
          <>
            <div className="flex-1 rounded bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Cost per request</div>
              <div className="font-semibold">{fmtCurrency(cap.costPerRequestUsd, 4)}</div>
            </div>
            <div className="flex-1 rounded bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Max requests / month</div>
              <div className="font-semibold">
                {cap.maxMonthlyRequests === Infinity ? '∞' : cap.maxMonthlyRequests.toLocaleString('en-US')}
              </div>
            </div>
            {maxUsers > 0 && (
              <div className="flex-1 rounded bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Max active users</div>
                <div className="font-semibold">{maxUsers.toLocaleString('en-US')}</div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit** `feat: budget cap panel — invert budget to requests/users`

---

### Task R2.9: Migration Panel — break-even + ▲/▼ icons + responsive

**Files:**
- Modify: `src/components/MigrationPanel/index.tsx`
- Modify: `src/components/MigrationPanel/MigrationPanel.test.tsx`

**Steps:**

- [ ] **Step 1: Add test for break-even line**

```tsx
it('shows break-even line when candidate saves money', () => {
  render(<MigrationPanel state={BASE_STATE} />)
  expect(screen.getByText(/break-?even/i)).toBeInTheDocument()
})

it('shows ▼ icon for savings, ▲ for increase', () => {
  render(<MigrationPanel state={BASE_STATE} />)
  // Gemini flash < Sonnet → savings → ▼
  expect(screen.getByText(/▼/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Extend component — add break-even block + arrow icons + md: responsive grid**

Key changes to `index.tsx`:
- Add constant `MIGRATION_EFFORT_HOURS = 40` and `ENGINEER_HOURLY = 150` (industry-ish defaults).
- If `result.monthlyDelta < 0`: break-even months = `(MIGRATION_EFFORT_HOURS * ENGINEER_HOURLY) / Math.abs(result.monthlyDelta)`. Display: `"Migration pays back in N months"`.
- Add `▼` / `▲` Unicode arrow next to delta values (inside same `<span translate="no">`).
- Wrap grids with `grid-cols-1 md:grid-cols-2` so they stack on mobile.

- [ ] **Step 3: Run → PASS**
- [ ] **Step 4: Commit** `feat: migration break-even + directional arrows + mobile stack`

---

### Task R2.10: Scenario Planner — editable assumptions + tooltips + responsive

**Files:**
- Modify: `src/components/ScenarioPlanner/index.tsx`
- Modify: `src/components/ScenarioPlanner/ScenarioPlanner.test.tsx`

**Steps:**

- [ ] **Step 1: Convert `SCENARIOS` from const to React state — each scenario has editable `trafficMultiplier`, `cacheHitRate`, `batchEnabled`.**

```tsx
const DEFAULT_SCENARIOS = [
  { label: 'Best', trafficMultiplier: 0.7, cacheHitRate: 0.8, batchEnabled: true },
  { label: 'Base', trafficMultiplier: 1.0, cacheHitRate: null, batchEnabled: null }, // null = follow user state
  { label: 'Worst', trafficMultiplier: 2.0, cacheHitRate: 0.2, batchEnabled: false },
]
// useState + reset button
```

Each editable cell: `<input type="number">` for traffic/cache %, `<input type="checkbox">` for batch.

- [ ] **Step 2: Add `title` tooltips on column headers explaining defaults**

`<th title="Default assumptions: Best = traffic −30%, cache 80%, batch on. Click any cell to edit.">Best</th>`

- [ ] **Step 3: Add "Reset to defaults" button below table**

- [ ] **Step 4: Add `md:` responsive — table scroll-x on mobile already via `overflow-x-auto`. Ensure cells remain tappable (min-width).**

- [ ] **Step 5: Test** — edit cell → only that column recomputes; reset restores defaults.

- [ ] **Step 6: Commit** `feat: scenario planner editable assumptions + tooltips + reset`

---

### Task R2.11: Role selector + period selector + SimState rollout in App.tsx

**Files:**
- Create: `src/components/RoleSelector.tsx`, `src/components/PeriodSelector.tsx`
- Modify: `src/App.tsx`

**Steps:**

- [ ] **Step 1: Add `Role` + `Period` types to `App.tsx` exports**

- [ ] **Step 2: Create `RoleSelector.tsx`** — 3 segmented buttons (Developer / PM / CEO). `aria-pressed` per button.

```tsx
export function RoleSelector({ value, onChange }: { value: Role, onChange: (r: Role) => void }) {
  const roles: Array<[Role, string]> = [
    ['developer', 'Developer'], ['pm', 'PM'], ['ceo', 'CEO'],
  ]
  return (
    <div className="inline-flex rounded-md border border-gray-300 overflow-hidden" role="tablist">
      {roles.map(([r, label]) => (
        <button
          key={r}
          role="tab"
          aria-pressed={value === r}
          onClick={() => onChange(r)}
          className={`px-3 py-1.5 text-sm transition-colors ${
            value === r ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `PeriodSelector.tsx`** — dropdown with 5 options. Emits `Period`.

- [ ] **Step 4: Rewire `App.tsx`**

```tsx
// SimState now carries role, period, periodInputTokens, periodOutputTokens, monthlyRequests, activeUsers, monthlyBudgetUsd
// Derived monthly values computed at panel boundary via toMonthly(periodInputTokens, period)
// Header: Role selector (right), Period selector (in config)
// Panel order adapts to ROLE_PACK[role].emphasisOrder
```

- [ ] **Step 5: Update TokenInputs.tsx** — rename labels using `periodLabel(period)` (e.g., "Weekly Input Tokens"), add "Requests / Users" inputs below.

- [ ] **Step 6: Run all tests (existing tests need updating for renamed fields)**

- [ ] **Step 7: Commit** `feat: role selector + period selector + SimState restructure (role/period/requests/users/budget)`

---

### Task R2.12: SummaryCard role-adapted template + copy toast + source links

**Files:**
- Modify: `src/components/SummaryCard/index.tsx`
- Modify: `src/components/SummaryCard/SummaryCard.test.tsx`
- Create: `src/components/ui/Toast.tsx`
- Create: `src/hooks/useToast.ts`

**Steps:**

- [ ] **Step 1: Implement `useToast.ts` + `Toast.tsx`** — minimal (one toast at a time, auto-dismiss 3s).

- [ ] **Step 2: Rewrite `buildSummaryText` to use `summaryTemplate` from roleLanguage** — pass `role` through.

- [ ] **Step 3: Wire copy button to `useToast`** — show "Copied to clipboard" 3s.

- [ ] **Step 4: Add per-provider source links to footer** (current + candidate, dedup identical providers).

- [ ] **Step 5: Update existing SummaryCard tests** — matchers should still find currency values but new template means sentence shape changes. Update test regex to `/Sonnet 4.6/` + `/Gemini 3.1 Flash/` presence, and currency pattern — not exact sentence.

- [ ] **Step 6: Commit** `feat: summary card role-adapted template + copy toast + provider source links`

---

### Task R2.13: Cross-cutting — input validation, optgroup, cache numeric pair, a11y

**Files:**
- Modify: `src/components/TokenInputs.tsx`
- Modify: `src/components/ModelSelector.tsx`

**Steps:**

- [ ] **Step 1: TokenInputs — add numeric input next to cache slider**

```tsx
<input
  type="number" min={0} max={100} step={1}
  value={Math.round(cacheHitRate * 100)}
  onChange={e => onCacheChange(Math.min(100, Math.max(0, Number(e.target.value))) / 100)}
  className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
  aria-label="Cache hit rate percent"
/>
```

- [ ] **Step 2: TokenInputs — warn on extreme input** — if user enters >1B tokens, show amber inline note "Unusually large — verify unit". Don't block.

- [ ] **Step 3: TokenInputs — preset buttons get `aria-pressed={activePresetId === p.id}`.** App.tsx tracks active preset.

- [ ] **Step 4: ModelSelector — group options by provider using `<optgroup>`**

```tsx
const byProvider = groupBy(MODELS, m => m.provider)
// render <optgroup label={providerDisplayName(provider)}> ... </optgroup>
```

- [ ] **Step 5: Test** — model selection still works, preset buttons show aria-pressed, cache input constrained 0-100.

- [ ] **Step 6: Commit** `feat: cross-cutting polish — cache numeric pair, optgroup by vendor, aria-pressed, extreme-value warning`

---

## Integration + Deploy (post-R2.13)

- [ ] **Final test suite** — `npm run test:run` (expect 70+ tests).
- [ ] **Build** — `npm run build`.
- [ ] **Preview smoke via gstack browse** — verify all 3 roles render, period switching works, budget panel accepts input, 10 new models show in optgroup, all 12 presets show with tooltips.
- [ ] **Merge `feat/round-2` → `main`** → GitHub Pages deploy.
- [ ] **Canary** — deployed bundle hash matches local, 3 role labels render, new models in dropdown.
- [ ] **Update `docs/diagnosis/`** with round 2 resolution.

---

## Self-Review

**Spec coverage**:

| 사용자 요청 / feedback2 항목 | Task |
|---|---|
| U1: Preset 확장 | R2.3 |
| U2: 커스텀 기간 | R2.1, R2.11 |
| U3: 더 많은 모델 (Gemma 등) | R2.2 |
| 사용자 Turn: 5 핵심 화면 | R2.4(breakdown) + R2.5(budget) + R2.9(migration break-even) + R2.10(scenario editable) + R2.12(summary) |
| 사용자 Turn: per-request / per-user | R2.7 per-request + R2.8 max users |
| 사용자 Turn: budget cap | R2.8 |
| 사용자 Turn: top cost driver | R2.4 + R2.6 (insights) |
| 사용자 Turn: 역할별 언어 | R2.6 (roleLanguage) + R2.11 (RoleSelector) + R2.12 (summary template) |
| feedback2 #1 입력 검증 | R2.13 (extreme warn) |
| feedback2 #2 모바일 | R2.7/8/9/10 responsive + cross-cutting |
| feedback2 #3 lang="en" | 이미 Round 1에서 처리됨 (verify) |
| feedback2 #4 optgroup | R2.13 |
| feedback2 #5 cache numeric | R2.13 |
| feedback2 #6 scenario 설명/편집 | R2.10 |
| feedback2 #7 copy toast | R2.12 |
| feedback2 #8 aria-pressed / ▲▼ | R2.9 (arrows) + R2.13 (aria-pressed) |
| feedback2 #9 출처 링크 | R2.12 |

**Placeholder scan**: 없음. 각 task의 "Steps"에 실제 코드 제시 (UI 컴포넌트 내부 일부는 구조 지정). lib 모듈은 전체 코드 포함.

**Type consistency**:
- `SimState` 확장 필드 5개(role/period/periodInputTokens/monthlyRequests/activeUsers/monthlyBudgetUsd) → App.tsx export, 모든 하위 컴포넌트 import
- `Period`, `Role`, `CostChannel`, `BreakdownResult`, `CapacityResult` 모두 단일 파일 정의 후 import
- `calculateBreakdown` vs 기존 `calculateCost` — 공존. breakdown은 채널 단위, cost는 합계 단위. Migration/Scenario는 기존 calculateCost 유지 (호환성), Breakdown 패널만 새 함수 사용.

**Scope check**: 13 tasks, 단일 페이지에서 완결. 정식 i18n / tokenizer UX / Recommendations 뷰 는 Round 3 이관 (backlog 유지).

---

## Execution handoff

**추천: Subagent-Driven Development** (Round 1에서 성공한 패턴).

순서:
1. R2.1 (period, 순수 lib) → R2.2 (models) → R2.3 (presets) — 데이터 기반
2. R2.4 (breakdown) → R2.5 (budget) → R2.6 (insights) — 계산 lib
3. R2.7 (breakdown panel) → R2.8 (budget panel) — 신규 패널
4. R2.9 (migration) → R2.10 (scenario) — 기존 패널 강화
5. R2.11 (role selector + period + App 재배선) — 큰 변경, 앞 12개 완료 후 통합
6. R2.12 (summary + toast) → R2.13 (cross-cutting polish)
7. Integration + deploy

Branch: `feat/round-2`. 이번엔 main 아닌 `feat/round-2` 위에서 진행. 각 Task 하나의 커밋.
