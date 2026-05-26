# Montage UI 적용 구현 계획

> **Montage UI**는 Wanted(원티드)의 디자인 시스템에서 관찰한 색상, 글꼴, 카드, 버튼, 필터, 간격 규칙을 AgentPayroll 화면에 적용하는 작업이다. 목표는 장식이 아니라 "한국 SaaS 운영 도구처럼 조용하고 신뢰감 있게 읽히는 화면"이다.

## 원천 디자인 시스템 판독

- 기본 브랜드 색은 `#0066FF` 계열 파랑이다.
- 제품 UI는 과한 gradient(그라데이션)보다 흰 표면, 따뜻한 회색, 명확한 테두리, 안정된 간격을 쓴다.
- 카드 모서리는 과하게 둥글지 않게 유지한다.
- CTA(주요 행동 버튼)는 한 화면에서 명확히 한두 개만 강하게 보인다.
- Wanted Sans/Pretendard 계열처럼 한국어 가독성이 좋은 sans-serif(고딕 계열)를 우선한다.

## 비즈니스 지표 계산

### 현재 구현

- 비용과 절감액은 기본 계산기를 통과한다.
- 일부 패널은 raw cost(순수 모델 호출비)만 보여 준다.
- role language(역할별 문장)와 business metric(사업 지표)이 화면별로 흩어져 있다.

### 필요한 업그레이드

- gross margin(매출총이익률), customer profitability(고객별 수익성), feature COGS(기능별 매출원가)를 같은 기준으로 보여 준다.
- "싸다/비싸다"보다 "이 고객·기능을 계속 키우면 마진이 남는가"를 먼저 말한다.
- 모든 숫자는 `src/lib/format.ts` 포맷터를 통과한다.

## 목표 시각 방향

- SaaS 운영 도구답게 dense but calm(정보는 촘촘하지만 차분한) 화면을 만든다.
- hero/marketing layout(랜딩 페이지형 과장 레이아웃)이 아니라 작업 화면을 첫 화면으로 둔다.
- 카드 안에 카드를 넣지 않는다.
- 아이콘 버튼과 segmented control(분할 선택 버튼)을 적극 사용한다.
- 모바일에서는 핵심 KPI와 다음 행동이 먼저 보이게 한다.

## 파일 구조

- `src/styles/`
- `src/components/`
- `src/app/App.tsx`
- `src/features/*/components/`
- `DESIGN.md`
- `design_system/`

## 작업 1: Token과 Font Layer

**목표:** 색상, 간격, 글꼴, 모서리, 그림자를 재사용 가능한 토큰으로 정리한다.

- [ ] brand blue, text, border, surface 색상을 변수로 둔다.
- [ ] Pretendard/Wanted Sans 계열 fallback을 정의한다.
- [ ] spacing scale(간격 단계)을 4px 기준으로 정리한다.
- [ ] button/card/input radius를 4/8/12px 중심으로 제한한다.
- [ ] 자동번역 보호(`notranslate`)를 유지한다.

## 작업 2: Local WDS-like Primitives

**목표:** 외부 디자인 시스템을 직접 의존하지 않고, 비슷한 품질의 로컬 primitive(기본 UI 부품)를 만든다.

- [ ] Button
- [ ] IconButton
- [ ] SegmentedControl
- [ ] MetricTile
- [ ] TableShell
- [ ] EmptyState
- [ ] Alert/TrustNotice

각 primitive는 긴 한국어 텍스트가 들어와도 레이아웃이 깨지지 않아야 한다.

## 작업 3: Five-Step Flow에 디자인 시스템 적용

**목표:** Design → Cost → Bottleneck → Optimize+Risk → Decision Log 흐름이 하나의 운영 도구처럼 느껴지게 한다.

- [ ] 상단 stage navigation(단계 이동)을 정리한다.
- [ ] KPI 영역은 과장된 hero가 아니라 compact operating summary(작은 운영 요약)로 만든다.
- [ ] Trust Gate와 Report Gate는 시각적으로 "안전 관문"처럼 구분한다.
- [ ] 주요 CTA는 다음 결정 행동과 연결한다.

## 작업 4: Business Metric Upgrade

**목표:** 화면이 단순 비용표가 아니라 마진 판단을 보여 주게 한다.

- [ ] cost per customer(고객당 비용), cost per feature(기능당 비용), gross margin을 같은 단위로 보여 준다.
- [ ] heavy user(과사용 고객)와 loss-making customer(손해 고객)를 명확히 표시한다.
- [ ] effective cost(실제 원가: 재시도·사람 검토·CS 비용 포함)를 raw cost와 구분한다.
- [ ] 가격 시나리오에는 expected margin delta(예상 마진 변화)를 붙인다.

## 작업 5: Visual Smoke와 Regression

- [ ] desktop/mobile에서 텍스트 겹침이 없는지 확인한다.
- [ ] chart/table/card가 viewport(화면 크기)에 맞춰 안정적으로 줄어드는지 확인한다.
- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] 가능한 경우 브라우저 스크린샷으로 첫 화면, CSV 업로드, 가격 시나리오, 리포트 흐름을 확인한다.

## 승인 기준

- 첫 화면이 "AI 비용 대시보드"가 아니라 "손해 고객과 가격 결정을 찾는 운영 화면"으로 읽힌다.
- 원티드풍의 파랑·흰 표면·따뜻한 회색·정돈된 간격이 일관된다.
- 버튼, 탭, 표, KPI, 리포트 게이트가 같은 시각 언어를 쓴다.
- 한국어 긴 문장이 UI를 깨뜨리지 않는다.
- 제품의 핵심 신뢰 문구(raw prompt 미수집, API key 차단, 숫자 결정론 계산)가 화면 안에서 먼저 보인다.
