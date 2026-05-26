# AgentPayroll LangChain 1.0 Agent Runtime 설계

작성일: 2026-05-26
상태: 리뷰용 설계
범위: Money Leak Run을 돕는 Python LangChain 1.0 agent runtime(에이전트 실행 계층)

## 1. 요약

AgentPayroll의 agent runtime은 돈을 계산하는 뇌가 아니다. Money Leak Run(비용 누수 진단 실행)에서 이미 만들어진 deterministic snapshot(결정론 계산으로 만든 분석 데이터 묶음)을 읽고, 손해 고객·마진 깨는 기능·정책 후보를 사람이 이해할 문장과 근거 묶음으로 정리하는 운영팀 계층이다.

```text
Money Leak Run snapshot
-> Stage Router
-> Bounded Operating Agents
-> Supervisor Synthesis
-> Decision Candidate / Risk / Report Draft
-> Human Adopt / Reject / Hold
```

숫자는 TypeScript 계산 엔진이 만든다. LangChain 1.0 agent는 read-only tool(읽기 전용 도구)로 snapshot, risk, evidence, decision history를 조회하고, 근거 없는 숫자 주장은 fallback 또는 unavailable로 낮춘다.

## 2. 설계 원칙

1. **Money Leak Run 우선.** Runtime은 넓은 AI 팀 데모가 아니라 첫 5분 흐름을 보조한다.
2. **계산 권한 없음.** 비용, 마진, 절감액, token, percent, price는 `src/lib/calculator.ts`와 인접 deterministic module만 만든다.
3. **근거 있는 문장만 허용.** Agent output은 `tool:*`, `snapshot:*`, `evidence:*`, `decision:*` ref를 남겨야 한다.
4. **사람 결정 전 실행 없음.** Adopt/Reject/Hold 선택 전에는 PDF를 decision-backed 또는 ledger-backed로 표시하지 않는다.
5. **Production honesty.** provider key, connector, ledger, storage가 없으면 `deterministic_preview`, `connector_not_configured`, `unavailable`로 표현한다.
6. **데모 seed 격리.** demo/static seed는 production evidence, fact, watchtower result로 표시하지 않는다.

## 3. Runtime 위치

### Next.js / TypeScript

- Money Leak Run UI와 route handler를 담당한다.
- CSV/summary 입력, Trust Gate, snapshot construction, report artifact gate를 관리한다.
- deterministic diagnosis와 format helper가 모든 표시 숫자의 source of truth(진실 출처)다.

### Python `agent_service`

- FastAPI로 `/api/agent/run`을 제공한다.
- LangChain 1.0 `create_agent` 또는 structured output path를 사용한다.
- provider key가 없거나 provider output이 안전하지 않으면 deterministic fallback prose를 반환한다.
- 외부 connector mutation(Stripe, Slack, Email, Metronome 등)은 수행하지 않는다.

## 4. Money Leak Run 연결

Runtime 입력은 Money Leak Run의 현재 단계에서 만든 snapshot이어야 한다.

```text
Trust Gate 통과
-> Money Leak diagnosis snapshot
-> policy candidate refs
-> runtime interpretation request
```

Runtime은 다음 네 가지를 보강한다.

- 손해 고객과 마진 깨는 기능을 쉬운 한국어로 설명한다.
- policy candidate(가격·사용량 제한·모델 라우팅 후보)의 리스크를 정리한다.
- report draft 문장을 만든다.
- 누락된 mapping, 오래된 evidence, production 미연결 상태를 경고한다.

Runtime은 다음을 하지 않는다.

- revenue mapping이 없는데 손해 고객을 확정하지 않는다.
- sample assumption을 production fact로 승격하지 않는다.
- decisionChoice를 자동 선택하지 않는다.
- PDF 또는 connector 실행을 완료 상태처럼 렌더하지 않는다.

## 5. Agent 구성

P0 runtime은 11개 Operating Agent를 전부 전면에 보여주지 않는다. Money Leak Run에는 아래 역할만 먼저 노출한다.

| 역할 | 책임 | 출력 |
| --- | --- | --- |
| Trust/Security Agent | raw prompt, API key, PII, mapping 상태 확인 | blocked/needs_mapping 설명 |
| Customer Diagnostic Agent | 손해 고객·heavy user 해석 | loss customer narrative |
| Pricing Ops Agent | cap, credit, overage, routing 후보 검토 | policy candidate risk |
| Finance Ops Agent | margin story와 보고서 관점 정리 | finance summary |
| QA/Report Agent | 근거 ref와 report readiness 점검 | report draft warnings |
| Supervisor | 서로 다른 agent 의견 병합 | final synthesis |

나머지 운영 에이전트는 expert mode 또는 all-hands review에서만 사용한다.

## 6. Tool 계약

모든 capability tool result(기능 도구 결과)는 같은 envelope(봉투 구조)를 쓴다.

```json
{
  "toolName": "lookup_snapshot_value",
  "refs": ["tool:snapshot:margin", "snapshot:money-leak-run"],
  "found": true,
  "data": {},
  "warnings": []
}
```

필수 규칙:

- `refs`가 비어 있으면 supervisor는 해당 주장을 report draft에 넣지 않는다.
- `found=false`이면 문장은 unavailable 또는 needs_review로 낮춘다.
- tool은 read-only만 허용한다.
- tool data에는 raw prompt, API key, secret, PII 원문을 넣지 않는다.

## 7. Output 계약

`AgentRunResponse`는 최소한 아래를 가진다.

- `executionMode`: `deterministic_preview | provider_llm | unavailable`
- `calledAgentIds`
- `primaryAgentId`
- `reviewerAgentIds`
- `usedCapabilityTools`
- `snapshotVersion`
- `events`
- `supervisorSummary`
- `disagreements`
- `decisionReadiness`
- `nextQuestions`
- `refs`
- `warnings`

LLM structured output에는 새 숫자 필드를 두지 않는다. 숫자가 필요하면 snapshot ref와 formatted display value를 함께 전달받아 인용만 한다.

## 8. 상태 모델

| 상태 | 의미 | UI 표현 |
| --- | --- | --- |
| `provider_llm` | provider key와 schema guard가 통과됨 | LLM assisted |
| `deterministic_preview` | key 없음 또는 provider skip | deterministic preview |
| `connector_not_configured` | 외부 실행 connector 없음 | blocked readiness |
| `ledger_not_persisted` | decision row 저장 전 | decision-backed draft 아님 |
| `storage_not_configured` | report artifact 저장 불가 | PDF unavailable |
| `unavailable` | snapshot 또는 trust 조건 미충족 | 실행 불가 |

이 상태들은 사용자에게 실패처럼 숨기지 않는다. AgentPayroll은 연결되지 않은 것을 연결된 것처럼 보이면 안 된다.

## 9. Human Gate

Runtime은 추천 문장을 만들 수 있지만 결정하지 않는다.

```text
agent synthesis
-> user chooses Adopt / Reject / Hold
-> rationale captured
-> decision row persisted
-> report artifact persisted
-> PDF shown
```

P0에서는 decision row persistence가 아직 없으면 report payload draft에 explicit `decisionChoice`, candidate id, refs를 포함할 수 있다. 단, UI 문구는 ledger-backed가 아니라 decision-backed draft로 제한한다.

## 10. Non-goals

- LangChain이 비용·마진·절감액을 계산하지 않는다.
- 첫 화면에 agent route, RAG corpus, Watchtower queue, connector status를 펼쳐 보이지 않는다.
- billing, pricing page, Slack/Email 전송 같은 외부 mutation을 실행하지 않는다.
- provider output이 citation 없는 숫자나 확정적 결정을 만들면 그대로 통과시키지 않는다.
- demo seed를 production-connected evidence로 포장하지 않는다.

## 11. 수용 조건

1. Money Leak Run이 runtime의 primary use case로 문서화되어 있다.
2. TypeScript deterministic calculation이 numeric authority로 남는다.
3. LangChain 1.0 runtime은 read-only tool과 structured output만 사용한다.
4. 모든 agent output은 ref, warning, execution mode를 포함한다.
5. provider 미연결 상태도 honest blocked/preview state로 표현한다.
6. Adopt/Reject/Hold 전에는 PDF가 완료된 report처럼 보이지 않는다.
7. production route/page는 demo seed, memory fallback, request fixture를 production evidence로 사용하지 않는다.

## 12. 구현 순서

1. `agent_service` schema에 supervisor summary, disagreements, decision readiness, refs, warnings를 고정한다.
2. capability tool envelope를 도입하고 free-form tool result를 막는다.
3. Money Leak Run snapshot을 runtime input으로 연결한다.
4. provider path와 deterministic fallback path가 같은 output shape을 반환하게 한다.
5. UI에서는 runtime detail을 evidence drawer 또는 expert mode에 둔다.
6. decisionChoice와 persisted artifact gate가 충족될 때만 PDF를 primary action으로 연다.

이 runtime의 목적은 AgentPayroll을 "AI가 대신 결정하는 제품"으로 만드는 것이 아니다. 목적은 Money Leak Run에서 사람이 하나의 돈 결정을 더 빨리, 더 근거 있게 내리도록 운영팀 초안을 붙이는 것이다.
