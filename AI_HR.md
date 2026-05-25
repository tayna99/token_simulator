# AI_HR.md - AgentCost AI 팀원 운영 지침

작성일: 2026-05-26  
대상 프로젝트: AgentCost / LLM Cost Simulator(대형 언어 모델 비용 시뮬레이터)  
문서 목적: 새 담당자가 인수인계받아도 "AI 팀원화가 무엇이고, 왜 필요하며, 실제 코드와 제품 흐름에서 어떻게 돌아가는지" 이해할 수 있게 남긴다.

## 0. 이 문서를 읽는 방법

이 문서는 단순 기능 설명서가 아니다. AgentCost 안에서 AI를 하나의 버튼이나 챗봇이 아니라, 업무 단위, 역할, 권한, 근거, 승인, 기록을 가진 팀원처럼 다루기 위한 운영 문서다.

각 파트는 같은 형식으로 읽으면 된다.

- 무엇인가: 이 개념이 무엇을 뜻하는지.
- 왜 하는가: 왜 이 구조가 필요한지.
- 어떻게 돌아가는가: 실제 제품과 코드에서 어떤 순서로 움직이는지.
- 인수인계 포인트: 다음 담당자가 확인해야 할 파일, 상태, 주의점.

첨부 PDF `AI-Native 조직 업무 지침 설계 프로토콜.pdf`의 핵심은 다음 문장으로 요약할 수 있다.

> AI 네이티브 조직은 업무를 Work Item(업무 단위)으로 쪼개고, State Machine(상태 머신)으로 흐름을 관리하며, AI(인공지능), Rule(규칙), RAG(검색 증강 생성), Human(사람)의 책임을 분리하고, Guardrail(안전장치), Permission(권한), Log(기록), Eval(평가)로 계속 개선한다.

AgentCost는 이 원칙을 아래 구조로 구현한다.

```text
사용자 입력 또는 사용량 데이터
-> Work Item(업무 단위) 생성
-> Trust Gate(신뢰/보안 검사)
-> deterministic engine(결정론적 계산 엔진)
-> Operating Agent(운영 에이전트, 역할별 AI 팀원) 라우팅
-> RAG / Ledger / Asset / Snapshot 조회
-> AI가 해석, 후보, 리스크, 다음 질문 작성
-> Human(사람)이 Adopt / Reject / Hold 선택
-> Decision Log / Operating Ledger 기록
-> Report / PDF 또는 다음 Work Item 생성
```

## 1. 용어 해석표

영어 용어는 코드와 제품에 그대로 남아 있으므로, 이 문서에서는 첫 번째 의미를 한국어로 고정한다. 파일명, 함수명, API 필드명 같은 코드 식별자는 원문을 유지하되, 운영 의미는 아래 표의 한국어 해석을 따른다.

| 영어 용어 | 한국어 해석 | 이 프로젝트에서의 의미 |
|---|---|---|
| AI-Native | AI 네이티브 | AI를 부가 기능이 아니라 업무 흐름의 기본 구성원으로 넣는 방식 |
| AgentCost | 에이전트 비용 운영 제품 | LLM 비용, 마진, 정책 결정을 돕는 현재 제품명/방향 |
| LLM Cost Simulator | 대형 언어 모델 비용 시뮬레이터 | 기존 비용 계산기에서 출발한 제품의 기술적 뿌리 |
| Work Item | 업무 단위 | AI나 사람이 처리해야 하는 추적 가능한 최소 작업 |
| State Machine | 상태 머신 | 업무가 어떤 상태에서 어떤 조건으로 다음 상태로 넘어가는지 정의한 흐름 |
| Transition | 상태 전이 | 한 상태에서 다른 상태로 넘어가는 행위 |
| Trigger / Event | 트리거 / 이벤트 | 상태 전이를 일으키는 입력, 시간, 버튼, 외부 시스템 변화 |
| JSON Schema | JSON 스키마 | 입력/출력 데이터가 가져야 하는 필드와 구조 |
| Operating Agent | 운영 에이전트 | 특정 업무 역할을 맡은 AI 팀원 |
| Operating Asset | 운영 자산 | 운영 에이전트가 책임지는 문서, 데이터, 원장, 정책, 스냅샷 |
| Agentic Runtime | 에이전트 실행 런타임 | 여러 AI 팀원을 라우팅하고 도구를 호출하는 실행 계층 |
| Supervisor | 감독자 | 여러 운영 에이전트의 응답을 모아 최종 답변을 합성하는 역할 |
| Committee | 위원회 | 한 명이 아니라 primary/reviewer 에이전트가 같이 검토하는 실행 방식 |
| All Hands | 전체 회의 | 모든 운영 에이전트를 호출하는 실행 방식 |
| Trust Gate | 신뢰/보안 관문 | raw prompt, API key, PII 같은 위험 입력을 막는 검사 단계 |
| RAG | 검색 증강 생성 | 외부/내부 문서를 검색해 AI 답변의 근거로 붙이는 방식 |
| Rule | 규칙 | 결정론적 검증, 계산, 조건 분기, 차단 로직 |
| Human | 사람 | 최종 승인자, 책임자, 의사결정자 |
| Decision Log | 의사결정 기록 | 사람이 어떤 결정을 했는지 남기는 기록 |
| Operating Ledger | 운영 원장 | 결정뿐 아니라 담당 에이전트, 근거, 영향, 후속 조치까지 남기는 기록 |
| Guardrail | 안전장치 | AI가 하면 안 되는 행동과 차단 조건 |
| Harness | 하네스 | 테스트, 실행 규칙, 검증 절차를 묶은 작업 통제 장치 |
| Eval Metrics | 평가 지표 | AI 팀원의 품질, 안전, 비즈니스 효과를 측정하는 지표 |
| Trace | 추적 기록 | 어떤 도구와 상태를 거쳐 답이 나왔는지 남기는 실행 경로 |
| P0 / P1 / P2 | 핵심 / 중요 / 확장 범위 | 지금 반드시 해야 할 것, 다음 단계, 장기 확장을 나누는 우선순위 |
| MVP | 최소 기능 제품 | 가장 작은 검증 가능한 제품 범위 |
| Adopt / Reject / Hold | 채택 / 거절 / 보류 | AI 제안을 사람이 어떻게 처리했는지 남기는 선택지 |
| deterministic | 결정론적 | 같은 입력이면 같은 출력이 나오는 계산 방식 |
| preview | 미리보기 | 실제 운영 완료가 아니라 검토용 결과 |
| unavailable | 사용 불가 | 필요한 production 환경이나 근거가 없어 완료로 볼 수 없는 상태 |
| connector | 외부 연결 도구 | Slack, Stripe, billing 같은 외부 시스템 연결 |
| idempotency | 멱등성 | 같은 실행을 여러 번 해도 결과가 중복으로 망가지지 않는 성질 |
| rollback | 되돌리기 | 외부 변경을 취소하거나 복구하는 절차 |
| stage | 단계 | 현재 업무가 어느 처리 단계에 있는지 나타내는 값 |
| primary agent | 주 담당 에이전트 | 해당 질문을 주도해서 답하는 AI 팀원 |
| reviewer agent | 검토 에이전트 | 주 담당 에이전트의 답을 보완하거나 위험을 보는 AI 팀원 |
| read-only | 읽기 전용 | 조회만 가능하고 데이터 변경은 못 하는 권한 |
| snapshot | 스냅샷 | 특정 시점의 입력, 계산 결과, 정책 상태를 고정한 기록 |
| evidence | 근거 | AI 답변이나 결정 후보를 뒷받침하는 문서, 데이터, source |
| risk card | 리스크 카드 | 제안의 위험, 조건, 안전장치를 요약한 카드 |
| ref | 참조값 | `source:*`, `tool:*`, `asset:*`, `decision:*`처럼 근거를 추적하는 식별자 |
| production env | 운영 환경 | 실제 사용자/데이터/DB/connector가 연결된 배포 환경 |
| success | 성공 | 실제 조건이 충족되어 완료된 상태. preview와 구분해야 한다 |
| blocked | 차단됨 | 안전, 데이터, 승인 조건 부족으로 다음 단계로 갈 수 없는 상태 |
| needs_mapping | 매핑 필요 | 데이터 연결은 가능하지만 customer_id, plan_id, revenue 같은 매핑이 부족한 상태 |
| preview_ready | 미리보기 가능 | 검토용 결과는 볼 수 있지만 운영 완료로 보기는 이른 상태 |
| payload | 요청 본문 | API나 report 생성에 전달하는 구조화 데이터 묶음 |
| artifact | 산출물 | PDF, report, snapshot처럼 저장되거나 공유되는 결과물 |
| persistence | 저장/영속화 | 새로고침이나 다음 실행 후에도 남도록 DB나 storage에 저장하는 것 |
| row | 행/레코드 | DB나 ledger에 저장되는 한 줄 기록 |
| customer-facing surface | 고객에게 보이는 화면 | 내부 debug ref를 숨겨야 하는 사용자용 UI |
| smoke check | 빠른 동작 확인 | 전체 검증 전 핵심 흐름이 실제 화면에서 보이는지 확인하는 테스트 |
| runtime logs | 실행 로그 | agent나 API가 실행되며 남긴 로그 |
| component/lib tests | 컴포넌트/라이브러리 테스트 | UI 컴포넌트와 순수 함수의 회귀를 막는 테스트 |
| baseline | 기준선 | 비교 대상이 되는 기존 비용, 기존 모델, 기존 정책 |
| provider runtime | 모델 제공자 실행 경로 | 실제 LLM provider 호출이 가능한 실행 환경 |
| connector ledger | 외부 연결 원장 | connector 실행, 승인, 실패, rollback을 추적하는 기록 |
| storage | 저장소 | report artifact나 snapshot을 보관하는 저장 계층 |

## 2. 현재 프로젝트 결론

### 무엇인가

AgentCost에는 이미 AI를 팀원처럼 다루는 구조가 있다. 단, 사람 대신 결정하는 완전 자율 직원이 아니라, 역할과 책임이 있는 분석가, 검토자, 초안 작성자에 가깝다.

가장 중요한 네 축은 다음과 같다.

1. Operating Agents(운영 에이전트): 11개 역할별 AI 팀원.
2. Agentic Runtime(에이전트 실행 런타임): supervisor/committee 방식으로 에이전트를 호출.
3. Decision Log / Operating Ledger(의사결정 기록 / 운영 원장): 사람의 최종 판단과 근거를 기록.
4. AI Team Cost Simulator(AI 팀 비용 시뮬레이터): AI를 비용 항목이 아니라 업무를 맡는 팀원으로 모델링.

### 왜 하는가

단순 비용 계산기는 "얼마나 드는가"만 말한다. 하지만 실제 AI SaaS 운영자는 다음 질문이 필요하다.

- 어떤 AI 업무가 돈을 새게 만드는가?
- 어떤 고객이나 기능이 마진을 깨는가?
- 어떤 정책 후보를 채택, 거절, 보류해야 하는가?
- 이 판단의 근거와 책임자는 누구인가?
- 나중에 같은 결정을 다시 검토할 수 있는가?

AI 팀원화는 이 질문에 답하기 위한 구조다. AI가 계산을 대신하는 것이 아니라, 계산 결과와 근거를 해석하고 사람의 결정을 기록 가능한 운영 흐름으로 만든다.

### 어떻게 돌아가는가

1. 사용자가 CSV 또는 summary JSON을 넣는다.
2. Trust Gate가 위험 입력과 스키마 문제를 검사한다.
3. TypeScript 순수 함수가 비용, 마진, 손실, 정책 후보를 계산한다.
4. Agentic Runtime이 현재 stage에 맞는 Operating Agent를 고른다.
5. AI는 read-only tool(읽기 전용 도구)로 snapshot, evidence, risk card, decision history를 조회한다.
6. AI는 요약, 후보, 리스크, 다음 질문을 만든다.
7. 사람은 Adopt / Reject / Hold 중 하나를 선택한다.
8. 선택값과 근거가 Decision Log 또는 Operating Ledger에 남는다.
9. 조건이 충족되면 report/PDF artifact가 생성된다.

### 인수인계 포인트

- 계산은 AI가 하지 않는다. `src/lib/calculator.ts`, `src/lib/format.ts` 계열을 우선 확인한다.
- AI는 해석과 추천만 한다. `agent_service/agentic_runtime.py`를 확인한다.
- 운영 에이전트 목록은 `src/features/operating-assets/lib/operatingAssets.ts`가 기준이다.
- Money Leak Run 흐름은 `src/features/report-first/lib/moneyLeakRun.ts`와 `ReportFirstDiagnosisWorkspace.tsx`가 기준이다.
- production 환경이 없으면 success가 아니라 unavailable/preview/blocked로 보여야 한다.

## 3. Part 1 - Work Item(업무 단위)

### 무엇인가

Work Item(업무 단위)은 AI나 사람이 처리해야 하는 가장 작은 추적 단위다. "리포트 만들기"처럼 큰 말이 아니라, "사용량 CSV를 검사한다", "손해 고객을 찾는다", "정책 후보를 선택한다"처럼 상태와 담당자를 붙일 수 있어야 한다.

### 왜 하는가

업무 단위가 없으면 AI가 한 번 답변하고 끝난다. 그러면 다음 담당자가 아래 내용을 알 수 없다.

- 지금 어떤 작업을 처리 중인지.
- 누가 담당해야 하는지.
- 어떤 입력을 보고 판단했는지.
- 사람 승인이 필요한지.
- 완료인지, 보류인지, 차단인지.

Work Item을 두면 AI의 답변이 업무 기록이 된다. 이것이 첨부 PDF에서 말한 "AI 네이티브 조직"의 출발점이다.

### 어떻게 돌아가는가

AgentCost에서 Work Item 후보는 다음과 같다.

| Work Item | 한국어 설명 | 담당 AI 팀원 | 사람이 결정할 것 |
|---|---|---|---|
| Usage import review | 사용량 CSV/summary가 분석에 써도 되는지 검사 | Usage Data Ingestion Agent, Trust / Security / Compliance Agent | 민감정보 차단 여부 |
| Money Leak diagnosis | 손해 고객, 마진 깨는 기능, 정책 후보 찾기 | Customer Diagnostic / Pricing Agent, Finance Ops Agent | Adopt / Reject / Hold |
| Pricing policy draft | credit/cap/overage/routing 정책 후보 만들기 | Pricing & Revenue Ops Agent | 실제 가격정책 반영 여부 |
| Model routing review | 비싼 모델, cache, batch, output cap 조정안 검토 | Optimization & Routing Agent, Model & Inference Research Agent | 품질 리스크 감수 여부 |
| Provider/source freshness | provider/model 가격과 출처 최신성 확인 | Provider & API Intelligence Agent | Fact Ledger 업데이트 승인 |
| Report artifact | 내부 공유용 report/PDF 만들기 | CFO Reporter Agent, Knowledge & Release Ops Agent | 공유 가능 여부 |
| Connector execution | Slack/Stripe/billing/alert 실행 전 검토 | Finance Ops Agent, Trust / Security / Compliance Agent | 외부 변경 승인 |

기본 Work Item 스키마 예시:

```json
{
  "work_item_id": "WI-2026-05-26-money-leak-run",
  "type": "money_leak_diagnosis",
  "current_state": "decision_required",
  "owner_agent_id": "customer_diagnostic_pricing",
  "input_refs": ["usage:snapshot:...", "asset:customer_cost_review"],
  "output_refs": [],
  "requires_human": true,
  "confidence": 0.86,
  "next_state": "decision_selected"
}
```

필드 해석:

- `work_item_id`: 업무 단위 식별자.
- `type`: 업무 종류.
- `current_state`: 현재 상태.
- `owner_agent_id`: 담당 운영 에이전트.
- `input_refs`: 이 판단에 사용한 입력 근거.
- `output_refs`: 생성된 산출물 또는 decision ref.
- `requires_human`: 사람 검토 필요 여부.
- `confidence`: AI 판단 신뢰도. 최종 승인 신뢰도가 아니라 참고값이다.
- `next_state`: 조건 충족 시 다음 상태.

### 인수인계 포인트

새 기능을 만들 때 먼저 "이 기능의 Work Item은 무엇인가?"를 정해야 한다. 이 질문에 답하지 못하면 아직 운영 업무가 아니라 화면 기능에 머문 것이다.

## 4. Part 2 - State Machine(상태 머신)

### 무엇인가

State Machine(상태 머신)은 Work Item이 어떤 상태를 지나며, 어떤 조건에서 다음 상태로 넘어가는지 정한 흐름이다.

Money Leak Run(돈이 새는 지점 진단 실행)의 현재 상태 레일:

```text
CSV/summary
-> Trust Gate
-> Money Leak
-> Decision Candidate
-> Adopt/Reject/Hold
-> PDF Report
```

한국어로 풀면:

```text
사용량 입력
-> 신뢰/보안 검사
-> 손실/마진 문제 진단
-> 결정 후보 제시
-> 사람이 채택/거절/보류 선택
-> PDF 리포트 생성
```

### 왜 하는가

상태 머신이 없으면 AI가 너무 빨리 "완료"라고 말한다. 하지만 이 프로젝트에서는 production env, Supabase, connector ledger, provider proof가 없으면 완료처럼 보여주면 안 된다. 상태 머신은 어떤 조건이 없을 때 `blocked`, `needs_mapping`, `preview_ready`, `production_report_unavailable` 같은 상태로 멈추게 해준다.

### 어떻게 돌아가는가

| 상태 | 한국어 의미 | 통과 조건 | 막히는 경우 |
|---|---|---|---|
| input | CSV 또는 summary JSON 입력 | 필수 컬럼과 구조가 있음 | 입력 없음, schema 불일치 |
| trust | Trust Gate 검사 | raw prompt/API key/PII 없음 | 민감정보, trustInspection 누락 |
| money_leak | 손실/마진 진단 | deterministic diagnosis 생성 | revenue mapping 부족 |
| candidate | 정책 후보 선택 | decision candidate 존재 | 후보 없음 |
| decision_choice | 사람의 Adopt/Reject/Hold | 명시 선택 있음 | 기본값으로 자동 선택 금지 |
| pdf | report artifact 생성 | persistence 성공 | storage/API 실패 |

코드 기준:

- 상태 정의: `src/features/report-first/lib/moneyLeakRun.ts`
- 진단 gate: `src/features/report-first/lib/diagnosis.ts`
- UI 흐름: `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx`
- Trust 검사: `src/features/trust/lib/securityMiddleware.ts`

### 인수인계 포인트

상태를 추가할 때는 UI label만 추가하면 안 된다. 반드시 다음 네 가지가 같이 있어야 한다.

- 상태 이름.
- 진입 조건.
- 다음 상태로 넘어가는 조건.
- 실패/차단 상태의 사용자 문구.

## 5. Part 3 - Operating Agents(운영 에이전트)

### 무엇인가

Operating Agent(운영 에이전트)는 역할별 AI 팀원이다. AgentCost에는 11개 운영 에이전트가 있고, 각 에이전트는 자기 업무와 소유 자산을 가진다.

### 왜 하는가

AI를 하나의 "똑똑한 챗봇"으로 두면 책임이 흐려진다. 누가 가격 출처를 봤는지, 누가 보안 위험을 봤는지, 누가 리포트를 썼는지 구분되지 않는다. 운영 에이전트는 이 문제를 막는다.

### 어떻게 돌아가는가

| Agent | 한국어 역할 | 소유 자산 |
|---|---|---|
| Provider & API Intelligence Agent | 공식 가격, API 조건, 출처 최신성 담당 | `provider_registry` |
| Model & Inference Research Agent | 모델 적합도, 품질 가정, 라우팅 근거 담당 | `model_perf_matrix` |
| Cost Modeling Agent | 비용 공식과 마진 정의 담당 | `cost_formula_registry` |
| Usage Data Ingestion Agent | 사용량 CSV/export 정규화와 schema mapping 담당 | `usage_schema_mapping` |
| Cost Engine / QA Agent | 계산 스냅샷, refs, 회귀 테스트 담당 | `cost_formula_registry`, `calculation_snapshots` |
| Optimization & Routing Agent | cache, routing, batch, output cap, review gate 제안 담당 | `optimization_playbook` |
| Customer Diagnostic / Pricing Agent | 손해 고객, 월간 비용 리뷰, plan-level margin 담당 | `customer_cost_review` |
| Pricing & Revenue Ops Agent | credit, overage, cap, pricing scenario 담당 | `pricing_policy_library` |
| Trust / Security / Compliance Agent | PII redaction, retention, audit posture 담당 | `security_runbook` |
| Finance Ops Agent | 자체 serving cost, runway, billing readiness 담당 | `pricing_policy_library`, `customer_cost_review`, `operating_ledger` |
| Knowledge & Release Ops Agent | changelog, runbook, release note, ledger 담당 | `operating_ledger` |

운영 원칙:

- 각 Agent는 자기 asset을 중심으로 말한다.
- 다른 Agent의 영역을 침범하지 않는다.
- 모든 Agent는 근거 ref를 남긴다.
- 실제 mutation(외부 변경)은 기본 금지다.
- external write(외부 쓰기)는 connector, approval, idempotency, rollback, ledger 조건이 모두 있어야 한다.

### 인수인계 포인트

운영 에이전트 정의 파일:

- `src/features/operating-assets/lib/operatingAssets.ts`

새 에이전트를 추가할 때는 agent label만 넣으면 안 된다. 반드시 다음을 같이 정의한다.

- agent id.
- 한국어로 설명 가능한 역할.
- activation 상태.
- owned asset.
- read-only tool 권한.
- human approval 필요 여부.

## 6. Part 4 - Agentic Runtime(에이전트 실행 런타임)

### 무엇인가

Agentic Runtime(에이전트 실행 런타임)은 여러 운영 에이전트를 실제로 호출하고, 결과를 합성하는 실행 계층이다. 현재 핵심 파일은 `agent_service/agentic_runtime.py`다.

### 왜 하는가

AI 팀원이 여러 명이면 누가 답해야 하는지 정해야 한다. 질문 하나에 항상 모든 에이전트를 부르면 느리고 시끄럽다. 반대로 한 에이전트만 부르면 리스크 검토가 빠질 수 있다. 그래서 stage와 질문에 따라 담당자를 라우팅한다.

### 어떻게 돌아가는가

1. 사용자의 질문과 현재 stage를 받는다.
2. `route_operating_agents`가 담당 에이전트를 고른다.
3. 실행 모드를 결정한다.
4. Supervisor가 `call_*_agent` 도구로 실제 agent를 호출한다.
5. 각 agent는 read-only tool로 근거를 조회한다.
6. Supervisor가 응답을 합성한다.
7. 결과에는 readiness, warnings, refs, next questions가 들어간다.

실행 모드 해석:

| 실행 모드 | 한국어 의미 | 언제 쓰는가 |
|---|---|---|
| `stage_committee` | 단계별 위원회 | 기본값. primary agent와 reviewer agent가 같이 검토 |
| `single_agent` | 단일 에이전트 | 특정 역할에만 물어볼 때 |
| `all_hands` | 전체 회의 | 전체 운영 조직 의견이 필요할 때 |

출력에서 봐야 할 필드:

- `decisionReadiness`: 결정을 내려도 되는지 상태.
- `nextQuestions`: 사람이 확인해야 할 다음 질문.
- `warnings`: 경고와 불완전 상태.
- `evidenceRefs`: 근거 ref.
- `assetRefs`: 연결된 운영 자산.
- `agentRoute`: 어떤 에이전트가 불렸는지.

### 인수인계 포인트

Supervisor는 memory에서 바로 답하면 안 된다. 반드시 operating agent 또는 read-only tool을 통해 근거를 가져와야 한다. 이 원칙이 깨지면 "팀원 회의"가 아니라 "한 AI의 즉흥 답변"이 된다.

## 7. Part 5 - AI / Rule / RAG / Human 역할 분담

### 무엇인가

첨부 PDF는 AI 네이티브 업무에서 AI, Rule, RAG, Human의 책임을 나누라고 말한다. AgentCost도 같은 원칙을 따라야 한다.

### 왜 하는가

LLM은 자연어 해석과 요약에는 강하지만, 숫자 계산과 최종 승인에는 위험하다. 반대로 Rule은 정확하지만 모호한 맥락 해석은 못 한다. RAG는 근거를 찾지만 판단을 대신하지 않는다. Human은 최종 책임을 진다.

### 어떻게 돌아가는가

| 역할 | 한국어 의미 | 맡는 일 | 하면 안 되는 일 |
|---|---|---|---|
| AI | 인공지능 해석자 | 요약, 설명, 후보, 리스크, 다음 질문 | 비용/마진 직접 계산, 최종 승인 |
| Rule | 결정론적 규칙 | schema validation, NaN guard, report eligibility, 상태 전이 | 모호한 자연어 판단 확정 |
| RAG | 근거 검색 | 공식 문서, benchmark evidence, decision history 조회 | Fact Ledger 승인 없이 숫자 권위로 행동 |
| Human | 사람 승인자 | Adopt / Reject / Hold, billing/connector 승인 | 기록 없는 암묵 승인 |

프로젝트 헌법과 연결:

- 모든 비용 계산은 `src/lib/calculator.ts`의 단일 경로를 통과한다.
- 모든 사용자 표시 숫자는 `src/lib/format.ts`를 통과한다.
- production env가 없으면 실행 완료처럼 렌더하지 않는다.
- demo/static seed는 production evidence처럼 보이면 안 된다.

### 인수인계 포인트

AI 관련 새 기능을 만들 때 코드 리뷰 질문은 하나다.

```text
이 AI가 지금 계산하거나 승인하고 있나, 아니면 deterministic 결과를 해석하고 사람의 결정을 기다리고 있나?
```

앞쪽이면 위험하다. 뒤쪽이면 프로젝트 방향과 맞다.

## 8. Part 6 - Permission(권한)과 Tool Contract(도구 계약)

### 무엇인가

Permission(권한)은 어떤 Agent가 무엇을 읽고, 쓰고, 실행하고, 승인할 수 있는지 정한 것이다. Tool Contract(도구 계약)는 AI가 호출할 수 있는 도구와 금지된 도구를 명확히 적은 규칙이다.

### 왜 하는가

AI 팀원에게 모든 권한을 주면 작은 해석 오류가 외부 billing 변경, 고객 알림, 가격정책 변경으로 이어질 수 있다. 최소 권한 원칙이 필요하다.

### 어떻게 돌아가는가

현재 Python runtime 방향은 read-only tool 중심이다.

허용되는 read-only tool 예:

- `lookup_snapshot_value`: 스냅샷 값 조회.
- `retrieve_threshold_policy`: threshold 정책 조회.
- `retrieve_metric_flags`: 지표 flag 조회.
- `retrieve_risk_cards`: risk card 조회.
- `retrieve_benchmark_evidence`: benchmark 근거 조회.
- `retrieve_decision_history`: 과거 결정 기록 조회.
- `retrieve_fact_sources`: fact source 조회.
- `retrieve_operating_assets`: 운영 자산 조회.
- `retrieve_provider_registry`: provider registry 조회.
- `retrieve_model_perf_matrix`: 모델 성능 매트릭스 조회.
- `retrieve_operating_ledger`: 운영 원장 조회.

금지되는 tool 성격:

- cost calculation: 비용 계산.
- margin calculation: 마진 계산.
- savings estimation: 절감액 추정.
- budget delta calculation: 예산 차이 계산.
- decision mutation: 의사결정 기록 변경.
- billing mutation: 결제/청구 변경.

권한 표:

| Agent 종류 | Read(읽기) | Write(쓰기) | Execute(실행) | Approve(승인) |
|---|---|---|---|---|
| Diagnostic / Research | snapshot, evidence, registry | 없음 | read-only retrieval | 없음 |
| Reporting | deterministic output, decision refs | report draft only | artifact draft request | 없음 |
| Trust / Compliance | trust inspection, security runbook | warning/review note | block/allow snapshot gate | 없음 |
| Finance / Pricing Ops | pricing library, operating ledger | draft policy only | connector preview only | 없음 |
| Human owner | 관련 근거 전체 | decision row, approval row | approved connector only | 최종 승인 |

### 인수인계 포인트

새 tool을 추가할 때는 "편하니까 AI에게 실행 권한을 준다"가 아니라, 아래 질문을 먼저 통과해야 한다.

1. 이 tool은 read-only인가?
2. write 또는 execute라면 human approval이 어디에 남는가?
3. 실패하면 rollback이 가능한가?
4. 같은 요청이 두 번 실행돼도 idempotency가 보장되는가?
5. Operating Ledger에 기록되는가?

## 9. Part 7 - Guardrail(안전장치) / Harness(하네스)

### 무엇인가

Guardrail(안전장치)은 AI가 해서는 안 되는 행동을 막는 규칙이다. Harness(하네스)는 테스트, 실행 절차, 검증 기준을 묶어서 작업이 선을 넘지 않게 하는 운영 장치다.

### 왜 하는가

AI는 그럴듯한 답을 만들 수 있다. 하지만 AgentCost에서는 그럴듯함보다 중요한 것이 있다.

- 민감정보를 저장하지 않는 것.
- 없는 production 연결을 성공처럼 말하지 않는 것.
- 사람이 고르지 않은 결정을 자동으로 고르지 않는 것.
- 숫자를 hallucination(환각)하지 않는 것.

### 어떻게 돌아가는가

공통 Guardrail:

- JSON schema를 어긴 입력은 Work Item으로 승격하지 않는다.
- raw prompt, API key, secret, PII 후보는 Trust Gate에서 차단하거나 needs_mapping으로 보낸다.
- AI는 숫자를 직접 계산하지 않고 deterministic output을 인용한다.
- AI summary는 decision reason 초안일 뿐 최종 승인 기록이 아니다.
- baseline, RAG, provider runtime, connector ledger가 없으면 `unavailable`, `deterministic_preview`, `connector_not_configured`를 쓴다.
- report export는 decisionChoice 없이 열리지 않는다.
- external mutation은 approval, idempotency, rollback, ledger가 없으면 금지한다.
- 실패한 test, blocked state, unavailable state를 성공처럼 말하지 않는다.

Money Leak Run 전용 Guardrail:

- Summary JSON은 `UsageImportSummary`와 `trustInspection`이 있어야 한다.
- 자연어 summary는 파싱하지 않는다.
- Trust-blocked CSV는 diagnosis preview와 report action을 만들 수 없다.
- 실제 revenue mapping이 없으면 preview만 허용하고 PDF는 잠근다.
- Adopt / Reject / Hold 중 하나를 사람이 직접 선택해야 PDF draft로 넘어갈 수 있다.

### 인수인계 포인트

Guardrail은 문구가 아니라 테스트와 상태로 남아야 한다. 새 guardrail이 생기면 다음도 같이 있어야 한다.

- 차단 조건.
- 사용자에게 보일 reason.
- 테스트 케이스.
- 우회가 가능한지 여부.
- 사람이 승인하면 다음 상태로 갈 수 있는지 여부.

## 10. Part 8 - Decision Log(의사결정 기록) / Operating Ledger(운영 원장)

### 무엇인가

Decision Log는 사람이 어떤 결정을 했는지 남기는 기록이다. Operating Ledger는 그 결정을 더 운영적으로 확장한 원장이다. 즉, 누가, 어떤 agent 도움을 받아, 어떤 근거로, 어떤 변경 후보를, 어떻게 처리했는지 남긴다.

### 왜 하는가

AI 팀원 운영에서 가장 위험한 것은 "그때 왜 그렇게 했지?"가 남지 않는 것이다. Decision Log와 Operating Ledger는 다음 실행의 기억이자 감사 추적이다.

### 어떻게 돌아가는가

Operating Ledger row 예시:

```json
{
  "workstream": "money_leak_run",
  "source": "report-first-diagnosis",
  "agent_used": "customer_diagnostic_pricing",
  "proposed_change": "Move heavy RAG usage to credit/cap policy",
  "human_decision": "hold",
  "artifact_updated": "report-artifact:...",
  "impact": {
    "margin_risk": "reduced_if_adopted"
  },
  "follow_up": "Confirm revenue mapping and customer communication",
  "tool_refs": ["tool:diagnosis"],
  "risk_refs": ["risk:pricing-change"],
  "threshold_snapshot": "threshold:...",
  "fact_source_snapshot": "source:...",
  "ai_mode": "deterministic_preview"
}
```

한국어 해석:

- `workstream`: 어떤 업무 흐름인지.
- `source`: 어떤 화면/기능에서 나온 기록인지.
- `agent_used`: 어떤 AI 팀원이 관여했는지.
- `proposed_change`: 제안된 변경.
- `human_decision`: 사람의 최종 선택.
- `artifact_updated`: 업데이트된 산출물.
- `impact`: 예상 영향.
- `follow_up`: 다음 조치.
- `tool_refs`: 사용한 도구 근거.
- `risk_refs`: 붙은 리스크 근거.
- `threshold_snapshot`: 당시 threshold 정책.
- `fact_source_snapshot`: 당시 사실 근거.
- `ai_mode`: provider LLM인지 deterministic preview인지.

### 인수인계 포인트

AI summary를 Decision Log로 착각하면 안 된다. AI summary는 초안이고, 사람이 선택한 decisionChoice가 있어야 운영 기록이 된다.

## 11. Part 9 - Report / PDF 생성 흐름

### 무엇인가

Report/PDF는 예쁜 다운로드 파일이 아니라, 운영 결정의 증거물이다.

### 왜 하는가

사용자가 돈 문제를 이해하고 팀과 공유하려면 "계산 화면"보다 "결정 가능한 리포트"가 필요하다. 단, 결정 없이 리포트를 만들면 AI가 결정을 대신한 것처럼 보일 수 있다.

### 어떻게 돌아가는가

현재 Money Leak Run의 report 흐름:

1. 사용량 CSV 또는 summary JSON을 입력한다.
2. Trust Gate가 snapshot 허용 여부를 판단한다.
3. diagnosis가 손해 고객, 마진 깨는 기능, 정책 후보를 만든다.
4. 사용자가 decision candidate를 선택한다.
5. 사용자가 Adopt / Reject / Hold를 명시한다.
6. report payload에 selected candidate, decisionChoice, refs, trust status가 들어간다.
7. persistence가 성공하면 PDF artifact를 보여준다.
8. storage가 없거나 report API가 실패하면 `storage_not_configured` 또는 `production_report_unavailable`을 보여준다.

정식 ledger-backed report 조건:

```text
explicit decisionChoice
-> decision row persisted
-> report artifact persisted
-> download visible
```

한국어 해석:

```text
사람이 선택한 결정값 존재
-> 의사결정 row 저장
-> 리포트 산출물 저장
-> 다운로드 표시
```

### 인수인계 포인트

first pass에서는 decision row persistence가 아직 없어도 report payload에 explicit decisionChoice와 refs가 있으면 draft report까지 허용할 수 있다. 하지만 UI에서 이것을 ledger persisted라고 부르면 안 된다.

## 12. Part 10 - Log / Trace / Privacy

### 무엇인가

Log(로그)는 실행 기록이고, Trace(추적 기록)는 어떤 도구와 상태를 거쳐 결과가 나왔는지 남기는 경로다. Privacy(프라이버시)는 민감정보를 기록하지 않거나 안전하게 처리하는 정책이다.

### 왜 하는가

AI 팀원은 실수할 수 있다. 문제가 생겼을 때 원인을 찾으려면 어떤 입력, 어떤 agent, 어떤 tool, 어떤 state, 어떤 human decision이 있었는지 남아야 한다. 동시에 raw prompt, API key, PII는 남기면 안 된다.

### 어떻게 돌아가는가

기본 로그 스키마:

```json
{
  "timestamp": "2026-05-26T00:00:00+09:00",
  "agent_id": "customer_diagnostic_pricing",
  "work_item_id": "WI-2026-05-26-money-leak-run",
  "action_type": "propose_decision_candidate",
  "input_refs": ["usage:snapshot:..."],
  "output_refs": ["decision:diagnosis:pricing-policy"],
  "tool_refs": ["tool:diagnosis"],
  "confidence": 0.86,
  "human_override": false,
  "warnings": [],
  "privacy_status": "redacted"
}
```

한국어 해석:

- `timestamp`: 실행 시각.
- `agent_id`: 실행한 AI 팀원.
- `work_item_id`: 연결된 업무 단위.
- `action_type`: 수행한 행동.
- `input_refs`: 사용한 입력 근거.
- `output_refs`: 생성된 산출물 근거.
- `tool_refs`: 호출한 도구 근거.
- `confidence`: 신뢰도 참고값.
- `human_override`: 사람이 AI 판단을 덮어썼는지.
- `warnings`: 경고.
- `privacy_status`: 민감정보 처리 상태.

보존 원칙:

- raw prompt, API key, secret, PII를 로그에 직접 저장하지 않는다.
- 필요한 경우 redaction(가림 처리) 또는 hash(해시 처리)를 한다.
- retention policy(보존 정책)가 없는 raw upload는 장기 보존하지 않는다.
- audit 목적의 refs와 artifact id는 남긴다.
- customer-facing surface(고객 화면)에는 내부 ref를 기본으로 숨긴다.

### 인수인계 포인트

로그를 많이 남기는 것보다 안전하게 남기는 것이 중요하다. 특히 prompt 원문, 고객 식별정보, API key 후보는 "디버깅에 도움 된다"는 이유로 저장하면 안 된다.

## 13. Part 11 - Eval Metrics(평가 지표)

### 무엇인가

Eval Metrics(평가 지표)는 AI 팀원이 일을 잘하고 있는지 측정하는 기준이다.

### 왜 하는가

AI 팀원 운영은 느낌으로 개선하면 안 된다. 어떤 상태에서 막히는지, 어떤 결정이 보류되는지, 어떤 리포트가 실패하는지 지표로 봐야 한다.

### 어떻게 돌아가는가

| 구분 | AgentCost 지표 | 측정 위치 |
|---|---|---|
| 자동화 지표 | schema pass rate, Trust Gate block rate, diagnosis success, report artifact success | tests, runtime logs |
| 품질 지표 | evidence coverage, risk card attachment, decision readiness, rerender state sync | component/lib tests |
| 휴먼 지표 | Adopt / Reject / Hold 비율, human review frequency, rework count | Decision Log / Operating Ledger |
| 비즈니스 지표 | loss customer count, margin risk, monthly AI cost, top agent share, report repeat request | report-first, team-cost |
| 안전 지표 | connector blocked count, unavailable state count, raw prompt/API key detection | trust/security logs |

영어 지표 해석:

- schema pass rate: 스키마 통과율.
- block rate: 차단율.
- diagnosis success: 진단 성공률.
- evidence coverage: 근거 포괄도.
- decision readiness: 결정 가능 상태.
- rerender state sync: UI 상태 변경 후 값이 다시 맞게 갱신되는지.
- human review frequency: 사람 검토 빈도.
- rework count: 재작업 수.
- top agent share: 가장 큰 비용을 차지하는 agent 비중.

테스트 원칙:

- 상태 변화는 `rerender` 또는 실제 UI event로 검증한다.
- 단일 static `BASE_STATE`만으로 회귀를 막았다고 보지 않는다.
- pure function은 입력/출력 경계 테스트를 우선한다.
- production path가 없으면 fake success가 아니라 blocked/unavailable을 테스트한다.

### 인수인계 포인트

새 AI 팀원 기능은 "잘 작동한다"가 아니라 어떤 metric이 좋아져야 하는지 같이 정의해야 한다.

## 14. Part 12 - P0 / P1 / P2 범위

### 무엇인가

P0/P1/P2는 구현 우선순위다.

- P0: 지금 제품의 핵심으로 반드시 닫아야 하는 범위.
- P1: 중요하지만 activation criteria가 필요한 다음 단계.
- P2: 장기 확장.

### 왜 하는가

AI 팀원 기능은 만들 수 있는 것이 너무 많다. 범위를 나누지 않으면 product가 운영 콘솔처럼 복잡해지고, 사용자는 "그래서 돈 문제를 어떻게 해결하지?"를 놓친다.

### 어떻게 돌아가는가

P0: 이미 제품의 핵심으로 다루는 영역

- deterministic cost/margin/diagnosis 계산.
- Usage import와 attribution.
- Trust Gate.
- Operating Agents registry.
- Decision Log / Operating Ledger 개념.
- Money Leak Run의 explicit decision choice.
- report draft / artifact path.

P1: activation criteria가 필요한 영역

- Supervisor Agent-as-Tool orchestration 강화.
- Full vector RAG.
- Official docs change monitor.
- SDK/Gateway automatic collection.
- Slack/Email alerts.
- Stripe billing execution.
- customer-facing SaaS dashboard.
- retention/data room automation.

P2: 장기 확장

- 자동 recurring review.
- 외부 connector mutation의 승인 자동화.
- team/customer별 반복 리포트 상품화.
- benchmark marketplace.
- vLLM/GPU serving economics 확장.

P1/P2 activation 조건:

```text
deterministic input contract
-> source labeling
-> testable acceptance criteria
-> fallback behavior
-> human approval before mutation
```

한국어 해석:

```text
결정론적 입력 계약
-> 출처 라벨링
-> 테스트 가능한 인수 기준
-> 실패 시 대체 상태
-> 외부 변경 전 사람 승인
```

### 인수인계 포인트

P1/P2는 "언젠가 할 기능" 목록이 아니라, 어떤 조건이 충족되면 켤 수 있는 automation-ready module로 관리해야 한다.

## 15. Part 13 - 운영 개선 루프

### 무엇인가

운영 개선 루프는 AI 팀원이 실제 사용 중 쌓는 실패, 승인, 보류, 재작업 기록을 다시 정책과 모델 개선에 반영하는 과정이다.

### 왜 하는가

AI 팀원은 한 번 설계한다고 끝나지 않는다. 새로운 provider 가격, 고객 데이터, 보안 정책, 모델 성능 변화가 계속 생긴다. 기록을 보고 주기적으로 조정해야 한다.

### 어떻게 돌아가는가

```text
운영 데이터 수집
-> 실패/차단/승인/재작업 분석
-> 정책/가드레일 조정
-> 모델 또는 라우팅 개선
-> 테스트와 smoke로 검증
-> 배포/운영 반영
-> 다시 데이터 수집
```

주기와 담당:

| 주기 | 담당 | 확인할 것 |
|---|---|---|
| daily | Knowledge & Release Ops Agent | runbook, failure note, release note |
| weekly | Finance Ops Agent | margin risk, top loss customer, own serving cost |
| weekly | Trust / Security / Compliance Agent | blocked upload, retention, PII/API key detection |
| monthly | Provider & API Intelligence Agent | provider registry freshness |
| monthly | Model & Inference Research Agent | model routing assumptions |
| quarterly | Human owner / PM | product direction, pricing policy, external connector policy |

### 인수인계 포인트

운영 개선 루프는 제품 기능이 아니라 관리 습관이다. Decision Log와 Operating Ledger를 읽고 "무엇이 자주 보류되는지"를 봐야 한다.

## 16. Part 14 - 위험과 완화

### 무엇인가

AI 팀원화의 위험은 AI가 틀리는 것만이 아니다. 더 큰 위험은 틀렸는데도 완료처럼 보이거나, 사람이 승인하지 않았는데 실행된 것처럼 보이는 것이다.

### 왜 하는가

AgentCost는 비용, 가격정책, 고객 마진, billing과 연결될 수 있다. 그러므로 AI의 말은 운영 책임과 연결된다.

### 어떻게 완화하는가

| 위험 | 프로젝트에서 보이는 형태 | 완화 |
|---|---|---|
| AI가 결정을 대신함 | decisionChoice 없이 report/export 가능 | Adopt / Reject / Hold 필수 |
| 숫자 환각 | AI가 비용/마진을 직접 계산 | deterministic TypeScript engine만 계산 |
| fake production success | Supabase/connector/provider 없는 상태를 성공처럼 렌더 | unavailable / deterministic_preview / connector_not_configured 표시 |
| 민감정보 저장 | raw prompt, API key, PII 포함 CSV | Trust Gate block, redaction, retention policy |
| RAG 권위 과잉 | snippet을 Fact Ledger처럼 사용 | RAG는 근거 조회, 공식 숫자는 accepted source만 |
| connector 사고 | billing/alert 외부 mutation 실행 | approval, rollback, idempotency, ledger 전까지 blocked |
| 팀원 역할 혼선 | 모든 agent가 모든 것을 말함 | ownerAgentIds, allowed tools, asset refs로 제한 |

### 인수인계 포인트

위험 완화는 문구가 아니라 상태와 테스트로 구현되어야 한다. 특히 fake production success는 이 프로젝트에서 반복적으로 막아야 하는 핵심 회귀다.

## 17. Part 15 - 현재 구현 상태

### 확실히 구현된 축

- 11개 Operating Agents와 10개 Operating Assets registry.
- AI Team Configuration의 Research / CFO Reporter / Ops Analyst 역할, guardrails, reviewGate, budget.
- Python agent runtime의 supervisor/committee 라우팅.
- read-only tool 중심의 agent runtime.
- Trust Gate와 Money Leak Run 상태 레일.
- Decision choice가 필요한 report-first 흐름.
- production env/connector/persistence 부재 시 unavailable 계열 상태 표시 원칙.

### 아직 강화해야 할 축

- persisted decision row와 PDF artifact의 완전한 ledger-backed 연결.
- 실제 Supabase/Auth/Postgres/pgvector production tenant smoke.
- connector ledger와 billing/alert 실행의 production proof.
- full vector RAG와 accepted Fact Ledger의 명확한 연결.
- AI team run log를 repo 문서가 아니라 제품 데이터로 남기는 경로.

### 인수인계 포인트

현재 상태는 "AI 팀원화의 조직 설계와 주요 runtime은 있다"에 가깝다. 아직 "완전한 production 자율 운영 조직"은 아니다. 따라서 다음 담당자는 구현 상태를 말할 때 반드시 다음처럼 분리해야 한다.

```text
구현됨: role registry, read-only agent runtime, Trust Gate, decision choice gate.
부분 구현: report artifact persistence, ledger-backed decision row.
미완료/조건부: connector execution, production Supabase tenant, full vector RAG.
```

## 18. 새 AI 팀원 기능을 추가할 때 체크리스트

새 기능을 만들기 전 아래 질문에 답해야 한다.

1. 무엇인가: 이 기능의 Work Item은 무엇인가?
2. 왜 하는가: 어떤 비용, 마진, 신뢰, 운영 문제를 줄이는가?
3. 상태: State Machine에서 어느 상태를 만들거나 이동시키는가?
4. 담당: 담당 Operating Agent는 누구인가?
5. 자산: 그 Agent가 소유한 Operating Asset은 무엇인가?
6. 입력: 어떤 refs, snapshots, evidence를 읽는가?
7. 도구: 호출 가능한 read-only tool은 무엇인가?
8. 분담: AI / Rule / RAG / Human 중 누가 무엇을 맡는가?
9. 승인: 사람 승인이 필요한 지점은 어디인가?
10. 실패: 실패하면 어떤 unavailable / blocked / preview 상태를 보여주는가?
11. 기록: 어떤 Decision Log / Operating Ledger row가 남는가?
12. 평가: 어떤 Eval Metric으로 좋아졌는지 확인하는가?
13. 범위: P0인지, P1 activation-ready인지, P2인지 명확한가?

이 질문에 답하지 못하면 아직 "AI 팀원"이 아니라 "AI 기능"에 머무른 것이다.

## 19. 다음 담당자를 위한 빠른 파일 지도

| 보고 싶은 것 | 먼저 볼 파일 |
|---|---|
| 프로젝트 헌법과 금지 패턴 | `AGENTS.md` |
| 운영 에이전트와 자산 목록 | `src/features/operating-assets/lib/operatingAssets.ts` |
| AI 팀 구성과 guardrails | `src/features/team/lib/aiTeamConfiguration.ts` |
| Python agent supervisor/committee 런타임 | `agent_service/agentic_runtime.py` |
| Money Leak 상태 레일 | `src/features/report-first/lib/moneyLeakRun.ts` |
| Report-first diagnosis와 report payload | `src/features/report-first/lib/diagnosis.ts` |
| Money Leak UI 흐름 | `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx` |
| Trust Gate / PII / API key 차단 | `src/features/trust/lib/securityMiddleware.ts` |
| 운영 조직 구현 계획 | `docs/superpowers/plans/2026-05-24-agentcost-ai-native-operating-organization.md` |
| Money Leak Run 설계 | `docs/superpowers/specs/2026-05-26-agentpayroll-money-leak-run-design.md` |
| 회사 기록/ledger 운영 철학 | `docs/ai-native-company-recordkeeping.md` |

## 20. 한 줄 인수인계

AgentCost의 AI 팀원화는 "AI가 대신 결정하는 자동화"가 아니라, "AI가 역할별로 근거를 조회하고 후보를 만들며, 사람의 결정을 Decision Log와 Operating Ledger에 남기는 운영 조직"이다. 계산은 deterministic engine이 맡고, AI는 해석과 제안을 맡고, 사람은 승인과 책임을 맡는다.
