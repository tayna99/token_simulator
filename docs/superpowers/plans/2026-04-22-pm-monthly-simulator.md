# PM Monthly Simulator 구현 계획

> **목표:** PM이 LLM migration ROI(모델 전환 투자 대비 효과), scenario planning(가정별 시나리오), stakeholder summary(이해관계자 요약)를 한 화면에서 볼 수 있는 월간 시뮬레이터를 만든다.

## 아키텍처

- Vite + React + TypeScript 단일 페이지 앱.
- 데이터는 hardcoded model pricing layer(고정 모델 가격 데이터), pure calculator(순수 함수 계산 엔진), 독립 PM feature panel 3개로 구성한다.
- Task 1~4는 순차 실행한다.
- Task 5~7은 git worktree(분리 작업트리) 3개에서 병렬 실행할 수 있다.

## 기술 스택

- Vite 5
- React 18
- TypeScript 5
- Vitest, Testing Library
- Tailwind CSS 3
- Recharts
- html-to-image

## 참고

- 기존 구현 참고 URL: <https://llm-costsim-aulvsefh.manus.space/monthly>

## 병렬 실행 지도

```txt
Task 1 repo setup
  -> Task 2 data
  -> Task 3 calculator
  -> Task 4 app shell
      -> Task 5 Migration Panel
      -> Task 6 Scenario Planner
      -> Task 7 Summary Card
          -> Task 8 merge + deploy
```

## 파일 구조

```txt
token_simulator/
  src/
    data/
      models.ts        모델 가격, releaseDate, 할인율
      presets.ts       workload preset(사용량 프리셋)
    lib/
      calculator.ts    비용 계산 순수 함수
    components/
      ModelSelector.tsx
      TokenInputs.tsx
      MigrationPanel/
      ScenarioPlanner/
      SummaryCard/
    App.tsx
    main.tsx
    index.css
  docs/superpowers/plans/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.js
```

## Task 1: Repo Setup

- [ ] 저장소를 준비하고 Vite React TypeScript 앱을 scaffold(기본 뼈대 생성)한다.
- [ ] Tailwind, Recharts, html-to-image, Vitest, Testing Library를 설치한다.
- [ ] 기본 앱이 로컬에서 뜨는지 확인한다.
- [ ] 기존 로컬 파일이 있으면 별도 디렉터리에 복제 후 필요한 파일만 옮긴다.

## Task 2: Model Data

- [ ] `models.ts`에 15개 모델의 입력/출력 단가, release date, cache discount, batch discount를 둔다.
- [ ] provider(모델 제공자), context window(문맥 길이), source URL(출처)을 함께 기록한다.
- [ ] 가격이 불확실한 모델은 estimated/tbd로 표시한다.

## Task 3: Calculator

- [ ] monthlyCost, annualCost, inputCost, outputCost, cacheSavings, batchSavings를 계산한다.
- [ ] 모든 계산은 순수 함수로 만든다.
- [ ] NaN, 음수, 비유한 숫자는 안전하게 처리한다.
- [ ] 단위 테스트로 같은 입력이 같은 결과를 내는지 확인한다.

## Task 4: App Shell

- [ ] 공유 상태를 `App.tsx`에서 관리한다.
- [ ] 모델 선택, 토큰 입력, 캐시/배치 가정을 연결한다.
- [ ] 세 패널이 같은 입력을 읽도록 한다.
- [ ] 사용자 표시 숫자는 formatter를 통과하게 한다.

## Task 5: Migration Panel

- [ ] 현재 모델과 후보 모델을 비교한다.
- [ ] 월/연 절감액과 절감률을 보여 준다.
- [ ] break-even(손익분기)을 계산한다.
- [ ] 같은 모델 비교와 가격 미확정 모델을 안전하게 처리한다.

## Task 6: Scenario Planner

- [ ] best/base/worst 시나리오를 제공한다.
- [ ] 요청 수, 입력 토큰, 출력 토큰, 캐시 비율을 편집 가능하게 한다.
- [ ] 각 시나리오의 월 비용과 차이를 보여 준다.
- [ ] 편집 후 다른 패널 값이 갱신되는지 테스트한다.

## Task 7: Summary Card

- [ ] PM이 복사해 공유할 수 있는 한 장 요약을 만든다.
- [ ] 핵심 숫자, 추천 후보, 전제 조건, 출처 링크를 포함한다.
- [ ] export 이미지 생성은 html-to-image를 사용한다.
- [ ] 영어 블록은 `lang="en"`으로 보호한다.

## Task 8: Merge와 Deploy

- [ ] 병렬 worktree 결과를 충돌 없이 합친다.
- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] 배포 후 주요 화면을 확인한다.

## 완료 기준

- PM이 한 화면에서 현재 비용, 모델 전환 효과, 시나리오, 공유 요약을 볼 수 있다.
- 계산은 `calculator.ts` 단일 경로를 따른다.
- 화면 숫자는 일관된 formatter를 쓴다.
- 자동번역이 모델명과 숫자를 깨뜨리지 않는다.
