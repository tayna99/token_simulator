# PRODUCT_UX: AI Team Cost Simulator Workspace

작성일: 2026-05-23

## 0.1 Google I/O 2026 모델/가격 UX 업데이트 (2026-05-24)

P1 웹앱은 “최신 모델을 알고 있다”와 “그 모델로 비용을 계산할 수 있다”를 분리해서 보여준다.

- 고객 기본 화면에는 다음 네 가지 상태만 노출한다: `최신 Google Gemini 3.5 Flash 단가 반영`, `가격 출처 확인일: 2026-05-24`, `Gemini Omni / 비디오 비용은 공식 API 단가 확인 필요`, `사용자 단가 입력 시 시나리오 계산 가능`.
- 모델 선택 UI는 Gemini 3.5 Pro, Gemini Omni, Gemini Omni Flash를 숨기지 않는다. 다만 공식 API 가격이 없으면 비활성화하고 “API pricing not published / 사용자 단가 필요”로 표시한다.
- 모델 레이더, 시장 업데이트, 멀티모달 확장 카드에서는 가격 미공개 모델도 활성 노출한다. 이는 제품이 시장 변화를 따라가고 있음을 보여주기 위한 surface다.
- 비용 계산 surface에서는 `isCostCalculableModel(model)`이 `false`인 모델을 공식 계산 모델로 쓰지 않는다. “공식 발표됨”은 정보이고, “계산 가능함”은 별도 상태다.
- `tool:*`, `asset:*`, `snapshot:*`, source URL, agent route, stale warning 같은 내부 근거는 admin/debug 모드에서만 표시한다. 고객 화면은 비용, 마진, 리스크, 결정 요약 중심으로 유지한다.
- AI Agent는 미공개 단가를 추정하지 않는다. 미공개 modality는 `unsupported_pricing` 또는 “공식 API 단가 확인 필요”로만 설명한다.

## 1. 문서 역할

`PRODUCT_UX.md`는 앱 본체의 기준 문서다. 앱은 Montage/WDS 운영 콘솔 언어를 따르되, P1부터는 랜딩과 앱을 분리하지 않는 **단일 웹앱**으로 간다. `DESIGN.md`는 Montage/WDS 토큰·컴포넌트 레퍼런스로만 참고하고, 실제 제품 서체는 **Pretendard 단일 서체**로 통일한다. `LANDING_UX.md`는 독립 랜딩 구현 문서가 아니라 웹앱 첫 화면의 온보딩/설명 섹션 참고 문서다.

앱 본체의 목표는 낮은 밀도의 제품 갤러리가 아니라, 사용자가 AI 팀 설계 결정을 끝까지 밀고 가는 고밀도 의사결정 작업대다.

## 2. 제품 척추

앱은 화면 묶음이 아니라 결정 흐름이다.

```txt
Design -> Cost -> Bottleneck -> Optimize + Risk -> Decision Log
```

각 단계의 성공 기준은 다음 결정으로 넘어갈 수 있는가다.

| 단계 | 사용자의 결정 | 성공 기준 |
| --- | --- | --- |
| Design | 어떤 회사/업무/Agent 구성을 시뮬레이션할지 정한다. | 회사 유형, 업무 빈도, Agent I/O가 비용 계산 가능한 형태가 된다. |
| Cost | 현재 구성의 월 비용을 받아들일지 판단한다. | 월 비용, 요청 수, 토큰 수, Agent별 비용 출처가 보인다. |
| Bottleneck | 어디가 비용/운영 병목인지 고른다. | 상위 Agent, 재로드 입력, 고객 수 선형 증가 같은 병목이 표와 설명으로 분리된다. |
| Optimize + Risk | 절감안을 채택하거나 보류한다. | 절감액, 리스크 카드, 사람 승인 게이트가 함께 보인다. |
| Decision Log | 결정을 기록하고 다음 보정 루프로 넘긴다. | 결정, 이유, 가정, tool ref, risk card, Plan vs Actual 스냅샷이 남는다. |

PRD의 9단계 데모는 이 척추의 세부 네비게이션이다. 9단계는 좌측 네비게이션에 유지하고, 중앙 작업영역은 현재 단계의 입력/표/차트를 보여주며, 우측 패널은 AI 해석과 결정 버튼을 제공한다.

## 3. 3-pane 운영 콘솔

앱 본체는 세 영역을 기본 구조로 한다.

| 영역 | 역할 | 주요 컴포넌트 |
| --- | --- | --- |
| 좌측 패널 | 생애주기 단계와 Agent 목록 탐색 | Decision flow nav, PRD 9-step demo path, Agent role list, 상태 badge |
| 중앙 작업영역 | 결정론적 입력과 숫자 작업 | forms, tables, metric tiles, charts, agent I/O editor, cost forecast |
| 우측 패널 | AI 보조와 승인 | AI interpretation, tool ref chips, Risk Card, Adopt/Reject/Record buttons |

좌측 패널은 사용자가 어디에 있는지, 중앙은 무엇을 계산하는지, 우측은 왜 이 결정을 해야 하는지 보여준다. AI-native 느낌은 채팅창을 크게 만드는 데서 나오지 않고, 우측 패널이 계산 옆에서 판단 보조자처럼 붙어 있는 데서 나온다.

## 4. 숫자와 해석의 분리

숫자는 deterministic engine의 산출물이다. 해석은 AI layer의 산출물이다. 두 영역은 시각적으로도 분리한다.

| 종류 | 스타일 | 규칙 |
| --- | --- | --- |
| deterministic 숫자 | 단단한 table, metric tile, 고정폭 정렬, `translate="no"` | 모든 표시 숫자는 `src/lib/format.ts` 포맷 함수만 사용한다. |
| AI 해석 | 주석/말풍선형 callout, 연한 배경, 짧은 문장 | 모든 문장 옆에 `tool:*` 또는 `risk:*` chip을 붙인다. |
| Risk Card | caution/negative tone, 근거 ID 노출 | 절감안 채택 버튼은 risk card가 없으면 비활성화한다. |
| Decision Log | 감사 가능한 ledger row | 결정, 이유, 가정, tool ref, risk card를 함께 저장한다. |

AI 문장은 숫자를 만들지 않는다. 숫자가 필요하면 tool ref chip으로 기존 deterministic 값을 인용한다.

## 5. 상태 패턴

모든 주요 화면은 네 가지 상태를 갖는다.

| 상태 | 의미 | UI 처리 |
| --- | --- | --- |
| Empty / Sample | 아직 입력이 없다. | sample load, default catalog, onboarding hint를 제공한다. |
| Assumption-based Estimate | 실측 전 가정 기반이다. | 노란 `Assumption-based` label과 조정 가능한 입력을 붙인다. |
| Plan vs Actual | 실제 usage log가 들어왔다. | 예상 대비 실제, 편차 원인, 다음 AgentSpec patch 후보를 보여준다. |
| Post-decision | 채택/거부/운영 결정이 기록됐다. | Decision Log row와 다음 검토 CTA를 보여준다. |

에러 상태는 조용하지만 숨기지 않는다. 원격 저장소나 LLM runtime이 꺼져 있으면 local fallback과 deterministic fallback을 명시한다.

## 6. 핵심 컴포넌트 규칙

### Forms

- 입력은 작은 라벨, 도움말, validation text를 갖는다.
- 비용 계산에 쓰이는 값은 `Number.isFinite()`로 가드하고, 잘못된 입력은 `0` 또는 `—`로 안전하게 처리한다.
- 사용자는 토큰 수를 직접 추정하도록 방치하지 않는다. artifact template 기본값을 보여주고 수정 가능하게 둔다.

## P1 개정: 고객용 웹앱 + 확장 Agent 운영체계

P1에서는 앱을 별도 마케팅 랜딩과 분리된 도구로 보지 않고, 고객이 실제로 들어와 쓰는 하나의 웹 대시보드로 본다. 이 제품은 **1인 창업자**가 자신의 AI 팀 비용, 마진, 병목, 절감안, 결정 기록을 한 번에 보는 **단일 웹앱**이다. 기존 `Design -> Cost -> Bottleneck -> Optimize + Risk -> Decision Log` 흐름은 유지하되, 앞단에는 `Trust Intake`를 명시적으로 추가하고, 뒤에는 월간 검토와 운영 기록을 붙인다.

```txt
Trust Intake -> Work Ledger -> Cost & Margin -> Bottleneck -> Optimize + Risk -> Operating Decision -> Monthly Review
```

### 웹앱 첫 화면

웹앱 첫 화면은 독립 랜딩을 대신하는 dashboard entry다. 사용자는 여기서 세 가지 행동 중 하나를 고른다.

| 진입 | 목적 | 성공 기준 |
| --- | --- | --- |
| 1인 창업자 샘플 실행 | 3분 안에 제품 가치를 본다. | Work Ledger, Cost/Margin, Bottleneck, Decision Ledger가 샘플로 채워진다. |
| usage export 업로드 | 실제 고객 데이터로 시작한다. | Trust Intake가 raw prompt/API key/PII/schema health를 검사하고 snapshot 허용 여부를 표시한다. |
| 기존 workspace 열기 | 지난 월간 리뷰와 결정 기록으로 돌아온다. | Monthly Review, Decision/Operating Ledger, report export가 이어진다. |

### Customer-facing SaaS Dashboard

P1 고객용 화면은 운영자 콘솔보다 결과와 근거를 먼저 보여준다. 필수 surface는 `workspace home`, `upload history`, `monthly review history`, `current cost/margin snapshot`, `agent review history`, `decision ledger`, `report export`, `alert settings`다. 내부 운영자용 세부 정보(schema mapping, adapter 상태, raw issue)는 advanced/admin 영역에 둔다.

### Supervisor Agent-as-Tool

11개 Operating Agent는 제품의 주체다. Python/LangChain runtime은 `Supervisor Agent-as-Tool` 구조로 stage별 primary/reviewer Agent를 호출하고, 각 Agent는 read-only capability tool(snapshot, risk, benchmark, decision, provider registry, model perf matrix, operating ledger)을 사용한다. 비용, 마진, 절감액, budget delta는 계속 TypeScript deterministic engine이 만든 `tool:*` snapshot만 인용한다.

### Full RAG

P1 `Full RAG`는 세 갈래로 분리한다.

| RAG | 역할 | 숫자 권위 |
| --- | --- | --- |
| 공식 문서 RAG | 가격/스펙 설명 보조 | structured fact ledger가 권위 |
| benchmark RAG | peer/evidence 비교 | corpus 부족 시 `baseline unavailable` |
| decision RAG | 과거 결정 검색 | decision id + snapshot version을 반환 |

RAG 결과는 반드시 `evidence:*`, `asset:*`, `decision:*`, `source:*` ref를 반환한다. RAG는 fact table 숫자를 덮어쓰지 않는다.

### P1 자동화 Surface

P1 확장 큐는 제품 표면에 `ready/backlog` 상태로 남긴다.

| 확장 | UI 위치 | 승인 규칙 |
| --- | --- | --- |
| SDK/Gateway 자동 수집 | upload history / Trust Intake | Trust pipeline 통과 전 snapshot 금지 |
| Slack/Email alert | alert settings | 기본 draft, human approval 후 발송 |
| Stripe/Billing draft | Operating Decision / Pricing | adopted decision + rollback metadata 필요 |
| vLLM/GPU economics | Model/Inference advanced module | provider API cost와 분리, what-if만 표시 |
| Benchmark marketplace | benchmark evidence drawer | 부족하면 평균을 만들지 않고 `baseline unavailable` |
| Retention/Data room automation | workspace admin / audit export | raw prompt/API key/PII 원본 저장 금지 |

### Tables

- 비용/토큰/요청 수는 오른쪽 정렬한다.
- Agent, task, artifact 이름은 왼쪽 정렬한다.
- top 5는 기본 표시, 자세한 행은 확장으로 보낸다.
- table 안에서는 inline 계산이나 inline 포맷을 금지한다.

### Charts

- 차트는 의사결정 질문이 있을 때만 사용한다.
- 비용 share, before/after, Plan vs Actual 차이에 집중한다.
- chart tooltip도 `fmtCurrency`, `fmtPercent`, `fmtTokens`를 사용한다.

### Right AI Panel

- 상단은 현재 단계의 AI 해석이다.
- 중단은 risk card와 tool ref chip 목록이다.
- 하단은 `Adopt`, `Reject`, `Record decision` 같은 결정 버튼이다.
- LLM이 비활성화된 경우에도 deterministic fallback event를 보여준다.

### Decision & Approval Log

- 앱의 마지막 부록이 아니라 first-class screen이다.
- adopted/rejected/superseded 상태를 구분한다.
- 모든 adopted optimization은 risk card를 요구한다.
- localStorage와 원격 store를 모두 지원하되, 원격이 없으면 fallback 상태를 노출한다.

## 7. 랜딩과 앱의 통합

P1부터 별도 랜딩 라우트를 만들지 않는다. 첫 화면은 웹앱 안의 onboarding/dashboard entry이며, 사용자는 설명을 읽고 바로 샘플 실행, usage export 업로드, 기존 workspace 열기로 들어간다.

| Surface | 문서 역할 | 밀도 | 표현 |
| --- | --- | --- | --- |
| 웹앱 첫 화면 | `LANDING_UX.md`는 온보딩 참고 문서 | 중간 | Pretendard 단일 서체, 제품 가치 설명, 3개 CTA |
| App workspace | `PRODUCT_UX.md` / `PRODUCT_UX_DETAILED.md` | 높음 | Pretendard 단일 서체, #0066FF 단일 인터랙션, 3-pane console |

공통(두 surface 불변): 인터랙션 색 `#0066FF` 단일, rest 카드 무그림자(gutter 분리)·12px radius, 이모지 금지(SVG), `translate="no"`/`notranslate`. glass morphism·보라 그라데이션 텍스트·네온·과도한 장식은 두 surface 모두 금지.

## 8. 구현 우선순위

1. App shell을 Montage/WDS 3-pane console로 바꾼다.
2. 좌측 네비게이션에 decision flow와 PRD 9-step path를 넣는다.
3. 중앙 작업영역에 기존 Wedge A/B 패널을 결정 흐름 순서로 재배치한다.
4. 우측 AI panel에 deterministic fallback event, tool ref chip, risk card, 결정 버튼을 묶는다.
5. `/api/team-cost-agent`는 opt-in real LLM runtime을 시도하고, 미구성 시 deterministic fallback을 유지한다.

## 9. 완료 기준

- `src/app/App.test.tsx`는 Apple gallery class를 기대하지 않는다.
- 앱 root는 `translate="no"`를 유지한다.
- `meta name="google" content="notranslate"`는 유지한다.
- 우측 AI panel에는 적어도 하나의 `tool:*` chip이 보인다.
- risk card 없이 optimization adoption이 불가능하다.
- `npm run test:run`과 `npm run build`가 통과한다.

## 10. Service MVP Runbook

See `docs/runbooks/agentcost-service-mvp-runbook.md` for the service MVP operating flow.

## 11. Official Research Watchtower UX (2026-05-24)

P1 웹앱은 공식 발표에 기민하게 반응해야 한다. 그래서 고객 화면과 admin/debug 화면을 분리한 `Official Research Watchtower`를 둔다.

- 고객 기본 화면은 “공식 가격 확인됨”, “공식 발표됨 / API 가격 미공개”, “중국 본토 가격과 국제 가격 다름”, “사용자 단가 입력 전 계산 불가”처럼 의사결정에 필요한 요약만 보여준다.
- admin/debug 화면은 source URL, crawler hash, parser warning, region/currency/FX review, hosted third-party 여부, candidate status를 보여준다.
- 중국권 provider는 Watchtower v1 필수 범위다. Qwen, Kimi, DeepSeek, GLM, MiniMax, Doubao, ERNIE, Hunyuan, StepFun을 active watch 대상으로 둔다.
- 01.AI/Yi, Baichuan, SenseTime, Huawei Pangu, iFlytek Spark는 가격이 불명확해도 radar 후보로 둔다.
- model owner와 serving provider는 분리한다. 예: GLM first-party 가격과 Baidu Qianfan hosted GLM 가격은 같은 숫자로 취급하지 않는다.
- 원본 가격은 원본 통화와 원본 단위로 저장한다. CNY 가격은 FX snapshot이 승인되기 전까지 USD 계산에 쓰지 않는다.
- Agent는 Watchtower 후보를 조회하고 설명할 수 있지만 후보를 자동 승인하거나 가격/환율을 만들 수 없다.
