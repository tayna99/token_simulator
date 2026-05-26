# Role Projection 구현 계획

> **Role Projection(역할별 투영)**은 같은 비용·마진 snapshot(분석 데이터 묶음)을 Developer, PM, CEO가 각자 다른 우선순위로 보게 만드는 기능이다. 숫자는 같고, 강조점과 설명 순서만 달라야 한다.

## 원천 맥락

- AgentPayroll은 비용 대시보드가 아니라 결정 워크스페이스다.
- 조직 안에서 개발자, PM, CEO가 같은 숫자로 이야기해야 구매 가치가 커진다.
- 따라서 role personalization(역할별 개인화)이 아니라 **shared snapshot with role emphasis(공통 데이터에 역할별 강조를 얹는 구조)**로 설계한다.

## 파일 구조

- `src/features/role-views/lib/roleLanguage.ts`
- `src/features/role-views/lib/projectSnapshotForRole.ts`
- `src/features/role-views/lib/projectSnapshotForRole.test.ts`
- `src/features/role-views/components/RoleProjectionStrip.tsx`
- `src/features/report/lib/`
- `src/app/App.tsx`

## 작업 1: Role Language를 `features/role-views`로 승격

**목표:** 화면 곳곳에 흩어진 역할별 문구를 한 곳으로 모은다.

- [ ] `developer`, `pm`, `ceo` 역할 타입을 정의한다.
- [ ] 각 역할의 primary question(첫 질문)을 둔다.
  - Developer: "어디서 토큰·지연·재시도가 터졌나?"
  - PM: "어떤 기능이 마진과 출시 판단을 흔드나?"
  - CEO/CFO: "어떤 고객·플랜이 손익을 깨고, 가격을 바꿔야 하나?"
- [ ] audience(대상 독자)를 `internal`과 `customer`로 나눈다.
- [ ] customer audience에서는 internal-only(내부 전용) 세부 정보를 숨긴다.

## 작업 2: Typed Role Projection Snapshot 정의

**목표:** 역할별 UI가 자유롭게 숫자를 재계산하지 못하게 타입으로 막는다.

- [ ] 공통 입력은 deterministic snapshot 하나만 받는다.
- [ ] 결과 타입에는 `kpis`, `panelOrder`, `assistantBrief`, `hiddenPanels`, `reportSections`를 둔다.
- [ ] 모든 KPI는 source ref(계산 근거 참조)를 가져야 한다.
- [ ] 값이 없으면 추정하지 말고 `unavailable` 또는 `needs_mapping`으로 표시한다.

## 작업 3: `projectSnapshotForRole` 구현

**목표:** 같은 snapshot을 역할별 화면 계약으로 변환한다.

- [ ] Developer는 model, latency, retry, cache, agent_run 비용을 우선한다.
- [ ] PM은 feature, launch risk(출시 리스크), plan fit(요금제 적합성)을 우선한다.
- [ ] CEO는 gross margin(매출총이익률), loss-making customer(손해 고객), pricing scenario(가격 시나리오)를 우선한다.
- [ ] customer audience에서는 raw row, debug metadata, internal assumptions를 숨긴다.
- [ ] 테스트는 같은 입력에서 총액이 역할마다 달라지지 않음을 확인한다.

## 작업 4: Role Projection Strip 추가

**목표:** 사용자가 현재 같은 데이터를 어떤 관점으로 보고 있는지 즉시 알게 한다.

- [ ] 탭 또는 segmented control(붙어 있는 선택 버튼)로 역할 전환을 제공한다.
- [ ] 역할마다 핵심 질문 한 줄과 가장 중요한 KPI 2~3개를 보여 준다.
- [ ] UI는 dashboard card 중첩이 아니라 작업공간 상단의 얇은 strip(상태 막대)에 둔다.
- [ ] 모바일에서는 줄바꿈되어도 버튼 텍스트가 깨지지 않아야 한다.

## 작업 5: `App.tsx` Stage Rendering에 통합

**목표:** 단계별 카드 배치가 역할에 따라 달라지되, 같은 stage(진행 단계)를 공유한다.

- [ ] Design, Cost, Bottleneck, Optimize+Risk, Decision Log 단계는 그대로 유지한다.
- [ ] role affinity(역할 적합도)에 따라 primary panel과 auxiliary panel을 나눈다.
- [ ] customer audience에서는 내부 패널을 숨긴다.
- [ ] stage navigation(단계 이동)은 역할 전환과 독립적으로 유지한다.

## 작업 6: Assistant와 Report Output에 연결

**목표:** 조수 문장과 리포트 섹션도 같은 역할 투영을 사용한다.

- [ ] assistant brief(조수 요약)는 역할별 첫 질문에 답한다.
- [ ] report artifact(리포트 산출물)는 Developer, PM, CEO/CFO, Board-ready 섹션을 가진다.
- [ ] 숫자는 report에서 다시 계산하지 않고 snapshot ref를 참조한다.
- [ ] Adopt/Reject/Hold 결정은 역할과 상관없이 같은 Decision Log에 저장된다.

## 작업 7: 전체 검증과 브라우저 스모크

- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] role switch 후 값이 바뀌지 않고 강조점만 바뀌는지 테스트한다.
- [ ] customer mode에서 internal-only 패널이 숨겨지는지 확인한다.
- [ ] PDF/report export에 같은 snapshot ref가 남는지 확인한다.

## 자기 검토

- Role Projection은 "개인화된 숫자"가 아니다.
- 개발자·PM·CEO가 다른 문장을 보더라도 손익 계산 결과는 같아야 한다.
- 이 기능의 판매 메시지는 "조직이 같은 숫자로 결정한다"이다.
