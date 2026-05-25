# AI SaaS Cost-Quality-Margin Decision Workspace 구현 계획

> **Agentic workers(AI 작업자)용 필수 지침:** 이 계획을 task-by-task(작업 단위)로 구현할 때는 superpowers:subagent-driven-development(권장) 또는 superpowers:executing-plans를 사용한다. 진행 추적은 checkbox(`- [ ]`) 문법을 쓴다.

**Goal(목표):** 시뮬레이터를 단순 cost calculator(비용 계산기)에서 LLM operational logs(LLM 운영 로그)를 customer(고객), feature(기능), model(모델), plan(요금제), session(세션) 단위 cost(원가)로 바꾸고, 그 cost를 gross margin(매출총이익률), pricing decisions(가격 결정), cost-quality-latency-risk tradeoffs(비용·품질·지연·위험의 균형 판단)로 연결하는 workspace(작업공간)로 만든다.

**Architecture(아키텍처):** raw token pricing(원시 토큰 단가)과 monthly cost math(월 비용 계산)는 `src/lib/calculator.ts` 안에 유지한다. Usage logs(사용 기록)를 customer, feature, model, plan, session, agent run별 attributed cost(귀속 원가)로 바꾸는 Core Engine(핵심 계산 엔진)을 추가한다. 결과는 6단계 UX(usage import, operational signal summary, cost attribution, margin analysis, pricing simulation, report output)로 노출한다.

**Tech Stack(기술 스택):** Vite 6, React 18, TypeScript 5, Tailwind CSS 3, Recharts, html-to-image, Vitest 4, Testing Library.

---

## Product Shape(제품 형태)

## 2026-05-07 Research Alignment(리서치 정렬)

제품 포지셔닝은 더 이상 "LLM 비용 계산기"가 아니다. 더 강한 방향은 다음이다.

> LLM 운영 로그를 고객·기능·모델·플랜·세션 단위 원가로 재분류하고, AI SaaS의 마진과 가격정책 판단으로 연결하는 워크스페이스.

핵심 제품 질문은 다음이다.

> 우리 AI 기능은 고객별·기능별로 얼마의 원가를 만들고, 어떤 고객이나 기능이 마진을 깨고 있는가?

제품 모델은 다음과 같다.

> Group A는 entry point(진입점), Core Engine은 비용 귀속 레이어, Group B는 paid value(돈을 내는 이유)다.

- Group A: entry point(진입점). token spike(토큰 급증), cache miss(캐시 미스), quota(사용 한도), agent loop(에이전트 반복 호출), provider delay(제공사 지연) 같은 개발자/운영자의 잦은 불편이 adoption(도입)과 onboarding(첫 사용)을 설명한다.
- Core Engine: cost attribution layer(비용 귀속 레이어). 사용량을 customer, feature, model, plan, session, agent run cost로 매핑한다.
- Group B: paid value(유료 가치). Customer profitability(고객별 수익성), plan gross margin(요금제별 매출총이익률), heavy-user loss(많이 쓰는 고객으로 인한 손실), usage-based pricing(사용량 기반 가격), credit pricing(크레딧 가격), CEO/CFO/Board reporting(경영진/이사회 보고)이 회사가 비용을 지불하는 이유를 설명한다.

새 first-run path(첫 실행 경로)는 AI SaaS unit economics(단위경제성) workflow처럼 읽혀야 한다.

1. LLM usage(사용량)를 가져온다.
2. token spike, cache miss 후보, agent loop cost 같은 operational signal(운영 신호)을 요약한다.
3. 비용을 customer, feature, model, plan, session, agent run별로 귀속한다.
4. raw cost(원가), effective cost(실효 비용), plan/customer gross margin(요금제/고객별 매출총이익률)을 이해한다.
5. usage-based, credit, hybrid, cap, overage 같은 pricing choice(가격 선택지)를 시뮬레이션한다.
6. PM, developer, CEO/CFO, Finance용 report(보고서)를 export한다.

headline savings number(대표 절감 숫자)는 여전히 가장 강한 demo artifact(데모에서 공유 가능한 결과물)다. `$287/mo -> $10/mo`, `96.3% savings` 같은 예시는 시각적으로 크게 남겨야 한다. 달라지는 점은 모든 savings claim(절감 주장) 옆에 quality/risk assessment(품질·위험 평가)를 붙여, UI가 "싼 것이 항상 더 좋다"고 암시하지 않게 하는 것이다.

## MVP Scope(MVP 범위)

먼저 만들 surface(화면/기능 표면)는 다음이다.

- Usage input and presets(사용량 입력과 프리셋): RAG chatbot(검색 근거를 붙여 답하는 챗봇), document summary, code generation, customer inquiry classification, report generation.
- Current model vs candidate model comparison(현재 모델과 후보 모델 비교): monthly cost, annual cost, cost/request, customer cost, input/output breakdown.
- Attribution and business unit economics(귀속과 비즈니스 단위경제성): customer, feature, model, plan, session, agent-run cost; cost per customer/report/ticket/job; selling price; gross margin; heavy-user loss.
- Pricing scenarios(가격 시나리오): 사용자가 denominator(분모 기준), selling price(판매가), plan assumptions(요금제 가정)을 제공하는 seat, usage-based, credit, hybrid, cap, overage 가정.
- Savings simulation(절감 시뮬레이션): model switch, prompt caching, batch processing, output token cap, feature-level routing.
- Report generation(리포트 생성): PM summary, developer breakdown, CEO savings summary.

live eval harness integration(실시간 평가 하네스 연결), real benchmark ingestion(실제 벤치마크 수집), price auto-fetch(가격 자동 수집), anomaly detection(이상 탐지), budget time-series alerts(예산 시계열 알림)는 명시적으로 후순위로 미룬다. MVP는 live production truth(실제 운영 사실)를 아는 척하지 않고 assumption(가정)을 분명히 보여줘야 한다.

## File Structure(파일 구조)

- Modify: `src/data/models.ts`
  - static catalog(정적 카탈로그), source URL, verified date(확인일)를 유지한다.
  - source(출처) 없는 benchmark claim(벤치마크 주장)을 모델 행에 넣지 않는다.
- Create: `src/data/workloadPresets.ts`
  - 다섯 use-case preset(사용 사례 프리셋)과 기본 feature mix(기능 비중)를 소유한다.
- Create: `src/data/qualityProfiles.ts`
  - use case/model tier(사용 사례/모델 등급)별 quality score, latency score, risk score, retry rate, review rate, CS escalation rate, tool-call reliability의 수정 가능한 기본 가정을 소유한다.
- Modify: `src/lib/workload.ts`
  - feature-level mix derivation(기능별 비중 계산)을 추가하고 monthly request/token derivation(월 요청/토큰 계산)은 deterministic(결정론적)으로 유지한다.
- Modify: `src/lib/calculator.ts`
  - raw cost calculation(원시 비용 계산)을 token cost의 유일한 경로로 보존한다.
  - optional effective-cost helpers(선택적 실효 비용 helper)는 내부에서 반드시 `calculateCost`를 호출할 때만 추가한다.
- Create: `src/lib/decisionMetrics.ts`
  - quality-adjusted cost(품질 보정 비용), retry cost, review cost, CS cost, latency/risk labels, decision verdicts(결정 판정)를 계산한다.
- Create: `src/lib/savingsLevers.ts`
  - calculator-derived deltas(계산기 기반 차이)와 조건 문구를 함께 사용해 model switch, caching, batch, output cap, feature routing을 순위화한다.
- Modify: `src/lib/format.ts`
  - 기존 formatter(표시 형식 함수)를 재사용한다. 필요한 score/label helper만 추가한다.
- Modify: `src/App.tsx`
  - 화면을 5단계 UX로 재배치하고 새 state field(상태 필드)를 추가한다.
- Create: `src/components/UsageSetup/index.tsx`
  - 첫 섹션: presets, monthly requests, average input/output tokens, feature mix, cacheable share, batchable share.
- Create: `src/components/CurrentCostPanel/index.tsx`
  - 두 번째 섹션: current monthly/annual/request cost와 input/output/cached breakdown.
- Create: `src/components/AlternativeComparison/index.tsx`
  - 세 번째 섹션: current vs candidate cost와 quality/risk/latency/context/tool-call 비교.
- Create: `src/components/SavingsLeverTable/index.tsx`
  - 네 번째 섹션: strategy, cost effect, risk, conditions, recommended use case.
- Modify: `src/components/SummaryCard/index.tsx`
  - 다섯 번째 섹션: role-specific report copy(역할별 보고서 문구)와 source/provenance notes(출처/근거 메모).
- Keep and adapt: `src/components/BudgetGuardrails/index.tsx`
  - core flow(핵심 흐름) 아래로 이동해 operational guardrails(운영 가드레일)로 둔다.

## Data Model(데이터 모델)

assumption-based(가정 기반)임을 명시하는 decision layer(결정 레이어)를 추가한다.

```ts
export type UseCasePresetId =
  | 'rag-chatbot'
  | 'document-summary'
  | 'code-generation'
  | 'customer-inquiry-classification'
  | 'report-generation'

export interface FeatureMixItem {
  id: string
  name: string
  requestShare: number
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  cacheableShare: number
  batchableShare: number
  qualityFloor: number
}

export interface QualityAssumptions {
  qualityScore: number
  latencyScore: number
  riskScore: number
  toolCallReliabilityScore: number
  retryRate: number
  humanReviewRate: number
  csEscalationRate: number
  reviewCostPerRequestUsd: number
  csCostPerEscalationUsd: number
}
```

Score convention(점수 규칙):

- `100`은 label wording(라벨 문구)에 따라 가장 강하거나 우려가 가장 낮다는 뜻이다.
- 점수는 benchmark fact(벤치마크 사실)가 아니라 directional assumptions(방향성 가정)으로 보여준다.
- NaN과 invalid value(잘못된 값)는 shared finite guards(공통 유한값 가드)를 통해 clamp(범위 제한)한다.

## Task 1: Decision Metrics Library

**Files:**
- Create: `src/lib/decisionMetrics.ts`
- Create: `src/lib/decisionMetrics.test.ts`

- [ ] **Step 1: effective cost 실패 테스트 작성**

다음 사례를 다룬다.

- retry rate가 높아지면 effective monthly cost가 증가한다.
- human review와 CS escalation 비용이 포함된다.
- quality/risk/latency score는 `0..100`으로 clamp된다.
- NaN input은 안전한 zero assumption으로 렌더된다.
- helper가 token price math를 중복하지 않고 `calculateCost`를 호출한다.

- [ ] **Step 2: `calculateDecisionMetrics` 구현**

다음을 노출한다.

- `rawMonthlyCost`
- `effectiveMonthlyCost`
- `retryCost`
- `humanReviewCost`
- `csEscalationCost`
- `costPerSuccessfulRequest`
- `qualityLabel`
- `latencyLabel`
- `riskLabel`
- `verdict`

- [ ] **Step 3: focused tests 실행**

Run: `npm run test:run -- src/lib/decisionMetrics.test.ts`

Expected: 모든 decision metric 테스트가 통과한다.

## Task 2: Workload Presets And Feature Mix

**Files:**
- Create: `src/data/workloadPresets.ts`
- Create: `src/data/workloadPresets.test.ts`
- Modify: `src/lib/workload.ts`
- Modify: `src/lib/workload.test.ts`

- [ ] **Step 1: 다섯 preset 추가**

Presets:

- RAG chatbot
- Document summary
- Code generation
- Customer inquiry classification
- Report generation

각 preset은 monthly request defaults, average input/output tokens, feature mix, cacheable share, batchable share, default quality floor를 포함해야 한다.

- [ ] **Step 2: feature mix에서 monthly usage 계산**

feature shares(기능 비중)를 monthly input tokens, output tokens, cacheable tokens, batchable requests로 바꾸는 deterministic helper를 추가한다.

- [ ] **Step 3: share math 검증**

Run: `npm run test:run -- src/data/workloadPresets.test.ts src/lib/workload.test.ts`

Expected: feature shares가 안전하게 합산되고, preset이 바뀌면 계산된 token totals가 갱신된다.

## Task 3: Savings Lever Ranking

**Files:**
- Create: `src/lib/savingsLevers.ts`
- Create: `src/lib/savingsLevers.test.ts`

- [ ] **Step 1: lever ranking 실패 테스트 작성**

다음을 다룬다.

- candidate cost delta가 가장 크면 Model switch가 1위가 될 수 있다.
- Prompt caching은 cacheable share가 0보다 클 때만 적용된다.
- Batch processing은 real-time suitability(실시간 적합성)가 낮아질 수 있음을 경고한다.
- Output token cap은 answer quality(답변 품질) 저하 가능성을 경고한다.
- Feature routing은 implementation complexity(구현 복잡도)를 포함한다.

- [ ] **Step 2: 다섯 fixed MVP lever 구현**

Rows:

| Strategy | Risk | Recommended use |
|---|---|---|
| Model switch | Quality degradation possible(품질 저하 가능) | Classification, summary, simple extraction |
| Prompt caching | Requires repeatable prompt patterns(반복 가능한 프롬프트 패턴 필요) | RAG system prompts, fixed policy blocks |
| Batch processing | Lower real-time responsiveness(실시간 응답성 저하) | Nightly analysis, bulk reports |
| Output token cap | Answer quality can degrade(답변 품질 저하 가능) | Internal summaries, log analysis |
| Feature-level routing | Higher implementation complexity(구현 복잡도 증가) | Operational AI apps with mixed features |

- [ ] **Step 3: fake certainty(가짜 확신) 방지 검증**

테스트는 모든 lever에 `conditionText`와 `riskText`가 있음을 assert해야 한다.

Run: `npm run test:run -- src/lib/savingsLevers.test.ts`

## Task 4: Five-Step UX Shell

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/UsageSetup/index.tsx`
- Create: `src/components/CurrentCostPanel/index.tsx`
- Create: `src/components/AlternativeComparison/index.tsx`
- Create: `src/components/SavingsLeverTable/index.tsx`
- 각 신규 컴포넌트 옆에 테스트를 만든다.

- [ ] **Step 1: 화면 순서 재배치**

Order:

1. Usage setup
2. Current cost
3. Alternative comparison
4. Savings lever recommendation
5. Report output

Budget Guardrails는 core flow 아래에 유지한다.

- [ ] **Step 2: savings를 크게 유지하되 companion signal을 붙이기**

Alternative comparison은 다음을 보여야 한다.

- monthly delta
- annual delta
- percentage savings
- quality score
- latency score
- risk score
- context window difference
- tool-call reliability assumption

- [ ] **Step 3: state update 검증**

컴포넌트 테스트는 `rerender` 또는 user events를 사용해 model, preset, cache rate, batch rate, output cap이 바뀔 때 값이 갱신됨을 증명해야 한다.

Run: `npm run test:run -- src/components/UsageSetup src/components/CurrentCostPanel src/components/AlternativeComparison src/components/SavingsLeverTable`

## Task 5: Report Output

**Files:**
- Modify: `src/components/SummaryCard/index.tsx`
- Modify: `src/components/SummaryCard/SummaryCard.test.tsx`

- [ ] **Step 1: role-specific report modes 추가**

Modes:

- PM: trade-off summary와 rollout recommendation.
- Developer: assumptions, breakdown, lever conditions.
- CEO: monthly/annual savings, confidence/risk note, budget impact.

- [ ] **Step 2: translation protection 유지**

Keep:

- English summary text 주변의 `lang="en"`.
- model name, brand name, numeric report output 주변의 `translate="no"` 필요 보호.

- [ ] **Step 3: provenance(출처/근거) 추가**

Report는 다음을 포함해야 한다.

- model price source links
- last verified dates
- quality/risk values가 user-editable assumptions라는 메모

Run: `npm run test:run -- src/components/SummaryCard/SummaryCard.test.tsx`

## Task 6: Pricing Catalog Trust

**Files:**
- Modify: `src/data/models.ts`
- Modify: `src/data/models.test.ts`
- Optionally create: `src/data/models.json` only if the app already has a clean import path for JSON data.

- [ ] **Step 1: pricing provenance 표시 유지**

모든 model row는 다음을 가져야 한다.

- `sourceUrl`
- `sourceLabel`
- `lastVerifiedAt`
- `supportsCaching`
- `supportsBatch`

- [ ] **Step 2: MVP에서 live prices를 fetch하지 않기**

visible provenance(보이는 출처)가 있는 static data를 사용한다. Live fetch는 provider별 가격 페이지가 다르고 network, parsing, trust complexity를 추가하므로 후순위다.

- [ ] **Step 3: catalog completeness 검증**

Run: `npm run test:run -- src/data/models.test.ts`

## Task 7: Final Verification

**Files:**
- All changed files.

- [ ] **Step 1: full test suite 실행**

Run: `npm run test:run`

Expected: 모든 테스트가 통과한다.

- [ ] **Step 2: production build 실행**

Run: `npm run build`

Expected: Vite build가 성공한다.

- [ ] **Step 3: manual smoke**

Run: `npm run preview`

Check:

- RAG chatbot preset이 usage와 cost를 갱신한다.
- Candidate model switch가 savings number를 계속 눈에 띄게 보여준다.
- Quality/risk panel이 savings 옆에 계속 보인다.
- Cache와 batch lever가 conditional text를 보여준다.
- PM/developer/CEO report가 서로 다른 summary를 만든다.

## Acceptance Criteria(수용 기준)

- 첫 화면은 사용자가 모델을 보기 전에 service usage(서비스 사용량)를 입력하도록 안내한다.
- Current cost와 candidate cost는 같은 calculator path를 사용한다.
- Savings는 risk/quality companion signal 없이 표시되지 않는다.
- lever table은 다섯 MVP lever를 모두 순위화하고 각각 언제 쓰는지 설명한다.
- Reports는 source 없는 benchmark truth(근거 없는 벤치마크 사실)를 암시하지 않고 공유 가능해야 한다.
- Pricing provenance와 verified dates가 계속 보인다.
- 커밋 전 full test suite와 production build가 통과한다.
