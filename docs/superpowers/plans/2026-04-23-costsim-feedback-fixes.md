# LLM Cost Simulator 피드백 라운드 1 수정 계획

> **목표:** `feedback.md`의 6가지 버그/UX 이슈를 해결해 PM 시연 가능한 품질로 안정화한다. 같은 유형의 회귀를 막기 위해 최소 harness(검증 장치)와 formatter module(표시 숫자 포맷 모듈)을 함께 추가한다.

## 아키텍처

- 기존 Vite + React + TypeScript 앱에 대한 유지보수 패치다.
- 새 의존성은 추가하지 않는다.
- 각 수정은 TDD(실패 테스트 → 최소 구현 → 테스트 통과)로 진행한다.
- Chrome 자동번역 같은 브라우저 번역이 모델명/숫자를 깨뜨리지 않도록 `translate="no"`와 meta tag를 유지한다.

## 기술 스택

- Vite 5
- React 18
- TypeScript 5
- Vitest, Testing Library
- Tailwind 3
- Recharts
- html-to-image

## 이전 산출물과의 관계

- `docs/superpowers/specs/2026-04-22-costsim-harness-design.md`: 초기 브레인스토밍 스펙. 실제 코드와 어긋나는 부분이 있어 이번 계획은 `feedback.md`에 다시 맞춘다.
- `docs/superpowers/plans/2026-04-22-pm-monthly-simulator.md`: 선행 계획. 이미 App/Migration/Scenario/Summary 컴포넌트가 존재한다.
- `feedback.md`: 이 계획의 1차 입력이다.

## 파일 구조

- `CLAUDE.md`: 프로젝트 규칙 문서.
- `index.html`: notranslate meta 추가.
- `docs/diagnosis/2026-04-23-deploy-state.md`: 배포 상태 진단 기록.
- `src/lib/format.ts`: 표시 숫자 포맷 함수.
- `src/lib/format.test.ts`: 포맷 테스트.
- `src/components/ModelSelector.tsx`: 모델 선택 UI 수정.
- `src/components/TokenInputs.tsx`: 입력 검증과 자동번역 방어.
- `src/components/MigrationPanel/`: 모델 전환 패널 수정.
- `src/components/ScenarioPlanner/`: 시나리오 패널 수정.
- `src/components/SummaryCard/`: 요약 카드 수정.

## 의존성

- Task 1 진단 후 후속 작업의 우선순위를 확정한다.
- Task 4 formatter가 있어야 여러 컴포넌트에 같은 표시 규칙을 적용할 수 있다.
- 여러 작업이 같은 컴포넌트를 건드리므로 순차 실행을 권장한다.

## 작업 1: 배포 상태 진단

**목적:** 피드백이 실제 소스 버그인지, 구 배포본 문제인지, 브라우저 자동번역 artifact(자동번역이 만든 왜곡)인지 구분한다.

- [ ] 배포본 텍스트와 스크린샷을 캡처한다.
- [ ] feedback.md의 각 주장을 표로 정리한다.
- [ ] `source bug`, `stale deploy`, `auto-translate artifact`, `cannot reproduce` 중 하나로 분류한다.
- [ ] `docs/diagnosis/2026-04-23-deploy-state.md`에 증거를 남긴다.

## 작업 2: Migration Panel 회귀 테스트

- [ ] 모델 변경 시 saving delta(절감 차이)가 갱신되는지 테스트한다.
- [ ] 같은 모델 비교 시 0 또는 unavailable을 안정적으로 표시한다.
- [ ] signed zero(음수 0) 같은 표시 오류를 막는다.

## 작업 3: Scenario Planner 입력 검증

- [ ] 음수, 빈 문자열, NaN 입력을 안전하게 처리한다.
- [ ] scenario cell(시나리오 입력칸)을 편집해도 다른 패널 값이 동기화되는지 테스트한다.
- [ ] 모바일에서 입력칸 텍스트가 넘치지 않게 한다.

## 작업 4: Formatter 모듈

- [ ] `fmtCurrency`, `fmtPercent`, `fmtTokens`, `fmtDelta`, `fmtPricePerMillion`를 만든다.
- [ ] 컴포넌트 내부의 `toLocaleString`, `toFixed`, `$ + n`를 제거한다.
- [ ] NaN/Infinity는 `—`로 표시한다.

## 작업 5: 컴포넌트 표시 통일

- [ ] ModelSelector, TokenInputs, MigrationPanel, ScenarioPlanner, SummaryCard가 formatter만 쓰게 한다.
- [ ] 통화 표기가 한 화면에서 섞이지 않게 한다.
- [ ] "cheapest" 같은 단어는 비교 범위를 붙여 쓴다.

## 작업 6: 자동번역 방어

- [ ] `index.html`에 `<meta name="google" content="notranslate">`를 유지한다.
- [ ] root div에 `translate="no"`를 유지한다.
- [ ] 영어 요약 블록은 `lang="en"`으로 감싼다.
- [ ] 테스트로 notranslate 레이어를 잠근다.

## 작업 7: 입력 UX 개선

- [ ] cache ratio(캐시 비율)와 batch ratio(배치 비율)를 명확히 표시한다.
- [ ] 요청 수/토큰 수 입력의 단위를 분명히 한다.
- [ ] 잘못된 입력은 계산 결과를 깨지 않고 안내 문구를 보여 준다.

## 작업 8: 모델 선택 UX

- [ ] provider별 optgroup(제공자 그룹)을 추가한다.
- [ ] 모델명과 브랜드명이 자동번역으로 깨지지 않게 보호한다.
- [ ] release date, pricing status, source를 필요한 곳에 표시한다.

## 작업 9: SummaryCard 안정화

- [ ] 역할별 문장과 숫자가 같은 입력에서 같은 값으로 갱신되는지 테스트한다.
- [ ] 복사 기능이 있으면 복사 성공 상태를 보여 준다.
- [ ] 긴 문장이 카드 밖으로 넘치지 않게 한다.

## 작업 10: 프로젝트 헌법 보강

- [ ] 계산 단일 경로와 formatter 단일 경로를 문서화한다.
- [ ] 자동번역 방어 규칙을 명시한다.
- [ ] state 변화 테스트 규칙을 남긴다.

## 검증

- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] 배포본 또는 로컬 preview에서 주요 흐름을 수동 확인한다.

## 완료 기준

- 피드백 6개가 원인과 함께 처리된다.
- 표시 숫자와 모델명이 자동번역으로 깨지지 않는다.
- 같은 입력을 쓰는 화면들이 서로 다른 값을 보여 주지 않는다.
