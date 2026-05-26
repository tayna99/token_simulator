# 폴더 구조 MVP 확장 구현 계획

> **목적:** 프로젝트를 token cost simulator(토큰 비용 계산기)에서 AI 제품의 비용, 마진, 가격, 사용량 가져오기, 알림을 다루는 workspace(작업공간)로 확장하기 쉽게 재구조화한다.

## 핵심 원칙

- 현재 동작하는 MVP는 깨지지 않아야 한다.
- 파일은 "컴포넌트 묶음"이 아니라 product capability(제품 기능 역량) 기준으로 나눈다.
- `src/lib/calculator.ts`와 `src/lib/format.ts`는 공개 계산/표시 진입점으로 유지한다.
- 기능별 세부 로직은 점진적으로 `src/features/*/lib`로 옮긴다.
- design_system(디자인 시스템 참고 자료)과 실제 앱 UI의 관계를 문서화한다.

## 왜 구조를 바꾸는가

현재 구조는 데모에는 충분하지만 확장에는 약하다.

- `src/components`에 MVP 화면, legacy panel(이전 패널), 실험 UI, 재사용 UI가 한 층에 섞여 있다.
- 비즈니스 로직이 `src/lib`에 흩어져 있어 product concept(제품 개념)이 폴더명에서 바로 보이지 않는다.
- 다음 제품 방향은 usage import(사용량 가져오기), cost calculation(비용 계산), quality burden(품질·검수 부담), pricing/margin(가격·마진), reporting(리포트), operations alerts(운영 알림)를 분리해야 한다.

비개발자 창업자, 개발자, 미래 기여자가 아래 문장을 구조만 보고 이해할 수 있어야 한다.

```txt
이 앱은 LLM 사용량 데이터를 받아 기능별 원가로 바꾸고,
품질·검수 부담을 더해 사업 지표와 연결한 뒤,
가격·마진·절감·알림 결정을 돕는다.
```

## 권장 목표 구조

```txt
src/
  app/                  앱 조립, 레이아웃, provider
  features/
    usage/              사용량 입력, CSV import, workload 계산
    current-cost/       현재 비용, 비용 분해
    alternatives/       모델 대안 비교
    savings/            절감 레버와 최적화 로드맵
    unit-economics/     고객·기능·요금제별 단위경제성
    pricing/            가격 시나리오와 rate card 초안
    report/             리포트 산출물
    decision-log/       결정 로그
    alerts/             운영 알림 후보
  lib/                  공개 계산/포맷 진입점
  components/ui/        재사용 UI primitive(기본 부품)
  styles/               전역 스타일과 토큰
```

## 작업 1: 공개 계약 고정

- [ ] `src/lib/calculator.ts`는 비용 계산의 유일한 공개 경로로 유지한다.
- [ ] `src/lib/format.ts`는 사용자 표시 숫자의 유일한 공개 경로로 유지한다.
- [ ] feature 폴더가 내부 helper를 가져가더라도 기존 import가 깨지지 않게 한다.
- [ ] 테스트는 기존 화면의 값이 재구조화 전후로 같음을 확인한다.

## 작업 2: Usage 기능 폴더

- [ ] `usageImport.ts`, workload/preset 관련 코드를 `src/features/usage`로 모은다.
- [ ] CSV 필수 컬럼과 오류 메시지를 문서화한다.
- [ ] README에는 usage event(사용량 이벤트), attribution key(귀속 키), snapshot(분석 데이터 묶음)을 설명한다.

## 작업 3: Current Cost와 Alternatives 분리

- [ ] 현재 비용 패널과 모델 비교 패널을 분리한다.
- [ ] model catalog(모델 카탈로그)는 alternatives data로 이동하되 계산 경로는 유지한다.
- [ ] "cheapest" 같은 모호한 표현은 scope(비교 범위)를 붙여 쓴다.

## 작업 4: Savings와 Unit Economics

- [ ] savings lever(절감 수단)와 unit economics(단위경제성)를 별도 기능으로 둔다.
- [ ] raw cost와 effective cost(재시도·사람 검수·CS 비용 포함 실제 원가)를 구분한다.
- [ ] gross margin(매출총이익률)과 customer profitability(고객별 수익성)를 같은 계산 snapshot에서 읽는다.

## 작업 5: Pricing, Report, Decision Log

- [ ] pricing scenario(가격 시나리오)와 rate card draft(요금표 초안)를 `pricing`으로 묶는다.
- [ ] report artifact(리포트 산출물)는 `report`에서 관리한다.
- [ ] decision log(결정 로그)는 pricing/report와 느슨하게 연결하고, 저장/삭제/export 계약을 명확히 한다.

## 작업 6: UI primitive 정리

- [ ] 버튼, 카드, 표, 탭, segmented control, trust notice를 재사용 UI로 분리한다.
- [ ] 카드 안 카드 구조를 피한다.
- [ ] 긴 한국어 문장이 모바일에서 겹치지 않는지 확인한다.

## 작업 7: 문서화

- [ ] 각 feature 폴더에 README를 둔다.
- [ ] README에는 목적, 소유 파일, 핵심 타입, 테스트 명령을 적는다.
- [ ] 내부 용어는 처음 등장할 때 괄호로 풀어 쓴다.

## 검증

- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] CSV import → 비용 분해 → 마진 → 가격 시나리오 → 리포트 흐름 스모크

## 완료 기준

- 새 기여자가 폴더명만 보고 기능 경계를 이해한다.
- 계산과 표시의 단일 진입점이 유지된다.
- 기존 UI 동작은 유지되고, 기능별 테스트 위치가 명확해진다.
