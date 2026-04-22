# PM Monthly Simulator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PM이 LLM 마이그레이션 ROI, 시나리오 플래닝, 이해관계자 요약을 한 화면에서 할 수 있는 Monthly Simulator를 새로 만든다.

**Architecture:** Vite + React + TypeScript 단일 페이지 앱. 데이터는 하드코딩된 모델 가격 레이어, 순수함수 계산 엔진, 3개의 독립 PM 피처 패널로 구성된다. Task 1-4는 순차 실행, Task 5-7은 git worktree 3개에서 병렬 실행.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Vitest, @testing-library/react, Tailwind CSS 3, Recharts, html-to-image

**Reference:** https://llm-costsim-aulvsefh.manus.space/monthly (기존 구현 참고용)

**Parallel execution map:**
```
Task 1 (repo) → Task 2 (data) → Task 3 (calculator) → Task 4 (app shell)
                                                              ↓ [git worktree 3개 생성]
                                          ┌───────────────────┼───────────────────┐
                                     Task 5               Task 6               Task 7
                               (Migration Panel)    (Scenario Planner)   (Summary Card)
                                     feat/migration     feat/scenario      feat/summary
                                          └───────────────────┼───────────────────┘
                                                              ↓
                                                          Task 8 (merge + deploy)
```

---

## File Structure

```
token_simulator/
├── src/
│   ├── data/
│   │   ├── models.ts          # 15개 모델 데이터 (가격, releaseDate, 할인율)
│   │   └── presets.ts         # 워크로드 프리셋 (6종)
│   ├── lib/
│   │   └── calculator.ts      # 순수함수 비용 계산 엔진
│   ├── components/
│   │   ├── ModelSelector.tsx       # 모델 선택 드롭다운
│   │   ├── TokenInputs.tsx         # 월간 토큰 입력 + 캐싱/배치 토글
│   │   ├── MigrationPanel/
│   │   │   ├── index.tsx           # 마이그레이션 비교 패널 (Task 5)
│   │   │   └── MigrationPanel.test.tsx
│   │   ├── ScenarioPlanner/
│   │   │   ├── index.tsx           # best/base/worst 테이블 (Task 6)
│   │   │   └── ScenarioPlanner.test.tsx
│   │   └── SummaryCard/
│   │       ├── index.tsx           # 요약 카드 + Export (Task 7)
│   │       └── SummaryCard.test.tsx
│   ├── App.tsx                # 앱 셸, 공유 상태, 레이아웃
│   ├── main.tsx
│   └── index.css
├── docs/superpowers/plans/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Task 1: Repo Setup

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Clone repo and scaffold**

```bash
cd C:/
git clone https://github.com/tayna99/token_simulator token_simulator_git
cd token_simulator_git
npm create vite@latest . -- --template react-ts
npm install
```

> **Note:** C:/token_simulator 에 기존 파일(llm-costsim-issues.md 등)이 있으면 별도 디렉토리에 클론 후 옮긴다.

- [ ] **Step 2: Install dependencies**

```bash
npm install recharts html-to-image jspdf
npm install -D tailwindcss postcss autoprefixer @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure vite.config.ts**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Configure tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Configure tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 6: Create test setup file**

```typescript
// src/test-setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Update package.json scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] **Step 8: Add tailwind to index.css**

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```
Expected: `http://localhost:5173` 에서 기본 Vite+React 페이지 열림

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: initial vite+react+ts scaffold"
```

---

## Task 2: Data Layer

**Files:**
- Create: `src/data/models.ts`
- Create: `src/data/presets.ts`

- [ ] **Step 1: Write models.ts**

```typescript
// src/data/models.ts

export type Provider = 'openai' | 'anthropic' | 'google' | 'xai' | 'microsoft'

export interface Model {
  id: string
  name: string
  provider: Provider
  inputPrice: number   // USD per 1M tokens
  outputPrice: number  // USD per 1M tokens
  contextWindow: number  // tokens
  releaseDate: string  // YYYY-MM format
  cacheDiscount: number  // 0-1, e.g. 0.9 = 90% discount on cached tokens
  batchDiscount: number  // 0-1, e.g. 0.5 = 50% discount when batch enabled
}

export const MODELS: Model[] = [
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    provider: 'openai',
    inputPrice: 2.5,
    outputPrice: 15,
    contextWindow: 128000,
    releaseDate: '2026-04',
    cacheDiscount: 0.5,
    batchDiscount: 0.5,
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 mini',
    provider: 'openai',
    inputPrice: 0.75,
    outputPrice: 4.5,
    contextWindow: 128000,
    releaseDate: '2026-04',
    cacheDiscount: 0.5,
    batchDiscount: 0.5,
  },
  {
    id: 'gpt-5.4-nano',
    name: 'GPT-5.4 nano',
    provider: 'openai',
    inputPrice: 0.2,
    outputPrice: 1.25,
    contextWindow: 128000,
    releaseDate: '2026-04',
    cacheDiscount: 0.5,
    batchDiscount: 0.5,
  },
  {
    id: 'claude-opus-4.7',
    name: 'Claude Opus 4.7',
    provider: 'anthropic',
    inputPrice: 5,
    outputPrice: 25,
    contextWindow: 200000,
    releaseDate: '2026-03',
    cacheDiscount: 0.9,
    batchDiscount: 0.5,
  },
  {
    id: 'claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    inputPrice: 3,
    outputPrice: 15,
    contextWindow: 200000,
    releaseDate: '2026-02',
    cacheDiscount: 0.9,
    batchDiscount: 0.5,
  },
  {
    id: 'claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    inputPrice: 1,
    outputPrice: 5,
    contextWindow: 200000,
    releaseDate: '2026-01',
    cacheDiscount: 0.9,
    batchDiscount: 0.5,
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    inputPrice: 2,
    outputPrice: 12,
    contextWindow: 1000000,
    releaseDate: '2026-02',
    cacheDiscount: 0.5,
    batchDiscount: 0.5,
  },
  {
    id: 'gemini-3.1-flash',
    name: 'Gemini 3.1 Flash',
    provider: 'google',
    inputPrice: 0.1,
    outputPrice: 0.4,
    contextWindow: 1000000,
    releaseDate: '2026-01',
    cacheDiscount: 0.5,
    batchDiscount: 0.5,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    inputPrice: 1.25,
    outputPrice: 5,
    contextWindow: 1000000,
    releaseDate: '2025-12',
    cacheDiscount: 0.5,
    batchDiscount: 0.5,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    inputPrice: 0.075,
    outputPrice: 0.3,
    contextWindow: 1000000,
    releaseDate: '2025-11',
    cacheDiscount: 0.5,
    batchDiscount: 0.5,
  },
  {
    id: 'grok-4.20',
    name: 'Grok 4.20',
    provider: 'xai',
    inputPrice: 2,
    outputPrice: 6,
    contextWindow: 131072,
    releaseDate: '2026-04',
    cacheDiscount: 0,
    batchDiscount: 0,
  },
  {
    id: 'grok-4.1-fast',
    name: 'Grok 4.1 Fast',
    provider: 'xai',
    inputPrice: 0.2,
    outputPrice: 0.5,
    contextWindow: 131072,
    releaseDate: '2026-02',
    cacheDiscount: 0,
    batchDiscount: 0,
  },
  {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xai',
    inputPrice: 3,
    outputPrice: 15,
    contextWindow: 131072,
    releaseDate: '2025-12',
    cacheDiscount: 0,
    batchDiscount: 0,
  },
  {
    id: 'copilot-pro',
    name: 'Copilot Pro',
    provider: 'microsoft',
    inputPrice: 1.5,
    outputPrice: 6,
    contextWindow: 128000,
    releaseDate: '2026-01',
    cacheDiscount: 0,
    batchDiscount: 0,
  },
  {
    id: 'copilot-standard',
    name: 'Copilot Standard',
    provider: 'microsoft',
    inputPrice: 0.5,
    outputPrice: 1.5,
    contextWindow: 128000,
    releaseDate: '2026-01',
    cacheDiscount: 0,
    batchDiscount: 0,
  },
]

export function getModelById(id: string): Model | undefined {
  return MODELS.find(m => m.id === id)
}
```

- [ ] **Step 2: Write presets.ts**

```typescript
// src/data/presets.ts

export interface WorkloadPreset {
  id: string
  name: string
  monthlyInputTokens: number
  monthlyOutputTokens: number
  defaultCacheHitRate: number  // 0-1
  defaultBatchEnabled: boolean
}

export const PRESETS: WorkloadPreset[] = [
  {
    id: 'basic-chat',
    name: 'Basic Chat',
    monthlyInputTokens: 1_000_000,
    monthlyOutputTokens: 500_000,
    defaultCacheHitRate: 0.3,
    defaultBatchEnabled: false,
  },
  {
    id: 'document-analysis',
    name: 'Document Analysis',
    monthlyInputTokens: 50_000_000,
    monthlyOutputTokens: 5_000_000,
    defaultCacheHitRate: 0.8,
    defaultBatchEnabled: false,
  },
  {
    id: 'code-generation',
    name: 'Code Generation',
    monthlyInputTokens: 10_000_000,
    monthlyOutputTokens: 15_000_000,
    defaultCacheHitRate: 0.4,
    defaultBatchEnabled: false,
  },
  {
    id: 'batch-processing',
    name: 'Batch Processing',
    monthlyInputTokens: 100_000_000,
    monthlyOutputTokens: 50_000_000,
    defaultCacheHitRate: 0.2,
    defaultBatchEnabled: true,
  },
  {
    id: 'data-extraction',
    name: 'Data Extraction',
    monthlyInputTokens: 200_000_000,
    monthlyOutputTokens: 100_000_000,
    defaultCacheHitRate: 0.6,
    defaultBatchEnabled: true,
  },
  {
    id: 'summarization',
    name: 'Summarization',
    monthlyInputTokens: 500_000_000,
    monthlyOutputTokens: 50_000_000,
    defaultCacheHitRate: 0.5,
    defaultBatchEnabled: false,
  },
]
```

- [ ] **Step 3: Commit**

```bash
git add src/data/
git commit -m "feat: add model data and workload presets"
```

---

## Task 3: Calculator Engine (TDD)

**Files:**
- Create: `src/lib/calculator.ts`
- Create: `src/lib/calculator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/calculator.test.ts
import { describe, it, expect } from 'vitest'
import { calculateCost, calculateMigrationDelta } from './calculator'
import type { Model } from '../data/models'

const MOCK_ANTHROPIC: Model = {
  id: 'mock-anthropic',
  name: 'Mock Anthropic',
  provider: 'anthropic',
  inputPrice: 3,       // $3 per 1M tokens
  outputPrice: 15,     // $15 per 1M tokens
  contextWindow: 200000,
  releaseDate: '2026-01',
  cacheDiscount: 0.9,  // 90% discount on cached
  batchDiscount: 0.5,
}

const MOCK_OPENAI: Model = {
  id: 'mock-openai',
  name: 'Mock OpenAI',
  provider: 'openai',
  inputPrice: 2.5,
  outputPrice: 15,
  contextWindow: 128000,
  releaseDate: '2026-01',
  cacheDiscount: 0.5,
  batchDiscount: 0.5,
}

describe('calculateCost', () => {
  it('calculates base cost with no caching or batch', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 500_000,
      cacheHitRate: 0,
      batchEnabled: false,
    })
    // input: 1M * $3/1M = $3, output: 0.5M * $15/1M = $7.5
    expect(result.monthlyCost).toBeCloseTo(10.5, 4)
    expect(result.annualCost).toBeCloseTo(126, 4)
  })

  it('applies cache discount correctly', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 0,
      cacheHitRate: 1.0,  // 100% cached
      batchEnabled: false,
    })
    // cached input: 1M * $3/1M * (1 - 0.9) = $0.30
    expect(result.monthlyCost).toBeCloseTo(0.3, 4)
  })

  it('applies batch discount to both input and output', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 1_000_000,
      cacheHitRate: 0,
      batchEnabled: true,
    })
    // input: $3 * 0.5 = $1.5, output: $15 * 0.5 = $7.5 → total $9
    expect(result.monthlyCost).toBeCloseTo(9, 4)
  })

  it('applies both cache and batch discount', () => {
    const result = calculateCost({
      model: MOCK_ANTHROPIC,
      monthlyInputTokens: 2_000_000,
      monthlyOutputTokens: 0,
      cacheHitRate: 0.5,  // 50% cached
      batchEnabled: true,
    })
    // uncached 1M * $3/1M * 0.5 (batch) = $1.5
    // cached   1M * $3/1M * 0.1 (cache) * 0.5 (batch) = $0.15
    // total = $1.65
    expect(result.monthlyCost).toBeCloseTo(1.65, 4)
  })

  it('models without cache or batch discount are unaffected', () => {
    const noDiscount: Model = { ...MOCK_ANTHROPIC, cacheDiscount: 0, batchDiscount: 0 }
    const withCache = calculateCost({
      model: noDiscount,
      monthlyInputTokens: 1_000_000,
      monthlyOutputTokens: 0,
      cacheHitRate: 1.0,
      batchEnabled: true,
    })
    expect(withCache.monthlyCost).toBeCloseTo(3, 4)
  })
})

describe('calculateMigrationDelta', () => {
  it('returns negative delta when candidate is cheaper', () => {
    const result = calculateMigrationDelta({
      currentModel: MOCK_ANTHROPIC,
      candidateModel: MOCK_OPENAI,
      monthlyInputTokens: 10_000_000,
      monthlyOutputTokens: 2_000_000,
      cacheHitRate: 0,
      batchEnabled: false,
    })
    // anthropic: 10M * $3/1M + 2M * $15/1M = $30 + $30 = $60
    // openai:    10M * $2.5/1M + 2M * $15/1M = $25 + $30 = $55
    expect(result.monthlyDelta).toBeCloseTo(-5, 2) // saving $5/month
    expect(result.annualDelta).toBeCloseTo(-60, 2)
    expect(result.savingPercent).toBeCloseTo(-8.33, 1)
  })

  it('returns positive delta when candidate is more expensive', () => {
    const result = calculateMigrationDelta({
      currentModel: MOCK_OPENAI,
      candidateModel: MOCK_ANTHROPIC,
      monthlyInputTokens: 10_000_000,
      monthlyOutputTokens: 2_000_000,
      cacheHitRate: 0,
      batchEnabled: false,
    })
    expect(result.monthlyDelta).toBeCloseTo(5, 2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run
```
Expected: FAIL — "calculateCost is not exported from './calculator'"

- [ ] **Step 3: Implement calculator.ts**

```typescript
// src/lib/calculator.ts
import type { Model } from '../data/models'

export interface CalcInput {
  model: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  cacheHitRate: number   // 0-1
  batchEnabled: boolean
}

export interface CalcResult {
  monthlyCost: number
  annualCost: number
  inputCost: number
  outputCost: number
}

export function calculateCost(input: CalcInput): CalcResult {
  const { model, monthlyInputTokens, monthlyOutputTokens, cacheHitRate, batchEnabled } = input

  const cachedInputTokens = monthlyInputTokens * cacheHitRate
  const uncachedInputTokens = monthlyInputTokens * (1 - cacheHitRate)
  const batchMult = batchEnabled ? (1 - model.batchDiscount) : 1

  const uncachedInputCost = (uncachedInputTokens / 1_000_000) * model.inputPrice * batchMult
  const cachedInputCost = (cachedInputTokens / 1_000_000) * model.inputPrice * (1 - model.cacheDiscount) * batchMult
  const inputCost = uncachedInputCost + cachedInputCost

  const outputCost = (monthlyOutputTokens / 1_000_000) * model.outputPrice * batchMult

  const monthlyCost = inputCost + outputCost

  return {
    monthlyCost,
    annualCost: monthlyCost * 12,
    inputCost,
    outputCost,
  }
}

export interface MigrationInput {
  currentModel: Model
  candidateModel: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
}

export interface MigrationResult {
  currentCost: CalcResult
  candidateCost: CalcResult
  monthlyDelta: number     // negative = saving
  annualDelta: number
  savingPercent: number    // negative = saving
}

export function calculateMigrationDelta(input: MigrationInput): MigrationResult {
  const base = { ...input, model: input.currentModel }
  const candidate = { ...input, model: input.candidateModel }

  const currentCost = calculateCost(base)
  const candidateCost = calculateCost(candidate)

  const monthlyDelta = candidateCost.monthlyCost - currentCost.monthlyCost
  const annualDelta = monthlyDelta * 12
  const savingPercent = currentCost.monthlyCost === 0
    ? 0
    : (monthlyDelta / currentCost.monthlyCost) * 100

  return { currentCost, candidateCost, monthlyDelta, annualDelta, savingPercent }
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm run test:run
```
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/
git commit -m "feat: calculator engine with migration delta (TDD)"
```

---

## Task 4: App Shell

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/ModelSelector.tsx`
- Create: `src/components/TokenInputs.tsx`

- [ ] **Step 1: Create ModelSelector.tsx**

```tsx
// src/components/ModelSelector.tsx
import { MODELS, type Model } from '../data/models'

interface Props {
  label: string
  value: string
  onChange: (model: Model) => void
}

export function ModelSelector({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={e => {
          const m = MODELS.find(m => m.id === e.target.value)
          if (m) onChange(m)
        }}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {MODELS.map(m => (
          <option key={m.id} value={m.id}>
            {m.name} — ${m.inputPrice}/${m.outputPrice} per 1M
          </option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Create TokenInputs.tsx**

```tsx
// src/components/TokenInputs.tsx
import { PRESETS, type WorkloadPreset } from '../data/presets'

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

export function TokenInputs({
  monthlyInputTokens, monthlyOutputTokens,
  cacheHitRate, batchEnabled,
  onInputChange, onOutputChange, onCacheChange, onBatchChange, onPresetSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Workload Preset</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => onPresetSelect(p)}
              className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-400 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Monthly Input Tokens</label>
          <input
            type="number"
            value={monthlyInputTokens}
            onChange={e => onInputChange(Number(e.target.value))}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Monthly Output Tokens</label>
          <input
            type="number"
            value={monthlyOutputTokens}
            onChange={e => onOutputChange(Number(e.target.value))}
            className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-6 items-center">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">
            Cache Hit Rate: {Math.round(cacheHitRate * 100)}%
          </label>
          <input
            type="range" min={0} max={100}
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

- [ ] **Step 3: Write App.tsx shell**

```tsx
// src/App.tsx
import { useState } from 'react'
import { MODELS, getModelById, type Model } from './data/models'
import { PRESETS, type WorkloadPreset } from './data/presets'
import { ModelSelector } from './components/ModelSelector'
import { TokenInputs } from './components/TokenInputs'

export interface SimState {
  currentModel: Model
  candidateModel: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  cacheHitRate: number
  batchEnabled: boolean
}

function App() {
  const [state, setState] = useState<SimState>({
    currentModel: getModelById('claude-sonnet-4.6') ?? MODELS[4],
    candidateModel: getModelById('gemini-3.1-flash') ?? MODELS[7],
    monthlyInputTokens: 50_000_000,
    monthlyOutputTokens: 5_000_000,
    cacheHitRate: 0.5,
    batchEnabled: false,
  })

  const handlePreset = (p: WorkloadPreset) => {
    setState(s => ({
      ...s,
      monthlyInputTokens: p.monthlyInputTokens,
      monthlyOutputTokens: p.monthlyOutputTokens,
      cacheHitRate: p.defaultCacheHitRate,
      batchEnabled: p.defaultBatchEnabled,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">LLM Cost Planner</h1>
        <p className="text-sm text-gray-500">Migration ROI · Scenario Planning · Stakeholder Export</p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Shared Inputs */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-6">
          <h2 className="text-base font-semibold text-gray-800">Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <ModelSelector
              label="Current Model"
              value={state.currentModel.id}
              onChange={m => setState(s => ({ ...s, currentModel: m }))}
            />
            <ModelSelector
              label="Candidate Model"
              value={state.candidateModel.id}
              onChange={m => setState(s => ({ ...s, candidateModel: m }))}
            />
          </div>
          <TokenInputs
            monthlyInputTokens={state.monthlyInputTokens}
            monthlyOutputTokens={state.monthlyOutputTokens}
            cacheHitRate={state.cacheHitRate}
            batchEnabled={state.batchEnabled}
            onInputChange={v => setState(s => ({ ...s, monthlyInputTokens: v }))}
            onOutputChange={v => setState(s => ({ ...s, monthlyOutputTokens: v }))}
            onCacheChange={v => setState(s => ({ ...s, cacheHitRate: v }))}
            onBatchChange={v => setState(s => ({ ...s, batchEnabled: v }))}
            onPresetSelect={handlePreset}
          />
        </section>

        {/* Placeholder zones for Tasks 5, 6, 7 */}
        <div id="migration-panel-mount" />
        <div id="scenario-planner-mount" />
        <div id="summary-card-mount" />
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 4: Verify renders without errors**

```bash
npm run dev
```
Expected: 헤더 + Configuration 섹션 보임, 모델 선택 드롭다운 동작

- [ ] **Step 5: Create worktrees for parallel tasks**

```bash
git add src/components/ src/App.tsx
git commit -m "feat: app shell with model selector and token inputs"

# 3개 병렬 worktree 생성
git worktree add ../token-migration feat/migration-panel
git worktree add ../token-scenario feat/scenario-planner
git worktree add ../token-summary feat/summary-card
```

Expected: `../token-migration`, `../token-scenario`, `../token-summary` 디렉토리 생성됨

---

## Task 5: Migration Panel [PARALLEL — worktree: feat/migration-panel]

> **Subagent context:** `cd ../token-migration`. main 브랜치에서 분기된 독립 워크트리다. `src/components/MigrationPanel/` 디렉토리를 만들어 작업한다. App.tsx의 `<div id="migration-panel-mount" />`를 `<MigrationPanel state={state} />` 로 교체한다.

**Files:**
- Create: `src/components/MigrationPanel/MigrationPanel.test.tsx`
- Create: `src/components/MigrationPanel/index.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/MigrationPanel/MigrationPanel.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MigrationPanel } from './index'
import { MODELS } from '../../data/models'

const BASE_STATE = {
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  monthlyInputTokens: 50_000_000,
  monthlyOutputTokens: 5_000_000,
  cacheHitRate: 0,
  batchEnabled: false,
}

describe('MigrationPanel', () => {
  it('renders current and candidate model names', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    expect(screen.getByText(/Claude Sonnet 4.6/)).toBeInTheDocument()
    expect(screen.getByText(/Gemini 3.1 Flash/)).toBeInTheDocument()
  })

  it('shows monthly delta', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    // claude: 50M*$3/1M + 5M*$15/1M = $150+$75 = $225/month
    // gemini: 50M*$0.1/1M + 5M*$0.4/1M = $5+$2 = $7/month
    // delta = $7 - $225 = -$218 (saving)
    expect(screen.getByText(/-\$218/)).toBeInTheDocument()
  })

  it('shows annual delta', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    expect(screen.getByText(/-\$2,616/)).toBeInTheDocument()
  })

  it('shows saving percent', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    // 218/225 = 96.9%
    expect(screen.getByText(/-96\.9%/)).toBeInTheDocument()
  })

  it('shows red when candidate is more expensive', () => {
    const expensiveState = {
      ...BASE_STATE,
      currentModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
      candidateModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
    }
    render(<MigrationPanel state={expensiveState} />)
    const deltaEl = screen.getByTestId('monthly-delta')
    expect(deltaEl.className).toMatch(/text-red/)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run src/components/MigrationPanel/
```
Expected: FAIL — "Cannot find module './index'"

- [ ] **Step 3: Implement MigrationPanel**

```tsx
// src/components/MigrationPanel/index.tsx
import { calculateMigrationDelta } from '../../lib/calculator'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtDelta(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  return `${sign}$${fmt(abs)}`
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
            ${fmt(result.currentCost.monthlyCost)}/mo
          </p>
          <p className="text-sm text-gray-500">${fmt(result.currentCost.annualCost)}/yr</p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Candidate</p>
          <p className="font-semibold text-gray-900">{state.candidateModel.name}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            ${fmt(result.candidateCost.monthlyCost)}/mo
          </p>
          <p className="text-sm text-gray-500">${fmt(result.candidateCost.annualCost)}/yr</p>
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${deltaBg}`}>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">Monthly Delta</p>
            <p
              data-testid="monthly-delta"
              className={`text-xl font-bold ${deltaColor}`}
            >
              {fmtDelta(result.monthlyDelta)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Annual Delta</p>
            <p className={`text-xl font-bold ${deltaColor}`}>
              {fmtDelta(result.annualDelta)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Change</p>
            <p className={`text-xl font-bold ${deltaColor}`}>
              {result.savingPercent.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Wire into App.tsx**

In `src/App.tsx`, replace:
```tsx
{/* Placeholder zones for Tasks 5, 6, 7 */}
<div id="migration-panel-mount" />
```
With:
```tsx
import { MigrationPanel } from './components/MigrationPanel'
// ...
<MigrationPanel state={state} />
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm run test:run src/components/MigrationPanel/
```
Expected: 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/MigrationPanel/ src/App.tsx
git commit -m "feat: migration comparison panel with delta and annual ROI"
```

---

## Task 6: Scenario Planner [PARALLEL — worktree: feat/scenario-planner]

> **Subagent context:** `cd ../token-scenario`. main 브랜치에서 분기된 독립 워크트리다. `src/components/ScenarioPlanner/` 디렉토리를 만들어 작업한다. App.tsx의 `<div id="scenario-planner-mount" />`를 `<ScenarioPlanner state={state} />` 로 교체한다.

**Files:**
- Create: `src/components/ScenarioPlanner/ScenarioPlanner.test.tsx`
- Create: `src/components/ScenarioPlanner/index.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/ScenarioPlanner/ScenarioPlanner.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScenarioPlanner } from './index'
import { MODELS } from '../../data/models'

const BASE_STATE = {
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  monthlyInputTokens: 50_000_000,
  monthlyOutputTokens: 5_000_000,
  cacheHitRate: 0.5,
  batchEnabled: false,
}

describe('ScenarioPlanner', () => {
  it('renders Best, Base, Worst column headers', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    expect(screen.getByText('Best')).toBeInTheDocument()
    expect(screen.getByText('Base')).toBeInTheDocument()
    expect(screen.getByText('Worst')).toBeInTheDocument()
  })

  it('shows three monthly cost values', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    const costs = screen.getAllByTestId('monthly-cost')
    expect(costs).toHaveLength(3)
  })

  it('best cost is less than base cost', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    const costs = screen.getAllByTestId('monthly-cost')
    const values = costs.map(el => parseFloat(el.textContent!.replace(/[$,]/g, '')))
    expect(values[0]).toBeLessThan(values[1]) // best < base
  })

  it('worst cost is greater than base cost', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    const costs = screen.getAllByTestId('monthly-cost')
    const values = costs.map(el => parseFloat(el.textContent!.replace(/[$,]/g, '')))
    expect(values[2]).toBeGreaterThan(values[1]) // worst > base
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run src/components/ScenarioPlanner/
```
Expected: FAIL

- [ ] **Step 3: Implement ScenarioPlanner**

```tsx
// src/components/ScenarioPlanner/index.tsx
import { calculateCost } from '../../lib/calculator'
import type { SimState } from '../../App'

interface ScenarioDef {
  label: 'Best' | 'Base' | 'Worst'
  trafficMultiplier: number
  cacheHitRate: number
  batchEnabled: boolean
}

const SCENARIOS: ScenarioDef[] = [
  { label: 'Best',  trafficMultiplier: 0.7, cacheHitRate: 0.8, batchEnabled: true },
  { label: 'Base',  trafficMultiplier: 1.0, cacheHitRate: 0.5, batchEnabled: false },
  { label: 'Worst', trafficMultiplier: 2.0, cacheHitRate: 0.2, batchEnabled: false },
]

interface Props {
  state: SimState
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function ScenarioPlanner({ state }: Props) {
  const results = SCENARIOS.map(s => ({
    ...s,
    result: calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.monthlyInputTokens * s.trafficMultiplier,
      monthlyOutputTokens: state.monthlyOutputTokens * s.trafficMultiplier,
      cacheHitRate: s.cacheHitRate,
      batchEnabled: s.batchEnabled,
    }),
  }))

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
              {SCENARIOS.map(s => (
                <td key={s.label} className={`text-center py-2 px-4 ${colColors[s.label]}`}>
                  {s.trafficMultiplier < 1
                    ? `−${Math.round((1 - s.trafficMultiplier) * 100)}%`
                    : s.trafficMultiplier === 1 ? 'Current'
                    : `+${Math.round((s.trafficMultiplier - 1) * 100)}%`}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Cache Hit Rate</td>
              {SCENARIOS.map(s => (
                <td key={s.label} className={`text-center py-2 px-4 ${colColors[s.label]}`}>
                  {Math.round(s.cacheHitRate * 100)}%
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Batch Mode</td>
              {SCENARIOS.map(s => (
                <td key={s.label} className={`text-center py-2 px-4 ${colColors[s.label]}`}>
                  {s.batchEnabled ? 'On' : 'Off'}
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
                >
                  {fmt(r.result.monthlyCost)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 pr-4 text-gray-600">Annualized</td>
              {results.map(r => (
                <td key={r.label} className={`text-center py-2 px-4 ${colColors[r.label]}`}>
                  {fmt(r.result.annualCost)}
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

- [ ] **Step 4: Wire into App.tsx**

In `src/App.tsx`, replace `<div id="scenario-planner-mount" />` with:
```tsx
import { ScenarioPlanner } from './components/ScenarioPlanner'
// ...
<ScenarioPlanner state={state} />
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm run test:run src/components/ScenarioPlanner/
```
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ScenarioPlanner/ src/App.tsx
git commit -m "feat: scenario planner with best/base/worst columns"
```

---

## Task 7: Summary Card + Export [PARALLEL — worktree: feat/summary-card]

> **Subagent context:** `cd ../token-summary`. main 브랜치에서 분기된 독립 워크트리다. `src/components/SummaryCard/` 디렉토리를 만들어 작업한다. App.tsx의 `<div id="summary-card-mount" />`를 `<SummaryCard state={state} />` 로 교체한다.

**Files:**
- Create: `src/components/SummaryCard/SummaryCard.test.tsx`
- Create: `src/components/SummaryCard/index.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/components/SummaryCard/SummaryCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SummaryCard } from './index'
import { MODELS } from '../../data/models'

const BASE_STATE = {
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  monthlyInputTokens: 50_000_000,
  monthlyOutputTokens: 5_000_000,
  cacheHitRate: 0,
  batchEnabled: false,
}

describe('SummaryCard', () => {
  it('renders model name in summary text', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByText(/Claude Sonnet 4.6/)).toBeInTheDocument()
  })

  it('renders monthly cost in summary text', () => {
    render(<SummaryCard state={BASE_STATE} />)
    // claude: 50M * $3/1M + 5M * $15/1M = $150 + $75 = $225
    expect(screen.getByText(/\$225/)).toBeInTheDocument()
  })

  it('renders "Copy" button', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('renders "Export PNG" button', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByRole('button', { name: /export png/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run src/components/SummaryCard/
```
Expected: FAIL

- [ ] **Step 3: Implement SummaryCard**

```tsx
// src/components/SummaryCard/index.tsx
import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { calculateCost, calculateMigrationDelta } from '../../lib/calculator'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
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
    ? `, ${Math.round(state.cacheHitRate * 100)}% cache hit`
    : ''
  const batchText = state.batchEnabled ? ', batch enabled' : ''
  const inputM = (state.monthlyInputTokens / 1_000_000).toFixed(0)
  const outputM = (state.monthlyOutputTokens / 1_000_000).toFixed(0)

  const direction = migration.monthlyDelta < 0 ? 'save' : 'cost an additional'
  const absDelta = fmt(Math.abs(migration.monthlyDelta))
  const absAnnual = fmt(Math.abs(migration.annualDelta))
  const percent = Math.abs(migration.savingPercent).toFixed(1)

  return `On ${state.currentModel.name} with ${inputM}M input / ${outputM}M output tokens/month` +
    `${cacheText}${batchText}, estimated monthly cost is ${fmt(current.monthlyCost)} ` +
    `(${fmt(current.annualCost)}/yr). ` +
    `Switching to ${state.candidateModel.name} would ${direction} ${absDelta}/month ` +
    `(${percent}%), annualized ${absAnnual}.`
}

export function SummaryCard({ state }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const summaryText = buildSummaryText(state)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summaryText)
  }

  const handleExportPng = async () => {
    if (!cardRef.current) return
    const dataUrl = await toPng(cardRef.current, { cacheBust: true })
    const link = document.createElement('a')
    link.download = 'llm-cost-summary.png'
    link.href = dataUrl
    link.click()
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
        className="bg-gray-50 border border-gray-200 rounded-lg p-5"
      >
        <p className="text-gray-800 leading-relaxed text-sm">{summaryText}</p>
        <p className="text-xs text-gray-400 mt-3">
          Prices based on official API docs · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Wire into App.tsx**

In `src/App.tsx`, replace `<div id="summary-card-mount" />` with:
```tsx
import { SummaryCard } from './components/SummaryCard'
// ...
<SummaryCard state={state} />
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm run test:run src/components/SummaryCard/
```
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/SummaryCard/ src/App.tsx
git commit -m "feat: board-ready summary card with copy and PNG export"
```

---

## Task 8: Integration + Merge + Deploy

> **Subagent context:** 이 task는 메인 repo에서 실행. `../token-migration`, `../token-scenario`, `../token-summary` 워크트리의 브랜치를 main으로 merge하고 deploy한다.

**Files:**
- Modify: `src/App.tsx` (3개 컴포넌트 import 통합)

- [ ] **Step 1: Merge all feature branches**

```bash
# main repo에서 실행
git merge feat/migration-panel --no-ff -m "merge: migration comparison panel"
git merge feat/scenario-planner --no-ff -m "merge: scenario planner"
git merge feat/summary-card --no-ff -m "merge: summary card and PNG export"
```

충돌이 있으면 App.tsx의 import 순서 문제가 대부분 — 세 컴포넌트를 모두 import하도록 수동 정리 후:

```bash
git add src/App.tsx
git commit -m "fix: resolve merge conflicts in App.tsx imports"
```

- [ ] **Step 2: Run all tests**

```bash
npm run test:run
```
Expected: 모든 tests PASS (최소 13개)

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: `dist/` 디렉토리 생성, 에러 없음

- [ ] **Step 4: Configure GitHub Pages deploy**

`vite.config.ts`에 base 추가:
```typescript
export default defineConfig({
  base: '/token_simulator/',
  // ... rest unchanged
})
```

- [ ] **Step 5: Add GitHub Actions deploy workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

- [ ] **Step 6: Push and deploy**

```bash
git add .github/ vite.config.ts
git commit -m "chore: add GitHub Pages deploy workflow"
git push origin main
```

Expected: GitHub Actions 실행 → `https://tayna99.github.io/token_simulator/` 에서 접근 가능

- [ ] **Step 7: Clean up worktrees**

```bash
git worktree remove ../token-migration
git worktree remove ../token-scenario
git worktree remove ../token-summary
git branch -d feat/migration-panel feat/scenario-planner feat/summary-card
```

---

## Self-Review

**Spec coverage check:**
- ✅ #12 Migration comparison panel → Task 5
- ✅ #13 Scenario planner (best/base/worst) → Task 6
- ✅ #16 Summary card → Task 7
- ✅ #14 Export PNG → Task 7 (html-to-image)
- ✅ Caching discount → calculator.ts
- ✅ Batch discount → calculator.ts
- ✅ releaseDate는 models.ts에 저장됨 (Migration 패널에서 참조 가능)
- ⚠️ PDF export → html-to-image로 PNG만 구현, jspdf 추가는 P3로 defer

**Placeholder scan:** 없음. 모든 step에 실제 코드 포함.

**Type consistency:**
- `SimState` → App.tsx export, Task 5/6/7에서 import
- `CalcInput`, `CalcResult`, `MigrationInput`, `MigrationResult` → calculator.ts export
- `Model` → models.ts export
- `WorkloadPreset` → presets.ts export
- 일관성 확인됨.
