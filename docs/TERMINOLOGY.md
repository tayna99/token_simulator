# TERMINOLOGY: 용어 친화화 가이드 (AgentPayroll)

작성일: 2026-05-23  
목적: 사용자(특히 1인 창업자)가 겁먹지 않는 **쉬운 말**로 통일한다. finance·엔지니어링 전문용어는 기본 노출에서 빼고, 필요할 때만 보조로 보여준다.

---

## 0. 3가지 원칙

1. **쉬운 한국어가 기본.** 화면·랜딩·버튼·설명은 쉬운 말로 쓴다.
2. **전문용어는 점진 공개.** CFO/투자자도 알아볼 수 있게, 전문용어는 괄호나 툴팁으로만 보조 표기한다. 예: **남는 돈**(이익률).
3. **내부/코드 용어는 화면에 안 보인다.** `deterministic engine`, `tool ref`, `agent-run`, `toolResults` 같은 건 코드·개발문서에만 쓰고, 화면엔 쉬운 대체어를 쓴다.

> 메타포 축: **"AI 팀의 급여명세서."** AI 팀원이 한 일과 그 비용을 보여주는 도구. 이 비유 하나로 대부분의 용어가 쉬워진다.

---

## 1. AI 팀 (급여 메타포)

| 어려운 말 | 쉬운 말 (기본) | 보조(선택) |
| --- | --- | --- |
| Agent | **AI 팀원** | Agent |
| Research/PM/Engineering Agent | 리서치 AI · 기획 AI · 개발 AI · 고객응대 AI | — |
| agent-run / session | **작업 1회** | — |
| deliverable | **한 일 / 결과물** | — |
| review gate / approval gate | **사람 확인** | — |
| monthly cost | **이번 달 비용** ("AI 팀 급여") | — |

## 2. 비용 · 돈

| 어려운 말 | 쉬운 말 | 보조 |
| --- | --- | --- |
| AI COGS / LLM cost | **AI 비용** | — |
| token / input·output tokens | **사용량** | 토큰 |
| cost attribution | **비용이 어디서 나오는지** | — |
| cost per request/report | **1건당 비용** | — |
| gross margin | **남는 돈 / 남는 비율** | 이익률, gross margin |
| customer profitability | **이 고객은 남는가 (고객별 손익)** | — |
| heavy user / heavy-user loss | **많이 쓰는 고객 / 많이 쓸수록 손해 나는 고객** | — |
| margin compression / erosion | **이익이 줄어듦** | — |
| break-even | **본전 (안 남고 안 잃는 지점)** | 손익분기 |

## 3. 가격 (요금제)

| 어려운 말 | 쉬운 말 | 보조 |
| --- | --- | --- |
| pricing simulation | **가격 바꿔보기** | — |
| flat / seat | **정액제** | — |
| usage-based | **쓴 만큼 내기** | — |
| credit | **충전식 (크레딧)** | — |
| cap | **상한** | — |
| overage | **초과 요금** | — |
| AI add-on | **AI 추가 옵션** | — |
| tier upgrade | **요금제 올리기** | — |

## 4. 분석 · AI

| 어려운 말 | 쉬운 말 | 보조 |
| --- | --- | --- |
| deterministic engine | (화면 비노출) **정확히 계산** | — |
| "숫자는 deterministic, 해석은 AI" | **숫자는 정확히 계산하고, 설명은 AI가 도와줘요** | — |
| tool ref / tool ref chip | **근거** | — |
| risk card | **주의할 점** | — |
| bottleneck | **돈이 가장 많이 새는 곳** | — |
| optimization | **비용 줄이기** | — |
| benchmark | **비슷한 팀 평균과 비교** | — |
| Plan vs Actual | **예상 vs 실제** | — |
| Decision & Approval Log | **운영 일지 (내가 정한 것들)** | — |
| Human Operating Decision | **사람이 정하기** | — |
| attribution 축(customer/feature/model/plan/session/agent-run) | 고객별 · 기능별 · 모델별 · **요금제별** · 작업별 | — |

## 5. 결정 흐름 단계 (spine)

| 내부 단계명 | 화면 표기(쉬운 말) |
| --- | --- |
| Design | **팀 짜기** |
| Cost | **비용 보기** |
| Bottleneck | **새는 곳 찾기** |
| Optimize + Risk | **줄이기 (주의할 점 함께)** |
| Decision Log | **기록** |

## 6. 적용 규칙 (어디까지 바꾸나)

- **화면/랜딩/카피**: 1~5번의 쉬운 말 사용. 전문용어는 괄호·툴팁만.
- **개발 문서/코드(`PRODUCT_UX_DETAILED`, agent_service, src)**: 기존 영문 기술용어 유지(`tool ref`, `agent-run`, `deterministic`) — 협업·검색 위해. 단 **UI 문자열은 쉬운 말**.
- **요금제 모델명**(정액제/쓴 만큼/충전식/상한/초과)은 쉬운 말 + 한 줄 설명 항상 동반.
- 숫자 표시는 여전히 `format.ts` 통과, `translate="no"` 유지.

## 7. 적용 우선순위

1. 랜딩 프로토타입(`prototypes/landing-montage.html`) — 즉시 (이번 작업)
2. 앱 워크스페이스 UI 문자열 — 다음
3. PRD/문서의 "사용자 노출 예시 문장"만 쉬운 말로 (기술 정의는 유지)
