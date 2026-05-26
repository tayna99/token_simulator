# AgentPayroll SparkClaw Evidence Pack

작성일: 2026-05-26
상태: 지원서/데모용 초안
파일명 참고: 경로에는 기존 요청명 `agentcost`가 남아 있지만, 외부 제품명은 **AgentPayroll**로 고정한다.

## 1. 지원서 한 줄 정의

AgentPayroll은 AI-native SaaS 팀이 토큰/API/GPU/클라우드 비용 때문에 마진이 새는 고객과 기능을 찾고, 가격·cap·credit·model routing 결정을 사람 승인과 Ledger 기록으로 운영하게 돕는 AI Unit Economics OS입니다.

더 짧은 버전:

> AgentPayroll은 AI가 팀원이 되는 시대에, 그 AI 팀의 비용·마진·권한·결정 기록을 관리하는 CFO/COO 레이어입니다.

## 2. 첫 문장 초안

AI-native 팀은 적은 인원으로 빠르게 제품을 만들 수 있지만, 사용자가 늘수록 토큰/API/GPU 비용과 고객별 마진 손실이 보이지 않는 Token Valley에 빠집니다. AgentPayroll은 usage/revenue 데이터를 Trust Gate로 안전하게 받아, 손해 고객·마진 깨는 기능·가격정책 후보를 찾아내고, AI 운영 에이전트가 근거를 정리해 사람이 Adopt/Reject/Hold로 결정하도록 돕는 AI-native CFO/COO 레이어입니다.

## 3. 문제

AI 기능이 늘수록 비용은 요청 수, 토큰 수, 모델 선택, retry, RAG, agent run, GPU serving 구조에 따라 빠르게 커진다. 하지만 많은 초기 AI SaaS 팀은 이 비용을 고객별·기능별·플랜별 매출과 연결하지 못한다.

그 결과 다음 결정이 늦어진다.

- 어떤 고객이 많이 쓸수록 손해인지
- 어떤 AI 기능이 gross margin을 깨는지
- seat/flat pricing을 유지할지, usage cap/credit/overage/hybrid pricing으로 바꿀지
- 비싼 모델을 어디에 유지하고 어디에서 라우팅을 바꿀지
- 리포트를 대표, PM, finance, investor에게 공유할 수 있는지

핵심은 "토큰이 많이 든다"가 아니라 "AI 기능이 팔수록 돈이 되는지, 어떤 결정을 지금 내려야 하는지 모른다"입니다.

## 4. 해결

쉽게 말하면, AgentPayroll은 고객의 AI 사용량 파일과 매출 파일을 넣으면 안전한 데이터만 골라 분석하고, 어떤 고객이나 기능에서 돈이 새는지 찾은 뒤, 사람이 최종 결정을 기록하고 리포트로 뽑는 흐름이다.

지원서용 설명:

> 사용자는 AI 사용량 CSV와 매출 데이터를 업로드합니다. AgentPayroll은 먼저 raw prompt, API key, 개인정보가 없는지 검사한 뒤, 고객별·기능별·요금제별 AI 원가와 마진을 계산합니다. 그 결과 손해 고객, 마진을 깨는 기능, 가격정책 후보를 보여주고, 사람은 Adopt/Reject/Hold 중 하나로 최종 결정을 남깁니다. 이 결정과 근거는 Decision Log/Operating Ledger에 기록되고, 내부 공유용 AI Cost Snapshot 리포트로 정리됩니다.

제품 내부 흐름은 아래처럼 볼 수 있다.

| 단계 | 쉬운 의미 | 제품에서 하는 일 |
|---|---|---|
| AI 사용량 CSV + 매출 CSV | 고객이 가진 사용량/매출 파일 | 고객별 호출 수, 토큰 수, 모델, 기능명, 요금제, 매출을 받는다. |
| Trust Gate | 민감정보 검사 | raw prompt, API key, 개인정보가 들어오면 차단하거나 다시 요청한다. |
| 비용·마진 진단 | 정해진 공식으로 계산 | AI가 임의로 계산하지 않고 코드가 고객별·기능별·요금제별 원가와 마진을 계산한다. |
| Money Leak Run | 돈이 새는 지점 찾기 | 손해 고객, 마진 깨는 기능, 비싼 모델 사용 패턴을 찾는다. |
| Decision Candidate | 실행 후보 제안 | 사용량 제한, credit 과금, overage, 모델 라우팅 변경 같은 정책 후보를 만든다. |
| Adopt/Reject/Hold | 사람의 최종 판단 | 사람이 채택, 거절, 보류 중 하나를 직접 고른다. |
| Decision Log / Operating Ledger | 결정 기록 | 어떤 근거로 어떤 결정을 했는지 남긴다. |
| AI Cost Snapshot report | 공유용 리포트 | 대표, PM, 재무, 투자자에게 보여줄 수 있는 1장 리포트로 정리한다. |

AI는 계산을 대신하지 않는다. 계산은 deterministic TypeScript engine(같은 입력이면 같은 결과를 내는 코드)이 수행한다. AI 운영 에이전트는 snapshot(분석 결과 묶음), evidence(근거), risk(위험), decision history(이전 결정 기록)를 읽고 해석, 후보, 리스크, 다음 질문을 만든다. 최종 결정은 사람이 선택하고 기록으로 남긴다.

## 5. 1차 ICP

초기 고객은 production AI 기능을 운영 중인 B2B AI SaaS 팀이다.

강한 ICP 조건:

- 외부 고객이 쓰는 AI 기능이 이미 있다.
- 월 LLM/API 비용이 발생하고 증가 중이다.
- usage log 또는 summary를 export할 수 있다.
- customer_id, plan_id, feature, model, token/cost, revenue 또는 plan_price 중 일부를 연결할 수 있다.
- 이번 달 또는 다음 달에 pricing, usage limit, credit, overage, model routing 중 하나를 결정해야 한다.
- 리포트를 founder, PM, finance, investor, board 중 한 곳에 공유할 이유가 있다.

현재 검증 기준은 `AI Cost Snapshot 30만~100만 원` 유료 리포트를 살 가능성이 있는 고객인지 판별하는 것이다. 넓은 SaaS dashboard 관심은 제품 힌트로 기록하지만, Service MVP pass로 계산하지 않는다.

## 6. 첫 5분 가치

데모와 지원서에서는 기능을 많이 보여주지 않는다. Money Leak Run 하나만 보여준다.

첫 5분 화면 약속:

```text
usage CSV + revenue CSV 업로드
-> Trust Gate: raw prompt/API key/PII 차단 또는 미수집 확인
-> 이번 달 추정 비용 누수
-> 손해 고객
-> 마진 깨는 기능
-> 정책 후보
-> Adopt/Reject/Hold
-> PDF report gate
```

사용자가 느껴야 하는 문장:

- "이 고객은 손해입니다."
- "이 기능이 마진을 깨고 있습니다."
- "이 정책 후보는 지금 검토할 만합니다."
- "이 결정은 사람 선택으로 Ledger에 남습니다."

## 7. AI-native 운영 증거

지원서에서 가장 먼저 증명해야 할 것은 "AI를 많이 썼다"가 아니라 "AI를 업무 단위·역할·권한·검증·기록이 있는 팀으로 운용했다"는 점이다.

붙여넣기용 문장:

> 저는 AgentPayroll을 만들면서 AI를 단순 챗봇이 아니라 운영 에이전트로 나누어 사용했습니다. Usage Data Ingestion Agent, Trust/Security Agent, Customer Diagnostic Agent, Pricing Ops Agent, Finance Ops Agent 등이 각자 맡은 역할과 읽기 권한을 가지고, deterministic engine이 계산한 결과만 해석합니다. 최종 결정은 사람이 Adopt/Reject/Hold로 승인하고, 모든 판단은 Decision Log/Operating Ledger에 남깁니다.

현재 운영 에이전트 구조:

| Agent | 역할 | 산출물 |
|---|---|---|
| Customer Intake / Front Office Agent | 처음 온 고객의 상황을 묻고 ICP 적합성을 판단 | fit score, next action, interview notes |
| Data Readiness Agent | 고객이 어떤 데이터를 줄 수 있는지 확인 | data checklist, missing field list, safe export request |
| Usage Data Ingestion Agent | usage CSV/export 정규화와 schema mapping | safe usage summary, mapping warning |
| Trust / Security / Compliance Agent | raw prompt, API key, PII 차단 | Trust Gate status, blocked fields |
| Customer Diagnostic / Pricing Agent | 손해 고객, heavy user, plan margin 진단 | Money Leak insight, decision candidate |
| Pricing & Revenue Ops Agent | credit, overage, cap, hybrid pricing 후보 | policy draft, pricing scenario |
| Finance Ops Agent | unit economics, gross margin, COGS 검토 | margin risk, report summary |
| Cost Modeling Agent | 모델/토큰/요청 단위 원가 해석 | deterministic snapshot explanation |
| QA / Report Agent | report claim과 숫자 오류 확인 | AI Cost Snapshot report draft |
| Knowledge / Release Ops Agent | 근거 문서, release, source freshness 관리 | evidence refs, source status |
| PM Agent | PDCA loop와 execution backlog 정리 | validation ledger, next experiment |

고객을 맞이하는 intake는 단순 문의 응대가 아니라 AgentPayroll의 첫 번째 운영 레이어다. 다만 이 레이어 전체가 LLM agent 하나로만 동작하는 것은 아니다. form, checklist, deterministic scoring, Trust-safe data request, 사람이 하는 영업/인터뷰가 섞이고, AI는 그중 반복 질문, fit 판단 초안, 데이터 요청 문구, 다음 action 추천을 맡는다.

Intake 레이어의 흐름:

```text
첫 문의 또는 소개
-> Customer Intake / Front Office Agent
-> ICP scorecard
-> Data Readiness Check
-> Trust-safe Data Request
-> AI Cost Snapshot 제안
-> Review Call / Learning Loop
```

지원서용 문장:

> AgentPayroll의 AI 팀은 분석 화면에서만 시작하지 않습니다. 고객이 처음 들어오는 intake 단계부터 AI-native 운영 레이어가 작동합니다. Customer Intake Agent가 고객의 AI 기능 운영 여부, 월 LLM/API 비용, usage/revenue export 가능성, 가격·limit 결정 압박을 정리하고, Data Readiness Agent가 raw prompt 없이 분석 가능한 데이터를 안내합니다. 이 과정을 통과한 고객만 AI Cost Snapshot으로 넘어가며, 이후 Money Leak 진단과 사람의 Adopt/Reject/Hold 결정으로 이어집니다.

### 회사처럼 돌아갈 때의 팀 구성

AgentPayroll을 하나의 회사처럼 보면 아래 팀들이 함께 움직인다. 이 표는 "AI agent가 몇 개 있느냐"보다, 실제 고객 문의부터 리포트와 월간 반복 운영까지 어떤 기능이 필요한지를 보여준다.

| 회사 기능 | 담당 팀/agent | 하는 일 |
|---|---|---|
| Front Office / Intake | Intake Triage Agent, Discovery Agent | 고객 문의 접수, fit score, A/B/C 분류, 콜 질문 생성 |
| Data / Trust Ops | Data Ingestion Agent, Trust Agent, PII scanner, anonymizer | 데이터 요청, 민감정보 검사, 익명화, 분석 가능 범위 판단 |
| Cost Engineering | Cost Modeling Agent, Cost Engine / QA | 비용 공식, 계산 버전, 고객/기능/요금제별 원가 계산 |
| Diagnostic / Pricing Ops | Customer Diagnostic Agent, Pricing Ops, Optimization Agent | 손해 고객, 마진 깨는 기능, 정책 후보, 라우팅 후보 제안 |
| Report / Decision Ops | Report Agent, Decision Log Agent | 리포트 초안, 고객 결정 기록, 다음 달 추적 항목 생성 |
| Knowledge / Finance / Provider Ops | Provider Intelligence, Model Research, Finance Ops, Knowledge Ops | 가격/모델 근거, 원장, 월간 리뷰, 운영 문서 관리 |

### Agent와 Operating System의 차이

운영 시스템으로 넣은 것들이 전부 agent인 것은 아니다. Agent는 특정 단계에서 판단, 요약, 초안 작성, 다음 질문 생성을 맡는 작업자다. Operating System은 그 agent와 사람이 같은 방식으로 일을 끝내게 만드는 레일, 체크리스트, 스크립트, 폴더 구조, 로그, 승인 규칙이다.

정리하면 다음과 같다.

| 구분 | 예시 | 의미 |
|---|---|---|
| Agent / 작업 모드 | Intake Triage Agent, Discovery Agent, Data Ingestion Agent, Customer Diagnostic Agent, Report Agent | 특정 단계의 판단, 요약, 초안, 질문, 리스크 정리를 맡는다. |
| Script / deterministic tool | PII scanner, anonymizer, schema mapper, cost calculator, snapshot generator | AI가 아니라 코드가 반복 검사를 수행하고 같은 입력에 같은 결과를 낸다. |
| Gate / checklist | Data Health Check, Trust Gate, Report Review Checklist, report gate | 다음 단계로 넘어가도 되는지 막거나 승인한다. |
| Asset / registry | provider registry, pricing table, customer folder, report template, data request template | agent와 사람이 참조하는 운영 자산이다. |
| Log / ledger | audit_log.md, operating_ledger.md, Decision Log | 누가 언제 무엇을 했고 왜 승인/보류했는지 남긴다. |
| Human decision | 고객 수락 여부, 분석 범위 승인, 최종 리포트 승인, 정책 채택/거절/보류 | 책임과 외부 공유가 필요한 결정은 사람이 한다. |

따라서 AgentPayroll의 AI-native 운영 증거는 "에이전트가 많다"가 아니라 아래 구조를 보여주는 것이다.

```text
Agent가 초안을 만든다
-> Script가 검사/계산한다
-> Gate가 위험한 단계를 막는다
-> Human이 승인한다
-> Ledger가 처리 이력과 결정을 남긴다
```

지원서용 문장:

> AgentPayroll에서 agent는 운영 시스템의 전부가 아니라 한 구성요소입니다. 고객 intake, 데이터 요청, PII 검사, 익명화, 데이터 건강도 확인, 계산 snapshot, 리포트 검토, 감사 로그, 보관 정책이 함께 움직여야 실제 서비스가 됩니다. AI agent는 이 운영 시스템 위에서 반복 판단과 초안을 맡고, 코드는 검사와 계산을 맡고, 사람은 승인과 책임 있는 결정을 맡습니다.

## 8. 사람과 AI의 역할 분리

AgentPayroll은 "AI가 80%를 자동으로 결정하고 사람이 20%만 보는 제품"이 아니다. 더 정확히는 AI와 코드가 반복 분석·정리·초안 작성의 80%를 맡고, 사람은 위험하고 책임 있는 마지막 20%의 결정을 맡는 구조다.

지원서용 문장:

> AgentPayroll은 사람이 모든 사용량 로그를 직접 뜯어보는 일을 줄입니다. 코드가 비용과 마진을 계산하고, AI 운영 에이전트가 손해 고객·마진 깨는 기능·정책 후보를 정리합니다. 사람은 마지막 20%인 데이터 의미 확인, 리스크 판단, Adopt/Reject/Hold 결정에 집중합니다. 즉, AI와 코드가 반복 분석과 초안 작업을 맡고, 사람은 책임 있는 운영 결정을 내리는 구조입니다.

역할 구분:

| 담당 | 하는 일 | 하면 안 되는 일 |
|---|---|---|
| 코드 | 민감정보 검사, 비용·마진 계산, 포맷팅, report gate 판단 | 비즈니스 결정을 대신 내리기 |
| AI 운영 에이전트 | 계산 결과 해석, 손해 고객/마진 깨는 기능 설명, 정책 후보 초안, 리스크 요약, 다음 질문 작성 | 숫자 invent, 가격정책 자동 반영, 사람 승인 없는 report/connector 실행 |
| 사람 | 데이터 의미 확인, 정책 선택, 리스크 감수 여부 판단, 고객/요금제 변경 승인, 최종 리포트 공유 | AI가 만든 제안을 검토 없이 자동 실행 |

80/20로 설명하면 다음과 같다.

| 비중 | 담당 | 하는 일 |
|---|---|---|
| 80% | 코드 + AI | CSV 검사, 비용/마진 계산, 손해 고객 찾기, 마진 깨는 기능 찾기, 정책 후보 만들기, 리포트 초안 작성 |
| 20% | 사람 | 데이터 의미 확인, 정책 선택, 리스크 판단, 고객/요금제 변경 승인, 최종 리포트 공유 |

핵심 원칙:

> AI는 "무엇을 볼지"와 "어떤 선택지가 있는지"를 돕고, 사람은 "무엇을 실행할지"를 결정한다.

### 안전한 자동화와 쉬운 사용성

Manual + Script MVP는 자동화를 하지 말자는 뜻이 아니다. 처음부터 위험한 판단까지 agent에게 맡기지 말자는 뜻이다. AgentPayroll의 좋은 방향은 반복 작업은 최대한 자동화하고, 위험한 결정은 사람이 승인하는 것이다.

사용자는 복잡한 운영 시스템을 보면 안 된다. 사용자는 아래처럼 느껴야 한다.

```text
파일 넣기
-> 문제 보기
-> 결정하기
-> 리포트 받기
```

뒤에서는 agent, 코드, gate, ledger가 돌아가지만, 앞 화면은 `업로드 -> 진단 -> 결정 -> 리포트`로 단순해야 한다. 사용자는 agent 조직도를 쓰는 것이 아니라 결과를 받는 것이다.

자동화해도 되는 것:

| 영역 | 자동화 가능 | 방식 |
|---|---|---|
| 고객 intake | 문의 요약, fit score, A/B/C 분류 초안 | Intake Agent |
| 콜 준비 | 고객별 질문지 생성 | Discovery Agent |
| 데이터 요청 | safe CSV 요청 문구 자동 작성 | Data Readiness Agent |
| 데이터 검사 | PII/API key/raw prompt 탐지 | rule/script 자동화 |
| 컬럼 매핑 | customer_id, plan_id, feature 후보 매핑 | code + AI assist |
| 분석 가능 범위 | 고객별 손익 가능/불가 자동 판정 | Data Health Check |
| 계산 | 비용·마진·손해 고객 계산 | deterministic code |
| 해석 | 왜 손해인지, 어떤 기능이 문제인지 설명 | Diagnostic Agent |
| 정책 후보 | cap, credit, overage, routing 후보 초안 | Pricing Agent |
| 리포트 | 1장 리포트 초안 | Report Agent |
| 후속관리 | 다음 달 질문, follow-up, Decision Log 요약 | Decision Log Agent |

자동화하면 안 되거나 승인 뒤에만 해야 하는 것:

| 영역 | 이유 |
|---|---|
| 최종 가격정책 반영 | 고객 매출과 신뢰에 직접 영향 |
| billing 변경 | 돈이 실제로 움직임 |
| 고객에게 리포트 외부 공유 | 과장, PII, 근거 오류 위험 |
| Fact Ledger 업데이트 | 잘못된 가격/모델 정보가 전체 계산을 오염시킴 |
| raw 데이터 보관/삭제 예외 | 보안·책임 문제 |
| "이 고객은 손해다" 최종 표현 확정 | 고객 관계와 영업 판단 포함 |

제품 내부 흐름:

```text
Intake Agent
-> Data Health Check
-> Trust Gate
-> Cost Engine
-> Diagnostic Agent
-> Pricing Agent
-> Report Agent
-> Human Approval
-> Decision Log
```

지원서용 문장:

> AgentPayroll은 모든 운영을 수동으로 하자는 제품이 아닙니다. 반복 가능한 intake, 데이터 검사, 컬럼 매핑, 비용 계산, 진단 요약, 리포트 초안, follow-up은 자동화합니다. 다만 고객에게 영향을 주는 가격정책, billing, 외부 공유, 최종 결정은 사람이 승인합니다. 즉, AgentPayroll은 자동화 없는 컨설팅도 아니고 사람 없는 agent 회사도 아니라, 안전한 자동화 위에 사람의 결정을 올리는 AI-native 운영 시스템입니다.

SparkClaw용 압축 문장:

> 저는 AgentPayroll을 사람 없는 자동화 회사로 만들려는 것이 아니라, 한 사람이 AI 팀과 운영 시스템을 사용해 반복 분석의 80%를 자동화하고, 마지막 20%의 책임 있는 결정을 직접 내리는 구조로 설계했습니다. 이 구조가 반복되면 Service MVP에서 내부 운영 도구로, 다시 고객용 SaaS로 확장됩니다.

## 9. 현재 구현 증거

| 증거 | 상태 | 파일 |
|---|---|---|
| 제품 정체성: AI SaaS 운영 의사결정 워크스페이스 | 문서화됨 | `PM.md` |
| AI 팀원 운영 지침 | 문서화됨 | `AI_HR.md` |
| Money Leak Run 설계 | 문서화됨 | `docs/superpowers/specs/2026-05-26-agentpayroll-money-leak-run-design.md` |
| Money Leak Run UI | 구현됨 | `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx` |
| Money Leak step state model | 구현됨 | `src/features/report-first/lib/moneyLeakRun.ts` |
| deterministic diagnosis snapshot | 구현됨 | `src/features/report-first/lib/diagnosis.ts` |
| Trust Gate / security middleware | 구현됨 | `src/features/trust/lib/securityMiddleware.ts` |
| AI Cost Snapshot offer | 문서화됨 | `docs/service-validation/ai-cost-snapshot-offer-one-pager.md` |
| ICP scorecard | 문서화됨 | `docs/service-validation/icp-scorecard.md` |
| Data readiness checklist | 문서화됨 | `docs/service-validation/data-readiness-checklist.md` |
| Review call script | 문서화됨 | `docs/service-validation/review-call-script.md` |
| Service validation ledger | 문서화됨 | `docs/service-validation/service-mvp-validation-ledger.md` |
| Unit economics PDCA instrumentation | 구현됨 | `src/features/unit-economics/lib/pdcaInstrumentation.ts` |
| Lead intake 자동화 | 구현됨 | `src/features/front-operating/lib/intakeAutomation.ts` |

## 10. 현재 솔직한 상태

완성된 SaaS라고 말하지 않는다. 현재 상태는 아래처럼 말한다.

구현됨:

- usage CSV/summary 기반 diagnosis flow
- Trust Gate와 blocked/needs_mapping 상태
- customer/feature/plan/model 기준 비용·마진 진단
- Money Leak Run step rail
- decision candidate와 Adopt/Reject/Hold gate
- AI Cost Snapshot report payload
- Service MVP 검증 문서 패키지
- Unit economics PDCA 계측 기준
- lead intake fit score, A/B/C 분류, 다음 action, discovery 질문, safe data request fields 자동 생성

검증 중:

- 실제 AI SaaS 고객이 자기 usage/revenue 데이터로 테스트하고 싶은지
- 30만~100만 원 Snapshot 리포트에 지불 의향이 있는지
- Free Fit Check가 10분 이하로 끝나는지
- 첫 Snapshot이 사람 투입 3.5시간 이하로 가능한지
- 1회 리포트 이후 Monthly Decision Review로 반복 요청이 생기는지

아직 production 완료로 말하면 안 되는 것:

- 자동 billing 변경
- Stripe/Metronome push
- production connector 실행
- 사람 승인 없는 정책 반영
- raw prompt 분석
- 완전한 실시간 모니터링 SaaS

## 11. 2주 검증 계획

목표는 "좋아 보인다"가 아니라 "자기 데이터로 해보고 싶다"와 "돈 낼 수 있다"를 확인하는 것이다.

2주 목표:

- AI SaaS founder/PM/finance 15명 인터뷰
- 5명 이상이 "우리 데이터로 해보고 싶다" 반응
- 3명 이상이 유료 pilot, 예약금, 예산 출처 중 하나 제시
- 3개 messy CSV로 time-and-motion 측정
- Free Fit Check 10분 이하
- Data Readiness Check 45분 이하
- 첫 AI Cost Snapshot 생산 시간 3.5시간 이하
- Trust Gate 설명 후 데이터 업로드 거부 사유 태깅
- 1개 데모 완성: usage CSV + revenue CSV -> money leak -> decision pack

Pass 기준:

- 2개 이상의 ICP 적합 고객이 `AI Cost Snapshot 30만~100만 원` 범위의 유료 리포트를 요청하거나, 1회 리포트 이후 월간/분기 반복 리포트를 명시적으로 요청한다.

Conditional pass 기준:

- 1개 고객이 유료 리포트를 구매하고, 리뷰콜에서 데이터 공유 의도, 리포트 공유 의도, 가격/limit 결정 의도 중 2개 이상을 명확히 말한다.

Fail 기준:

- 고객 반응이 dashboard, alert, team account 같은 넓은 SaaS 기능 요구에만 머물고, 유료 리포트 또는 반복 분석 요청으로 이어지지 않는다.

## 12. SparkClaw와 맞는 이유

AgentPayroll은 SparkClaw 지원서에서 "AI를 팀원처럼 운용한 방식"을 보여주기 좋다. 제품 자체가 AI 팀의 비용, 권한, 성과, 의사결정 기록을 운영하는 구조이기 때문이다.

서류에서는 다음 세 가지를 앞에 둔다.

1. AgentPayroll은 Token Valley 문제를 고객별 마진/기능별 비용/가격정책 결정으로 푼다.
2. 창업자는 AI를 단순 문서 작성 도구가 아니라 역할별 운영 에이전트 팀으로 운용했다.
3. 현재 목표는 완성된 SaaS 과장이 아니라, 2주 안에 유료 AI Cost Snapshot 반복 요청을 검증하는 것이다.

주의: SparkClaw 공식 문구, 혜택, 파트너, 최신 FAQ 표현은 제출 직전에 최신 원문으로 재확인한다. 이 문서는 현재 프로젝트 증거를 지원서 서사로 묶는 초안이다.

## 13. WHY

창업가 WHY:

> 저는 AI가 단순한 도구가 아니라 실제 업무를 맡는 팀원이 되는 변화를 직접 겪고 있습니다. 하지만 AI 팀원이 늘어날수록 새로운 문제가 생깁니다. 누가 어떤 일을 했는지, 어떤 모델이 얼마를 썼는지, 어떤 고객이 손해를 만들고 있는지, 어떤 결정이 왜 내려졌는지 보이지 않습니다.
>
> 작은 AI-native 팀은 사람을 많이 뽑지 않고도 큰 제품을 만들 수 있지만, 토큰/API/GPU 비용, 모델 라우팅, 고객별 마진, 가격정책 결정에서 무너지기 쉽습니다. 저는 이 문제가 앞으로 모든 AI-native 팀의 운영 병목이 된다고 봅니다.
>
> AgentPayroll은 그래서 시작했습니다. AI 팀의 비용과 마진을 계산하고, 정책 후보를 만들고, 사람이 최종 결정을 남기는 CFO/COO 레이어가 필요합니다. AI를 더 많이 쓰게 하는 제품이 아니라, AI 팀이 망가지지 않게 운영하는 제품을 만들고 싶습니다.

짧은 버전:

> 저는 AI가 팀원이 되는 시대의 첫 번째 운영 문제는 생산성이 아니라 비용, 권한, 성과, 결정 기록이라고 봅니다. AgentPayroll은 작은 AI-native 팀이 토큰/API/GPU 비용 때문에 마진을 잃거나 잘못된 가격 결정을 하지 않도록 돕는 운영 OS입니다.

더 압축한 한 줄:

> AI로 혼자 더 많은 일을 할 수 있게 됐지만, 그 AI 팀을 운영하는 장부와 기준이 없으면 결국 비용과 결정에서 무너진다.

## 14. 지원서 답변 블록

### 제품 설명

AgentPayroll은 AI-native SaaS 팀이 usage/revenue 데이터를 넣으면 고객별·기능별·플랜별 AI 원가와 마진을 진단하고, 가격·usage cap·credit·model routing 후보를 사람이 승인하게 하는 AI Unit Economics OS입니다. 계산은 deterministic engine이 수행하고, AI 운영 에이전트는 근거 조회와 후보 생성만 담당합니다. 최종 결정은 Adopt/Reject/Hold로 기록되어 Decision Log/Operating Ledger에 남습니다.

### 고객

1차 고객은 production AI 기능을 운영 중인 초기 B2B AI SaaS 팀입니다. 이들은 월 LLM/API 비용이 발생하고, 고객별/기능별/플랜별 원가를 매출과 연결하지 못해 가격정책, 사용량 제한, 모델 라우팅 결정을 늦춥니다.

### 첫 사용 경험

사용자는 usage CSV와 revenue CSV를 넣고 Trust Gate를 통과한 데이터만 분석합니다. AgentPayroll은 이번 달 추정 비용 누수, 손해 고객, 마진 깨는 기능, 정책 후보를 보여주고, 사람이 Adopt/Reject/Hold를 선택하면 내부 공유용 AI Cost Snapshot report를 생성합니다.

### AI-native 운영 방식

AgentPayroll은 AI가 계산을 만들어내지 않도록 설계했습니다. Usage Ingestion, Trust/Security, Customer Diagnostic, Pricing Ops, Finance Ops, QA/Report Agent가 각자 읽기 권한과 책임을 갖고 deterministic snapshot을 해석합니다. 사람의 결정 없이는 report가 decision-backed 상태가 되지 않으며, 모든 판단은 Ledger에 남깁니다.

### 2주 검증

2주 안에 AI SaaS founder/PM/finance 15명을 인터뷰하고, 5명 이상이 자기 데이터로 테스트 의향을 보이는지, 3명 이상이 유료 pilot/예약금/예산 출처를 제시하는지 확인합니다. 동시에 Free Fit Check 10분 이하, 첫 Snapshot 3.5시간 이하, 30만~100만 원 가격대의 AI Cost Snapshot 반복 요청 가능성을 검증합니다.

## 15. 데모 스크립트

심사자에게 보여줄 때는 내부 용어보다 아래 흐름으로 말한다.

1. "AgentPayroll은 AI 기능이 늘어난 팀이 어떤 고객과 기능에서 돈을 잃고 있는지 찾아주는 제품입니다."
2. "고객은 원문 프롬프트나 API key를 줄 필요가 없습니다. 고객별 사용량, 기능명, 모델명, 토큰 수, 요금제, 매출처럼 분석에 필요한 숫자만 넣습니다."
3. "먼저 개인정보나 비밀키가 섞였는지 검사하고, 위험한 데이터가 있으면 분석하지 않습니다."
4. "검사를 통과한 데이터로 고객별·기능별·요금제별 AI 원가와 마진을 계산합니다."
5. "그 결과 손해 고객, 마진을 깨는 기능, 지금 검토할 가격정책 후보를 보여줍니다."
6. "AI는 왜 이 후보가 나왔는지 설명하지만, 숫자 계산은 정해진 코드가 합니다."
7. "마지막 결정은 사람이 합니다. 채택, 거절, 보류 중 하나를 고르면 그 이유와 근거가 기록으로 남습니다."
8. "이 기록은 다음 달에 같은 지표를 다시 볼 때 기준선이 되고, 내부 공유용 AI Cost Snapshot 리포트로 정리됩니다."

내부 용어로 다시 매핑하면 다음과 같다.

| 쉬운 설명 | 내부 용어 |
|---|---|
| 고객별 사용량, 기능명, 모델명, 토큰 수, 요금제, 매출 | usage metadata + revenue mapping |
| 개인정보나 비밀키 검사 | Trust Gate |
| 분석에 쓰는 고정 데이터 묶음 | snapshot |
| 손해 고객과 마진 깨는 기능 찾기 | Money Leak Run |
| 가격정책 후보 | Decision Candidate |
| 채택, 거절, 보류 | Adopt / Reject / Hold |
| 결정과 근거 기록 | Decision Log / Operating Ledger |
| 내부 공유용 1장 리포트 | AI Cost Snapshot report |

## 16. 제출 전 체크리스트

- [ ] 외부 표기는 AgentPayroll로 통일한다.
- [ ] "완성된 SaaS"처럼 과장하지 않는다.
- [ ] SparkClaw 관련 최신 공식 문구는 제출 전 원문으로 확인한다.
- [ ] 다른 프로젝트 이름은 빼고 AgentPayroll 하나만 말한다.
- [ ] 구현됨/검증 중/아직 아님을 분리한다.
- [ ] 첫 화면은 Money Leak Run으로 설명한다.
- [ ] AI 팀 운영 증거는 AI_HR.md보다 짧은 지원서 문장으로 압축한다.
- [ ] 2주 검증 숫자를 명확히 쓴다.
- [ ] 유료 가치는 dashboard가 아니라 AI Cost Snapshot과 Monthly Decision Review로 말한다.
