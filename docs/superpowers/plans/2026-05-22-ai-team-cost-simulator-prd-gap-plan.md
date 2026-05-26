# AI Team Cost Simulator PRD 갭 클로저 계획

> **목표:** `docs/research/2026-05-22-ai-team-cost-simulator-prd.md`와 현재 `C:\token_simulator` 구현 사이에 남은 차이를 닫는다.

## 아키텍처

- Wedge A simulator(운영 전 AI 팀 비용 설계 도구)는 P0에서 client-only(브라우저 단독)로 유지한다.
- 모든 token/cost 숫자는 deterministic TypeScript tools(결정론 TypeScript 도구)가 만든다.
- LangGraph.js와 UI 문구는 설명, 비교, 위험 감사, 결정 초안만 담당한다.

## 기술 스택

- Vite, React, TypeScript
- Vitest, Testing Library
- `@langchain/langgraph`
- localStorage Decision Log
- 기존 `calculateCost`

## 현재 구현 상태

이미 구현됨:

- `AgentSpec`, `Artifact`, `Frequency`, review gate schema: `src/features/team-cost/lib/agentSpec.ts`
- `AgentSpec -> monthly tokens -> calculateCost` mapper: `src/features/team-cost/lib/estimateAgentWorkload.ts`
- artifact token template 25개: `src/features/team-cost/lib/artifactTemplates.ts`
- 9-agent catalog: `src/features/team-cost/lib/agentCatalog.ts`
- bottleneck detection(병목 탐지): `src/features/team-cost/lib/bottleneckAnalysis.ts`
- optimization candidate mapping(최적화 후보 매핑): `src/features/team-cost/lib/optimizationPolicies.ts`
- LangGraph.js team-cost flow: `src/features/agent/lib/teamCostGraph.ts`
- tool snapshot contract(도구 스냅샷 계약): `src/features/agent/lib/teamCostToolContract.ts`
- screen 1~4 UI panel: `src/features/team-cost/components/*`
- Wedge A toggle path: `src/app/App.tsx`
- Decision Log primitive: `src/features/decision-log/lib/decisionLog.ts`

검증 기준:

```bash
npm test -- --run src/features/team-cost/lib/agentSpec.test.ts src/features/team-cost/lib/estimateAgentWorkload.test.ts src/features/team-cost/lib/artifactTemplates.test.ts src/features/team-cost/lib/agentCatalog.test.ts src/features/team-cost/lib/bottleneckAnalysis.test.ts src/features/team-cost/lib/optimizationPolicies.test.ts src/features/agent/lib/teamCostGraph.test.ts src/features/agent/lib/teamCostRuntime.test.ts src/features/agent/lib/teamCostToolContract.test.ts
```

예상: 9개 파일 / 13개 테스트 통과.

```bash
npm test -- --run src/app/App.test.tsx
```

예상: 1개 파일 / 6개 테스트 통과.

## 남은 핵심 갭

core engine(핵심 엔진)은 있지만 PRD의 5-screen MVP(5개 화면 MVP)가 완전히 제품화되지 않았다.

- Screen 1은 대부분 static(정적)이다.
- Screen 2는 monthly runs(월 실행 횟수)만 편집한다.
- Screen 4는 risk cards(위험 카드)와 adoption controls(채택 조작)를 충분히 노출하지 않는다.
- Screen 5는 Wedge A Decision Log workflow가 아니라 placeholder(자리표시자)에 가깝다.

## 작업 1: Screen 1 편집 가능하게 만들기

- [ ] company setup(회사 설정) 입력이 실제 team cost state를 바꾸게 한다.
- [ ] monthly AI team budget(월 AI 팀 예산)을 수정하면 화면 값이 갱신된다.
- [ ] 테스트는 `userEvent`로 입력 변경 후 새 금액이 보이는지 확인한다.

## 작업 2: Screen 2 입력 확장

- [ ] monthly runs 외에도 document size, review level, model choice를 편집하게 한다.
- [ ] 편집 값이 token workload estimate(토큰 작업량 추정)에 반영된다.
- [ ] 값이 비어 있거나 잘못돼도 계산이 깨지지 않는다.

## 작업 3: Screen 3 병목 설명 강화

- [ ] highest-cost agent와 highest-cost artifact를 분리해 보여 준다.
- [ ] bottleneck reason(병목 이유)을 사람 말로 설명한다.
- [ ] 같은 snapshot ref를 유지한다.

## 작업 4: Screen 4 Risk Card와 Adoption Controls

- [ ] 각 optimization candidate 옆에 Risk Card를 붙인다.
- [ ] Adopt/Reject/Hold 버튼을 추가한다.
- [ ] 품질 민감 후보는 Risk Auditor 결과 없이는 채택되지 않는다.

## 작업 5: Screen 5 Decision Log Workflow

- [ ] 선택한 결정, 이유, 가정, snapshot ref를 Decision Log에 저장한다.
- [ ] export/import 가능성을 남긴다.
- [ ] AI가 만든 초안은 사람 승인과 구분한다.

## 작업 6: Wedge A 리포트

- [ ] 설계 전 AI 팀 비용 리포트를 만든다.
- [ ] 팀 구성, 예상 월 비용, 병목, 추천 조정, 리스크를 포함한다.
- [ ] 실제 운영 사용량이 아니라 estimate임을 명확히 표시한다.

## 검증

- [ ] team-cost lib 테스트 전체
- [ ] App 테스트
- [ ] Screen 1~5 수동 스모크
- [ ] `npm run test:run`
- [ ] `npm run build`

## 완료 기준

- Wedge A가 static demo가 아니라 편집 가능한 5-screen MVP가 된다.
- 숫자는 모두 `calculateCost` 경로에서 온다.
- Decision Log에 사람의 선택과 근거가 남는다.
