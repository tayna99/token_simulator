# AgentPayroll Service MVP Validation(서비스 최소 검증) P1 구현 계획

> **agentic worker(에이전트형 작업자)용:** REQUIRED SUB-SKILL(필수 하위 스킬): 이 계획을 task-by-task(작업 단위)로 구현하려면 superpowers:subagent-driven-development(권장) 또는 superpowers:executing-plans를 사용한다. 단계 추적은 checkbox(`- [ ]`) 문법을 사용한다.

**목표:** AgentPayroll이 넓은 SaaS(구독형 소프트웨어) 기능 요구가 아니라 `AI Cost Snapshot 30만~100만 원` 유료 리포트 서비스로 반복 요청될 수 있는지 검증한다.

**아키텍처:** 이번 P1(다음 단계)은 제품 코드가 아니라 서비스 검증 운영 자산을 만드는 문서 작업이다. ICP(이상적 고객 프로필) 점수표, 데이터 준비도, 안전한 데이터 요청, 유료 offer(제안), review call(리뷰 통화), learning loop(배운 내용을 다음 실험에 반영하는 반복 루프)를 하나의 검증 패키지로 묶고, 합격 기준은 반복 리포트 요청과 세 가지 의사결정 의도 기록에 둔다.

**기술 스택:** Markdown 운영 문서, 기존 `docs/templates/*` template(템플릿), 기존 Front Operating System(고객 획득/검증 앞단 운영 체계) 맥락, 사람이 승인하는 서비스 판매/review call 루프.

---

## 사전 확인

- 이 계획은 P1 서비스 검증용 문서 계획이다. 제품 코드, Next.js route(페이지/API 경로), Python agent runtime(파이썬 에이전트 실행 계층), Supabase schema(데이터베이스 구조)는 수정하지 않는다.
- 이번 작업에서는 기존 `docs/templates/*` 파일을 직접 고치지 않는다. 아래 Task는 다음 실행자가 어떤 문서와 template을 만들거나 보강할지 계획만 적는다.
- 검증 대상은 "AI 비용을 계속 볼 수 있는 SaaS를 만들자"가 아니라 "고객이 돈을 내고 1회 또는 반복 리포트를 요청하는가"다.
- 합격/불합격은 광범위한 SaaS 기능 요청량이 아니라 반복 서비스 리포트 요청으로 판단한다.
- 모든 customer-facing(고객에게 보이는) 문구는 raw prompt(원문 프롬프트), 개인정보, API key 수집을 기본값으로 암시하지 않는다.

---

## Validation Contract(검증 계약)

### 기록해야 하는 세 가지 의도

1. **데이터 공유 의도:** 고객이 raw prompt 없이 usage metadata(사용량 메타데이터) 또는 집계 CSV를 공유할 의사가 있는가.
2. **리포트 공유 의도:** 고객이 산출 리포트를 팀 회의, 대표/재무/제품 의사결정 자리, 또는 투자자/이사회 준비에 공유할 의사가 있는가.
3. **가격/limit 결정 의도:** 고객이 리포트 결과를 기반으로 요금제, 사용량 제한, credit(사용 크레딧), overage(초과 사용 과금), 모델 라우팅 중 하나를 결정할 의사가 있는가.

### Pass / Fail 기준

| 판정 | 기준 |
|---|---|
| Pass | 2개 이상의 ICP 적합 고객이 `AI Cost Snapshot 30만~100만 원` 범위의 유료 리포트를 요청하거나, 1회 리포트 이후 월간/분기 반복 리포트를 명시적으로 요청한다. |
| Conditional Pass | 1개 고객이 유료 리포트를 구매하고, 리뷰콜에서 데이터 공유 의도, 리포트 공유 의도, 가격/limit 결정 의도 3개 중 2개 이상을 명확히 말한다. |
| Fail | 고객 반응이 대시보드, 알림, 실시간 모니터링, 팀 SaaS 기능 요구에만 머물고, 돈을 내는 리포트 요청이나 반복 분석 요청으로 이어지지 않는다. |
| Invalid | 고객이 raw prompt, 개인정보, API key 제공을 전제로만 분석을 이해하거나, 현재 Trust-safe(신뢰/보안 경계를 지킨) 데이터 요청으로 분석 가능한 범위를 오해한다. |

---

## 파일 구조

이번 계획을 실행할 때 만들거나 보강할 문서 후보는 아래와 같다. 현재 Task에서는 이 파일들을 만들지 않는다.

- 생성: `docs/service-validation/icp-scorecard.md`
  - 유료 리포트 구매 가능성이 높은 리드와 단순 SaaS 기능 탐색 리드를 분리한다.

- 생성: `docs/service-validation/data-readiness-checklist.md`
  - 고객이 공유할 수 있는 안전한 usage metadata와 분석 가능/불가능 범위를 체크한다.

- 수정 계획: `docs/templates/agentcost-data-request.md`
  - raw prompt, 개인정보, API key를 요청하지 않는다는 문구를 강화한다.

- 생성: `docs/service-validation/ai-cost-snapshot-offer-one-pager.md`
  - `AI Cost Snapshot 30만~100만 원` 유료 리포트 제안을 한 장으로 정리한다.

- 생성: `docs/service-validation/review-call-script.md`
  - 리뷰콜에서 세 가지 quote를 직접 검증하고 기록한다.

- 생성: `docs/service-validation/learning-loop-template.md`
  - 리드별 결과, 가격 반응, 반복 요청 여부, 다음 문서 개선을 기록한다.

- 생성: `docs/service-validation/service-mvp-validation-ledger.md`
  - Pass/Conditional Pass/Fail/Invalid 판정을 누적한다.

---

## P1 Queue(실행 대기열)

### Task 1: ICP Scorecard(이상적 고객 점수표)

**파일:**
- 생성 계획: `docs/service-validation/icp-scorecard.md`
- 참조: `docs/AgentCost_AI_Native_Front_Operating_System.md`
- 참조: `src/features/front-operating/lib/frontOperatingContext.ts`

- [ ] **Step 1: scoring purpose(점수 목적) 정의**

`docs/service-validation/icp-scorecard.md`의 첫 문단에 다음 목적을 적는다.

```markdown
# AgentPayroll ICP Scorecard

이 점수표의 목적은 AgentPayroll을 넓은 SaaS 기능 관심사로 검증하는 것이 아니라, 고객이 `AI Cost Snapshot 30만~100만 원` 유료 리포트를 실제로 요청할 가능성이 있는지 판별하는 것이다.
```

- [ ] **Step 2: required scoring field(필수 점수 필드) 추가**

아래 필드를 체크박스 표로 만든다.

| Field | Strong signal | Weak signal | Score |
|---|---|---|---:|
| 실제 AI 기능 운영 | 외부 고객이 쓰는 AI 기능이 운영 중 | 내부 실험 또는 아이디어 단계 | 0-2 |
| 월 LLM/API 비용 | 월 30만 원 이상 또는 비용 증가 중 | 월 비용을 모름 | 0-2 |
| usage metadata 보유 | customer_id, plan_id, feature, model, token/cost 중 4개 이상 보유 | raw prompt만 있거나 export 불가 | 0-2 |
| 의사결정 압박 | 가격, limit, credit, margin 중 하나를 이번 달 결정해야 함 | 단순 관심 또는 벤치마크 탐색 | 0-2 |
| 리포트 공유 대상 | 대표, 재무, 제품, 투자자/이사회 중 공유 대상이 있음 | 개인 학습용 | 0-2 |

- [ ] **Step 3: grading rule(등급 규칙) 추가**

아래 판정 규칙을 추가한다.

| Grade | Score | Next action |
|---|---:|---|
| A | 8-10 | `AI Cost Snapshot 30만~100만 원` 제안 |
| B | 5-7 | Data Readiness Check 또는 축소 리포트 제안 |
| C | 0-4 | 샘플 리포트 공유, 유료 검증 대상에서 제외 |

- [ ] **Step 4: disqualification guardrail(탈락 보호 규칙) 추가**

다음 조건 중 하나라도 있으면 A급으로 올리지 않는다.

- raw prompt 분석을 기본으로 요구한다.
- 개인정보 또는 API key 제거가 어렵다고 말한다.
- "대시보드가 있으면 써보겠다"만 있고 유료 리포트 구매 의사가 없다.
- 가격, limit, credit, 모델 라우팅, gross margin(매출총이익률/매출에서 직접 원가를 뺀 마진) 중 어떤 결정에도 연결되지 않는다.

- [ ] **Step 5: Acceptance check(인수 확인)**

각 리드 기록에는 `data_sharing_intent`, `report_sharing_intent`, `price_or_limit_decision_intent`, `repeat_report_request_signal` 네 항목이 반드시 들어간다.

---

### Task 2: Data Readiness Checklist(데이터 준비도 체크리스트)

**파일:**
- 생성 계획: `docs/service-validation/data-readiness-checklist.md`
- 참조: `docs/templates/agentcost-data-request.md`
- 참조: `docs/runbooks/agentcost-service-mvp-runbook.md`

- [ ] **Step 1: allowed data(받을 수 있는 데이터) 정의**

체크리스트에 다음 "받는 데이터" 항목을 넣는다.

```markdown
## 받을 수 있는 데이터

- [ ] timestamp
- [ ] customer_id 또는 익명 customer_key
- [ ] plan_id 또는 plan_name
- [ ] feature
- [ ] model
- [ ] input_tokens
- [ ] output_tokens
- [ ] total_cost 또는 provider_cost
- [ ] status
- [ ] retry_count
- [ ] revenue 또는 plan_price
```

- [ ] **Step 2: blocked data(받지 않는 데이터) 정의**

체크리스트에 다음 "받지 않는 데이터" 항목을 넣는다.

```markdown
## 받지 않는 데이터

- raw prompt
- 대화 원문
- 이메일
- 전화번호
- 실명
- API key
- access token
- secret key
- 고객 계약서 원문
```

- [ ] **Step 3: field를 report scope(리포트 가능 범위)에 매핑**

아래 분석 범위 표를 추가한다.

| Data present | Report section enabled |
|---|---|
| feature + cost | 기능별 AI 원가 |
| customer_id + cost | 고객별 AI 원가 |
| plan_id + revenue + cost | 요금제별 gross margin |
| model + token/cost | 모델별 비용 구조 |
| status + retry_count | 실패/재시도 비용 |

- [ ] **Step 4: missing field를 blocked scope(막히는 범위)에 매핑**

아래 제한 범위 표를 추가한다.

| Missing data | Report limitation |
|---|---|
| customer_id 없음 | 고객별 손익 판단 불가 |
| plan_id 없음 | 요금제별 마진 판단 불가 |
| revenue 없음 | 손해 고객 또는 손해 플랜 판단 제한 |
| feature 없음 | 기능별 비용 우선순위 판단 제한 |
| retry_count 없음 | 재시도 비용 절감안 판단 제한 |

- [ ] **Step 5: Acceptance check**

체크리스트 하단에 고객 답변란을 둔다.

```markdown
## 고객 의도 기록

- 데이터 공유 의도: 예 / 아니오 / 조건부
- 공유 가능한 파일 형태: CSV / JSONL / 집계표 / 화면 공유만 가능
- 리포트 공유 대상: 대표 / 재무 / 제품 / 엔지니어링 / 투자자 / 기타
- 가격 또는 limit 결정 예정일:
- 반복 리포트 관심: 월간 / 분기 / 없음
```

---

### Task 3: Trust-Safe Data Request Template(신뢰/보안 경계를 지킨 데이터 요청 템플릿) 보강

**파일:**
- 수정 계획: `docs/templates/agentcost-data-request.md`
- 참조: `docs/templates/agentcost-report-disclaimer.md`
- 참조: `docs/runbooks/agentcost-service-mvp-runbook.md`

- [ ] **Step 1: first-screen trust statement(첫 화면 신뢰 안내문) 추가**

다음 실행 때 `docs/templates/agentcost-data-request.md` 상단에 아래 문구를 추가하도록 계획한다.

```markdown
AgentPayroll은 기본 분석에서 raw prompt, 대화 원문, 개인정보, API key를 요청하지 않습니다. 가능한 경우 customer_id와 plan_id는 익명 key로 바꿔서 보내주세요.
```

- [ ] **Step 2: safe export example(안전한 내보내기 예시) 추가**

템플릿 본문에 다음 예시를 추가하도록 계획한다.

```csv
timestamp,customer_id,plan_id,feature,model,input_tokens,output_tokens,total_cost,status,retry_count
2026-05-01,cus_anon_001,pro,summary,gpt-5-mini,1200,350,0.048,success,0
```

- [ ] **Step 3: blocked export example(보내면 안 되는 내보내기 예시) 추가**

템플릿에 아래 반례를 넣고 "보내지 말아야 하는 데이터"로 표시하도록 계획한다.

```csv
email,real_name,prompt,api_key
customer@example.com,Kim Example,"Please summarize this contract...",sk-example-secret
```

- [ ] **Step 4: analysis limitation language(분석 제한 안내문) 추가**

템플릿 하단에 다음 안내를 추가하도록 계획한다.

```markdown
일부 컬럼이 없어도 리포트는 만들 수 있습니다. 다만 없는 컬럼은 리포트의 제한 사항으로 표시되며, 고객별 손익·요금제별 마진·재시도 비용 같은 섹션은 비활성화될 수 있습니다.
```

- [ ] **Step 5: Acceptance check**

강화된 템플릿은 고객에게 다음 세 가지를 동시에 전달해야 한다.

- 무엇을 보내면 되는지 명확하다.
- 무엇을 보내면 안 되는지 명확하다.
- 데이터가 부족해도 분석 가능한 범위와 막히는 범위가 명확하다.

---

### Task 4: Paid Report Offer One-Pager(유료 리포트 제안 한 장 문서)

**파일:**
- 생성 계획: `docs/service-validation/ai-cost-snapshot-offer-one-pager.md`
- 참조: `docs/AgentCost_AI_Native_Front_Operating_System.md`
- 참조: `docs/templates/agentcost-first-reply.md`

- [ ] **Step 1: offer title(제안 제목)과 price(가격) 고정**

문서 제목과 가격 문구를 아래처럼 고정한다.

```markdown
# AI Cost Snapshot

가격: 30만~100만 원
기간: 데이터 수령 후 3~5영업일
산출물: 1장 요약 리포트, 계산 부록, 30분 리뷰콜
```

- [ ] **Step 2: 고객이 받는 것 정의**

아래 산출물 범위를 명시한다.

- AI 기능별 원가 breakdown(분해 내역)
- 고객 또는 요금제별 비용 압박 지점
- gross margin을 깨는 사용 패턴 후보
- 가격, limit, credit, 모델 라우팅 중 하나 이상의 의사결정 후보
- 데이터 한계와 추가로 필요한 컬럼
- 리뷰콜에서 합의한 다음 결정

- [ ] **Step 3: 제외 범위 정의**

아래 제외 범위를 명시한다.

- 실시간 모니터링 구축
- 자동 과금 변경
- 품질 평가 없는 모델 다운그레이드 보장
- raw prompt 분석
- 보안/개인정보 감사 대행
- 장기 대시보드 구축

- [ ] **Step 4: buyer fit copy(구매자 적합성 문구) 추가**

다음 문구를 넣는다.

```markdown
이 리포트는 "AI 기능을 많이 쓰는 고객이 늘수록 마진이 깨지는지", "어떤 기능이 원가를 만들고 있는지", "요금제나 사용량 제한을 바꿔야 하는지"를 빠르게 판단해야 하는 초기 AI SaaS 팀을 위한 유료 진단입니다.
```

- [ ] **Step 5: Acceptance check**

오퍼 문서는 고객이 다음 질문에 1분 안에 답할 수 있어야 한다.

- 얼마인가.
- 무엇을 받는가.
- 어떤 데이터를 줘야 하는가.
- 무엇은 포함되지 않는가.
- 리포트 이후 어떤 결정을 해야 하는가.

---

### Task 5: 세 가지 Quote(고객이 실제로 말한 검증 문장)를 검증하는 Review Call Script

**파일:**
- 생성 계획: `docs/service-validation/review-call-script.md`
- 참조: `docs/templates/agentcost-report-disclaimer.md`
- 참조: `docs/research/evidence_board.csv`

- [ ] **Step 1: call objective(통화 목적) 정의**

리뷰콜 스크립트 상단에 다음 목적을 쓴다.

```markdown
이 리뷰콜의 목적은 리포트 설명이 아니라, 고객이 다음 세 문장을 실제로 말할 수 있는지 검증하는 것이다.
```

- [ ] **Step 2: data sharing intent(데이터 공유 의도)용 Quote 1 추가**

첫 번째 검증 문장을 추가한다.

```markdown
Quote 1: "raw prompt나 개인정보 없이도 이 정도 usage metadata는 공유할 수 있습니다."
```

확인 질문:

- 이 수준의 CSV를 실제로 export할 수 있나요?
- 익명 customer_id와 plan_id를 붙일 수 있나요?
- 내부 승인 없이 가능한가요, 아니면 보안/법무 확인이 필요한가요?

기록값:

- `data_sharing_intent`: yes / conditional / no
- `data_blocker`: 없음 / 컬럼 부족 / 보안 승인 / export 권한 / 기타

- [ ] **Step 3: report sharing intent(리포트 공유 의도)용 Quote 2 추가**

두 번째 검증 문장을 추가한다.

```markdown
Quote 2: "이 리포트는 팀 회의나 대표/재무/제품 의사결정에 공유할 수 있습니다."
```

확인 질문:

- 이 리포트를 누구에게 공유하겠습니까?
- 공유하려면 어떤 표현, 단위, 근거가 더 필요합니까?
- 1장 요약과 부록 중 어느 쪽이 의사결정에 더 중요합니까?

기록값:

- `report_sharing_intent`: yes / conditional / no
- `sharing_audience`: founder / finance / product / engineering / investor / board / other

- [ ] **Step 4: price 또는 limit decision intent(가격/사용량 제한 결정 의도)용 Quote 3 추가**

세 번째 검증 문장을 추가한다.

```markdown
Quote 3: "이 결과를 보고 가격, 사용량 제한, credit, overage, 모델 라우팅 중 하나를 결정하겠습니다."
```

확인 질문:

- 이번 리포트 이후 바꿀 가능성이 가장 큰 결정은 무엇입니까?
- 그 결정을 언제까지 해야 합니까?
- 결정을 못 하게 막는 추가 근거는 무엇입니까?

기록값:

- `price_or_limit_decision_intent`: yes / conditional / no
- `decision_type`: pricing / usage_limit / credit / overage / model_routing / no_decision
- `decision_deadline`: 날짜 또는 기간

- [ ] **Step 5: repeat report question(반복 리포트 질문) 추가**

리뷰콜 마지막 질문을 아래처럼 고정한다.

```markdown
이 리포트를 월간 또는 분기별로 반복해서 보면 의사결정에 도움이 됩니까? 도움이 된다면 다음 회차에서 같은 지표를 유지해야 합니까, 아니면 다른 지표가 필요합니까?
```

기록값:

- `repeat_report_request_signal`: monthly / quarterly / one_more_after_change / no
- `requested_next_report_scope`: same_metrics / new_segment / pricing_change_followup / data_readiness_followup

- [ ] **Step 6: Acceptance check**

리뷰콜 기록은 세 quote의 원문 반응을 짧게 보존해야 한다. 합격 신호는 "기능이 있으면 좋겠다"가 아니라 "이 리포트를 다시 받고 싶다" 또는 "이 리포트로 결정을 하겠다"다.

---

### Task 6: Learning Loop Template(학습 루프 템플릿)

**파일:**
- 생성 계획: `docs/service-validation/learning-loop-template.md`
- 참조: `docs/AgentCost_AI_Native_Front_Operating_System.md`
- 참조: `src/features/front-operating/lib/frontOperatingContext.ts`

- [ ] **Step 1: learning loop schema(학습 루프 기록 구조) 생성**

문서에 아래 기록 양식을 넣는다.

```markdown
# Service MVP Learning Loop

## Lead

- Company:
- ICP grade:
- Industry:
- AI feature live: yes / no
- Monthly LLM/API cost band:

## Offer

- Offered package: AI Cost Snapshot / Data Readiness Check / sample only
- Offered price:
- Accepted price:
- Rejected reason:

## Intent Signals

- Data sharing intent: yes / conditional / no
- Report sharing intent: yes / conditional / no
- Price or limit decision intent: yes / conditional / no
- Repeat report request signal: monthly / quarterly / one_more_after_change / no

## Outcome

- Validation verdict: pass / conditional_pass / fail / invalid
- Strongest quote:
- Biggest blocker:
- Next artifact to improve:
```

- [ ] **Step 2: classification rule(분류 규칙) 추가**

아래 분류 규칙을 추가한다.

| Signal | Classify as |
|---|---|
| 같은 리포트를 월간/분기로 받고 싶다고 말함 | service_repeat_request |
| 리포트 결과로 가격/limit 결정을 하겠다고 말함 | decision_report_pull |
| 대시보드, 알림, Slack, 팀 계정만 요구함 | broad_saas_feature_request |
| 데이터 export가 불가능하다고 말함 | data_readiness_blocker |
| raw prompt 분석을 기대함 | trust_mismatch |

- [ ] **Step 3: weekly review prompt(주간 검토 질문) 추가**

매주 아래 질문에 답하도록 만든다.

- 이번 주 리드 중 A급은 몇 명인가.
- 유료 리포트 가격에 명시적으로 반응한 사람은 몇 명인가.
- 리포트를 팀에 공유하겠다고 말한 사람은 몇 명인가.
- 반복 리포트를 요청한 사람은 몇 명인가.
- SaaS 기능 요구만 있고 리포트 구매 의사가 없는 리드는 몇 명인가.
- 다음 주에 고칠 문서는 ICP, 데이터 요청, 오퍼, 리뷰콜 중 무엇인가.

- [ ] **Step 4: Acceptance check**

학습 루프는 "무엇을 만들까"보다 "어떤 리포트 서비스를 다시 팔 수 있는가"를 답해야 한다.

---

### Task 7: Service MVP Validation Ledger(서비스 MVP 검증 원장)

**파일:**
- 생성 계획: `docs/service-validation/service-mvp-validation-ledger.md`
- 참조: `docs/runbooks/agentcost-service-mvp-runbook.md`
- 참조: `docs/service-validation/learning-loop-template.md`

- [ ] **Step 1: ledger column(원장 컬럼) 정의**

검증 원장에 아래 컬럼을 넣는다.

| Column | Meaning |
|---|---|
| lead_id | 리드 식별자 |
| icp_grade | A / B / C |
| offered_price_krw | 제안 가격 |
| accepted_price_krw | 수락 가격 |
| data_sharing_intent | yes / conditional / no |
| report_sharing_intent | yes / conditional / no |
| price_or_limit_decision_intent | yes / conditional / no |
| repeat_report_request_signal | monthly / quarterly / one_more_after_change / no |
| dominant_request_type | service_report / broad_saas_feature / data_readiness / sample_only |
| verdict | pass / conditional_pass / fail / invalid |

- [ ] **Step 2: verdict formula(판정 규칙)를 문장으로 추가**

원장 상단에 다음 판정 규칙을 문장으로 적는다.

```markdown
Pass는 반복 서비스 리포트 요청이 있을 때만 부여한다. 대시보드, 알림, 자동화, SaaS 계정 관리 요청은 제품 힌트로 기록하되 Service MVP Validation의 Pass로 계산하지 않는다.
```

- [ ] **Step 3: operating cadence(운영 주기) 추가**

운영 주기를 아래처럼 적는다.

- 매 리드 통화 후 24시간 안에 원장 업데이트
- 매 유료 리포트 전달 후 리뷰콜 기록 연결
- 매주 금요일 Pass/Conditional Pass/Fail/Invalid 집계
- 3건 이상 같은 blocker(막힘 요인)가 반복되면 다음 주 문서 개선 Task로 승격

- [ ] **Step 4: Acceptance check**

원장은 다음 질문에 바로 답해야 한다.

- 돈을 내고 받은 리포트가 몇 건인가.
- 반복 리포트 요청은 몇 건인가.
- 리포트를 공유하겠다는 고객은 몇 건인가.
- 가격/limit 결정을 하겠다는 고객은 몇 건인가.
- 넓은 SaaS 기능 요구는 몇 건이며, 왜 검증 합격에서 제외했는가.

---

## Final Acceptance Criteria(최종 인수 기준)

- [ ] `docs/service-validation/icp-scorecard.md` 계획이 유료 리포트 적합 고객과 broad SaaS feature(넓은 SaaS 기능) 관심 고객을 분리한다.
- [ ] `docs/service-validation/data-readiness-checklist.md` 계획이 받을 데이터, 받지 않을 데이터, 분석 가능 범위, 막히는 범위를 구분한다.
- [ ] `docs/templates/agentcost-data-request.md` 보강 계획이 raw prompt, 개인정보, API key 미수집 원칙을 첫 화면에서 강화한다.
- [ ] `docs/service-validation/ai-cost-snapshot-offer-one-pager.md` 계획이 `AI Cost Snapshot 30만~100만 원`의 가격, 기간, 산출물, 제외 범위를 명확히 한다.
- [ ] `docs/service-validation/review-call-script.md` 계획이 데이터 공유 의도, 리포트 공유 의도, 가격/limit 결정 의도 세 quote를 검증한다.
- [ ] `docs/service-validation/learning-loop-template.md` 계획이 반복 리포트 요청과 broad SaaS feature request를 별도 신호로 기록한다.
- [ ] `docs/service-validation/service-mvp-validation-ledger.md` 계획이 Pass/Conditional Pass/Fail/Invalid를 반복 서비스 리포트 요청 중심으로 판정한다.
- [ ] 이번 Task에서는 위 산출물 파일과 기존 템플릿을 직접 수정하지 않고, 이 계획 파일만 생성한다.

---

## Plan Author(계획 작성자) Self-Review Checklist(자가 검토 목록)

- [ ] 지정된 산출물 6개가 모두 Task로 들어갔다: ICP scorecard, data readiness checklist, trust-safe data request template reinforcement, paid report offer one-pager, review call script validating the three quotes, learning loop template.
- [ ] Acceptance Criteria가 데이터 공유 의도, 리포트 공유 의도, 가격/limit 결정 의도 기록을 포함한다.
- [ ] Pass/Fail 기준이 broad SaaS feature request가 아니라 repeat service report request에 묶여 있다.
- [ ] 기존 docs/templates 파일을 현재 Task에서 수정하지 않고, 다음 실행 계획으로만 다룬다.
- [ ] 실행자가 체크박스 단위로 진행할 수 있도록 각 Task에 파일, 단계, 판정 기준이 있다.
