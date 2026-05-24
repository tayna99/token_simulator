# PRD: AgentPayroll (LLM Cost Simulator)

부제: **AI SaaS Cost · Margin · Pricing Decision Workspace**
문서 버전: 2.5 (복구 + 부트캠프 검증 + 모델 카탈로그 갱신) · 2026-05-24
상태: Draft · 작성: 제품팀
독자: 내부(PM/Eng/Design) + 외부(투자자/스폰서)

> 이 PRD는 `C:\token_simulator/` 코드베이스에 실제로 구현된 기능 — `src/lib/calculator.ts` 단일 계산 경로, 45종 모델/레이더 카탈로그, CSV 사용 기록 임포트, 6축 비용 귀속, 마진 엔진, 가격 시나리오 시뮬레이션, AI 팀 설계, 5단계 인입 게이트, 11종 운영 분석 에이전트, Read-only Capability Tools 23종, Front Operating System context, Supervisor Synthesis, 2-ledger 결정 저장소, 역할별 리포트 — 를 기준으로 정리한 정본이다. 기존 `docs/PRD.md`(v1.0)는 product narrative 중심, 본 v2.x는 **구현 사실 ↔ 제품 가치** 매핑 중심. v2.1에서 아키텍처 다이어그램과의 1:1 정합성 보강(§9 전면 재작성).

---

## 1. 요약 (TL;DR)

AgentPayroll은 LLM을 매출 원가(COGS)로 쓰는 AI SaaS 팀과 1인 창업자를 위한 **비용·마진·가격 결정 워크스페이스**다. 사용자는 두 진입점 중 하나로 들어온다. 운영 중인 팀은 LLM 호출 로그(CSV)를 올려 고객·기능·모델·요금제·세션·에이전트 작업 단위로 원가를 쪼개고, 마진과 손해 고객을 보고, 가격 시나리오를 비교한다. 설계 단계의 1인 창업자는 회사 유형과 업무를 선택해 9종 AI 팀원에 배정하고, 한 달 비용 예측과 병목, 절감안과 주의 카드를 받는다. 두 경로 모두 결정은 운영 일지에 이유·가정·근거와 함께 저장된다.

핵심은 *"토큰 얼마 썼나"* 가 아니라 *"이 AI 기능/팀이 돈이 남는가, 가격을 어떻게 바꿔야 하는가"* 에 답한다는 것이다. 숫자는 결정론 엔진(`calculator.ts`)이 정확히 계산하고, 해석·추천은 LangGraph 에이전트가 돕되 숫자는 절대 만들어 내지 않는다.

- 한 줄 (Founder 언어): **AI 팀 급여명세서 — 이번 달 AI 팀이 한 일과 그 비용.**
- 한 줄 (분석가 언어): **AI SaaS의 사용 기록을 고객·기능·요금제별 원가·마진·가격 결정으로 바꾸는 워크스페이스.**
- 한 줄 (투자자 언어): **Observability와 Billing 사이의 빈 레이어 — LLM 사용량을 비즈니스 판단으로 번역.**

---

## 2. 배경과 문제

### 2.1 시장 변화
AI 기능이 들어간 SaaS에서 LLM 비용은 단순 운영비가 아니라 매출 원가(COGS)다. 전통 SaaS는 고객이 많이 써도 한계비용이 낮지만, AI SaaS는 요청 수·입출력 토큰·재시도·모델 선택에 따라 원가가 계속 변한다. 많이 쓰는 고객일수록 손해 고객이 될 수 있고, 정액제 가격은 마진을 빠르게 깎는다.

### 2.2 지금 팀들이 할 수 없는 것
OpenAI/Anthropic 콘솔이나 Helicone, Langfuse 같은 observability 도구는 **총액과 토큰 수**까지만 보여 준다. 그 비용이 어떤 고객·기능·요금제의 원가인지, 이익을 얼마나 깎는지, 가격을 바꿔야 하는지, 어떤 모델로 바꾸면 라이브 품질이 깨지는지는 잇지 못한다.

검증된 Top Pain:
1. AI 기능이 gross margin을 얼마나 깎는지 모른다.
2. 많이 쓰는 고객이 오히려 손해 고객이 된다.
3. 비용은 종량인데 가격은 정액제라 마진이 깨진다.
4. (1인 창업자) 운영 시작도 전에 "이 AI 팀 구성으로 한 달에 얼마 들지, 어디서 사고 날지, 사람이 어디서 확인해야 할지" 모른다.

### 2.3 빈 시장
Observability(Helicone/Langfuse) — Billing(Stripe/Metronome) — FinOps(CloudZero) 사이에서 **"LLM 사용량 → 고객·기능·요금제별 원가 → 이익·수익성 → 가격 결정 → 경영진 설명"** 으로 잇는 레이어가 비어 있다. 본 제품은 그 자리를 점유한다.

### 2.4 2026년 시장 신호 (I/O 2026 기준)
2026-05-19 Google I/O 2026에서 발표된 다음 신호들은 본 제품의 포지셔닝을 *시장이 따라오고 있다*는 방향으로 강화한다:

- **Gemini 3.5 / Gemini Spark / Google Antigravity** — "에이전트가 사용자 대신 일한다"는 메시징의 메인스트림화. 우리 "AI 팀 급여명세서" 비유와 동일 프레임.
- **Co-Scientist (멀티 에이전트)** — 우리 `stage_committee` / `all_hands` 라우팅과 같은 패러다임이 업계 표준으로 굳어지는 중. PRD §9.4 라우팅 모드 정당화.
- **AI Ultra ($100/mo)** — 신규 구독 등급. 우리 가격 시나리오(flat/usage/credit/hybrid/cap/overage)에 *competitor benchmark* 축이 없다는 갭이 드러남 → P1 항목으로 끌어올림.
- **Gemini Omni Flash (비디오 생성)** — 멀티모달 비용 모델링이 *언제 옵션이 아니라 필수가 되는지*의 기점. §9.11 신설.

반대로 동일 발표가 드러낸 우리 약점: **신규 발표를 캐치하는 자동 모니터링이 부재했다.** 5/19 발표가 PRD 갱신 직후(5/23)에도 5일간 반영되지 않았던 이유는 모델 카탈로그 신선도를 추적하는 게이트가 없었기 때문이다. v2.2에서 `scripts/research/check-provider-pricing.mjs` 신설로 보강(§9.12).

---

## 3. 목표와 비목표

### 3.1 목표 (Goals)
- 사용자가 자기 AI 사용을 **업무/팀원/기능 단위로 구조화**하게 한다.
- LLM 사용량을 **6축(고객·기능·모델·요금제·세션·agent-run)** 으로 쪼개 보여 준다.
- **마진, 손해 고객, 가격 시나리오**를 판단 가능한 숫자와 문장으로 제공한다.
- 모든 결정을 **이유·가정·근거와 함께 운영 일지**에 기록해 재검토 가능하게 한다.
- 계산은 결정론, 해석은 AI — 두 레이어를 분리해 환각으로 인한 오결정을 차단한다.
- 외부 자동번역(Chrome 등)이 숫자/모델명을 깨뜨리는 회귀를 방어한다(2026-04-22 라운드 1에서 학습한 규칙).

### 3.2 비목표 (Non-Goals)
- 무제한 실시간 예산/쿼터 가드레일, Slack/Email 알림 난사 — Margin Guard는 결정 필요한 4종 알림으로만 제한(§12).
- Gateway/Proxy 자동 라우팅 — SDK-lite 이후 선택형 고급 모드로 후순위.
- Observability 자체(트레이스 수집) 대체 — 우리는 export를 받아 *비즈니스 판단*으로 번역하는 레이어.
- Billing 집행(과금) — 가격 *결정*을 돕고 집행은 Stripe 등이.
- AI가 숫자를 직접 계산하거나 사람 대신 최종 결정 — 헌법(§9.1)에서 금지.

---

## 4. 타깃 사용자 & 페르소나

| 구분 | 대상 | 원하는 것 | 화면에서 만나는 곳 |
| --- | --- | --- | --- |
| 주 구매자 | Founder/CEO/CFO | 고객별 손익, 남는 돈, 가격 결정, 보고 자료 | RoleSelector → CEO 모드, SummaryCard, 1장 리포트 |
| 주 사용자 | AI SaaS 개발자/백엔드/ML | 사용 기록 올리기, 비용 쪼개기, 모델/캐싱/라우팅 판단 | UsageImportPanel, CostAttribution, MigrationPanel |
| 보조 사용자 | PM, RevOps, CS | 기능별 원가, 출시 판단, 고객별 비용 설명 | FeatureCostBreakdown, FeatureUnitEconomicsPanel |
| 1인 창업자(Wedge A) | 혼자 AI 팀 굴리는 사람 | 설계 시점 비용 예측, 사람 확인 지점, 주의 카드 | TeamDesignerPanel, AITeamSpecPanel, OptimizationReviewPanel |

두 진입점(Wedge)은 같은 결정론 엔진을 공유한다.

| | Wedge A (설계 시점) | Wedge B (운영 후) |
| --- | --- | --- |
| 입력 | 회사 유형 · 업무 빈도 · I/O 가정 | 실제 사용 CSV (SparkClaw 샘플 포함) |
| 산출 | 팀 설계 · 비용 예측 · 주의 카드 | 손익 진단 · 가격 시나리오 · 리포트 |
| MVP 우선순위 | **P0 (데모)** | P1 (실측 검증) |

---

## 5. 핵심 가치 (Core Value Proposition)

1. **숫자는 정확, 해석은 AI.** 모든 비용은 `src/lib/calculator.ts`의 `calculateCost`/`calculateMigrationDelta` 단일 경로를 통과하고, 모든 표시 숫자는 `src/lib/format.ts`를 통과한다. AI 에이전트(LangGraph)는 그 결과 snapshot을 받아 설명·추천만 한다 — 자체적으로 숫자를 만들지 않는다.
2. **사용 기록 → 비즈니스 판단의 단일 흐름.** 토큰 단위 raw cost로 끝나지 않고, 고객별 마진, 손해 고객, 가격 시나리오, 역할별 리포트까지 같은 입력으로 같은 값이 나오게 페르소나 간 일관성을 강제한다.
3. **결정의 추적 가능성.** 모든 결정은 운영 일지에 이유·가정 스냅샷·근거(tool ref)·주의 카드·평가 결과와 함께 저장되며, 내보내기·삭제할 수 있다.
4. **두 진입점, 한 시스템.** 설계 단계 1인 창업자와 운영 단계 SaaS 팀이 같은 코어를 다른 입구로 만난다.
5. **자동번역 방어.** Chrome 자동번역이 모델명·숫자를 깨뜨리는 회귀를 막기 위한 `translate="no"`, `lang="en"`, `<meta google notranslate>` 규칙이 헌법화돼 있다.

---

## 6. 사용자 흐름 (제품 척추)

앱은 화면 묶음이 아니라 단계별 **결정 흐름**이다. 각 단계는 "다음으로 넘어갈 수 있나?"로 끝난다. App의 `DECISION_STAGES`에 코드로 박혀 있다.

```
Design (팀 짜기) → Cost (비용 보기) → Bottleneck (새는 곳) → Optimize+Risk (줄이기+주의) → Decision Log (기록)
```

### 6.1 Wedge B (운영 후, SaaS 팀) — 6단계
1. **사용 기록 가져오기.** CSV 업로드/붙여넣기/SparkClaw 샘플 로드. 필수 컬럼: `timestamp, feature, model, input_tokens, output_tokens` (선택: `customer_id, plan_id, session_id, agent_run_id, total_cost, latency_ms, status`).
2. **운영 문제 요약.** 토큰 스파이크, 캐시 미스 후보, agent loop 비용 폭증을 `operationalSignals`가 자동 요약.
3. **비용 귀속.** 같은 import를 6축으로 roll-up (`attribution.ts`).
4. **마진과 손해 고객.** 사용자가 입력한 요금제별 매출/고객 매출과 결합해 plan margin, customer profitability, heavy-user concentration 계산.
5. **가격 시나리오.** 정액제/쓴 만큼/충전식/하이브리드/상한/초과 비교 (`pricingScenario.ts`).
6. **리포트.** 개발자용 / PM용 / CEO·CFO 1장 / 이사회용 4종, html-to-image + jspdf로 export.

### 6.2 Wedge A (설계 시점, 1인 창업자) — 9단계 데모
회사 유형 → 업무 선택 → 9종 AI 팀원에 배정 → 빈도·문서량 입력 → 비용 예측 → 병목 탐지 → 줄이기 + 주의 카드 → before/after 비교 → 운영 일지 기록. App의 `TEAM_COST_DEMO_STEPS`에 그대로 박혀 있다.

---

## 7. 기능 요구사항 (구현 현황 기준)

> 범례: 🟢 구현 완료 · 🟡 부분 구현 · ⚪ 계획

### 7.1 P0 — MVP (현재 출시 상태)

**모델 카탈로그 & 결정론 계산 엔진** 🟢
- 20개 provider/model source(OpenAI, Anthropic, Google, xAI, Microsoft, Meta, Mistral, DeepSeek, Alibaba, Moonshot, Cursor, Z.ai/GLM, MiniMax, ByteDance, Baidu, Tencent, StepFun, 01.AI, Baichuan, SenseTime), 45종 모델/레이더 entry. 각 모델은 input/output 단가, context window, release date, cache discount, batch discount, source URL, lastVerifiedAt, `pricingStatus` 보유.
- `calculateCost(input)` → monthlyCost, annualCost, inputCost/outputCost, cached/uncached split, costPerRequest, cacheSavings, batchSavings.
- `calculateMigrationDelta(current, candidate)` → monthlyDelta, annualDelta, savingPercent.
- NaN/음수/비유한 입력은 0으로 클램프, ratio는 [0,1]로 클램프.

**사용 기록 임포트 (Wedge B)** 🟢
- `UsageImportPanel` — CSV 업로드/붙여넣기/SparkClaw 샘플.
- `usageImport.ts` — 필수 컬럼 검증, 행 단위 에러 카운트, snapshot ref 생성.
- 6축 attribution (`customer`, `feature`, `model`, `plan`, `session`, `agent_run`).

**운영 신호 요약** 🟢
- `operationalSignals.ts` + `OperationalSignalSummary` — 토큰 스파이크, 캐시 미스 후보, agent loop 비용 폭증 요약.

**마진 엔진** 🟢
- `margin.ts` — plan margin row, customer margin row, heavy-user detection.
- `unitEconomics.ts`, `businessMetrics.ts`, `effectiveCost.ts` — 비즈니스 기준값(월 고객 수, 보고서 수, 1건당 판매가) 입력 후 `cost per ticket/report/customer` + gross margin 계산.
- Raw cost vs Effective cost (raw + 재시도 + 사람 검수 + CS 에스컬레이션) 분리.

**가격 시나리오** 🟢
- `pricingScenario.ts` — flat / usage-based / credit / hybrid / cap / overage 비교.
- `BreakevenAnalysis`, `ROICalculator`, `SLACostCalculator`, `SavingsPaybackTimeline`.

**AI 팀 설계 (Wedge A) — 사용자가 짜는 9종 AI 팀** 🟢
- 9종 AI 팀원 카탈로그 (`agentCatalog.ts`): research, PM, design, engineering, marketing, sales, CS, ops, finance-legal. 각 팀원에 inputs/outputs/assignedTasks/humanReviewGate 정의.
- `CompanyWorkInputPanel` — 회사 유형/단계/예산/locale + 8종 표준 업무(market research, PRD writing, UX, code, marketing, CS, cold email, meeting notes) 빈도 입력.
- `AITeamSpecPanel`, `TeamDesignerPanel` — 업무 → AI 팀원 매핑.
- `estimateAgentWorkload.ts` — 빈도·문서량 → 월 호출 수·토큰 → 비용 (calculator 호출).
- **주의**: 이 9종은 *사용자가 자기 회사용으로 짜는 AI 팀원*이며, 아래 §7.1의 "11 운영 분석 에이전트"(제품 백엔드의 분석 일꾼들)와 다른 개념이다.

**데이터 인입 보안 & 신뢰성 게이트** 🟢
- `DataIntakePolicy` (`dataIntakePolicy.ts`): `allowRawPrompt: false`, `allowPiiByDefault: false`, `allowedFileTypes: ['csv','jsonl']`, `maxFileSizeMb: 10`, `retentionDays: 30`, `requiredColumns: ['timestamp','feature','model','input_tokens','output_tokens']`.
- `inspectUsageImportSecurity` (`securityMiddleware.ts`) — 4단계 검사: ① raw prompt 컬럼 검출 → ② API key 후보 검출 → ③ PII 후보 검출 → ④ 스키마(plan_id/customer_id/revenue) 누락 검출. 결과는 `ready / needs_mapping / blocked` 3-status + `anonymizationStatus` + `analysisScope.{available,blocked}` + 30일 보관 안내.
- 8종 `TrustWarning`: raw_prompt_detected, pii_candidate_detected, api_key_candidate_detected, schema_mapping_required, plan_id_missing, customer_id_missing, revenue_missing, retention_policy_unconfirmed.
- `ImportTrustCheckPanel` — 사용자에게 검사 결과·차단 사유·필요한 매핑을 화면에 노출.

**11종 운영 분석 에이전트 (Agent-as-Tool, 백엔드)** 🟢
- `OperatingAgentId` 11종 (`operatingAssets.ts`): provider_api_intelligence, model_inference_research, cost_modeling, usage_data_ingestion, cost_engine_qa, optimization_routing, customer_diagnostic_pricing, pricing_revenue_ops, trust_security_compliance, finance_ops, knowledge_release_ops.
- 각 에이전트는 `AGENT_TOOL_PERMISSION_MATRIX`로 허용된 Read-only Capability Tools만 호출 가능(총 23종, agent별 allow-list).
- 10종 `OperatingAsset`(provider_registry, model_perf_matrix, cost_formula_registry, usage_schema_mapping, calculation_snapshots, optimization_playbook, pricing_policy_library, customer_cost_review, security_runbook, operating_ledger)을 소유.
- `AgentRunInput.frontOperatingSystem`을 통해 ICP scorecard, self-assessment, data readiness gate, sample report, offer ladder, approval matrix, learning loop context가 같은 `POST /api/agent/run` payload에 포함된다.
- Python `build_agent_tools()`는 `retrieve_front_operating_system`, `retrieve_front_operating_assets`, `retrieve_front_operating_gate`, `retrieve_learning_loop_records` 4종 front operating read-only tool을 제공한다. stage committee와 all-hands는 같은 `create_agent` 호출 안에서 이 앞단 운영 자산을 조회한다.

**병목 탐지 & 최적화 추천** 🟢
- `bottleneckAnalysis.ts` — 가장 비싼/취약한 agent · task 추출.
- `optimizationPolicies.ts` — 모델 교체, 캐싱, 배치, 출력 제한, 라우팅 후보를 calculator 기반 delta로 랭킹.
- 각 추천마다 `riskCards.ts`에서 주의 카드 자동 부착(영향·조건·안전망·근거 ID).

**역할별 리포트** 🟢
- `RoleSelector` — Developer / PM / CEO.
- `SummaryCard` (lang="en", cardRef export) → html-to-image PNG + jspdf PDF.
- `reportArtifacts.ts` — one-page report + 풀 리포트 빌더.
- `DecisionSummaryStrip` — 화면 상단 1줄 요약.

**운영 일지 (Decision Log)** 🟢
- `decisionLog.ts` — 결정·이유·가정 스냅샷·tool ref·risk card ref·평가 보고 메타데이터 저장.
- `decisionStore.ts` (local + 선택적 remote) — workspace ID 기반 영속.
- 삭제, JSON 내보내기(`exportDecisionLogFileName`).

**LangGraph / Python LangChain 에이전트 해석 레이어** 🟢
- `@langchain/langgraph` 1.3.2 기반.
- `agentRuntime.ts`, `agentRunRuntime.ts`, `serverAgentRuntime.ts`, `teamCostAgentRuntime.ts`, `teamCostGraph.ts`, `teamCostRouter.ts`, `toolContract.ts`.
- `buildAgentSnapshot.ts` — 결정론 결과와 `frontOperatingSystem` context를 snapshot으로 묶어 에이전트에 전달.
- `approvalGate.ts` — 사람 승인 게이트.
- LLM 미구성 시 `deterministic-fallback` 모드로 동작.
- 옵션 백엔드: `agent_service/` (Python LangChain `create_agent`, Stage Router, 23 read-only tools).

**디자인 시스템 & UX** 🟢
- Wanted Montage(WDS) — 인터랙션 색 `#0066FF` 단일, 12px 카드, Pretendard(UI)/Wanted Sans(마케팅).
- 3-pane 콘솔(좌: 단계·팀원, 중: 결정론 표/차트, 우: AI 해석 + 근거).
- i18n: 한국어/영어 (`react-i18next`).

**번역 방어 & 포맷 일관성** 🟢
- `<meta name="google" content="notranslate" />`, root `<div translate="no">` 유지.
- 영어 텍스트 블록은 `lang="en"`.
- 모든 숫자는 `fmtCurrency`, `fmtPercent`, `fmtTokens`, `fmtDelta`, `fmtPricePerMillion` 통과.
- 컴포넌트 내 inline `toLocaleString`/`toFixed` 금지.

**테스트 & 품질 게이트** 🟢
- Vitest 4 + Testing Library 16. `src/lib/` 순수 함수 100% 커버리지 정책.
- 컴포넌트 테스트는 `rerender`로 state sync 검증(라운드 1에서 학습).
- TDD: 실패 테스트 → 최소 구현 → 통과.

### 7.2 P1 — 실측 + 반복 (다음 분기)
- Plan vs Actual 보정(예측 대비 실제 사용 차분), 주간/월간 자동 리포트 🟡 (`p1OperatingSystem.ts` 일부 구현).
- 얇은 서버 백엔드(`api/`, `server/`, `agent_service/`) — 키 보관·영속·반복 리포트. `kvStore.ts`, `p1ApiHandlers.ts`, `teamCostApiHandlers.ts` 골격 있음.
- 멀티 워크스페이스(`workspace-${uuid}` 기반) 🟡.
- 신뢰성 검증: `ImportTrustCheckPanel`, `securityMiddleware`, `dataIntakePolicy` 🟡.

### 7.3 P2 — 확장 ⚪
- SDK-lite 자동 수집, Helicone/Langfuse import.
- Gateway/Proxy는 선택형 고급 모드로 별도 보안·장애·신뢰 계획 후 진행.
- Stripe/Metronome 연동.
- 이사회 패키지 export.
- 지속 수익성 모니터링.
- 리서치 게이트 통과 시 예산/쿼터 알림 재도입.

---

## 8. UX & 디자인 원칙

- **두 surface, 한 시스템.** 앱=제품 surface(고밀도 3-pane 콘솔), 랜딩=마케팅 surface(저밀도, Wanted Sans).
- **3-pane 콘솔.** 좌측(단계 네비 + AI 팀원), 중앙(결정론 입력·표·차트), 우측(AI 해석 + 근거 칩 + 주의 카드 + 결정 버튼).
- **숫자/해석 시각 분리.** 숫자는 단단한 표·타일(`format.ts` 통과), AI 해석은 callout + "근거" 칩. 근거 없는 AI 문장은 렌더 금지.
- **5종 상태 카드.** 빈 화면/샘플 · 가정 기반 추정 · 예상 vs 실제 · 결정 후 · 실패(fallback 명시).
- **쉬운 말 우선.** `docs/TERMINOLOGY.md` — 화면은 "AI 팀원", "이번 달 비용", "남는 돈", "주의할 점", "운영 일지". 전문용어(deterministic, gross margin, agent-run)는 코드·문서에만.

---

## 9. 시스템 아키텍처 & 기술

### 9.1 절대 원칙 (헌법 §9.1)
> **계산은 결정론 엔진(TypeScript 순수 함수), 해석은 AI.**
> AI는 숫자를 만들지 않는다. AI가 출력하는 모든 수치는 도구(=단일 계산 경로) 결과의 인용이며 근거 칩이 붙는다. 최종 결정은 사람이 한다(승인 게이트).

### 9.2 전체 데이터 흐름 (5단계 인입 게이트 → 결정론 코어 → 에이전트 해석 → 사람 결정 → 2-ledger 저장)

```
Customer CSV/Export
   ↓ [Gate 1] Data Intake Policy (no raw prompt, no PII default, csv/jsonl, ≤10MB, 30일 보관)
   ↓ [Gate 2] Security Middleware (validate → API key scan → PII scan → schema health) → ready|needs_mapping|blocked
   ↓ [Gate 3] Normalized Usage Table (6축 attribution 가능한 단일 행 셋)
   ↓ [Gate 4] React 3-pane Workspace · Stage Router (Design / Cost / Bottleneck / Optimize / Decision Log)
   ↓ [Gate 5] TS Deterministic Snapshot (cost · margin · flags · refs · policy · version)
   ↓ POST /api/agent/run (structured input, 숫자 필드 없음)
       ↓ Python Stage Router — 3 모드: stage_committee | single_agent | all_hands
           ↓ Bounded Parallel Runner (stage_committee 최대 3 에이전트 cap)
               ↓ 11 Operating Agents (Agent-as-Tool, 각자 권한 매트릭스로 도구 화이트리스트)
                   ↓ Read-only Capability Tools (5 카테고리, 16종)
       ↓ Supervisor Synthesis (summary · disagreements · readiness · next questions)
   ↓ Right AI Panel (해석 + 근거 칩 + 주의 카드)
   ↓ Human Decision: Adopt / Reject / Supersede(=Hold) / Export
   ↓ Ledger Writer (append-only metadata)
       → Decision Ledger (사용자 결정: adopted/rejected/superseded × OperatingDecisionKind 6종)
       → Operating Ledger (운영 결정 + 자산 ref)
   → Snapshot Store + Ledger Store → 다음 사이클에서 Read-only Tools가 재인용
```

### 9.3 5단계 인입 게이트 (상세)

| Gate | 책임 모듈 | 입력 | 출력 | 차단 조건 |
| --- | --- | --- | --- | --- |
| 1. Data Intake Policy | `features/trust/lib/dataIntakePolicy.ts` | 사용자 업로드 시도 | 허용 여부 + 정책 메타 | 파일 타입/크기/raw prompt 허용 안 됨 |
| 2. Security Middleware | `features/trust/lib/securityMiddleware.ts` | rawCsv + scope | `TrustInspectionResult` (3-status) | `raw_prompt_detected` · `api_key_candidate_detected` → blocked |
| 3. Normalized Usage Table | `features/usage/lib/usageImport.ts` + `attribution.ts` | 검증된 CSV | 6축(customer/feature/model/plan/session/agent_run) roll-up 가능한 행 셋 | 필수 컬럼 미충족 |
| 4. Stage Router | `app/App.tsx` `DECISION_STAGES` | 사용자가 현재 보고 있는 stage | `activeStage` | — (선택 UI) |
| 5. Deterministic Snapshot | `features/agent/lib/buildAgentSnapshot.ts` | toolResults + threshold/risk/benchmark/decision history + factSources + operatingAgents + operatingAssets + providerRegistry + modelPerfMatrix + operatingLedger + trustInspection | `AgentSnapshotPayload` (16+ 필드, `snapshotVersion: snapshot:<stage>:<stableHash>`, `formulaVersion: cost_formula_v0.3`, `providerRegistryVersion: provider_registry_v0.4`) | — (해시 안정성 보장) |

> 어느 한 게이트라도 차단되면 에이전트 호출은 일어나지 않는다. Gate 2가 blocked이면 `stage_committee`/`single_agent` 모드는 자동으로 `trust_security_compliance + usage_data_ingestion + cost_engine_qa`로 강제 라우팅되어 사람이 먼저 검토할 수 있다(`all_hands`만 우회 가능).

### 9.4 에이전트 라우팅 (Python Stage Router 3 모드)

`agent_service/agentic_runtime.py` `route_operating_agents` 정의.

| 모드 | 동작 | 사용처 |
| --- | --- | --- |
| `stage_committee` (기본) | 현재 stage의 default route(에이전트 3명)를 호출, primary + 최대 3명 cap | 일반 사용자 흐름 |
| `single_agent` | 특정 에이전트 1명만 호출 | "이 결정만 다시 검토" 같은 좁은 질의 |
| `all_hands` | 11명 전원 호출 + 신뢰 게이트 우회 허용 | 사고 조사 · 라이브 이슈 · 감사 |

기본 stage → 에이전트 매핑 (`STAGE_AGENT_ROUTES`):
- **design**: usage_data_ingestion · provider_api_intelligence · cost_engine_qa
- **cost**: cost_modeling · cost_engine_qa · finance_ops
- **bottleneck**: customer_diagnostic_pricing · usage_data_ingestion · cost_engine_qa
- **optimize**: optimization_routing · model_inference_research · trust_security_compliance
- **decision-log**: knowledge_release_ops · finance_ops · pricing_revenue_ops

### 9.5 Read-only Capability Tools (5 카테고리, 16종)

에이전트는 *Read-only*로만 호출할 수 있고, 어떤 도구도 결정론 수치를 새로 계산하지 않는다. 모두 `_envelope(tool_name, refs, found, data, warnings)` 형식으로 응답하며 `refs`가 비면 근거 부재로 표시된다.

| 카테고리 | 도구 | 의미 |
| --- | --- | --- |
| **snapshot** | `lookup_snapshot_value`, `list_available_tool_refs` | TS Deterministic Snapshot 값 인용 |
| **policy / flags** | `retrieve_threshold_policy`, `retrieve_metric_flags` | 임계치/플래그(조정 가능 정책) |
| **risk / benchmark** | `retrieve_risk_cards`, `retrieve_benchmark_evidence` | 주의 카드, 벤치마크 evidence |
| **decision / ledger** | `retrieve_decision_history`, `retrieve_operating_ledger` | 과거 결정·운영 기록 |
| **assets / registry** | `retrieve_fact_sources`, `retrieve_operating_assets`, `retrieve_operating_asset`, `retrieve_operating_agent_profile`, `route_operating_agents`, `retrieve_provider_registry`, `retrieve_model_perf_matrix`, `compose_report_outline` | 자산·제공자·모델 메타·라우트 미리보기·리포트 outline |

격리 정책: `AGENT_TOOL_PERMISSION_MATRIX`가 에이전트별 허용 도구 화이트리스트를 정의한다(예: `cost_modeling`은 snapshot + threshold + metric flags만, `trust_security_compliance`는 risk + assets + ledger만). 미허용 도구 호출은 거부된다.

### 9.6 Supervisor Synthesis (AgentRunResponse 계약)

에이전트들의 출력은 Supervisor가 모아 단일 응답으로 합친다. 우측 패널은 이 필드들을 그대로 렌더한다.

| 필드 | 의미 |
| --- | --- |
| `supervisorSummary` | 호출된 에이전트들의 종합 요약 (숫자는 ref 인용만) |
| `disagreements[]` | 에이전트 간 의견이 갈린 지점 |
| `decisionReadiness` | `ready` · `needs_review` · `blocked` |
| `nextQuestions[]` | 다음에 사람이 확인해야 할 질문 |
| `calledAgentIds`, `primaryAgentId`, `reviewerAgentIds`, `agentRoute` | 누가 어떻게 호출됐나 |
| `usedTools`, `toolResultRefs`, `riskCardIds`, `evidenceRefs`, `assetRefs`, `decisionIds` | 사용된 도구·참조한 ref들 |
| `snapshotVersion` | 어떤 snapshot 위에서 합성됐나 |
| `llmMode` | `provider-llm` · `deterministic-fallback` |
| `warnings[]` | 정책 위반·근거 부재 경고 |

### 9.7 Human Decision & 2-Ledger 모델

`createDecision` / `createOperatingLedgerEntry`(`decisionLog.ts`)가 사람 결정을 append-only로 저장한다.

- **DecisionStatus** 3종: `adopted` · `rejected` · `superseded`(=Hold/대체) — UI의 "Adopt / Reject / Hold / Export"는 처음 3개가 status에, Export는 `serializeDecisionLog` + `exportDecisionLogFileName`에 매핑된다.
- **OperatingDecisionKind** 6종: `approve` · `automate` · `authority` · `policy` · `attribution` · `ownership` — "사람이 정하기"의 6가지 종류.
- **정책 강제**: `status === 'adopted'`인데 `riskCards`가 비면 생성 거부(주의 카드 누락 채택 차단).
- **두 ledger**:
  - **Decision Ledger** — 사용자가 내린 제품/운영 결정(이유·가정 스냅샷·threshold snapshot·tool refs·risk card refs·evidence refs·agentReview/trustReview/reportReview metadata).
  - **Operating Ledger** — 운영 자산과 결정의 cross-link (`OperatingLedgerMetadata`, asset ref 포함).
- 저장: `decisionStore.ts` (local) + 선택적 remote(`createRemoteDecisionStore`), 영속은 `kvStore.ts` (`workspace-${uuid}` 단위).

### 9.8 레이어 요약

- **L1 프런트.** React 18 + Vite 6 + TypeScript 5 + Tailwind 3. Recharts, html-to-image + jspdf, react-i18next. 3-pane 콘솔 (좌: stage + 팀원 / 중: 결정론 입력·표·차트 / 우: Supervisor 결과).
- **L2 결정론 계산.** TypeScript 순수 함수. `lib/calculator.ts`, `lib/format.ts`, `domain/cost/`, `features/unit-economics/lib/`, `features/pricing/lib/`, `features/savings/lib/`, `features/team-cost/lib/`, `features/agent/lib/buildAgentSnapshot.ts`. 브라우저·서버 공용.
- **L3 신뢰성 & 보안.** `features/trust/` — DataIntakePolicy + Security Middleware + ImportTrustCheckPanel. 모든 인입의 첫 게이트.
- **L4 AI 에이전트 해석.** `@langchain/langgraph` 1.3.2 (`features/agent/lib/` 12개 모듈) + Python LangChain 백엔드(`agent_service/`, `agentic_runtime.py`, `pipeline.py`, `interpreter.py`, `interactive_agent.py`, `schemas.py`, `main.py`). `POST /api/agent`(요약) + `POST /api/agent/run`(전체 흐름) 두 endpoint. `AgentRunInput.frontOperatingSystem`을 같은 payload에 싣고, Python `create_agent` 호출에는 23종 read-only tool(앞단 운영 자산 4종 포함)을 주입한다. structured output(숫자 필드 없음). LLM 미구성 시 `deterministic-fallback` 모드로 동작하면서 같은 응답 구조 유지.
- **L5 저장 & RAG.** Snapshot Store(`buildAgentSnapshot`의 결정론 출력) + Ledger Store(`decisionStore` + `kvStore`) + corpus(`benchmarkCorpus.ts`, `riskCards.ts`, `operatingAssets.ts`).

### 9.9 단계
- **P0 (현재).** 프런트 client-only + 샘플, BYO-key. Python 에이전트 서비스는 옵션, 미구성 시 결정론 fallback(같은 응답 스키마).
- **P1.** 얇은 서버 백엔드로 키 보관·영속·반복 리포트. `p1OperatingSystem.ts`, `kvStore.ts`, `p1ApiHandlers.ts`, `teamCostApiHandlers.ts` 골격 존재. 헌법의 "서버 없음"은 "프런트=client-only, AI/영속성=얇은 backend"로 개정.

### 9.10 배포
- Vercel 정적 배포, base path `/token_simulator/`.
- `.github/workflows/deploy.yml` 자동화.

### 9.11 멀티모달 비용 모델 (v2.2 신설, v2.3 복구)

`CalcInput` / `Model`이 텍스트 외 3가지 모달리티를 추가로 지원한다. 기존 text-only 호출은 무손실 호환(모든 신규 필드 optional, default 0)을 유지한다.

**`Model`에 추가된 필드**
| 필드 | 의미 | 단위 |
| --- | --- | --- |
| `modalities` | 입력으로 받는 모달리티 목록 | `Array<'text'|'image'|'audio'|'video'>` |
| `outputModalities` | 생성하는 모달리티 목록 | 동일 |
| `imageInputPrice` | 이미지 입력 단가 | USD per 1M image tokens |
| `audioInputPricePerSecond` | 오디오 입력 단가 | USD per second |
| `videoInputPricePerSecond` | 비디오 입력 단가 | USD per second |
| `videoOutputPricePerSecond` | 비디오 출력(생성) 단가 | USD per generated second |
| `pricingStatus` | 가격 신뢰도 | `verified` · `estimated` · `tbd` · `unavailable` |

**`CalcInput`에 추가된 필드**
- `monthlyImageInputTokens`, `monthlyAudioInputSeconds`, `monthlyVideoInputSeconds`, `monthlyVideoOutputSeconds` (모두 optional, default 0)

**`CalcResult`에 추가된 필드**
- `imageInputCost`, `audioInputCost`, `videoInputCost`, `videoOutputCost`, `modalitiesUsed[]`

**별도 단가 함수**
- `calculateModalityCost`와 `calculateMultimodalScenario`는 text/image/audio/video/search/cache storage 차원을 받는다.
- 공식 단가가 없거나 `pricingStatus='unavailable'`이면 숫자 0을 만들지 않고 `unsupported_pricing`을 반환한다.
- Agent/LLM은 미공개 단가를 추정하지 않는다. 필요한 숫자가 없으면 `snapshot_missing` 또는 `unsupported_pricing` warning만 설명한다.

**적용 규칙**
- 일반 `calculateCost` 경로에서는 가격이 없는 모달리티 사용량을 0으로 처리해 기존 화면과 테스트를 깨지 않는다.
- 명시적 멀티모달 시나리오(`calculateMultimodalScenario`)에서는 가격 미공개 모달리티를 `unsupported_pricing`으로 막아 의사결정용 숫자 조작을 차단한다.
- 배치 할인은 text/image token 단위에만 적용한다.
- 캐시 할인은 텍스트 입력에만 적용한다.
- `monthlyCost` = text input + text output + image input + audio input + video input + video output.

**카탈로그 갱신 (2026-05-24)**
- **Gemini 3.5 Flash** — I/O 2026, agent/coding 특화. Gemini API pricing 기준으로 `verified` 계산 가능 모델이다. 2026-05-24 기준 input $1.50 / 1M tokens, output $9.00 / 1M tokens, context caching $0.15 / 1M tokens, batch 50% 할인으로 기록한다.
- **Gemini 3.5 Pro** — 공식 발표 모델이므로 카탈로그에는 올리지만 API 가격은 아직 미공개다. `pricingStatus='unavailable'`, `apiPricingAvailable=false`, `requiresCustomPricing=true`로 두고 fake price나 placeholder 가격을 넣지 않는다.
- **Gemini Omni / Gemini Omni Flash** — 공식 발표된 멀티모달/비디오 모델이므로 카탈로그와 모델 레이더에는 노출한다. 단, 공식 API pricing이 나오기 전까지 비용/절감액 계산에는 쓰지 않고 `pricingStatus='unavailable'` + `requiresCustomPricing=true`로 표시한다.

### 9.12 모델 신선도 모니터링 (v2.2 신설, v2.3 복구)

**문제**: I/O 2026(2026-05-19) 발표가 5일간 카탈로그에 반영되지 않았다. 단일 원인은 *자동 게이트가 없다*는 것.

**해결**: `scripts/research/check-provider-pricing.mjs` 신설.
- 카탈로그의 모든 `priceSourceUrl` 페이지를 fetch → SHA-256 hash → `.pricing-hashes.json` baseline과 비교.
- 동적 fragment(timestamp, nonce, hex token) 제거 후 hash → 가짜 변경 최소화.
- 변경 감지 시 exit code 1 + URL 목록 출력 → CI/cron에서 알람.
- 추가로 `pricingStatus: 'estimated' | 'tbd' | 'unavailable'` 모델 목록을 매 실행 시 출력 → "후속 확인 필요 모델" 가시화.
- npm script: `research:pricing` (체크), `research:pricing-update` (baseline 갱신).

**운영 권장**: 주 1회 수동 실행 + GitHub Actions cron(P1)으로 자동화 예정.

---

## 10. 데이터 & 용어

### 10.1 사용 기록 스키마 (권장)
```
timestamp, request_id, customer_id, plan_id, feature, model,
session_id, agent_run_id, input_tokens, output_tokens,
total_cost, latency_ms, status
```
필수: `timestamp, feature, model, input_tokens, output_tokens`. 나머지는 attribution 정밀도에 비례.

### 10.2 사용자가 직접 입력하는 비즈니스 기준값
- 월 고객 수, 월 보고서/티켓/job 수, 요금제별 월 매출.
- 1건당 판매가(report price, ticket price 등).
- 예상 재시도율, 사람 검수 비율, CS 에스컬레이션 비율 (effective cost 계산용).
- **토큰량은 사용자가 추측하지 않는다.** 토큰은 import한 사용 기록이나 카탈로그 가정에서만 가져온다.

### 10.3 용어 노출 정책
- 화면 = 쉬운 한국어 (TERMINOLOGY.md).
- 코드/개발 문서 = 영문 기술용어 유지(`deterministic`, `tool ref`, `agent-run`, `toolResults`, `gross margin`).
- 화면에 전문용어 노출 금지.

---

## 11. 성공 지표

### 11.1 정량
- 사용 기록 임포트 성공률(필수 컬럼 통과 행 비율).
- Attribution 커버리지(전체 비용 중 6축 모두에 매핑된 비중).
- 리포트 export 횟수(PNG/PDF).
- 가격 시나리오 비교 실행 횟수.
- 운영 일지 기록 수, 결정당 가정·근거 첨부율.
- 비즈니스 기준값 입력 완성도(7개 항목 중 채워진 수).

### 11.2 정성 (강한 구매 신호)
- "이 고객이 손해인지 몰랐다."
- "경영진에 그대로 공유해도 되겠다."
- "이걸로 가격을 바꿔야겠다."
- "우리 실제 사용 기록으로 해볼 수 있나?" (익명 CSV 자발 제공).
- 다음 달에도 같은 리포트를 받고 싶다는 요청.

### 11.3 안티지표
- "토큰 계산기로 쓸게요" → 포지셔닝 실패.
- 운영 일지를 한 번도 열지 않음 → 시뮬레이터로만 소비됨.
- AI 추천이 100% 무비판 채택됨 → 주의 카드와 승인 게이트가 형식적.
- 같은 입력으로 페르소나(Developer/PM/CEO)별 화면에서 다른 숫자가 나옴 → 헌법 위반.

---

## 12. 로드맵 & 의존성

| 단계 | 내용 | 상태 |
| --- | --- | --- |
| MVP 1 | 샘플 + CSV 기반 서비스 MVP(쪼개기·마진·가격·1장 리포트·운영 일지·Trust Intake) | P0/P1 진행 |
| MVP 2 | SDK-lite 자동 수집. prompt는 수집하지 않고 feature/model/tokens/cost/latency/status/business metadata만 수집 | P1 다음 후보 |
| MVP 3 | Alert / Margin Guard. 비용 급증, 예산 초과 예측, 손해 고객/기능, 모델 변경 리스크 4종만 | P1/P2 후보 |
| MVP 4 | Gateway / Proxy. 비싼 요청 차단, 싼 모델 라우팅, fallback, 고객별 예산 제한 | P2 고급 모드 |

첫 경험은 빈 대시보드가 아니라 setup wizard다: 사용량 가져오기 → 기능 매핑 → 비즈니스 기준값 → 원가/마진 → 추천 → 리포트.

핵심 의존성: Python LangChain 1.0 에이전트 서비스(옵션), Montage 디자인 토큰, Pretendard·Wanted Sans 폰트, evidence/벤치마크 corpus, 모델 단가 source URL 갱신(`check-provider-pricing.mjs`), SDK-lite 이벤트 계약, rule-based alert policy.

---

## 13. 리스크 & 완화

| # | 리스크 | 완화 |
| --- | --- | --- |
| R1 | 구매자가 실제로 돈을 낼지 미검증 | P0 후 인터뷰 20건 WTP 검증, 안티지표 모니터링 |
| R2 | 사용 기록 데이터 민감성(PII, 매출) | 익명 샘플 우선, client-only 분석, CSV 삭제 정책, `securityMiddleware`/`dataIntakePolicy` |
| R3 | 설계 시점(Wedge A) 추정의 신뢰성 | 벤치마크 corpus 노란불 + Plan vs Actual 보정(P1) |
| R4 | 포지션 줄타기(CFO ↔ 개발자) | 첫 메시지 Founder 언어, 실제 진입은 개발자 |
| R5 | "AI Native" 추상 슬로건 | 화면 전면은 구체("이번 달 ₩612,000") |
| R6 | "payroll=고정급여" 오해 | "실적 기반 급여명세서" 카피 (한 일 + 그 비용) |
| R7 | AI 환각으로 숫자 지어냄 | §9.1 원칙 + 근거 칩 + tool ref 매칭 검증 |
| R8 | Chrome 자동번역이 숫자/모델명 깨뜨림 | 헌법화된 `translate="no"` + `lang="en"` + meta notranslate (라운드 1 회귀 학습) |
| R9 | 모델 단가가 자주 바뀜 | `lastVerifiedAt` 메타데이터 + source URL 명시 + `scripts/research/check-provider-pricing.mjs` 주간 모니터링(§9.12) |
| R10 | LangGraph/LLM 백엔드 미구성 시 사용 불가 | `deterministic-fallback` 모드로 핵심 기능 모두 동작 보장 |
| R11 | 신규 모델 발표를 카탈로그가 따라가지 못함(I/O 2026 5일 지연 사건) | `pricingStatus` 필드(`verified`/`estimated`/`tbd`/`unavailable`) + 모니터링 스크립트 + PR 템플릿에 "마지막 verify 7일 이내?" 체크 |
| R12 | 멀티모달 단가 모델 부재로 비디오 생성 SaaS 원가 측정 불가 | v2.2 §9.11에서 calculator 확장(image/audio/video token + per-second 차원), text-only 호출 무손실 호환 |
| R13 | "estimated"/"tbd"/"unavailable" 가격 상태를 사용자가 잘못 이해함 | UI에 pricingStatus 뱃지 노출, 가격 미공개 모델은 사용자 단가 입력 전까지 계산 불가로 표시, AI 해석에서 "공식 API 단가 미공개" disclaimer 부착 |

---

## 14. 미해결 질문

- **라우팅.** 마케팅 `/` + 앱 분리 vs. base `/token_simulator/` 유지.
- **제품명 정리.** repo는 아직 `token_simulator`, 제품명은 `AgentPayroll` — 통일 시점.
- **Wanted Sans 사용 범위.** 랜딩 hero에만 vs. 마케팅 전체.
- **P1 서버 전환 트리거.** 어떤 WTP 신호를 임계점으로 잡을 것인가.
- **데모 미디어.** 인터랙티브 데모 vs. 녹화 영상(스폰서·SparkClaw 안전성).
- **알림 재도입 기준.** README Phase 3의 evidence 50개 / Top 3 Pain / WTP 4+ 게이트가 현실적인가.
- **멀티모달 사용 기록 임포트.** 현재 CSV 스키마는 텍스트 토큰 컬럼만 정의. 이미지·오디오·비디오 사용량을 어떤 컬럼/단위로 받을지(시간 단위 vs 토큰 단위) 결정 필요. Gemini Omni Flash API 공개 후 공식 응답 포맷 보고 확정.
- **estimated/tbd/unavailable 가격 UI 노출.** 뱃지로 보일지, 별도 disclaimer 라인으로 보일지, 채택 시 운영 일지에 자동 기록할지.
- **AI 구독 비교 축.** AI Ultra($100/mo), Pro, Plus 같은 패키지를 가격 시나리오 비교군에 넣을지(API 단가와 별도 카테고리로). PM/CEO 리포트의 "경쟁사 대비 위치" 요구 강화 시 P1 후보.
- **모니터링 자동화 단계.** 주간 수동 → GitHub Actions cron → Slack/Email 알림으로 가는 단계의 trigger 조건.

---

## 15. 부록

### 15.1 핵심 파일 맵
| 영역 | 경로 |
| --- | --- |
| 단일 계산 경로 | `src/lib/calculator.ts` → `src/domain/cost/calculator.ts` |
| 단일 포맷 경로 | `src/lib/format.ts` |
| 모델 카탈로그 | `src/features/alternatives/data/models.ts` (현재 **45종 모델/레이더 entry**, 20 provider/source, Modality 타입 + pricingStatus 포함) |
| 모델 단가 모니터링 | `scripts/research/check-provider-pricing.mjs`, `scripts/research/.pricing-hashes.json` |
| 사용 기록 임포트 | `src/features/usage/lib/usageImport.ts`, `attribution.ts`, `operationalSignals.ts` |
| 마진 엔진 | `src/features/unit-economics/lib/{margin,unitEconomics,effectiveCost,businessMetrics}.ts` |
| 가격 시나리오 | `src/features/pricing/lib/pricingScenario.ts` |
| 절감 레버 | `src/features/savings/lib/savingsLevers.ts` |
| AI 팀 카탈로그 (사용자가 짜는 9종) | `src/features/team-cost/lib/agentCatalog.ts` |
| 11 운영 분석 에이전트 + 10 자산 | `src/features/operating-assets/lib/operatingAssets.ts` |
| Front Operating System context | `src/features/front-operating/lib/frontOperatingContext.ts` (`icp_scorecard`, `data_readiness`, `offer_ladder`, `approval_matrix`, `learning_loop`) |
| 데이터 인입 정책 (Gate 1) | `src/features/trust/lib/dataIntakePolicy.ts` |
| Security Middleware (Gate 2) | `src/features/trust/lib/securityMiddleware.ts`, `components/ImportTrustCheckPanel.tsx` |
| 병목·최적화 | `src/features/team-cost/lib/{bottleneckAnalysis,optimizationPolicies}.ts` |
| 결정 ledger + 운영 ledger | `src/features/decision-log/lib/{decisionLog,decisionStore}.ts` |
| 주의 카드 | `src/features/agent/lib/riskCards.ts` |
| Deterministic Snapshot (Gate 5) | `src/features/agent/lib/buildAgentSnapshot.ts` |
| 에이전트 해석 (TS) | `src/features/agent/lib/{agentRuntime,agentRunRuntime,serverAgentRuntime,teamCostAgentRuntime,teamCostGraph,teamCostRouter,approvalGate,toolContract,teamCostToolContract,agentGraph,checkpointStore,teamCostRuntime,teamCostLlmRuntime}.ts` |
| 에이전트 해석 (Python) | `agent_service/agentic_runtime.py` (Stage Router + 23 Capability Tools + front operating tools + Supervisor), `pipeline.py`, `interpreter.py`, `interactive_agent.py`, `main.py` (POST /api/agent, POST /api/agent/run), `schemas.py` |
| 리포트 | `src/features/report/{components/SummaryCard, lib/reportArtifacts.ts}` |
| 영속 (P1) | `src/server/storage/kvStore.ts`, `p1ApiHandlers.ts`, `teamCostApiHandlers.ts`, `features/p1/lib/p1OperatingSystem.ts` |
| 부트캠프 검증 샘플 (v2.3) | `src/features/usage/data/bootcampSample.ts` (Generic Team A~F placeholder, deterministic generator) |
| 메인 앱 | `src/app/App.tsx` (**2,773 lines**, 2026-05-24 현재) |

### 15.2 참고 문서
| 문서 | 역할 |
| --- | --- |
| `CLAUDE.md` | 프로젝트 헌법(아키텍처 규칙·금지 패턴) |
| `README.md` | 제품 narrative + 로드맵 Phase 1~5 |
| `DESIGN.md` | Wanted Montage 디자인 시스템 |
| `docs/PRD.md` | v1.0 PRD (product narrative 중심) |
| `docs/PRD-v3.md` | v3.0 PRD (의사결정 통합 + 부트캠프 검증 반영) |
| `docs/PRODUCT_UX.md`, `PRODUCT_UX_DETAILED.md` | 앱 UX 원칙·상세 |
| `docs/LANDING_UX.md` | 랜딩 surface 상세 |
| `docs/TERMINOLOGY.md` | 쉬운 말 ↔ 전문용어 매핑 |
| `docs/cost-quality-decision-workspace.md` | 워크스페이스 구현 플랜 |
| `docs/diagnosis/2026-04-23-deploy-state.md` | 자동번역 회귀 진단 |
| `feedback.md`, `feedback2.md` | 외부 리뷰 라운드 1·2 |
| `docs/research/2026-05-24-bootcamp-1week-plan.md` | 부트캠프 검증 1주 압축 플랜 |
| `docs/research/bootcamp-slack-messages.md` | 부트캠프 운영진/팀용 메시지 5종 + 안티템플릿 |
| `docs/research/bootcamp-interview-guide.md` | 7+1 질문 인터뷰 가이드 + 기록 템플릿 |
| `agent_service/` | Python LangChain 해석 서비스 |
| `prototypes/landing-montage.html` | 랜딩 프로토타입 |

### 15.3 변경 이력
- v2.5 (2026-05-24) — Cursor Composer 2.5 Standard/Fast와 Alibaba Qwen3.7-Max를 공식 가격 출처 기준으로 모델 카탈로그에 추가했다. Composer 2.5는 Cursor provider의 subscription-plan 모델로 분리하고, Qwen3.7-Max는 기존 `qwen-3-max`와 별도 row(`qwen3.7-max`)로 유지한다. 공식 source registry에 Cursor changelog와 Alibaba Model Studio landing을 추가했다. 현재 카탈로그 사실: 45종 모델/레이더 entry, 20 provider/source.
- v2.4 (2026-05-24) — Python LangChain `create_agent` 통합 사실을 반영했다. `AgentRunInput.frontOperatingSystem`과 `src/features/front-operating/lib/frontOperatingContext.ts`를 핵심 파일 맵에 추가하고, `build_agent_tools()`가 제공하는 front operating read-only tools 4종(`retrieve_front_operating_system`, `retrieve_front_operating_assets`, `retrieve_front_operating_gate`, `retrieve_learning_loop_records`)을 §7.1/§9.8에 명시했다. Read-only Capability Tools 총수를 23종으로 정정했다.
- v2.3 (2026-05-24, 복구 + 방향성 보강) — 파일 잘림/중복 tail 사건 복구. §9.6~§9.10은 v2.1 구조를 유지하고, §9.11~§9.12는 당시 코드 단서(`Modality`, `pricingStatus`, `calculateModalityCost`, `calculateMultimodalScenario`, `check-provider-pricing.mjs`) 기준으로 보강했다. 중복으로 붙어 있던 오래된 §9.6~§15 tail을 제거했다. 당시 코드 사실로 정정: 모델/레이더 entry 42종, provider/source 19종, `App.tsx` 2,773 lines. §12에 MVP 2 SDK-lite, MVP 3 Alert/Margin Guard, MVP 4 Gateway/Proxy 순서를 반영하고, §15.4에 Bootcamp Validation Round 1을 추가했다.
- v2.2 (2026-05-24) — I/O 2026 (5/19) 반영. §2.4 시장 신호 신설, 모델 카탈로그에 Gemini 3.5 Flash / 3.5 Pro / Gemini Omni / Omni Flash 추가. Gemini 3.5 Flash는 공식 Gemini API pricing으로 `verified` 계산 가능 모델로 두고, Gemini 3.5 Pro / Omni / Omni Flash는 공식 발표 모델이지만 `pricingStatus='unavailable'`, `apiPricingAvailable=false`, `requiresCustomPricing=true`로 둔다. §9.11 멀티모달 비용 모델 신설(`Modality` 타입 + 미공개 단가 `unsupported_pricing`), §9.12 모델 신선도 모니터링 스크립트 신설(`check-provider-pricing.mjs`, npm `research:pricing`), §13에 R11/R12/R13 추가.
- v2.1 (2026-05-24) — 다이어그램 ↔ PRD 1:1 매핑 보강. §7.1에 Data Intake Policy / Security Middleware 4단계 / 11 운영 분석 에이전트 추가. §9 전체 재작성: 5단계 인입 게이트(9.3), Python Stage Router 3 모드(9.4), Read-only Capability Tools 5 카테고리·16종(9.5), Supervisor Synthesis 계약(9.6), Human Decision & 2-Ledger 모델(9.7). §15.1 핵심 파일 맵에 trust / operating-assets / agent_service 추가.
- v2.0 (2026-05-24) — 코드베이스 기준 정본화. 구현 현황(7장)과 핵심 파일 맵(15.1) 추가, 9종 AI 팀원·6축 attribution·LangGraph 레이어 명시.
- v1.0 (2026-05-23) — product narrative 중심 초안(`docs/PRD.md`).

### 15.4 Bootcamp Validation Round 1 (2026-05-25 ~ 2026-05-31)

이 부록은 제품 방향을 폐기하지 않고, 1주 부트캠프 리서치로 검증 가능한 질문으로 좁힌다. 실행 계획은 `docs/research/2026-05-24-bootcamp-1week-plan.md`를 따른다.

**검증 범위**
- 이번 라운드는 Wedge B(실제/가상 사용 기록 → 비용·마진·리포트)를 검증한다.
- Wedge A(설계 시점 AI 팀 구성)는 폐기하지 않는다. 다만 이번 주 인터뷰의 직접 검증 대상에서는 제외한다.
- SDK는 구현하지 않는다. SDK 수용도와 prompt-free analytics 반응만 질문한다.

**현재 샘플 상태**
- `src/features/usage/data/bootcampSample.ts`는 Generic Team A~F placeholder다.
- 팀명, plan, feature는 실제 부트캠프 팀이 아니다.
- risk-band 분포, time profile, feature weights, model mix는 데모용 가정이며 인터뷰 후 Day 3~4에 swap한다.
- prompt 컬럼은 없다. prompt-free analytics 포지션을 유지한다.

**검증 가설**
| 가설 | 확인 질문 | 성공 신호 |
| --- | --- | --- |
| 팀들은 API 비용을 잘 예측하지 못한다 | 한 달 10만 원 한도에서 어느 정도 쓸 것 같은가 | "잘 모르겠다", "써봐야 알 것 같다" |
| 팀들은 기능별 비용 분포를 모른다 | 어떤 기능이 가장 비쌀 것 같은가 | 추측 근거가 막연하거나 기능 단위로 말하지 못함 |
| 팀들은 비용 초과를 늦게 안다 | 80% 도달 전에 알 방법이 있는가 | 콘솔 수동 확인, 메일 의존 |
| 비용을 보면 결정해야 할 선택지가 생긴다 | 모델 변경/기능 축소/호출 제한/캐싱 중 무엇이 먼저인가 | 1순위와 이유가 나온다 |
| 발표/제출용 리포트 가치가 있다 | AI 사용 리포트가 있으면 도움이 되는가 | 발표에 쓸 수 있다는 원문 발언 |
| prompt-free SDK가 수용 가능하다 | prompt 없이 feature/model/tokens/cost만 자동 기록하면 어떤가 | prompt 수집보다 안전하다는 반응 |

**MVP 방향에 주는 의미**
- SDK-lite는 `timestamp, request_id, customer_id, plan_id, feature, model, session_id, agent_run_id, input_tokens, output_tokens, total_cost, latency_ms, status`와 business metadata만 수집한다.
- prompt, messages, API key, PII는 기본 수집하지 않는다.
- Alert / Margin Guard는 대시보드 알림이 아니라 결정 필요한 4종 알림으로 제한한다: 비용 급증, 예산 초과 예측, 손해 고객/기능, 모델 변경 리스크.
- Gateway/Proxy는 선택형 고급 모드로 둔다. SDK-lite와 추천형 guard가 먼저다.

**완료 산출물**
- 운영진/팀 메시지 발송 기록: `docs/research/bootcamp-slack-messages.md`
- 인터뷰 가이드와 기록 템플릿: `docs/research/bootcamp-interview-guide.md`
- 인터뷰 3~5건 기록: `docs/research/bootcamp-interviews/`
- 원문 발언 후보: `docs/research/bootcamp-quotes-for-landing.md`
- 진짜 페르소나로 swap된 `bootcampSample.ts` v2
- 가설별 Pass / Fail / Inconclusive 결과표
- 다음 1주 결정 메모 1장
