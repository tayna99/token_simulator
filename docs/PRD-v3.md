# PRD: AgentPayroll v3.1

부제: **AI SaaS Cost · Margin · Decision Operating System**
문서 버전: 3.1 · 2026-05-24
상태: Draft
관계: `docs/PRD-v2.md`를 폐기하지 않는다. v2.4는 복구된 구현 사실 정본이고, v3.1은 현재 합의된 제품 방향과 다음 MVP 순서를 정리한 새 정본 후보다.

---

## 1. 한 줄 정의

AgentPayroll은 AI SaaS의 사용 기록을 고객·기능·요금제별 원가와 마진으로 바꾸고, 어떤 결정을 내려야 하는지까지 운영 일지에 남기는 의사결정 워크스페이스다.

핵심은 토큰 계산기가 아니라 **AI 비용이 어디서 발생했고, 어떤 고객/기능이 손해이며, 가격·모델·사용 제한을 어떻게 바꿀지 결정하는 시스템**이다.

---

## 2. 문제

AI SaaS 팀은 OpenAI/Anthropic/Gemini 콘솔, Helicone, Langfuse 같은 도구로 총 토큰과 총 비용은 볼 수 있다. 하지만 다음 질문에는 바로 답하지 못한다.

- 어떤 고객이 AI 원가 때문에 손해인가?
- 어떤 기능이 마진을 깨고 있는가?
- 정액제/크레딧/종량제 중 무엇으로 가격을 바꿔야 하는가?
- 모델을 바꾸면 비용은 줄어도 품질·지연·리스크가 감당 가능한가?
- 경영진/PM/개발자에게 같은 숫자로 설명할 수 있는가?
- 다음 달에도 같은 방식으로 반복 리포트를 받을 수 있는가?

---

## 3. 절대 원칙

1. **계산은 TypeScript 결정론 엔진.** 비용, 마진, 절감액, 예산 초과 예측, alert 조건은 `src/lib/calculator.ts`, `src/domain/cost/calculator.ts`, unit-economics/pricing pure modules에서 계산한다.
2. **표시는 format 경로.** 사용자 표시 숫자는 `src/lib/format.ts` 계열 함수를 통과한다.
3. **AI는 숫자를 만들지 않는다.** AI는 `tool:*`, `snapshot:*`, `risk:*`, `decision:*` ref를 설명하고 다음 액션 초안을 쓴다.
4. **Prompt-free가 기본값.** raw prompt, messages, API key, PII는 기본 수집하지 않는다.
5. **역할별 화면은 달라도 숫자는 같다.** Developer/PM/CEO view는 같은 deterministic snapshot과 같은 usage rows를 읽는다.

---

## 4. 페르소나

| 페르소나 | 원하는 것 | 우선 화면 |
| --- | --- | --- |
| Developer / Backend / ML | 로그, 모델, latency, error, retry, cache, 비용 급증 원인 | Developer view |
| Founder / CEO / CFO | 남는 돈, 손해 고객, 가격 결정, 보고 자료 | CEO view |
| PM / RevOps / CS | 기능별 원가, 출시 판단, 고객 설명 | PM view |
| Bootcamp / early team | API 예산 소진 위험, 발표용 AI 사용 리포트 | Guided setup + report |

---

## 5. 첫 경험

첫 화면은 빈 대시보드가 아니다. 사용자는 setup wizard로 들어온다.

```text
사용량 가져오기
-> 기능 매핑
-> 비즈니스 기준값
-> 원가/마진
-> 추천
-> 리포트
```

이 흐름은 CSV, SDK-lite, Helicone/Langfuse adapter가 모두 공유한다. 입력 방식이 달라도 `normalized_usage_table`과 Trust pipeline을 통과한 뒤 같은 snapshot을 만든다.

---

## 6. 현재 구현 기반

| 영역 | 현재 상태 |
| --- | --- |
| 모델/레이더 카탈로그 | `models.ts` 기준 42종, 19 provider/source, `pricingStatus` 포함 |
| 사용 기록 | CSV import, SparkClaw sample, bootcamp placeholder sample |
| 비용 계산 | text + multimodal skeleton, `calculateCost`, `calculateModalityCost`, `calculateMultimodalScenario` |
| 비용 귀속 | customer / feature / model / plan / session / agent_run |
| 마진 | plan margin, customer margin, heavy-user detection |
| 가격 | flat / usage / credit / hybrid / cap / overage |
| Trust | Data Intake Policy, Security Middleware, ImportTrustCheckPanel |
| Front Operating | `frontOperatingSystem` snapshot context: ICP, self-assessment, data readiness gate, sample report, offer ladder, approval matrix, learning loop |
| Agent | Python `create_agent` stage router, 11 operating agents, 23 read-only capability tools including 4 front operating tools |
| Decision | Decision Ledger + Operating Ledger |
| Export | role-specific report artifacts |

---

## 7. MVP 순서

### MVP 1: Service MVP

샘플/CSV 기반으로 실제 사용 기록을 분석한다.

- Trust Intake로 prompt/API key/PII/schema health 확인
- normalized usage table 생성
- 원가/마진/손해 고객/가격 시나리오 계산
- 개발자/PM/CEO 리포트 export
- 운영 일지 기록

### MVP 2: SDK-lite 자동 수집

SDK-lite는 "붙이고 끝"이 목표다. Gateway보다 먼저 만든다.

수집 이벤트:

```text
timestamp, request_id, customer_id, plan_id, feature, model,
session_id, agent_run_id, input_tokens, output_tokens,
total_cost, latency_ms, status
```

허용:

- feature/model/tokens/cost/latency/status
- customer/plan/session/agent_run 같은 business metadata
- retry/cache/human_review 같은 운영 metadata

금지:

- raw prompt
- messages
- API key / secrets
- PII

SDK 이벤트도 CSV와 동일하게 Trust pipeline을 통과해야 snapshot에 들어간다.

### MVP 3: Alert / Margin Guard

Alert는 "비용 알림"이 아니라 "결정 필요한 알림"이다. v1은 4종만 둔다.

| Alert family | 조건 | 사용자가 내려야 할 결정 |
| --- | --- | --- |
| 비용 급증 | 최근 사용량/원가가 baseline 대비 급증 | 모델/기능/호출 제한 확인 |
| 예산 초과 예측 | 현재 추세로 월 예산 초과 예상 | cap, plan, usage policy 조정 |
| 손해 고객/기능 | 고객/기능 gross margin이 기준 이하 | 가격 정책 또는 feature gating |
| 모델 변경 리스크 | 모델 교체 후보가 비용은 낮지만 품질/latency/risk 조건 있음 | A/B, human review, rollback |

조건 판정은 deterministic rule이다. AI는 설명문과 다음 액션 초안만 작성한다.

### MVP 4: Gateway / Proxy

Gateway는 선택형 고급 모드다. 초기 MVP가 아니다.

가능 기능:

- 비싼 요청 차단
- 싼 모델 라우팅
- provider fallback
- 고객별 예산 제한
- 모델/기능별 policy enforcement

진입 조건:

- SDK-lite로 반복 사용 데이터가 충분히 쌓임
- Trust/security/outage 책임 문서화
- 장애 시 fallback 정책 정의
- 고객 트래픽 중간에 서는 리스크에 대한 명시적 승인

---

## 8. Bootcamp Validation Round 1

부트캠프 검증은 Wedge B를 1주 안에 검증한다.

현재 결정:

- 6팀의 실제 페르소나는 아직 모른다.
- `bootcampSample.ts`는 Generic Team A~F placeholder다.
- 인터뷰 후 Day 3~4에 팀명/feature/분포를 swap한다.
- SDK는 구현하지 않는다. SDK 수용도와 prompt-free analytics 반응만 묻는다.

검증 질문:

| 가설 | 성공 신호 |
| --- | --- |
| 팀들은 API 비용을 잘 모른다 | "감이 안 온다", "써봐야 안다" |
| 기능별 비용 분포를 모른다 | 비싼 기능을 추측만 함 |
| 예산 초과를 늦게 안다 | 콘솔 수동 확인에 의존 |
| 리포트 가치가 있다 | 발표/제출에 쓰겠다는 원문 발언 |
| prompt-free 수집이 안전하다 | prompt 수집은 부담스럽고 metadata는 괜찮다는 반응 |
| SDK-lite에 약한 WTP가 있다 | "1만 원이면 쓸 수 있다/검토한다" |

---

## 9. 아키텍처

```text
Raw CSV / SDK-lite event / Adapter export
-> Data Intake Policy
-> Security Middleware
-> Normalized Usage Table
-> Deterministic Snapshot
-> Front Operating System Context
-> Stage-routed Operating Agents
-> Supervisor Synthesis
-> Human Decision
-> Decision Ledger + Operating Ledger
```

권위:

- 가격/모델 spec: structured fact table
- 계산: TypeScript pure functions
- 해석: AI agent with refs
- 앞단 운영 자산: read-only `frontOperatingSystem` context exposed to Python `create_agent`
- 결정: human approval + ledger
- 반복 학습: Plan vs Actual + Decision history

---

## 10. 성공 지표

정량:

- 사용 기록 import 성공률
- attribution coverage
- report export 횟수
- pricing scenario 실행 횟수
- decision log 기록 수
- SDK-lite event ingestion 성공률
- alert당 채택/보류/해결 결정 수

정성:

- "이 고객이 손해인지 몰랐다."
- "이걸로 가격을 바꿔야겠다."
- "우리 실제 사용 기록으로 해볼 수 있나?"
- "prompt를 안 가져가면 붙여볼 수 있다."
- "다음 달에도 같은 리포트를 받고 싶다."

안티지표:

- 토큰 계산기로만 사용됨
- 리포트 export는 하지만 decision log를 쓰지 않음
- alert가 너무 많아 무시됨
- Developer/CEO view 숫자가 서로 다름
- AI가 근거 없는 숫자를 설명함

---

## 11. 리스크

| 리스크 | 완화 |
| --- | --- |
| 비용 계산 신뢰 하락 | 계산 경로 단일화, `tool:*` refs, formatting 헌법 유지 |
| prompt/privacy 불안 | prompt-free default, Trust Intake, retention note |
| 개발자 DX 부담 | SDK-lite 먼저, Gateway는 보류 |
| alert fatigue | 4종 decision-needed alert만 |
| Gateway 책임 과중 | P2 고급 모드, 별도 보안/장애 계획 |
| 모델 가격 신선도 하락 | `check-provider-pricing.mjs`, `pricingStatus`, Watchtower |
| 멀티모달 가격 미공개 | `unsupported_pricing`, custom pricing 전까지 계산 차단 |

---

## 12. 미해결 질문

- 제품명 `AgentPayroll` 유지 여부.
- SDK-lite 패키지 형태: npm package, snippet, server endpoint 중 무엇부터인가.
- SDK event를 어디에 저장할지: local-first, thin backend, hosted ingestion.
- Alert delivery: in-app first, Slack/Email opt-in later.
- Gateway의 첫 지원 provider 범위.
- Bootcamp 이후 Wedge A와 Wedge B 중 어느 쪽에 2주 더 투자할지.
- `PRD-v3.md`를 언제 v2의 후속 정본으로 승격할지.

---

## 13. 참고 문서

| 문서 | 역할 |
| --- | --- |
| `docs/PRD-v2.md` | 복구된 구현 사실 정본 |
| `docs/superpowers/plans/2026-05-24-complete-service-mvp-trust-runtime.md` | Service MVP + P1/P2 backlog 구현 계획 |
| `docs/superpowers/plans/2026-05-24-agentcost-front-operating-system.md` | Front operating system 구현 계획과 TDD 체크포인트 |
| `docs/superpowers/plans/2026-05-23-p1-extension-backlog.md` | P1 backlog mirror |
| `docs/research/2026-05-24-bootcamp-1week-plan.md` | Bootcamp 1주 검증 계획 |
| `docs/research/bootcamp-slack-messages.md` | Bootcamp outreach 메시지 |
| `docs/research/bootcamp-interview-guide.md` | Bootcamp 인터뷰 질문/기록 템플릿 |
| `src/features/usage/data/bootcampSample.ts` | Generic Team A~F sample |
