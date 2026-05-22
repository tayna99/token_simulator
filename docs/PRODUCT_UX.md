# PRODUCT_UX: AI Team Cost Simulator Workspace

작성일: 2026-05-23

## 1. 문서 역할

`PRODUCT_UX.md`는 앱 본체의 기준 문서다. 앱은 Montage/WDS 운영 콘솔 언어를 따른다. `DESIGN.md`는 Apple풍 마케팅 랜딩페이지, hero, 데모 영상, SparkClaw 피칭 화면의 시각 레퍼런스로만 사용한다.

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

## 7. Landing과 App의 분리

| Surface | 기준 문서 | 밀도 | 시각 언어 |
| --- | --- | --- | --- |
| Landing | `DESIGN.md` | 낮음 | 사진, hero, 데모 영상, Apple풍 여백 |
| App workspace | `PRODUCT_UX.md` | 높음 | Montage/WDS, 3-pane console, tables/forms/charts |

공통 금지는 유지한다. glass morphism, 보라 그라데이션 텍스트, 네온 글로우, 과도한 장식은 두 surface 모두에서 쓰지 않는다.

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
