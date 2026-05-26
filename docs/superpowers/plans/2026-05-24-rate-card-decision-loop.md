# Rate Card Decision Loop 구현 계획

> **Rate Card(요금표 초안)**는 실제 Stripe/Metronome 과금 변경이 아니라, 고객·플랜·사용량을 근거로 만든 가격 정책 초안이다. **Decision Loop(결정 루프)**는 이 초안을 사람이 Adopt/Reject/Hold(채택/거절/보류)로 남기기 전에는 리포트나 내보내기를 완료하지 못하게 하는 흐름이다.

## 목표

Rate Card 초안, 운영 일지 강제 루프, 가격 신선도, multimodal UsageEvent v2(텍스트·이미지·오디오·비디오 사용량 이벤트), Decision Header(오늘 내려야 할 결정 한 줄)를 하나의 고객용 의사결정 루프로 만든다.

## 아키텍처

- 숫자와 영향 고객 수는 TypeScript deterministic engine(결정론 계산 엔진)이 계산한다.
- AI/Python Agent는 초안의 의미, 리스크, 다음 질문만 해석한다.
- Stripe/Metronome 같은 billing system(과금 시스템)은 직접 집행하지 않는다.
- 산출물은 `RateCardDraft` export artifact(요금표 초안 파일)와 Decision/Operating Ledger(결정·운영 장부) 기록까지만 만든다.

## 기술 스택

- Vite React TypeScript
- Vitest, Testing Library
- 기존 `calculateCost`, `calculatePricingScenario`
- `DecisionLog`, `ThresholdPolicy`, `ReportArtifact`
- `Official Research Watchtower`(공식 문서 변경 감시 장치)

## 현재 검토 결과

5개 제안은 모두 맞는 방향이다. 구현 순서는 중요하다. `Decision Header`와 `운영 일지 강제 루프`가 먼저 들어가야 Rate Card Export가 단순 파일 다운로드가 아니라 "사람이 선택한 운영 결정"이 된다.

| 제안 | 현재 상태 | 구현 판단 |
| --- | --- | --- |
| Rate Card Draft Export(요금표 초안 내보내기) | pricing scenario 계산은 있음. Rate Card artifact는 없음. | P0.5 핵심. 집행이 아니라 초안 export로 구현 |
| 운영 일지 강제 루프 | Adopt/Reject 버튼은 있음. Export hard gate는 없음. | P0.5 핵심. Export 전에 Adopt/Reject/Hold 필요 |
| Pricing Freshness badge(가격 신선도 표시) | `lastVerifiedAt`, `pricingStatus`, stale warning은 있음. | P0.5 핵심. Decision Log와 연결 |
| multimodal UsageEvent v2 | calculator skeleton은 있음. CSV schema는 text 중심 | P0.5 핵심. I/O 2026과 Gemini Omni 대응 기반 |
| Decision Header | metric summary 중심 | P0.5 핵심. "오늘 내려야 할 결정 1개"로 전환 |

## 파일 구조

### 새 파일

- `src/features/pricing/lib/rateCardDraft.ts`: `RateCardDraft` 타입과 `buildRateCardDraft()` 결정론 빌더.
- `src/features/pricing/lib/rateCardDraft.test.ts`: 초안 필드, 영향 고객 수, 가짜 실행 금지 테스트.
- `src/features/facts/lib/pricingFreshness.ts`: 가격 신선도 요약과 재확인 필요 결정 계산.
- `src/features/facts/lib/pricingFreshness.test.ts`: verified/estimated/tbd/source_changed 상태 테스트.
- `src/features/usage/lib/usageEventV2.ts`: 멀티모달 사용량 row 타입과 비용 입력 변환.
- `src/features/usage/lib/usageEventV2.test.ts`: image/audio/video/cache/tool/search 컬럼 파싱 테스트.
- `src/features/decision-loop/lib/decisionHeader.ts`: 오늘 내려야 할 결정 생성.
- `src/features/decision-loop/lib/decisionHeader.test.ts`: margin breach, stale pricing, rate-card-ready 상황 테스트.
- `src/features/decision-loop/lib/exportGate.ts`: export 전 결정 기록 검사.
- `src/features/decision-loop/lib/exportGate.test.ts`: decision 없는 export 차단 테스트.

### 수정 파일

- `src/features/pricing/lib/pricingScenario.ts`: 고객별 before/after 영향 요약 추가.
- `src/features/decision-log/lib/decisionLog.ts`: `decisionChoice`, `rateCardDraft`, `pricingFreshnessSnapshot` 추가.
- `src/features/report/lib/reportArtifacts.ts`: one-page report와 export artifact에 rate card, freshness, gate 결과 포함.
- `src/features/usage/lib/usageImport.ts`: UsageEvent v2 컬럼과 multimodal totals 추가.
- `src/components/DecisionSummaryStrip/index.tsx`: metric strip에서 decision header로 전환.
- `src/app/App.tsx`: Rate Card Draft panel, Decision Header, Export Gate 연결.
- `src/app/App.test.tsx`: stage flow, export gate, freshness badge, rate card 렌더 테스트.
- `docs/PRD.md`, `docs/PRD-v2.md`, `docs/PRODUCT_UX.md`, `docs/PRODUCT_UX_DETAILED.md`: 제품 스펙 반영.

## 작업 1: Rate Card Draft 모델과 결정론 빌더

- [ ] `RateCardDraft`에 plan, included credits(포함 크레딧), overage price(초과 단가), cap(상한), affected customers(영향 고객), basis margin(근거 마진), source refs(근거 참조)를 둔다.
- [ ] `buildRateCardDraft()`는 pricing scenario 결과와 customer margin row를 입력으로 받는다.
- [ ] Stripe/Metronome 실행 가능 상태를 만들지 않는다. `stripeExecutable:false`, `requiresHumanApproval:true`를 유지한다.
- [ ] 테스트는 영향 고객 수와 근거 ref가 누락되면 실패해야 한다.

## 작업 2: Decision Header

- [ ] "오늘 내려야 할 결정"을 한 문장으로 만든다.
- [ ] 우선순위는 margin breach(마진 기준 위반), stale pricing(오래된 가격), rate-card-ready(요금표 초안 준비) 순서다.
- [ ] 문장은 숫자와 원인을 함께 말하되, 계산은 기존 엔진 결과만 참조한다.
- [ ] 고객 화면은 쉬운 문장, admin/debug 화면은 refs를 함께 보여 준다.

## 작업 3: Export Gate

- [ ] PDF/export 전에 Adopt/Reject/Hold 중 하나가 있어야 한다.
- [ ] `hold`도 유효한 결정으로 인정하되, 이유 입력을 요구한다.
- [ ] gate 실패 시 "먼저 결정을 기록하세요"라고 말한다.
- [ ] 테스트는 state 변화 후 gate 상태가 갱신되는지 `rerender`로 확인한다.

## 작업 4: Pricing Freshness

- [ ] 모델 가격 상태를 `verified`, `estimated`, `tbd`, `source_changed`로 나눈다.
- [ ] 과거 Decision Log에서 가격 재확인이 필요한 결정을 찾는다.
- [ ] source가 바뀐 경우 rate card export를 바로 허용하지 않고 review 상태로 보낸다.

## 작업 5: UsageEvent v2

- [ ] 텍스트 중심 CSV를 깨지 않으면서 image/audio/video/tool/search/cache 컬럼을 읽는다.
- [ ] 가격이 없는 modality(입력 유형)는 `missing_price_warning`으로 표시한다.
- [ ] 멀티모달 비용은 기존 calculator를 우회하지 않는다.

## 작업 6: UI 통합

- [ ] Decision Header를 상단에 둔다.
- [ ] Rate Card Draft panel은 pricing scenario 뒤에 붙인다.
- [ ] Export Gate는 one-page report 버튼 앞에서 작동한다.
- [ ] 고객 화면에서는 실행 버튼이 아니라 draft/export 문구를 쓴다.

## 작업 7: 검증

- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] CSV import → pricing scenario → rate card draft → Adopt/Reject/Hold → PDF export gate 흐름 스모크.
- [ ] demo/fixture 데이터가 production evidence처럼 표시되지 않는지 확인.

## 완료 기준

- Rate Card는 실제 과금 실행이 아니라 사람이 검토할 초안으로만 남는다.
- 리포트 export 전에는 결정이 반드시 기록된다.
- 가격 신선도와 멀티모달 사용량이 결정 근거에 들어간다.
- 숫자는 계산 엔진이 만들고 AI는 해석만 한다.
