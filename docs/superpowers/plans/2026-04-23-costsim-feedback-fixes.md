# LLM Cost Simulator — Feedback Round 1 Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `feedback.md` 의 6가지 버그/UX 이슈를 해결하여 PM 시연 가능한 품질로 안정화. 같은 유형의 회귀를 막는 최소 하네스(CLAUDE.md + formatter 모듈)를 동반 추가.

**Architecture:** 기존 Vite+React+TS 앱에 대한 **유지보수 패치**. 새 의존성 없음. 각 수정은 실패 테스트 → 최소 구현 → 테스트 통과 순서의 TDD. 브라우저 자동번역(Chrome auto-translate 등) 저항성을 `translate="no"` + 메타 태그로 방어.

**Tech Stack:** 기존 그대로 — Vite 5, React 18, TypeScript 5, Vitest, @testing-library/react, Tailwind 3, Recharts, html-to-image.

**Relationship to prior artifacts:**
- `docs/superpowers/specs/2026-04-22-costsim-harness-design.md` (브레인스토밍 스펙) — 그린필드 16파일 가정. 현실 코드와 어긋나서 이번 플랜은 feedback.md에 재정렬. 그 스펙의 Phase 1/2/7 티켓은 안정화 이후 별도 반복.
- `docs/superpowers/plans/2026-04-22-pm-monthly-simulator.md` (선행 플랜) — 이미 실행됨, App/Migration/Scenario/Summary 컴포넌트 현존. 본 플랜은 그 결과물 위에서 수정.
- `feedback.md` — 본 플랜의 **1차 입력**. 우선순위 순서 그대로 반영.

**Reference:**
- 배포본 (검증 대상): `https://tayna99.github.io/token_simulator/`
- 원본 (feature 참고만): `https://llm-costsim-aulvsefh.manus.space/`

---

## File Structure

```
token_simulator/
├── CLAUDE.md                                    [CREATE — Task 10]
├── index.html                                   [MODIFY — Task 6: notranslate meta]
├── docs/
│   └── diagnosis/
│       └── 2026-04-23-deploy-state.md           [CREATE — Task 1]
├── src/
│   ├── lib/
│   │   ├── format.ts                            [CREATE — Task 4]
│   │   └── format.test.ts                       [CREATE — Task 4]
│   ├── components/
│   │   ├── ModelSelector.tsx                    [MODIFY — Tasks 5, 6, 8]
│   │   ├── TokenInputs.tsx                      [MODIFY — Tasks 3, 5, 7, 9]
│   │   ├── MigrationPanel/
│   │   │   ├── index.tsx                        [MODIFY — Tasks 5, 6, 8]
│   │   │   └── MigrationPanel.test.tsx          [MODIFY — Task 2]
│   │   ├── ScenarioPlanner/
│   │   │   ├── index.tsx                        [MODIFY — Tasks 3, 5, 6]
│   │   │   └── ScenarioPlanner.test.tsx         [MODIFY — Task 3]
│   │   └── SummaryCard/
│   │       ├── index.tsx                        [MODIFY — Tasks 5, 6, 9]
│   │       └── SummaryCard.test.tsx             [MODIFY — Task 6]
```

**의존성:** Task 1 → 모든 후속 Task (진단 결과에 따라 우선순위 조정 여지). Task 4 → Task 5 (formatter 있어야 apply 가능). Task 5 → 여러 컴포넌트 수정이 다른 Task와 겹치므로 순서 준수.

**병렬 불가:** 대부분 같은 파일들을 건드려 merge conflict 위험 있음. 순차 실행 권장.

---

## Task 1: Diagnose Deployed State

**목적:** feedback.md의 각 주장이 (a) 현재 소스의 진짜 버그인지, (b) 구 배포본의 잔재인지, (c) 브라우저 자동번역 아티팩트인지 구분하여 후속 Task의 우선순위/범위를 확정.

**Files:**
- Create: `docs/diagnosis/2026-04-23-deploy-state.md`

- [ ] **Step 1: Create diagnosis directory**

```bash
mkdir -p docs/diagnosis
```

- [ ] **Step 2: Capture deployed state with gstack browse**

Run:
```bash
# gstack browse 바이너리 경로 확인
_ROOT=$(git rev-parse --show-toplevel)
B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ ! -x "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"

$B goto https://tayna99.github.io/token_simulator/
$B snapshot -i -a -o /tmp/deploy-state.png
$B screenshot /tmp/deploy-full.png
$B text > /tmp/deploy-text.txt
$B js "document.documentElement.lang" > /tmp/deploy-lang.txt
$B js "Array.from(document.querySelectorAll('meta')).map(m => m.outerHTML).join('\n')" > /tmp/deploy-meta.txt
```

Expected: 4개 출력 파일. 페이지가 로드됨 확인.

- [ ] **Step 3: Reproduce each feedback bug**

```bash
# Bug ①: Migration card 고정값 검증
$B snapshot -D   # baseline
# 모델 드롭다운 바꾸기 (ref 번호는 snapshot -i 결과에 따라 조정)
$B click "select[id*=current]"
$B select "select[id*=current]" "claude-opus-4.7"
$B snapshot -D > /tmp/bug1-diff.txt

# Bug ②: 캐시 라벨 + NaN 검증
$B fill "input[type=range]" "30"
$B text | grep -i "cache\|nan" > /tmp/bug2-state.txt

# Bug ③⑥: 통화/단위 포맷
$B js "Array.from(document.querySelectorAll('*')).filter(e => /\\$|달러|원|%/.test(e.textContent) && e.children.length === 0).map(e => e.textContent.trim()).filter(Boolean).slice(0, 50)" > /tmp/bug3-currency.txt

# Bug ④: 번역 흔적
$B js "document.body.textContent" | grep -oE "작품|이주|교통|나N|끄다|배치 모드" > /tmp/bug4-translation.txt
```

- [ ] **Step 4: Compare deployed bundle hash with local dist**

```bash
# 로컬 dist
ls dist/assets/ > /tmp/local-hashes.txt
# 배포 hash는 deploy-text나 HTML 소스 확인
$B html | grep -oE 'index-[A-Za-z0-9]+\.(js|css)' | sort -u > /tmp/deployed-hashes.txt
diff /tmp/local-hashes.txt /tmp/deployed-hashes.txt || echo "HASHES DIFFER: stale deploy"
```

- [ ] **Step 5: Write diagnosis findings**

Create `docs/diagnosis/2026-04-23-deploy-state.md`:

```markdown
# Deploy State Diagnosis — 2026-04-23

**Source:** `feedback.md` (round 1)
**Deployed URL:** https://tayna99.github.io/token_simulator/
**Local SHA:** <git rev-parse HEAD>
**Deployed bundle hash:** <from /tmp/deployed-hashes.txt>
**Local bundle hash:** <from /tmp/local-hashes.txt>
**Bundle match:** YES / NO

## Bug triage

| # | Feedback 주장 | 분류 | 근거 | 후속 Task |
|---|---|---|---|---|
| ① | Migration 카드 고정값 | <CODE_BUG / STALE_DEPLOY / AUTO_TRANSLATE> | <evidence> | Task 2 |
| ② | 캐시 라벨 50% 고정 | <...> | <evidence> | Task 3 |
| ② | Scenario NaN % | <...> | <evidence> | Task 3 |
| ③ | 통화 혼용 (달러/$) | <...> | <evidence> | Task 4, 5 |
| ④ | 번역 이슈 (작품/이주 등) | <...> | <evidence> | Task 6 |
| ⑤ | preset 선택 시 요약 영어로 flip | <...> | <evidence> | Task 6 |
| ⑥ | 모델 단위 라벨 불일치 | <...> | <evidence> | Task 4, 5 |

## Scope confirmation

- CODE_BUG 분류된 항목: Task 2~10에서 수정.
- STALE_DEPLOY 분류된 항목: 재배포만 해도 해결 → Task 10 완료 후 `/land-and-deploy` 트리거로 자연 해결.
- AUTO_TRANSLATE 분류된 항목: Task 6 (translate="no" 방어)에서 해결.
```

- [ ] **Step 6: Commit**

```bash
git add docs/diagnosis/
git commit -m "docs: diagnose deployed state against feedback round 1"
```

---

## Task 2: Migration Panel State Sync Regression Test

**목적:** Migration Panel의 monthly/annual/% 값이 state 변경에 반영되는지 **회귀 테스트로 고정**. 현재 코드가 이미 올바를 경우에도, 미래 회귀를 막음.

**Files:**
- Modify: `src/components/MigrationPanel/MigrationPanel.test.tsx`

- [ ] **Step 1: Add failing tests**

Edit `src/components/MigrationPanel/MigrationPanel.test.tsx`, append at end of `describe` block:

```tsx
  it('updates monthly cost when currentModel changes', () => {
    const { rerender } = render(<MigrationPanel state={BASE_STATE} />)
    // sonnet baseline: 50M*$3 + 5M*$15 = $225
    expect(screen.getByText(/\$225\/mo/)).toBeInTheDocument()

    const opusState = {
      ...BASE_STATE,
      currentModel: MODELS.find(m => m.id === 'claude-opus-4.7')!,
    }
    rerender(<MigrationPanel state={opusState} />)
    // opus: 50M*$5 + 5M*$25 = $375
    expect(screen.getByText(/\$375\/mo/)).toBeInTheDocument()
    expect(screen.queryByText(/\$225\/mo/)).not.toBeInTheDocument()
  })

  it('updates candidate cost when candidateModel changes', () => {
    const { rerender } = render(<MigrationPanel state={BASE_STATE} />)
    // gemini flash baseline: 50M*$0.1 + 5M*$0.4 = $7
    expect(screen.getByText(/\$7\/mo/)).toBeInTheDocument()

    const nanoState = {
      ...BASE_STATE,
      candidateModel: MODELS.find(m => m.id === 'gpt-5.4-nano')!,
    }
    rerender(<MigrationPanel state={nanoState} />)
    // nano: 50M*$0.2 + 5M*$1.25 = $16.25 → rounded $16
    expect(screen.getByText(/\$16\/mo/)).toBeInTheDocument()
  })

  it('updates when monthlyInputTokens changes', () => {
    const { rerender } = render(<MigrationPanel state={BASE_STATE} />)
    expect(screen.getByText(/\$225\/mo/)).toBeInTheDocument()

    const doubled = { ...BASE_STATE, monthlyInputTokens: 100_000_000 }
    rerender(<MigrationPanel state={doubled} />)
    // sonnet: 100M*$3 + 5M*$15 = $375
    expect(screen.getByText(/\$375\/mo/)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests**

```bash
npm run test:run src/components/MigrationPanel/
```

Expected (case A): all PASS → 현재 코드가 이미 올바름, feedback ①은 STALE_DEPLOY 또는 AUTO_TRANSLATE로 확정.
Expected (case B): FAIL → 진짜 버그 존재. Step 3 진행.

- [ ] **Step 3: If FAIL — diagnose and fix**

FAIL 상황에서는 `src/components/MigrationPanel/index.tsx` 를 열고:
- `calculateMigrationDelta` 호출 시 `state.*` 값이 props로 들어오는지
- memoization이 잘못 걸려 state 변화를 무시하는지
- result를 캐싱하는 useMemo/useState가 있으면 deps 확인

발견된 원인에 따라 최소 수정. 수정 후 `npm run test:run src/components/MigrationPanel/` → PASS 확인.

- [ ] **Step 4: Commit**

```bash
git add src/components/MigrationPanel/MigrationPanel.test.tsx src/components/MigrationPanel/index.tsx
git commit -m "test: regression tests for Migration Panel state sync (feedback ①)"
```

---

## Task 3: Scenario Planner NaN Fix + Cache Label Binding

**목적:** feedback ②의 두 현상 — `NaN %` 표시, 캐시 적중률 라벨 업데이트 누락 — 을 재현 테스트 후 수정.

**Files:**
- Modify: `src/components/ScenarioPlanner/ScenarioPlanner.test.tsx`
- Modify: `src/components/ScenarioPlanner/index.tsx`
- Modify: `src/components/TokenInputs.tsx` (캐시 라벨 검증용)

- [ ] **Step 1: Add NaN-guard tests to ScenarioPlanner**

Append to `src/components/ScenarioPlanner/ScenarioPlanner.test.tsx`:

```tsx
  it('never renders NaN in any cell', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
  })

  it('handles cacheHitRate=0 without NaN', () => {
    const zeroCache = { ...BASE_STATE, cacheHitRate: 0 }
    render(<ScenarioPlanner state={zeroCache} />)
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/\d+%/)).toHaveLength(3) // 3 cache cells
  })

  it('handles cacheHitRate=1 without NaN', () => {
    const fullCache = { ...BASE_STATE, cacheHitRate: 1 }
    render(<ScenarioPlanner state={fullCache} />)
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
  })

  it('Base column reflects current user cacheHitRate', () => {
    const specific = { ...BASE_STATE, cacheHitRate: 0.37 }
    render(<ScenarioPlanner state={specific} />)
    // Base 열 Cache Hit Rate 셀은 Math.round(0.37*100)=37% 표시
    expect(screen.getByText('37%')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests — observe which fail**

```bash
npm run test:run src/components/ScenarioPlanner/
```

Expected: "never renders NaN" may PASS (if no bug) or FAIL (bug reproduced). "Base column reflects current user cacheHitRate" should PASS (code already does this).

- [ ] **Step 3: Harden ScenarioPlanner against NaN**

Edit `src/components/ScenarioPlanner/index.tsx`. Modify the `results` computation to coerce NaN → 0:

```tsx
export function ScenarioPlanner({ state }: Props) {
  // NaN guard: 사용자 입력 이상(예: 빈 input)으로 NaN이 들어와도 0으로 수렴
  const safeCacheHitRate = Number.isFinite(state.cacheHitRate) ? state.cacheHitRate : 0
  const safeInputTokens = Number.isFinite(state.monthlyInputTokens) ? state.monthlyInputTokens : 0
  const safeOutputTokens = Number.isFinite(state.monthlyOutputTokens) ? state.monthlyOutputTokens : 0

  const results = SCENARIOS.map(s => {
    const cacheHitRate = s.cacheHitRate(safeCacheHitRate)
    const batchEnabled = s.batchEnabled(state.batchEnabled)
    return {
      ...s,
      cacheHitRate,
      batchEnabled,
      result: calculateCost({
        model: state.currentModel,
        monthlyInputTokens: safeInputTokens * s.trafficMultiplier,
        monthlyOutputTokens: safeOutputTokens * s.trafficMultiplier,
        cacheHitRate,
        batchEnabled,
      }),
    }
  })

  // ... rest unchanged
}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
npm run test:run src/components/ScenarioPlanner/
```

Expected: 모든 tests PASS (기존 + 신규 4개).

- [ ] **Step 5: Verify TokenInputs cache label binding in dev server**

현재 `TokenInputs.tsx` line 60-62:
```tsx
<label className="text-sm font-medium text-gray-700">
  Cache Hit Rate: {Math.round(cacheHitRate * 100)}%
</label>
```

이 구조는 prop 변화 시 자동 재렌더됨. feedback ②의 "라벨이 50에서 멈춤"은 코드 버그가 아니라 stale deploy로 추정. Task 1의 진단에서 STALE_DEPLOY로 확정됐으면 Step 6 건너뛰고 Step 7.

FAIL로 확정된 경우에만 Step 6.

- [ ] **Step 6: (조건부) TokenInputs 재렌더 강제 — 조건부 실행**

만약 라벨 업데이트 실패가 재현됐다면 `TokenInputs.tsx`에 `key={cacheHitRate}`를 label wrapper에 추가:

```tsx
<label key={cacheHitRate} className="text-sm font-medium text-gray-700">
  Cache Hit Rate: {Math.round(cacheHitRate * 100)}%
</label>
```

단, 이건 근본 해결이 아닌 대증 요법이므로 Task 1 진단에서 명백한 컴포넌트 memoization 버그가 있을 때만 적용. 일반적으로는 건너뜀.

- [ ] **Step 7: Commit**

```bash
git add src/components/ScenarioPlanner/
git commit -m "fix: ScenarioPlanner NaN guard + cache hit rate coverage (feedback ②)"
```

---

## Task 4: Unified Formatter Module (TDD)

**목적:** 통화/단위/퍼센트/토큰 수를 표시하는 포맷을 **한 곳**에서 관리. 현재는 각 컴포넌트에 `fmt()` 가 3~4번 중복 정의됨 → `$195`, `195달러`, `1M당 $2.5`, `100만 개당` 혼용의 뿌리.

**Files:**
- Create: `src/lib/format.ts`
- Create: `src/lib/format.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/format.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { fmtCurrency, fmtPercent, fmtTokens, fmtPricePerMillion, fmtDelta } from './format'

describe('fmtCurrency', () => {
  it('formats integer dollars with $ prefix', () => {
    expect(fmtCurrency(195)).toBe('$195')
    expect(fmtCurrency(1634)).toBe('$1,634')
    expect(fmtCurrency(0)).toBe('$0')
  })

  it('rounds to 0 decimals by default', () => {
    expect(fmtCurrency(195.67)).toBe('$196')
  })

  it('supports decimals when requested', () => {
    expect(fmtCurrency(1.234, 2)).toBe('$1.23')
  })

  it('handles negatives with minus before $', () => {
    expect(fmtCurrency(-195)).toBe('-$195')
  })

  it('returns "—" for NaN or Infinity', () => {
    expect(fmtCurrency(NaN)).toBe('—')
    expect(fmtCurrency(Infinity)).toBe('—')
  })
})

describe('fmtPercent', () => {
  it('takes a 0-1 ratio and renders whole percent', () => {
    expect(fmtPercent(0.5)).toBe('50%')
    expect(fmtPercent(0)).toBe('0%')
    expect(fmtPercent(1)).toBe('100%')
  })

  it('supports decimals', () => {
    expect(fmtPercent(0.1234, 1)).toBe('12.3%')
  })

  it('returns "—" for NaN', () => {
    expect(fmtPercent(NaN)).toBe('—')
  })
})

describe('fmtDelta', () => {
  it('prefixes negative with -, positive with +, zero with no sign', () => {
    expect(fmtDelta(-195)).toBe('-$195')
    expect(fmtDelta(195)).toBe('+$195')
    expect(fmtDelta(0)).toBe('$0')
  })
})

describe('fmtTokens', () => {
  it('formats millions with "M" suffix', () => {
    expect(fmtTokens(50_000_000)).toBe('50M')
    expect(fmtTokens(1_500_000)).toBe('1.5M')
  })

  it('formats billions with "B" suffix', () => {
    expect(fmtTokens(2_000_000_000)).toBe('2B')
  })

  it('formats thousands with "K" suffix', () => {
    expect(fmtTokens(5_000)).toBe('5K')
  })

  it('formats under 1000 as raw number', () => {
    expect(fmtTokens(500)).toBe('500')
  })
})

describe('fmtPricePerMillion', () => {
  it('formats input/output price pair with unified unit', () => {
    // 단위는 "/ 1M tokens" 로 통일
    expect(fmtPricePerMillion(2.5, 15)).toBe('$2.50 / $15.00 per 1M tokens')
  })

  it('shows two decimals for prices < $10 and zero decimals for >= $10', () => {
    expect(fmtPricePerMillion(0.2, 1.25)).toBe('$0.20 / $1.25 per 1M tokens')
    expect(fmtPricePerMillion(5, 25)).toBe('$5.00 / $25.00 per 1M tokens')
  })
})
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm run test:run src/lib/format
```

Expected: FAIL — "Cannot find module './format'".

- [ ] **Step 3: Implement format.ts**

Create `src/lib/format.ts`:

```typescript
// src/lib/format.ts
// 모든 사용자 표시 숫자는 이 모듈을 통과한다.
// CLAUDE.md CRITICAL: 통화/퍼센트/토큰 표시는 inline 포맷 금지.

const INVALID = '—'

function isValid(n: number): boolean {
  return Number.isFinite(n)
}

export function fmtCurrency(n: number, decimals = 0): string {
  if (!isValid(n)) return INVALID
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}

export function fmtDelta(n: number): string {
  if (!isValid(n)) return INVALID
  if (n === 0) return '$0'
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return n < 0 ? `-$${formatted}` : `+$${formatted}`
}

export function fmtPercent(ratio: number, decimals = 0): string {
  if (!isValid(ratio)) return INVALID
  const pct = ratio * 100
  return pct.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%'
}

export function fmtTokens(n: number): string {
  if (!isValid(n)) return INVALID
  if (n >= 1_000_000_000) {
    const b = n / 1_000_000_000
    return (b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)) + 'B'
  }
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'M'
  }
  if (n >= 1_000) {
    const k = n / 1_000
    return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'K'
  }
  return n.toLocaleString('en-US')
}

export function fmtPricePerMillion(input: number, output: number): string {
  if (!isValid(input) || !isValid(output)) return INVALID
  const fmt = (p: number) => `$${p.toFixed(2)}`
  return `${fmt(input)} / ${fmt(output)} per 1M tokens`
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm run test:run src/lib/format
```

Expected: 모든 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: unified currency/percent/token formatter (feedback ③⑥)"
```

---

## Task 5: Apply Formatter Across All Components

**목적:** Task 4의 `format` 모듈을 네 컴포넌트에 적용하여 인라인 fmt 중복 제거 + 표기 일원화. 기존 테스트가 여전히 통과하도록 유지.

**Files:**
- Modify: `src/components/MigrationPanel/index.tsx`
- Modify: `src/components/ScenarioPlanner/index.tsx`
- Modify: `src/components/SummaryCard/index.tsx`
- Modify: `src/components/ModelSelector.tsx`

- [ ] **Step 1: Replace MigrationPanel formatters**

Edit `src/components/MigrationPanel/index.tsx`:

```tsx
// src/components/MigrationPanel/index.tsx
import { calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency, fmtDelta, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function MigrationPanel({ state }: Props) {
  const result = calculateMigrationDelta({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.monthlyInputTokens,
    monthlyOutputTokens: state.monthlyOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const isSaving = result.monthlyDelta < 0
  const deltaColor = isSaving ? 'text-green-600' : 'text-red-600'
  const deltaBg = isSaving ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Migration Comparison</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current</p>
          <p className="font-semibold text-gray-900">{state.currentModel.name}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            <span translate="no">{fmtCurrency(result.currentCost.monthlyCost)}</span>/mo
          </p>
          <p className="text-sm text-gray-500">
            <span translate="no">{fmtCurrency(result.currentCost.annualCost)}</span>/yr
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Candidate</p>
          <p className="font-semibold text-gray-900">{state.candidateModel.name}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            <span translate="no">{fmtCurrency(result.candidateCost.monthlyCost)}</span>/mo
          </p>
          <p className="text-sm text-gray-500">
            <span translate="no">{fmtCurrency(result.candidateCost.annualCost)}</span>/yr
          </p>
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${deltaBg}`}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">Monthly Delta</p>
            <p
              data-testid="monthly-delta"
              className={`text-xl font-bold ${deltaColor}`}
              translate="no"
            >
              {fmtDelta(result.monthlyDelta)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Annual Delta</p>
            <p className={`text-xl font-bold ${deltaColor}`} translate="no">
              {fmtDelta(result.annualDelta)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Change</p>
            <p className={`text-xl font-bold ${deltaColor}`} translate="no">
              {fmtPercent(result.savingPercent / 100, 1)}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Update MigrationPanel tests for new formatter**

Current tests check `/-\$218/` etc. Formatter produces same strings, so they should still pass. Run:

```bash
npm run test:run src/components/MigrationPanel/
```

Expected: 모든 tests PASS (regression 포함).

If FAIL: likely `savingPercent / 100` division mismatch. Current code used `result.savingPercent.toFixed(1) + '%'`. If `savingPercent` is -96.9 (raw percent), then `fmtPercent(-96.9/100, 1)` = `-96.9%`. Matches. OK.

- [ ] **Step 3: Replace ScenarioPlanner formatters**

Edit `src/components/ScenarioPlanner/index.tsx`. Remove local `fmt()` and use import:

```tsx
// src/components/ScenarioPlanner/index.tsx
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface ScenarioDef {
  label: 'Best' | 'Base' | 'Worst'
  trafficMultiplier: number
  cacheHitRate: (base: number) => number
  batchEnabled: (base: boolean) => boolean
}

const SCENARIOS: ScenarioDef[] = [
  { label: 'Best',  trafficMultiplier: 0.7, cacheHitRate: () => 0.8, batchEnabled: () => true },
  { label: 'Base',  trafficMultiplier: 1.0, cacheHitRate: b => b,     batchEnabled: b => b },
  { label: 'Worst', trafficMultiplier: 2.0, cacheHitRate: () => 0.2, batchEnabled: () => false },
]

interface Props {
  state: SimState
}

export function ScenarioPlanner({ state }: Props) {
  const safeCacheHitRate = Number.isFinite(state.cacheHitRate) ? state.cacheHitRate : 0
  const safeInputTokens = Number.isFinite(state.monthlyInputTokens) ? state.monthlyInputTokens : 0
  const safeOutputTokens = Number.isFinite(state.monthlyOutputTokens) ? state.monthlyOutputTokens : 0

  const results = SCENARIOS.map(s => {
    const cacheHitRate = s.cacheHitRate(safeCacheHitRate)
    const batchEnabled = s.batchEnabled(state.batchEnabled)
    return {
      ...s,
      cacheHitRate,
      batchEnabled,
      result: calculateCost({
        model: state.currentModel,
        monthlyInputTokens: safeInputTokens * s.trafficMultiplier,
        monthlyOutputTokens: safeOutputTokens * s.trafficMultiplier,
        cacheHitRate,
        batchEnabled,
      }),
    }
  })

  const colColors: Record<string, string> = {
    Best:  'text-green-700 bg-green-50',
    Base:  'text-gray-700 bg-gray-50',
    Worst: 'text-red-700 bg-red-50',
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Scenario Planner</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-gray-500 font-medium py-2 pr-4">Parameter</th>
              {SCENARIOS.map(s => (
                <th key={s.label} className={`text-center py-2 px-4 rounded-t-lg ${colColors[s.label]}`}>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 pr-4 text-gray-600">Traffic</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`} translate="no">
                  {r.trafficMultiplier < 1
                    ? `−${Math.round((1 - r.trafficMultiplier) * 100)}%`
                    : r.trafficMultiplier === 1 ? 'Current'
                    : `+${Math.round((r.trafficMultiplier - 1) * 100)}%`}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Cache Hit Rate</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`} translate="no">
                  {fmtPercent(r.cacheHitRate)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Batch Mode</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`} translate="no">
                  {r.batchEnabled ? 'On' : 'Off'}
                </td>
              ))}
            </tr>
            <tr className="border-t-2 border-gray-300">
              <td className="py-3 pr-4 font-semibold text-gray-800">Monthly Cost</td>
              {results.map(r => (
                <td
                  key={r.label}
                  data-testid="monthly-cost"
                  className={`text-center py-3 px-4 font-bold text-lg ${colColors[r.label]}`}
                  translate="no"
                >
                  {fmtCurrency(r.result.monthlyCost)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Annualized</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`} translate="no">
                  {fmtCurrency(r.result.annualCost)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Replace SummaryCard formatter + source link**

Edit `src/components/SummaryCard/index.tsx`:

```tsx
// src/components/SummaryCard/index.tsx
import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { calculateCost, calculateMigrationDelta } from '../../lib/calculator'
import { fmtCurrency, fmtTokens, fmtPercent } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

// 출처 링크 맵 (SummaryCard 소스 표기용)
const PROVIDER_PRICING_URLS: Record<string, string> = {
  openai: 'https://openai.com/api/pricing',
  anthropic: 'https://www.anthropic.com/pricing',
  google: 'https://ai.google.dev/pricing',
  xai: 'https://x.ai/api',
  microsoft: 'https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/',
}

function buildSummaryText(state: SimState): string {
  const current = calculateCost({
    model: state.currentModel,
    monthlyInputTokens: state.monthlyInputTokens,
    monthlyOutputTokens: state.monthlyOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const migration = calculateMigrationDelta({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.monthlyInputTokens,
    monthlyOutputTokens: state.monthlyOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  const cacheText = state.cacheHitRate > 0
    ? `, ${fmtPercent(state.cacheHitRate)} cache hit`
    : ''
  const batchText = state.batchEnabled ? ', batch enabled' : ''

  const direction = migration.monthlyDelta < 0 ? 'save' : 'cost an additional'
  const absDelta = fmtCurrency(Math.abs(migration.monthlyDelta))
  const absAnnual = fmtCurrency(Math.abs(migration.annualDelta))
  const percent = fmtPercent(Math.abs(migration.savingPercent) / 100, 1)

  return `On ${state.currentModel.name} with ${fmtTokens(state.monthlyInputTokens)} input / ${fmtTokens(state.monthlyOutputTokens)} output tokens/month` +
    `${cacheText}${batchText}, estimated monthly cost is ${fmtCurrency(current.monthlyCost)} ` +
    `(${fmtCurrency(current.annualCost)}/yr). ` +
    `Switching to ${state.candidateModel.name} would ${direction} ${absDelta}/month ` +
    `(${percent}), annualized ${absAnnual}.`
}

export function SummaryCard({ state }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const summaryText = buildSummaryText(state)
  const currentSource = PROVIDER_PRICING_URLS[state.currentModel.provider]
  const candidateSource = PROVIDER_PRICING_URLS[state.candidateModel.provider]

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
    } catch {
      window.prompt('Copy the text below:', summaryText)
    }
  }

  const handleExportPng = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true })
      const link = document.createElement('a')
      link.download = 'llm-cost-summary.png'
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Try again or use a screenshot.')
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">Board-Ready Summary</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Copy
          </button>
          <button
            onClick={handleExportPng}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Export PNG
          </button>
        </div>
      </div>

      <div
        ref={cardRef}
        lang="en"
        className="bg-gray-50 border border-gray-200 rounded-lg p-5"
      >
        <p className="text-gray-800 leading-relaxed text-sm" translate="no">{summaryText}</p>
        <p className="text-xs text-gray-400 mt-3">
          Prices based on official API docs · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          {currentSource && (
            <> · Source: <a href={currentSource} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">{state.currentModel.provider}</a></>
          )}
          {candidateSource && candidateSource !== currentSource && (
            <>, <a href={candidateSource} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">{state.candidateModel.provider}</a></>
          )}
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Replace ModelSelector price label**

Edit `src/components/ModelSelector.tsx`:

```tsx
import { MODELS, type Model } from '../data/models'
import { fmtPricePerMillion } from '../lib/format'

interface Props {
  label: string
  value: string
  onChange: (model: Model) => void
}

export function ModelSelector({ label, value, onChange }: Props) {
  const id = `model-select-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      <select
        id={id}
        value={value}
        onChange={e => {
          const m = MODELS.find(m => m.id === e.target.value)
          if (m) onChange(m)
        }}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {MODELS.map(m => (
          <option key={m.id} value={m.id}>
            {m.name} — {fmtPricePerMillion(m.inputPrice, m.outputPrice)}
          </option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 6: Run all tests**

```bash
npm run test:run
```

Expected: 모든 tests PASS. 기존 `expect(screen.getByText(/-\$218/))` 형태는 새 포맷터에서도 동일 문자열 생성. `fmtPercent(ratio, 1)` 결과는 `-96.9%` → 기존 검사 통과.

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/lib/
git commit -m "refactor: apply unified formatter across all components (feedback ③⑥)"
```

---

## Task 6: Translation Protection Layer

**목적:** 브라우저 자동번역(Chrome Translate 등)이 기술 용어 / 고유명사 / 숫자를 망가뜨리지 못하게 `translate="no"` 속성과 `<meta>` 태그로 방어. feedback ④⑤ 해결.

**Files:**
- Modify: `index.html`
- Modify: `src/components/SummaryCard/SummaryCard.test.tsx` (regression test)

- [ ] **Step 1: Add notranslate meta to index.html**

Edit `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="google" content="notranslate" />
    <title>LLM Cost Simulator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

변경 포인트:
- `<meta name="google" content="notranslate" />` 추가: Chrome Translate에게 "이 페이지 번역 제안하지 말 것" 신호.
- `lang="en"` 유지: 기본 언어 명시.

주의: 이 메타가 있어도 사용자가 수동으로 번역 실행하면 번역됨. 그래서 Task 5에서 이미 `translate="no"` 를 가격/모델명/숫자 등 중요 위치에 추가함.

- [ ] **Step 2: Add regression test for SummaryCard notranslate attribute**

Edit `src/components/SummaryCard/SummaryCard.test.tsx`, append:

```tsx
  it('marks summary text as not-translatable', () => {
    render(<SummaryCard state={BASE_STATE} />)
    const paragraph = screen.getByText(/Claude Sonnet 4.6/).closest('p')
    expect(paragraph).toHaveAttribute('translate', 'no')
  })

  it('wraps summary card in lang="en"', () => {
    render(<SummaryCard state={BASE_STATE} />)
    const card = screen.getByText(/Claude Sonnet 4.6/).closest('[lang]')
    expect(card).toHaveAttribute('lang', 'en')
  })
```

- [ ] **Step 3: Run tests — verify PASS**

```bash
npm run test:run src/components/SummaryCard/
```

Expected: 모든 tests PASS (새로 추가한 2개 포함).

- [ ] **Step 4: Verify in browser (optional, gstack)**

```bash
npm run build
npm run preview &
sleep 2
$B goto http://localhost:4173/
$B js "document.querySelector('meta[name=google]').content"
# Expected: "notranslate"
$B js "document.querySelectorAll('[translate=no]').length"
# Expected: 10+ (가격/모델명/델타 요소들)
```

- [ ] **Step 5: Commit**

```bash
git add index.html src/components/SummaryCard/SummaryCard.test.tsx
git commit -m "feat: translation protection via meta + translate=no (feedback ④⑤)"
```

---

## Task 7: Input Validation Hardening

**목적:** feedback 섹션 4(접근성/입력 검증) 해결. 음수 거부, 천단위 구분 표시, 너무 큰 수 가드.

**Files:**
- Modify: `src/components/TokenInputs.tsx`

- [ ] **Step 1: Rewrite TokenInputs with hardened inputs**

Edit `src/components/TokenInputs.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { PRESETS, type WorkloadPreset } from '../data/presets'
import { fmtTokens } from '../lib/format'

interface Props {
  monthlyInputTokens: number
  monthlyOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
  onInputChange: (v: number) => void
  onOutputChange: (v: number) => void
  onCacheChange: (v: number) => void
  onBatchChange: (v: boolean) => void
  onPresetSelect: (p: WorkloadPreset) => void
}

const MAX_TOKENS = 10_000_000_000 // 100억 토큰 상한

function sanitize(raw: string): number {
  // 숫자 + , 만 허용. 그 외는 거름.
  const cleaned = raw.replace(/[^\d]/g, '')
  if (cleaned === '') return 0
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return 0
  return Math.min(MAX_TOKENS, Math.max(0, n))
}

function formatInput(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('en-US')
}

export function TokenInputs({
  monthlyInputTokens, monthlyOutputTokens,
  cacheHitRate, batchEnabled,
  onInputChange, onOutputChange, onCacheChange, onBatchChange, onPresetSelect,
}: Props) {
  // 내부 display state — 천단위 포맷된 문자열 유지
  const [inputStr, setInputStr] = useState(() => formatInput(monthlyInputTokens))
  const [outputStr, setOutputStr] = useState(() => formatInput(monthlyOutputTokens))

  // 부모 state 변경(preset) 시 동기화
  useEffect(() => { setInputStr(formatInput(monthlyInputTokens)) }, [monthlyInputTokens])
  useEffect(() => { setOutputStr(formatInput(monthlyOutputTokens)) }, [monthlyOutputTokens])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Workload Preset</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => onPresetSelect(p)}
              title={`${fmtTokens(p.monthlyInputTokens)} in / ${fmtTokens(p.monthlyOutputTokens)} out · cache ${Math.round(p.defaultCacheHitRate * 100)}%${p.defaultBatchEnabled ? ' · batch on' : ''}`}
              className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-400 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="monthly-input-tokens" className="text-sm font-medium text-gray-700">
            Monthly Input Tokens
          </label>
          <input
            id="monthly-input-tokens"
            type="text"
            inputMode="numeric"
            value={inputStr}
            onChange={e => {
              const n = sanitize(e.target.value)
              setInputStr(formatInput(n))
              onInputChange(n)
            }}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            translate="no"
          />
        </div>
        <div>
          <label htmlFor="monthly-output-tokens" className="text-sm font-medium text-gray-700">
            Monthly Output Tokens
          </label>
          <input
            id="monthly-output-tokens"
            type="text"
            inputMode="numeric"
            value={outputStr}
            onChange={e => {
              const n = sanitize(e.target.value)
              setOutputStr(formatInput(n))
              onOutputChange(n)
            }}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            translate="no"
          />
        </div>
      </div>
      <div className="flex gap-6 items-center">
        <div className="flex-1">
          <label htmlFor="cache-hit-rate" className="text-sm font-medium text-gray-700">
            Cache Hit Rate: <span translate="no">{Math.round(cacheHitRate * 100)}%</span>
          </label>
          <input
            id="cache-hit-rate"
            type="range" min={0} max={100} step={1}
            value={Math.round(cacheHitRate * 100)}
            onChange={e => onCacheChange(Number(e.target.value) / 100)}
            className="mt-1 w-full"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={batchEnabled}
            onChange={e => onBatchChange(e.target.checked)}
            className="w-4 h-4"
          />
          Batch Mode
        </label>
      </div>
    </div>
  )
}
```

주요 변경:
- `type="number"` → `type="text" inputMode="numeric"`: 천단위 쉼표 렌더링 가능.
- `sanitize()` 함수: 음수/문자/NaN 거부, 상한 100억.
- `useState` + `useEffect`: preset 선택 시 부모 state 변경이 input 표시에 반영됨.
- preset 버튼 `title` 속성: 호버 tooltip에 preset 값 preview (feedback UX ①).
- `translate="no"` 위에 cache % 숫자에만 국한.

- [ ] **Step 2: Manual verify in dev server**

```bash
npm run dev
```

브라우저에서 `localhost:5173` 접속:
- Input tokens 필드에 "abc" 타이핑 → 빈 값 (0).
- "-100" 타이핑 → 100 표시 (sanitize).
- "50000000" 타이핑 → "50,000,000" 자동 포맷.
- Preset 버튼 호버 → tooltip 표시.
- Preset 클릭 → input 필드 값이 자동 갱신되고 쉼표 포맷 유지.

- [ ] **Step 3: Run tests**

```bash
npm run test:run
```

Expected: 모든 tests PASS. TokenInputs에 테스트 없음이 예상 (기존 plan에도 없었음). 수동 verify로 충분.

- [ ] **Step 4: Commit**

```bash
git add src/components/TokenInputs.tsx
git commit -m "feat: input hardening — thousand separators, sanitize, preset tooltip (feedback 4, UX ①)"
```

---

## Task 8: Same-Model Migration Guard

**목적:** 현재/후보 모델이 동일하면 "동일 모델" 안내를 표시하여 -0% 델타 등 의미없는 숫자를 방지.

**Files:**
- Modify: `src/components/MigrationPanel/index.tsx`
- Modify: `src/components/MigrationPanel/MigrationPanel.test.tsx`

- [ ] **Step 1: Add failing test**

Append to `src/components/MigrationPanel/MigrationPanel.test.tsx`:

```tsx
  it('shows "same model" notice when current === candidate', () => {
    const same = {
      ...BASE_STATE,
      candidateModel: BASE_STATE.currentModel,
    }
    render(<MigrationPanel state={same} />)
    expect(screen.getByText(/same model/i)).toBeInTheDocument()
    // 델타는 표시되지 않아야 함
    expect(screen.queryByTestId('monthly-delta')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm run test:run src/components/MigrationPanel/
```

Expected: FAIL — 새 테스트만.

- [ ] **Step 3: Implement same-model branch**

Edit `src/components/MigrationPanel/index.tsx`. Before the main return, add:

```tsx
export function MigrationPanel({ state }: Props) {
  const isSameModel = state.currentModel.id === state.candidateModel.id

  if (isSameModel) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Migration Comparison</h2>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center">
          <p className="text-sm text-amber-800">
            Current and candidate are the <strong>same model</strong> (
            <span translate="no">{state.currentModel.name}</span>).
            Select a different candidate to see migration delta.
          </p>
        </div>
      </section>
    )
  }

  const result = calculateMigrationDelta({
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    monthlyInputTokens: state.monthlyInputTokens,
    monthlyOutputTokens: state.monthlyOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
  })

  // ... rest of existing render (unchanged from Task 5)
  const isSaving = result.monthlyDelta < 0
  const deltaColor = isSaving ? 'text-green-600' : 'text-red-600'
  const deltaBg = isSaving ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      {/* existing JSX from Task 5 */}
    </section>
  )
}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
npm run test:run src/components/MigrationPanel/
```

Expected: 모든 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/MigrationPanel/
git commit -m "feat: same-model migration guard with amber notice (feedback UX ③)"
```

---

## Task 9: Preset Tooltip Already Applied — Verify

**목적:** Task 7 Step 1에서 preset 버튼에 `title` 속성 (호버 tooltip) 이미 추가됐음을 확인. feedback UX ① 검증 완료 처리.

**Files:**
- None (verification only)

- [ ] **Step 1: Manual verification**

```bash
npm run dev
```

브라우저에서:
- 각 preset 버튼 ("Basic Chat", "Document Analysis" 등) 호버.
- 네이티브 tooltip이 "1M in / 500K out · cache 30%" 형태로 표시되는지 확인.
- 6개 preset 모두 tooltip 표시.

- [ ] **Step 2: Mark this task complete**

별도 커밋 없음. Task 7에 포함됨.

---

## Task 10: CLAUDE.md — Rules Derived from This Round

**목적:** 이번 feedback 라운드의 근본 원인(인라인 포맷터 중복, 자동번역 방어 누락, state 변화 검증 테스트 부재)을 다시 만들지 않도록 프로젝트 헌법에 기록.

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write CLAUDE.md**

Create `CLAUDE.md`:

```markdown
# LLM Cost Simulator — 프로젝트 헌법

## 기술 스택
- Vite 5 + React 18 + TypeScript 5
- Tailwind CSS 3
- Recharts (차트), html-to-image (export)
- Vitest + @testing-library/react (test)
- 클라이언트 사이드 only — 서버 없음, DB 없음, localStorage 사용 안 함 (현 시점)

## 아키텍처 규칙
- CRITICAL: 모든 비용 계산은 `src/lib/calculator.ts` 의 `calculateCost` / `calculateMigrationDelta` 단일 경로를 통과한다. 컴포넌트 내에서 가격 연산 금지.
- CRITICAL: 모든 사용자 표시 숫자는 `src/lib/format.ts` 의 `fmtCurrency` / `fmtPercent` / `fmtTokens` / `fmtDelta` / `fmtPricePerMillion` 을 통과한다. 컴포넌트 내에서 `toLocaleString`, `toFixed`, `$ + n` 같은 인라인 포맷 금지.
- CRITICAL: 기술 용어/고유명사/숫자를 렌더하는 요소에는 `translate="no"` 속성을 붙인다. 가격, 모델명, 프로바이더명, 델타 숫자, 토큰 수, 퍼센트가 해당.
- CRITICAL: 요약/문장성 영어 텍스트 블록은 `lang="en"` 으로 감싼다 (브라우저 자동번역 품질이 급격히 떨어짐).
- CRITICAL: 컴포넌트 테스트는 **state 변화 시 값이 갱신되는지** 를 반드시 검증한다 (`rerender` 사용). 단일 정적 `BASE_STATE` 만으로는 state sync 회귀를 잡지 못함.
- NaN 가드: 산술 연산 전 `Number.isFinite()` 체크. NaN → 0 또는 `—` 렌더.
- 페르소나 간 일관성: badge, Migration, Scenario, Summary 가 보는 수치는 **같은 입력으로 같은 값**이어야 함. 어느 한 곳에서만 다른 숫자가 나오면 즉시 근본 원인 추적.

## 개발 프로세스
- CRITICAL: 새 기능/수정은 실패 테스트 → 최소 구현 → 테스트 통과 (TDD). `src/lib/` 순수 함수는 100% 커버리지.
- 커밋 메시지: conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- 각 Task 완료 후 `npm run test:run` 전체 통과 확인, 이후 커밋.
- PR 전 `npm run build` 성공 + `dist/` 에서 `$B goto` 로 수동 스모크.

## 금지 패턴 (안티 슬롭)
- 모델명/브랜드명 번역: `Claude Opus 4.7 → 클로드 작품 4.7` ❌
- 통화 표기 혼용: `$195` 와 `195달러` 를 같은 화면에서 ❌
- "cheapest" 같은 단어를 scope 없이 단독 사용 ❌
- 차트에서 `model.releaseDate` 이전 달의 데이터 포인트 렌더 ❌
- glass morphism, 보라 그라데이션 텍스트, 네온 글로우, 과도한 이모지 ❌

## 명령어
- `npm run dev` — 로컬 개발 서버 (http://localhost:5173)
- `npm run build` — 프로덕션 빌드 (dist/)
- `npm run preview` — 빌드 결과 미리보기 (http://localhost:4173)
- `npm run test` — watch 모드 테스트
- `npm run test:run` — CI 모드 테스트 (한 번만 실행)

## 참고 문서
- `docs/superpowers/specs/2026-04-22-costsim-harness-design.md` — 초기 하네스 설계 스펙
- `docs/superpowers/plans/2026-04-22-pm-monthly-simulator.md` — 1차 구현 플랜
- `docs/superpowers/plans/2026-04-23-costsim-feedback-fixes.md` — 본 플랜 (feedback 라운드 1)
- `docs/diagnosis/2026-04-23-deploy-state.md` — 배포 상태 진단
- `feedback.md` — 외부 리뷰 피드백 (라운드 1)
- `llm-costsim-issues.md`, `llm-costsim-issues-v2.md` — 초기 투자 티켓 목록
- `하네스 프레임워크 튜토리얼 가이드 1103fbff97b0828286a781accadb81dc.md` — 하네스 프레임워크 설명
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md project constitution (rules from feedback round 1)"
```

---

## Task 11: Integration Smoke + Deploy

**목적:** 모든 수정 통합 후 빌드/스모크/배포로 라운드 1 종결.

**Files:**
- None (verification + push)

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: 전체 PASS (최소 20+ tests — calculator 6 + format 17 + MigrationPanel 5+3+1 + ScenarioPlanner 4+4 + SummaryCard 4+2).

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: `dist/` 재생성, error 없음.

- [ ] **Step 3: Preview smoke via gstack**

```bash
npm run preview &
sleep 2
_ROOT=$(git rev-parse --show-toplevel)
B="$_ROOT/.claude/skills/gstack/browse/dist/browse"
[ ! -x "$B" ] && B="$HOME/.claude/skills/gstack/browse/dist/browse"

$B goto http://localhost:4173/
$B snapshot -i -a -o /tmp/post-fix-state.png
$B text | grep -iE "NaN|\\$.*달러|달러.*\\$|작품|이주|교통" > /tmp/post-fix-issues.txt
# Expected: /tmp/post-fix-issues.txt is EMPTY (no Korean auto-translate artifacts, no NaN)
$B console --errors > /tmp/post-fix-errors.txt
# Expected: no errors

# 수동 삼입 테스트: 모델 변경 → Migration 카드 수치 변경 확인
$B click "select[id*=current]"
$B select "select[id*=current]" "claude-opus-4.7"
$B snapshot -D > /tmp/post-fix-model-change.txt
# Expected: diff shows $/mo 값 변경됨

# 정리
kill %1
```

- [ ] **Step 4: Push to GitHub (triggers deploy)**

```bash
git push origin main
```

Expected: `.github/workflows/deploy.yml` 이 트리거되어 `https://tayna99.github.io/token_simulator/` 가 새 빌드로 교체됨.

- [ ] **Step 5: Verify deployed — gstack canary**

```bash
sleep 90   # GitHub Pages 배포 대기
$B goto https://tayna99.github.io/token_simulator/
$B html | grep -oE 'index-[A-Za-z0-9]+\.js' | sort -u > /tmp/canary-hashes.txt
ls dist/assets/*.js | xargs -n1 basename > /tmp/local-hashes.txt
diff /tmp/canary-hashes.txt /tmp/local-hashes.txt && echo "DEPLOY MATCH" || echo "DEPLOY MISMATCH"
# Expected: DEPLOY MATCH

$B snapshot -i -a -o /tmp/canary-state.png
$B text | grep -iE "NaN|작품|이주|교통" > /tmp/canary-issues.txt
# Expected: EMPTY
```

- [ ] **Step 6: Record completion**

Append to `docs/diagnosis/2026-04-23-deploy-state.md`:

```markdown
## Round 1 Resolution (YYYY-MM-DD)

- All 6 feedback categories addressed.
- Tests pass: <count>.
- Canary verified: deploy hashes match local dist.
- Residual items deferred to round 2:
  - Scenario parameter customization (feedback UX ②) — 별도 Task로 이관
  - Enterprise-procurement persona (v2 스펙 명시 제외)
  - v2 티켓 #4 (token estimator), #7 (context/RL/benchmark), #8 (rec rationale), #2 (priceHistory) — 별도 플랜
```

커밋:

```bash
git add docs/diagnosis/
git commit -m "docs: round 1 resolution recorded"
git push origin main
```

---

## Self-Review

**1. Spec coverage (feedback.md vs 본 플랜):**

| feedback 항목 | 대응 Task | 커버리지 |
|---|---|---|
| ① Migration 카드 state 연결 | Task 2 (regression test + 조건부 fix) | ✅ |
| ② 캐시 라벨 50 고정 | Task 3 Step 5-6 (조건부), Task 7 (재작성으로 해소) | ✅ |
| ② Scenario NaN | Task 3 Step 3 (NaN guard) | ✅ |
| ③ 통화 포맷 혼용 | Task 4 (formatter) + Task 5 (apply) | ✅ |
| ④ 번역 이슈 (작품, 이주, 교통, NaN→나N) | Task 6 (`translate="no"`, meta), Task 5 (모델명에 `translate="no"`) | ✅ |
| ⑤ preset 선택 시 요약 영어 flip | Task 6 (SummaryCard에 `lang="en"` + `translate="no"`) | ✅ |
| ⑥ 모델 라벨 단위 불일치 | Task 4 (`fmtPricePerMillion`) + Task 5 Step 5 | ✅ |
| UX ① preset preview | Task 7 Step 1 (`title` 속성) + Task 9 (verify) | ✅ |
| UX ② scenario 파라미터 커스터마이징 | **이관** — round 2 플랜 | ⏸ |
| UX ③ 같은 모델 선택 가드 | Task 8 | ✅ |
| UX ④ 요약 카드 출처 링크 | Task 5 Step 4 (`PROVIDER_PRICING_URLS`) | ✅ |
| 4. 접근성/입력 검증 | Task 7 (sanitize, thousand sep, max) | ✅ |

2개 확장 덤(CLAUDE.md, diagnosis 문서) 도 포함.

**2. Placeholder scan:** 없음. 모든 step에 실제 코드/명령/예상 출력 포함.

**3. Type consistency:**
- `SimState` → App.tsx export, 모든 컴포넌트에서 import.
- `fmtCurrency`, `fmtPercent`, `fmtTokens`, `fmtDelta`, `fmtPricePerMillion` → `src/lib/format.ts` export. Task 4에서 정의, Task 5에서 사용 — 시그니처 일치.
- `calculateCost`, `calculateMigrationDelta` → 기존, 변경 없음.
- `WorkloadPreset`, `Model` → 기존, 변경 없음.
- `PROVIDER_PRICING_URLS` → SummaryCard 내부, keys는 `Provider` 타입 (models.ts).

**4. Scope check:** 단일 이터레이션 (feedback round 1) 에 집중. v2 티켓 잔여분(#1, #3, #4, #7, #8, #2, #9, #15)은 별도 플랜으로 이관 — 본 플랜에 끼지 않음.

**5. Task count sanity:** 11 tasks. 각 task는 3-7 steps. TDD 리듬 유지. 병렬 가능성 제한적(같은 파일들) → 순차 권장.

---

## Future Work (out of scope for this plan)

- **Round 2 candidates**:
  - Scenario parameter customization (편집 가능한 Best/Base/Worst)
  - v2 티켓 #1 (pre-release data filter in charts)
  - v2 티켓 #4 (client-side tiktoken estimator)
  - v2 티켓 #7 (모델 카드에 context window / rate limit / benchmark 링크)
  - v2 티켓 #8 (Recommendations per-row "why")
- **Harness 확장**:
  - `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ADR.md`, `docs/UI_GUIDE.md` — 브레인스토밍 스펙 기준 추가 작성
  - `scripts/hooks/price-integrity-guard.sh` — CRITICAL 1을 자동 강제
  - `.claude/settings.json` 에 hook 등록
- **i18next 도입 고려** — auto-translate 방어 이상의 정식 i18n 필요 시
