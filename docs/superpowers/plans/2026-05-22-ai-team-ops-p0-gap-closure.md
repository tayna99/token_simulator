# AI Team Ops P0 갭 클로저 구현 계획

> **에이전트 작업자 안내:** 이 계획은 `superpowers:subagent-driven-development`(서브에이전트로 독립 작업을 나눠 실행하는 방식) 또는 `superpowers:executing-plans`(계획서를 작업 단위로 실행하는 방식)로 처리한다. 체크박스(`- [ ]`)는 진행 추적용이다.

## 목표

현재 SparkClaw P0 데모를 두 문서의 기준에 맞춘다.

- `AI SaaS Cost & Margin Workspace v2.0`(AI SaaS 비용·마진 작업공간 제품 요구사항)
- `AI Team Operations Workspace v0.4`(AI 팀 운영 작업공간 제품 요구사항)

핵심은 "멋진 대시보드"가 아니라 **사용량 로그 → 원가·마진 계산 → 위험 검토 → 가격 결정 → 리포트와 결정 로그**까지 끊기지 않는 데모를 만드는 것이다.

## 아키텍처 원칙

- P0는 client-only(서버 없이 브라우저 안에서 동작하는 데모)로 유지한다.
- 모든 숫자는 순수 TypeScript 도구가 결정론적으로 계산한다.
- LangGraph.js(에이전트 흐름을 그래프로 묶는 라이브러리)는 해석과 승인 흐름만 담당하고 산술 계산을 하지 않는다.
- Risk Card(위험 카드: 결정 전에 확인해야 할 품질·보안·비용 리스크)와 benchmark(비교 기준)는 번들된 JSON/TS corpus(검색 가능한 문서 묶음)에서 시작한다.
- 검색은 deterministic tag search(고정 태그 기반 검색)로 시작하고, P1 이후 RAG(검색 증강 생성: 문서 검색 결과를 답변 근거로 붙이는 방식)로 확장한다.

## 기술 스택

- Vite 6, React 18, TypeScript 5, Tailwind 3
- Vitest 4
- `@langchain/langgraph`
- `localStorage`
- JSON export(파일 내보내기)

## PRD 갭 리뷰

### P0 필수 보완 갭

1. `src/features/agent/lib/agentRuntime.ts`가 아직 LangGraph runtime(그래프 기반 에이전트 실행기)이 아니다. 현재는 deterministic fallback array(고정된 대체 이벤트 배열)에 가깝다.
2. `src/features/agent/lib/riskCards.ts`에는 카드가 3개뿐이다. PRD v0.4는 evidence metadata(근거 메타데이터)가 있는 Risk Card 10개 이상을 요구한다.
3. `PricingSimulatorWorkspace`는 `flat`, `credit`, `cap`만 렌더한다. 엔진은 `usage`, `hybrid`, `overage`도 지원하므로 P0 UI에서 모두 비교해야 한다.
4. `AITeamConfiguration`은 Wedge A+B(설계 전 사용자와 운영 중 SaaS 팀을 함께 받는 두 진입점) 공유 객체로 쓰기에는 얇다. prompt template(프롬프트 양식), guardrails(안전장치), expected volume(예상 사용량), cost budget(비용 예산), performance history hook(성능 이력 연결점), config snapshot reference(설정 스냅샷 참조)가 필요하다.
5. Team Designer UI(사용자가 AI 팀을 구성하는 화면)는 카드 목록 수준이다. onboarding conversation(초기 질의 흐름), scenario selector(시나리오 선택), org chart(조직도), selected-agent detail panel(선택한 에이전트 상세), benchmark row(비교 기준 행)가 필요하다.
6. Report Output(리포트 출력)은 일부 분리됐지만 PRD 수준의 report system(리포트 체계)은 아니다. Developer, PM, CEO/CFO, Board-ready(이사회 공유용) 산출물이 tool refs(도구 실행 근거)와 risk cards에 묶여야 한다.
7. Decision Log(결정 로그)에 삭제와 실제 export UI(내보내기 화면)가 부족하다.
8. Operational Signal Summary(운영 신호 요약)가 없다. token spike(토큰 급증), cache miss(캐시 미스), top session/agent-run cost(비싼 세션·에이전트 실행) 안내가 필요하다.
9. Raw vs Effective Cost(순수 LLM 원가와 재시도·사람 검수·CS 비용을 더한 실제 원가) 구분이 없다.
10. Sample data(샘플 데이터)가 하나의 고정 CSV뿐이다. v0.4는 5개 synthetic scenario(합성 시나리오)와 benchmark corpus seed statistics(비교 기준 코퍼스 초기 통계)를 요구한다.

### 이미 건강한 부분

- CSV 계약 확장과 필수 컬럼 검증은 `src/features/usage/lib/usageImport.ts`에 있다.
- multi-axis attribution(고객·기능·모델·요금제·세션·에이전트 실행 단위 귀속)은 `src/features/usage/lib/attribution.ts`에 있다.
- plan/customer margin(요금제·고객 마진)과 heavy-user detection(과사용 고객 감지)은 `src/features/unit-economics/lib/margin.ts`에 있다.
- pricing engine(가격 정책 엔진)은 여섯 정책 타입을 이미 지원한다.
- 현재 구현은 client-only P0 제약과 formatter-only display rule(표시 숫자는 formatter만 통과한다는 규칙)을 대체로 지킨다.

## P1/P2 로드맵 리뷰

P0는 SparkClaw 데모다. client-only, sample/import driven(샘플 또는 CSV 업로드 기반), BYO-key(사용자 키 직접 입력), localStorage/export 중심이다. P1/P2는 패널을 더 붙이는 일이 아니라, 데모 작업공간을 반복 가능한 SaaS workflow(서비스형 반복 업무 흐름)로 바꾸는 단계다.

### P1 목표: 실제 로그와 반복 가능한 SaaS 흐름

P1은 사용자가 자기 익명화 로그를 분석하고 싶다는 신호가 나온 뒤 시작한다.

1. **얇은 서버리스 백엔드**
   - 기존 `runAgent(input) -> events` 인터페이스 뒤에 `/api/agent`를 붙인다.
   - provider key(모델 제공자 API 키)는 서버에 보관하거나 세션 단위 암호화 키로 받는다.
   - deterministic L2 functions(결정론 계산 함수)은 공유 패키지에서 재사용하고 계산을 복제하지 않는다.

2. **영속 Decision Log와 설정 저장소**
   - Decision Log, `AITeamConfiguration`, report history를 localStorage에서 KV/DB로 옮긴다.
   - 신뢰와 이동성을 위해 JSON export/import를 유지한다.
   - 모든 리포트에 `config_snapshot_ref`, `tool_snapshot_ref`를 붙여 당시 가정으로 역추적 가능하게 한다.

3. **실제 usage CSV와 observability export 지원**
   - OpenAI/Anthropic usage export(사용량 내보내기)와 Helicone/Langfuse류 CSV profile(가져오기 규격)을 추가한다.
   - 분석 전 PII-safe preview(개인정보 안전 미리보기)를 제공한다.
   - provider invoice total(제공자 청구 총액)과 내부 row total(행 단위 합계) 대조 필드를 추가한다.

4. **주간/월간 recurring report(반복 리포트)**
   - 예약 리포트 생성을 추가한다.
   - period(기간), inputs(입력), deltas(변화량), adopted decisions(채택 결정), unresolved risks(미해결 리스크)를 저장한다.
   - CEO/CFO digest(경영진 요약)와 다운로드 가능한 리포트 이력을 만든다.

5. **Plan vs Actual(계획 대비 실제)**
   - 이전 가격/모델 라우팅 결정과 새 사용량을 비교한다.
   - expected margin(예상 마진)과 actual margin(실제 마진), expected reduction(예상 절감)과 actual reduction(실제 절감)을 보여 준다.
   - 결정 상태를 `validated`, `missed`, `needs-review`로 표시한다.

6. **서버 RAG 업그레이드**
   - benchmark와 Risk Card 검색을 서버 도구 뒤로 옮긴다.
   - `evidence_board.csv`의 evidence metadata를 붙인다.
   - "근거 없으면 주장 없음" 원칙을 유지한다.

7. **P1 검증**
   - 단위 테스트: API 계약, 영속 스키마, report-run diff, import profile.
   - 통합 테스트: 익명 CSV 업로드 → 에이전트 리포트 → 저장된 결정 → 다음 기간 비교.
   - 브라우저 테스트: 로그인/세션 → 업로드 → 반복 리포트 미리보기 → export.

### P2 목표: 연동과 멀티테넌트 제품

P2는 P1에서 반복 사용 신호가 확인된 뒤 시작한다.

1. SDK/Gateway/Proxy ingestion(자동 이벤트 수집)
2. Helicone/Langfuse/LangSmith/Portkey connector(관측 도구 연동)
3. Stripe/Metronome/OpenMeter billing integration(과금 데이터 연동)
4. multi-tenant workspace(여러 조직·프로젝트를 분리하는 작업공간)
5. board deck/finance package export(이사회·재무 패키지 내보내기)
6. continuous customer profitability monitoring(고객별 수익성 지속 모니터링)
7. model routing/cache/output cap/tier migration simulation(모델 라우팅·캐시·출력 제한·요금제 이동 시뮬레이션)
8. connector contract test(연동 계약 테스트), authorization test(권한 테스트), seeded end-to-end test(시드 데이터 기반 E2E 테스트)

### 단계 경계 규칙

- P0가 real-log import path(실제 로그 업로드 경로)와 최소 1명의 "내 CSV로 분석하고 싶다" 신호를 만들기 전에는 P1 백엔드를 시작하지 않는다.
- P1에서 report history와 Plan vs Actual이 반복 사용을 증명하기 전에는 P2 connector를 시작하지 않는다.
- CSV/import 흐름이 검증되기 전에는 SDK/gateway ingestion을 추가하지 않는다. 너무 일찍 붙이면 제품이 observability infrastructure(관측 인프라)로 흘러간다.
- deterministic tools produce numbers, agents explain(숫자는 도구가 만들고 에이전트는 설명한다)는 불변식을 약화하지 않는다.

## 파일 구조

### Agent Graph와 Tool Contract

- `src/features/agent/lib/toolContract.ts`
- `src/features/agent/lib/agentRuntime.ts`
- `src/features/agent/lib/agentRuntime.test.ts`

### RAG Corpus와 Risk Cards

- `src/features/agent/lib/riskCards.ts`
- `src/features/agent/lib/riskCards.test.ts`
- `src/features/agent/data/`

### Product State와 Team Designer

- `src/features/team/lib/aiTeamConfiguration.ts`
- `src/features/team/lib/estimateAgentWorkload.ts`
- `src/features/team/components/`
- `src/app/App.tsx`

### Pricing과 Unit Economics

- `src/features/pricing/lib/pricingScenario.ts`
- `src/features/unit-economics/lib/effectiveCost.ts`
- `src/features/unit-economics/components/`

### Operational Signals

- `src/features/usage/lib/operationalSignals.ts`
- `src/features/usage/components/OperationalSignalSummary.tsx`

### Reports와 Decision Log

- `src/features/report/lib/reportArtifacts.ts`
- `src/features/report/components/`
- `src/features/decision-log/lib/decisionLog.ts`
- `src/features/decision-log/components/DecisionLogWorkspace.tsx`

## 작업 1: Agent Tool Contract 고정

- [ ] 에이전트가 읽는 입력 계약을 `toolContract.ts`로 고정한다.
- [ ] tool ref(도구 근거 참조), snapshot ref(스냅샷 참조), risk ref(위험 카드 참조)를 타입으로 분리한다.
- [ ] 에이전트 이벤트가 숫자를 직접 만들 수 없도록 계산 결과는 `calculator`/`pricing`/`margin` 결과만 참조한다.
- [ ] 테스트는 잘못된 ref와 누락된 snapshot을 거부해야 한다.

## 작업 2: Fallback-only Runtime을 LangGraph.js Skeleton으로 교체

- [ ] Orchestrator(흐름 조정자), Margin Analyst(마진 분석), Pricing Strategy(가격 전략), Risk Auditor(위험 검토), CFO Reporter(경영진 리포트) 노드를 정의한다.
- [ ] BYO-key가 없을 때는 `deterministic_preview`로 표시하고, provider execution(실제 모델 호출)처럼 렌더하지 않는다.
- [ ] stream events(단계별 이벤트)를 UI가 그대로 소비할 수 있게 유지한다.

## 작업 3: Risk Card Corpus를 PRD 최소 기준까지 확장

- [ ] 10개 이상 Risk Card를 만들고 evidence metadata를 붙인다.
- [ ] 각 recommendation(추천안)이 독립적으로 risk review를 받도록 연결한다.
- [ ] "근거 없음" 상태를 실패가 아니라 `needs_evidence`로 표시한다.

## 작업 4: 모든 가격 정책을 P0 UI에 렌더

- [ ] flat, usage, credit, hybrid, cap, overage를 모두 보여 준다.
- [ ] AI add-on(별도 AI 부가 요금)과 tier upgrade(상위 요금제 이동)는 P0 비교 후보로 추가한다.
- [ ] 같은 입력이 모든 persona(개발자/PM/CEO)에 같은 숫자로 보이게 한다.

## 작업 5: Operational Signal Summary 추가

- [ ] token spike, cache miss, top session, top agent-run cost를 계산한다.
- [ ] alert(경보)처럼 과장하지 말고 "review candidate(검토 후보)"로 표시한다.
- [ ] attribution table(귀속 표)과 같은 snapshot을 읽는다.

## 작업 6: Raw vs Effective Cost Engine 추가

- [ ] raw LLM cost와 retry/human review/CS escalation cost를 분리한다.
- [ ] assumption(가정)은 사용자가 볼 수 있고 바꿀 수 있어야 한다.
- [ ] effective cost가 pricing scenario와 report에 이어져야 한다.

## 작업 7: Team Designer를 Mockup 방향으로 업그레이드

- [ ] onboarding conversation, scenario selector, org chart, selected-agent detail panel을 추가한다.
- [ ] 9종 AI 팀원과 11개 운영 분석 에이전트를 화면에서 헷갈리지 않게 라벨링한다.
- [ ] benchmark row는 근거가 없으면 `baseline_unavailable`로 표시한다.

## 작업 8: Decision Log Save/Delete/Export 마무리

- [ ] save, delete, export UI를 만든다.
- [ ] export에는 결정 이유, 가정, snapshot ref, risk ref가 들어간다.
- [ ] 삭제는 사용자가 명시적으로 확인한 뒤 수행한다.

## 작업 9: Structured Report Artifacts 구축

- [ ] Developer, PM, CEO/CFO, Board-ready report를 타입으로 나눈다.
- [ ] 모든 숫자에 tool ref를 붙인다.
- [ ] Risk Card와 unresolved risk를 리포트에 남긴다.

## 작업 10: 전체 검증

- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] CSV import → attribution → margin → pricing → risk review → decision log → report 흐름 스모크
- [ ] 자동번역 보호(`notranslate`, `lang="en"`) 회귀 확인

## 완료 기준

- P0 데모에서 사용자가 "어떤 고객/기능/요금제가 손해인지"와 "어떤 가격 결정을 검토해야 하는지"를 한 흐름에서 본다.
- 에이전트가 숫자를 만들지 않고, 결정론 계산 결과를 설명만 한다.
- 리포트와 결정 로그가 같은 snapshot을 참조한다.
- 미구현 backend/connector 기능은 운영 완료처럼 표시하지 않는다.
