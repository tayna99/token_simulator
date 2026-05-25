# AI-Native Company Recordkeeping Guide

작성일: 2026-05-26
대상 저장소: `C:\token_simulator`
목적: PDF의 AI-Native 조직 업무 지침을 `token_simulator`의 실제 문서, 계획, 커밋 기록에 맞춰 사람이 읽고 AI가 이어서 실행할 수 있는 Markdown 기록 양식으로 바꾼다.

---

## 1. 핵심 원칙

AI-Native 회사의 기록은 "나중에 읽을 문서"가 아니라 "다음 실행자가 이어받을 상태 데이터"여야 한다.

이 저장소에서는 이미 그 방향이 보인다.

| 현재 자료 | 이미 담고 있는 것 | AI-readable 기록으로 바꾸는 방법 |
|---|---|---|
| `PM.md` | 제품 정체성, 핵심 고객, 결정 원칙, 남은 리스크 | PM 결정마다 `ADR-*` decision record로 분리 |
| `docs/PRD-current-state-2026-05-25.md` | 현재 구현 상태, gap, 상태 모델, production demo 규칙 | 섹션별로 `Work Item`과 `Guardrail`에 연결 |
| `docs/METRICS_THRESHOLDS.md` | Fact Ledger/Judgment Ledger, threshold snapshot | `policy_snapshot`과 `eval_case`의 기준값으로 저장 |
| `docs/superpowers/plans/*.md` | 구현 순서, 파일 범위, 검증 명령, 커밋 단위 | `Work Item`의 `input`, `acceptance`, `verification`으로 저장 |
| git commit | 실제로 변경된 파일과 완료된 단위 | `work_item_id`, `decision_id`, `verification`을 commit body에 연결 |

기록의 기본 문법은 다음과 같다.

1. 모든 일에는 고유 ID를 붙인다.
2. 모든 일은 상태를 가진다.
3. 입력, 출력, 근거, 결정, 다음 상태를 분리한다.
4. AI 초안과 인간 승인을 같은 문단에 섞지 않는다.
5. 숫자, 정책, 기준값은 snapshot으로 남긴다.
6. "성공처럼 보임"과 "production path로 확인됨"을 구분한다.

---

## 2. 추천 폴더 구조

처음에는 한 저장소 안에 아래처럼 둔다. 나중에 Notion, Supabase, vector DB로 옮기더라도 이 구조가 원본 계약 역할을 한다.

```text
docs/company-memory/
  00-principles/
    operating-principles.md
    guardrails.md
    permissions.md

  10-work-items/
    WI-2026-05-26-money-leak-run-decision-gate.md

  20-decisions/
    ADR-2026-05-25-decision-log-before-export.md

  30-meetings/
    2026-05-26-founder-product-review.md

  40-agent-runs/
    2026-05-26-money-leak-run-implementation.md

  50-evals/
    eval-cases.jsonl
    weekly-eval-report-2026-W22.md
```

아직 파일이 많지 않다면 이 문서 하나에서 시작해도 된다. 파일 수가 늘어나는 순간 위 구조로 쪼개면 된다.

---

## 3. 공통 상태 모델

`token_simulator`는 Decision Log, export gate, connector readiness, production demo unavailable 같은 상태를 이미 중요하게 다룬다. 회사 기록도 같은 방식으로 상태를 고정한다.

| 상태 | 의미 | 다음 행동 |
|---|---|---|
| `new` | 아직 시작하지 않음 | owner와 input 확정 |
| `in_progress` | 작업 중 | output 초안 작성 |
| `review` | 인간 검토 필요 | 승인자와 판단 근거 기록 |
| `approved` | 결정 승인됨 | 구현, 배포, 문서 반영 |
| `blocked` | 권한, env, 근거, 데이터 부족 | block reason과 unblock 조건 기록 |
| `done` | 검증까지 끝남 | commit, report, weekly review에 연결 |
| `superseded` | 더 새 결정이 대체함 | 대체 decision/work item 링크 |

중요한 점은 `done`을 쉽게 쓰지 않는 것이다. 테스트, 빌드, production path, human approval 중 무엇이 확인됐는지 따로 남겨야 한다.

---

## 4. Work Item 템플릿

파일명 예시: `docs/company-memory/10-work-items/WI-2026-05-26-money-leak-run-decision-gate.md`

```md
---
id: WI-2026-05-26-money-leak-run-decision-gate
type: work_item
title: "Money Leak Run decision gate"
owner: "product-engineering"
status: "review"
priority: "P0"
created_at: "2026-05-26"
updated_at: "2026-05-26"
source_docs:
  - docs/superpowers/plans/2026-05-26-agentpayroll-money-leak-run.md
  - docs/PRD-current-state-2026-05-25.md
related_decisions:
  - ADR-2026-05-25-decision-log-before-export
related_commits:
  - fdd0f74
  - c10378b
  - b1d3e21
requires_human: true
confidence: 0.86
---

# Money Leak Run decision gate

## Goal
CSV/summary -> Trust Gate -> margin diagnosis -> explicit Adopt/Reject/Hold -> PDF artifact 흐름에서, 사용자가 결정하지 않으면 report export가 열리지 않게 한다.

## Input
- Product rule: Decision Log가 제품의 종착점이다.
- Existing plan: Money Leak Run implementation plan.
- Existing commits:
  - `fdd0f74 feat: require explicit money leak decision choice`
  - `c10378b test: cover money leak run state machine`
  - `b1d3e21 feat: add money leak run decision gate`

## Output
- Decision candidate는 기본 선택값을 갖지 않는다.
- 사용자가 `adopt`, `reject`, `hold` 중 하나를 명시해야 한다.
- PDF artifact는 선택된 decision과 trust state를 포함한다.

## Evidence
- `PM.md`: "Decision Log가 제품의 종착점이다."
- `docs/PRD-current-state-2026-05-25.md`: Cost-to-decision flow는 adopt/reject/hold로 끝난다.
- `docs/METRICS_THRESHOLDS.md`: decision은 `thresholdSnapshot`, `factSourceSnapshot`, `aiMode`를 보존해야 한다.

## Acceptance
- [ ] 선택 전 report export가 잠겨 있다.
- [ ] 선택 후 report artifact가 decision choice를 보존한다.
- [ ] blocked/preview/production-connected 상태가 구분된다.
- [ ] 관련 테스트가 상태 변화 시 rerender로 검증한다.

## AI Draft
AI는 사용자의 선택을 대신하지 않는다. 가능한 결정 후보와 근거를 제안하되, 최종 선택은 human decision으로 남긴다.

## Human Review
- reviewer:
- decision: approved / revise / blocked
- reason:

## Verification
- command:
- result:
- gaps:

## Next State
approved / revise / blocked / done
```

---

## 5. Decision Record 템플릿

파일명 예시: `docs/company-memory/20-decisions/ADR-2026-05-25-decision-log-before-export.md`

```md
---
id: ADR-2026-05-25-decision-log-before-export
type: decision
status: "accepted"
date: "2026-05-25"
owner: "PM"
scope:
  - report export
  - decision ledger
  - rate card draft
source_docs:
  - PM.md
  - docs/PRD-current-state-2026-05-25.md
related_work_items:
  - WI-2026-05-26-money-leak-run-decision-gate
---

# Decision Log 없이는 report export를 열지 않는다

## Context
AgentPayroll은 단순 계산기가 아니라 AI SaaS 운영 의사결정 워크스페이스다. 리포트는 예쁜 산출물이 아니라 "어떤 결정을 어떤 근거로 내렸는지"를 증명하는 artifact다.

## Options
1. 사용자가 계산 결과만 보고 즉시 PDF export 가능.
2. decision candidate가 있으면 자동으로 hold 처리 후 export 가능.
3. 사용자가 `adopt`, `reject`, `hold` 중 하나를 명시해야 export 가능.

## Decision
3번을 채택한다. 사용자의 명시적 결정이 없으면 report export는 locked 상태다.

## Rationale
- `PM.md`는 Decision Log를 제품의 종착점으로 정의한다.
- `docs/PRD-current-state-2026-05-25.md`는 decision이 없으면 report export가 잠겨야 한다고 본다.
- AI가 결정을 대신하면 비용/가격/고객 정책 변경 책임이 흐려진다.

## Consequences
- 장점: report가 실제 운영 판단의 증거가 된다.
- 장점: billing/rate card 실행 전 human approval chain이 보존된다.
- 단점: 사용자는 한 번 더 선택해야 하므로 first-run friction이 생긴다.

## State Transition
```text
diagnosis_ready -> decision_required -> decision_selected -> report_ready
decision_required -> blocked_export
```

## Review Policy
- decision choice, actor, timestamp, threshold snapshot, fact source snapshot을 함께 저장한다.
- AI summary는 decision reason 초안일 뿐 최종 승인 기록이 아니다.
```

---

## 6. Meeting Note 템플릿

회의록도 사람용 요약만 남기면 AI가 이어서 실행하기 어렵다. 회의록은 결정과 Work Item을 생성하는 입력으로 남긴다.

```md
---
id: MEET-2026-05-26-founder-product-review
type: meeting
date: "2026-05-26"
participants:
  - founder
  - AI assistant
status: "closed"
generated_work_items:
  - WI-2026-05-26-money-leak-run-decision-gate
generated_decisions:
  - ADR-2026-05-25-decision-log-before-export
---

# Founder Product Review

## Purpose
AgentPayroll이 AI-Native 회사 운영 방식으로 기록되고 있는지 점검한다.

## Inputs Reviewed
- `PM.md`
- `docs/PRD-current-state-2026-05-25.md`
- recent commits

## Decisions
- Decision Log는 report export의 선행 조건으로 유지한다.
- production-connected evidence가 없으면 success처럼 렌더하지 않는다.

## Open Questions
- Supabase accepted fact ledger를 언제 production demo 기준으로 연결할 것인가?
- Watchtower review inbox의 owner는 누구인가?

## Action Items
| id | owner | due | status |
|---|---|---|---|
| WI-2026-05-26-money-leak-run-decision-gate | product-engineering | 2026-05-26 | review |
```

---

## 7. Agent Run 템플릿

AI 작업 로그는 "무엇을 했는지"보다 "무엇을 근거로 어떤 상태 전이를 만들었는지"가 중요하다.

```md
---
id: RUN-2026-05-26-money-leak-run-implementation
type: agent_run
agent_id: "codex"
work_item_id: WI-2026-05-26-money-leak-run-decision-gate
status: "completed_with_review_needed"
started_at: "2026-05-26T00:00:00+09:00"
ended_at: "2026-05-26T00:00:00+09:00"
runtime:
  frontend: "Next.js App Router + React 19 + TypeScript 5"
  tests: "Vitest 4"
permissions:
  write_scope:
    - src/features/report-first
    - src/features/report
    - docs/superpowers/plans
---

# Agent Run: Money Leak Run implementation

## Task
Money Leak Run에서 명시적 Adopt/Reject/Hold 선택 전에는 report export가 열리지 않게 한다.

## Context Read
- `PM.md`
- `docs/PRD-current-state-2026-05-25.md`
- `docs/superpowers/plans/2026-05-26-agentpayroll-money-leak-run.md`

## Changes Proposed
- decision candidate에서 default choice 제거
- pure state machine test 추가
- UI decision gate 추가
- report artifact에 selected decision/trust state 반영

## Tool / Command Log
| command | purpose | result |
|---|---|---|
| `npm run test:run -- src/features/report-first/lib/diagnosis.test.ts` | diagnosis state 검증 | pending |
| `npm run test:run -- src/features/report-first/lib/moneyLeakRun.test.ts` | step rail state machine 검증 | pending |
| `npm run test:run` | 전체 회귀 검증 | pending |
| `npm run build` | production build 검증 | pending |

## Output
- related commits:
  - `fdd0f74`
  - `c10378b`
  - `b1d3e21`

## Human Review Required
- [ ] export gate wording이 고객에게 너무 무겁지 않은지 확인
- [ ] decision choice가 실제 report artifact에 저장되는지 확인
- [ ] production-connected 상태와 deterministic preview 상태가 섞이지 않는지 확인

## Next State
review
```

JSONL로도 남기고 싶다면 같은 내용을 한 줄 이벤트로 저장한다.

```jsonl
{"type":"agent_event","run_id":"RUN-2026-05-26-money-leak-run-implementation","work_item_id":"WI-2026-05-26-money-leak-run-decision-gate","timestamp":"2026-05-26T00:00:00+09:00","event":"state_transition","from":"decision_required","to":"decision_selected","actor":"human","evidence":["decisionChoice","thresholdSnapshot","factSourceSnapshot"]}
{"type":"agent_event","run_id":"RUN-2026-05-26-money-leak-run-implementation","work_item_id":"WI-2026-05-26-money-leak-run-decision-gate","timestamp":"2026-05-26T00:00:00+09:00","event":"verification","command":"npm run test:run","status":"pending"}
```

---

## 8. Eval Case 템플릿

이 저장소의 헌법상 중요한 회귀는 "상태 변화 시 값이 갱신되는지", "숫자가 단일 계산 경로를 통과하는지", "production 경로가 없는데 성공처럼 보이지 않는지"다. 따라서 eval case도 이 위험을 직접 표현해야 한다.

```md
---
id: EVAL-2026-05-26-report-export-gate
type: eval_case
status: "active"
owner: "qa"
related_work_items:
  - WI-2026-05-26-money-leak-run-decision-gate
---

# Eval: report export requires explicit decision

## Scenario
사용자가 Money Leak Run diagnosis를 봤지만 아직 Adopt/Reject/Hold를 선택하지 않았다.

## Expected
- report export CTA는 locked 상태다.
- blocked reason은 `decision_required`다.
- AI summary는 결정처럼 렌더되지 않는다.

## Failure Mode
- 기본값 `hold`가 자동 선택되어 report가 생성된다.
- deterministic preview가 provider/connector 실행 완료처럼 보인다.

## Test Hooks
- `ReportFirstDiagnosisWorkspace.test.tsx`
- `reportArtifacts.test.ts`
- `moneyLeakRun.test.ts`

## Required Evidence
- rerender 후 decision state가 갱신되는 assertion
- report artifact에 selected decision/ref/trust가 들어가는 assertion
```

JSONL로 eval dataset을 만들 때는 이렇게 둔다.

```jsonl
{"id":"EVAL-2026-05-26-report-export-gate","input":{"state":"decision_required","decisionChoice":null},"expected":{"exportGate":"locked","reason":"decision_required","aiMayDecide":false}}
{"id":"EVAL-2026-05-26-production-demo-unavailable","input":{"supabase":false,"agentService":false,"ragChunks":false},"expected":{"status":"production_demo_unavailable","showSuccessDashboard":false}}
```

---

## 9. Guardrail 템플릿

```md
---
id: GDR-2026-05-26-production-truth-first
type: guardrail
status: "active"
owner: "engineering"
source_docs:
  - AGENTS.md
  - docs/PRD-current-state-2026-05-25.md
  - docs/METRICS_THRESHOLDS.md
---

# Production truth first

## Rule
production env, Supabase/Auth/Postgres/pgvector, connector ledger, or provider run proof가 없으면 실행 완료처럼 렌더하지 않는다.

## Allowed States
- `unavailable`
- `deterministic_preview`
- `connector_not_configured`
- `blocked`
- `stale`

## Forbidden
- fixture, memory fallback, request body seed를 production evidence처럼 표시
- RAG snippet을 Fact Ledger 승인 없이 숫자 권위로 사용
- LLM이 비용, 마진, 절감액을 직접 계산

## Enforcement
- UI copy에서 unavailable/block reason 표시
- route handler에서 production demo 조건 검증
- tests에서 fake success 렌더 금지

## Human Override
허용하지 않는다. production evidence가 없으면 상태를 낮춰 표시한다.
```

---

## 10. Commit을 AI-readable 기록으로 연결하는 법

지금 커밋 메시지는 conventional commit 형태라 좋다. 여기에 body로 Work Item과 검증 상태를 붙이면 AI가 훨씬 잘 이어받는다.

예시:

```text
feat: add money leak run decision gate

Work-Item: WI-2026-05-26-money-leak-run-decision-gate
Decision: ADR-2026-05-25-decision-log-before-export
State: review
Verification:
- npm run test:run -- src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx
- npm run test:run -- src/features/report/lib/reportArtifacts.test.ts
Evidence:
- explicit Adopt/Reject/Hold required before report export
- report artifact preserves decision choice and trust state
Human-Review: required
```

기존 커밋을 다시 쓰지 않아도 된다. 새 커밋부터 붙이면 충분하다.

---

## 11. Weekly Review 템플릿

```md
---
id: WEEKLY-2026-W22
type: weekly_review
period: "2026-W22"
owner: "founder"
status: "draft"
---

# Weekly AI-Native Operating Review

## Done
| work_item | result | evidence |
|---|---|---|
| WI-2026-05-26-money-leak-run-decision-gate | decision gate added | commits `fdd0f74`, `c10378b`, `b1d3e21` |

## Still Open
| work_item | blocker | next action |
|---|---|---|
| production demo tenant | Supabase/Auth/RAG/report path not fully connected | define seed + readiness smoke |
| Watchtower review workflow | accepted fact owner unclear | create review inbox owner decision |

## Metrics
| metric | current | target | note |
|---|---:|---:|---|
| tests passing | pending | 100% | fill after verification |
| stale fact sources | pending | 0 critical | from source registry audit |
| blocked connector actions | pending | explicit reason for all | no fake success |

## Decisions This Week
- ADR-2026-05-25-decision-log-before-export

## Risks
- TS/Python runtime contracts may drift.
- role projection may change emphasis but must not change deterministic numbers.
- demo/static seed data must not appear as production-connected evidence.

## Next Week
1. Close production demo tenant missing checklist.
2. Add accepted fact review workflow.
3. Add report artifact persistence smoke.
```

---

## 12. 운영 리듬

매일:
- 새 작업을 `Work Item`으로 시작한다.
- AI에게 맡긴 작업은 `Agent Run`으로 남긴다.
- blocker는 `blocked` 상태와 unblock 조건을 적는다.

커밋 전:
- Work Item ID와 Decision ID가 있는지 확인한다.
- 테스트와 빌드 결과를 `Verification`에 적는다.
- 사람 승인이 필요한 작업은 `review` 상태로 남긴다.

주간:
- `Weekly Review`에서 done/open/risk/next를 갱신한다.
- 오래된 threshold, fact source, RAG corpus, connector readiness를 확인한다.
- superseded된 결정은 새 ADR에 연결한다.

이렇게 남기면 다음 AI는 "문서를 읽는" 수준이 아니라 다음 질문에 바로 답할 수 있다.

- 지금 무엇이 끝났는가?
- 무엇이 검증되지 않았는가?
- 어떤 결정이 어떤 구현을 잠그고 있는가?
- 어떤 상태에서 사람이 승인해야 하는가?
- 어떤 커밋이 어떤 Work Item을 닫았는가?

