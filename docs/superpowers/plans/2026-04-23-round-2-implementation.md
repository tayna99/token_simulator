# LLM Cost Planner 라운드 2 구현 계획

> **목표:** 앱의 thesis(핵심 주장)를 "토큰 계산기"에서 **역할별 비용 인텔리전스 대시보드**로 전환한다. Developer, PM, CEO가 같은 데이터를 각자 자기 언어로 이해해야 한다.

## 다섯 핵심 질문

1. 지금 월/년에 얼마가 드는가?
2. input/output/cache/batch 중 어디서 돈이 빠지는가?
3. 모델을 바꾸면 얼마나 절감되고, break-even(손익분기점)은 어디인가?
4. 사용량이 늘면 best/base/worst 시나리오 중 어디서 터지는가?
5. 예산 한도에서 몇 명/몇 요청까지 서비스 가능한가?

## 아키텍처

- 기존 Vite + React + TypeScript 앱을 유지한다.
- 신규 순수 함수 모듈 3개를 추가한다.
  - `period`(기간 변환)
  - `breakdown`(비용 분해)
  - `budget`(예산에서 최대 수용량 역산)
- 신규 UI 패널 3개를 추가한다.
  - Cost Breakdown(비용 분해)
  - Budget Cap(예산 한도)
  - Role framing(역할별 문장)
- 기존 Migration, Scenario, Summary 패널을 강화한다.
- 새 의존성은 추가하지 않는다.

## 참조

- `feedback2.md`: 라운드 2 외부 피드백 9개 항목.
- 사용자 요청: 핵심 화면 5개, 역할별 언어, per-request/per-user/budget-cap/top-driver.
- `docs/superpowers/plans/2026-04-23-round-2-backlog.md`: 이전 범위 문서. 이 문서가 대체한다.
- Round 1 SHA `87d71b0`: 배포 기준점.

## 출시 기준

13개 task를 TDD(실패 테스트 → 구현 → 통과) 리듬으로 진행한다. 전체 완료 후 `npm run test:run`, `npm run build`, canary 검증을 통과해야 한다.

## 왜 재구조화인가

Round 1은 auto-translate 방어, formatter 중복 제거, 회귀 테스트 중심의 보수적 방어였다. Round 2는 사용자가 제시한 명제에 맞춰 앱의 정보 표면을 다시 설계한다.

빠진 것:

- Cost Breakdown: input/output/cache/batch 할인 중 어디서 돈이 빠지는지 보여 준다.
- Budget Cap: 예산이 정해졌을 때 얼마나 서비스 가능한지 역산한다.
- Top Cost Driver: 가장 큰 비용 원인을 한 줄로 말한다.
- Per-request/Per-user: PM/CEO가 실제 쓰는 단위로 보여 준다.
- Role framing: 같은 데이터를 개발자/PM/CEO 언어로 바꿔 설명한다.

## 파일 구조 요약

- `src/lib/calculator.ts`: breakdown 필드 추가.
- `src/lib/period.ts`: 기간 변환.
- `src/lib/breakdown.ts`: 채널별 비용 계산.
- `src/lib/budget.ts`: 예산에서 최대 사용자/요청 수 역산.
- `src/lib/insights.ts`: top driver와 절감 제안.
- `src/lib/roleLanguage.ts`: dev/PM/CEO 라벨과 템플릿.
- `src/data/models.ts`: 모델/제공자 확장.
- `src/data/presets.ts`: 프리셋과 기본 요청/사용자 수 확장.
- `src/components/RoleSelector.tsx`: 역할 선택.
- `src/components/PeriodSelector.tsx`: 기간 선택.
- `src/components/CostBreakdown/`: 비용 분해 패널.
- `src/components/BudgetCap/`: 예산 한도 패널.
- `src/components/SummaryCard/`: 역할별 요약.

## T0: SimState 확장

- [ ] period(기간), role(역할), requests/users(요청 수/사용자 수), cache numeric pair(캐시 수치 쌍)을 상태에 추가한다.
- [ ] 모든 패널이 같은 state를 읽도록 한다.
- [ ] 테스트는 state 변경 시 값이 갱신되는지 `rerender`로 확인한다.

## R2.1: 기간 변환 라이브러리

- [ ] monthly/annual/daily 변환을 순수 함수로 만든다.
- [ ] 0, NaN, 음수 입력을 안전하게 처리한다.
- [ ] formatter와 계산 책임을 섞지 않는다.

## R2.2: 모델 카탈로그 확장

- [ ] 모델 10개와 제공자 5개를 추가한다.
- [ ] source URL과 verified date(확인일)를 둔다.
- [ ] release date 이전 차트 포인트를 렌더하지 않는 규칙을 남긴다.

## R2.3: 프리셋 카탈로그 확장

- [ ] 사용 사례 프리셋 6개를 추가한다.
- [ ] 각 프리셋에 기본 요청 수, 사용자 수, 토큰 범위를 둔다.
- [ ] 프리셋 변경 시 모든 계산 값이 갱신되는지 테스트한다.

## R2.4: Breakdown Engine

- [ ] input/output/cache/batch 비용을 분리한다.
- [ ] 캐시 절감과 batch 절감을 별도 필드로 둔다.
- [ ] UI는 `fmtCurrency`와 `fmtPercent`만 사용한다.

## R2.5: Budget Cap Engine

- [ ] 예산에서 max users, max requests를 역산한다.
- [ ] per-request/per-user 비용을 제공한다.
- [ ] 0 또는 가격 미확정 모델에서는 `unavailable`을 반환한다.

## R2.6: Insights와 Role Language

- [ ] top driver를 한 줄로 만든다.
- [ ] developer/PM/CEO별 문장 템플릿을 둔다.
- [ ] 같은 숫자를 다른 역할 언어로만 바꾼다.

## R2.7~R2.13: UI와 통합

- [ ] Cost Breakdown 패널 추가.
- [ ] Budget Cap 패널 추가.
- [ ] Migration Panel에 break-even과 방향 아이콘을 추가.
- [ ] Scenario Planner에 편집 가능한 가정과 tooltip(도움말)을 추가.
- [ ] RoleSelector와 PeriodSelector를 앱에 연결.
- [ ] SummaryCard는 역할별 문장, copy toast(복사 알림), source links(출처 링크)를 제공.
- [ ] input validation(입력 검증), optgroup(제공자별 그룹), 접근성, 모바일 반응형을 보강.

## 검증

- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] 주요 패널의 state sync 회귀 테스트.
- [ ] 모바일에서 텍스트 겹침 없음.

## 완료 기준

- 앱이 단순 토큰 계산기를 넘어 역할별 비용 판단 화면으로 읽힌다.
- 사용자는 월 비용, 비용 원인, 모델 전환 절감, 성장 시 위험, 예산 한도를 한 흐름에서 본다.
- 모든 표시 숫자는 formatter를 통과한다.
