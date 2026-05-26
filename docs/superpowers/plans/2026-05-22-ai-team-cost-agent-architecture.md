# AI Team Cost Agent 아키텍처 구현 계획

> **목표:** `2026-05-22-ai-team-cost-simulator-prd.md`의 Wedge A(운영 시작 전 AI 팀 비용 설계 흐름)를 구현한다. 사용자가 AI 팀의 Agent 입력/출력 명세를 정의하면 deterministic engine(결정론 엔진)이 비용을 계산하고, LangGraph.js agent(에이전트 흐름)가 해석·최적화·리스크 감사·Decision Log 초안까지 돕는다.

## 아키텍처

시스템은 두 층으로 나눈다.

1. **Deterministic cost tool layer(결정론 비용 도구 층)**
   - `AgentSpec`(에이전트 명세)과 `Artifact`(입출력 산출물)를 월간 토큰 추정치로 바꾼다.
   - 반드시 `src/lib/calculator.ts`의 `calculateCost` 경로로 비용을 계산한다.

2. **LangGraph.js orchestration layer(에이전트 흐름 조정 층)**
   - tool snapshot(도구 계산 결과 묶음)을 먼저 만든다.
   - 분석 subgraph(하위 그래프)를 병렬 실행한다.
   - optimization recommendation(최적화 추천)은 Risk Auditor(위험 검토자)와 approval gate(승인 관문)를 직렬로 통과한다.

## 기술 스택

- Vite 6, React 18, TypeScript 5
- Vitest
- `@langchain/langgraph` 1.x
- 기존 `src/lib/calculator.ts`
- 기존 `src/lib/format.ts`
- P0: browser/runtime
- P1: Vercel Functions shell
- 이후: Next.js Route Handler

## PRD 해석

이 문서는 Wedge A다. 운영 후 usage log를 분석하는 Wedge B가 아니라, 운영 시작 전에 "AI 팀을 이렇게 구성하면 한 달에 얼마 드는가?"를 보는 pre-flight(사전 점검) 도구다.

핵심 흐름:

```txt
AgentSpec + Artifact I/O + Frequency
  -> token workload estimate
  -> calculateCost
  -> bottleneck / optimization candidate
  -> agent interpretation / risk audit / approval / decision log
```

절대 불변식:

- Agent는 설명, 비교, 추천, 리포트, Decision Log 초안을 작성할 수 있다.
- Agent는 비용, 마진, 토큰 수치를 직접 계산하거나 만들어내면 안 된다.
- 모든 숫자는 deterministic tool ref(결정론 도구 근거 참조)에서만 나온다.

## 이미 있는 기반

- `@langchain/langgraph` 설치.
- P0 graph skeleton: `src/features/agent/lib/agentGraph.ts`.
- browser/server runtime switch: `src/features/agent/lib/agentRuntime.ts`.
- P1 Vercel Functions shell: `src/server/p1ApiHandlers.ts`, `api/*`.
- Risk Card corpus(위험 카드 문서 묶음).
- Decision Log primitive(결정 로그 기본 부품).

## 아직 필요한 핵심

- `AgentSpec` / `Artifact` schema.
- Artifact token template library(산출물별 토큰 추정 템플릿).
- PRD의 9-agent catalog(9종 AI 팀원 카탈로그).
- `AgentSpec -> CalcInput -> calculateCost` mapper.
- 팀 전체 비용 요약과 bottleneck detection(병목 탐지).
- optimization candidate engine(최적화 후보 생성 엔진).
- Wedge A 전용 LangGraph graph: router, parallel branches, serial risk/approval flow, subagents.

## LangGraph 사용 결정

결론: Python LangChain 서비스가 아니라 LangGraph.js `StateGraph`를 직접 사용한다.

이유:

- 현재 deterministic cost core가 TypeScript다.
- 프로젝트 헌법상 모든 비용 계산은 `src/lib/calculator.ts`를 통과해야 한다.
- Python 서비스를 따로 두면 `AgentSpec -> token estimate -> calculateCost` 단일 경로가 찢어진다.
- LangGraph.js는 state, router, parallel branch, subgraph, human approval gate를 구현하기에 충분하다.

## Top-Level Flow

```txt
Intake
  -> Normalize AgentSpec
  -> Estimate Workload
  -> Calculate Cost
  -> Detect Bottlenecks
  -> Generate Optimization Candidates
  -> Risk Audit
  -> Approval Gate
  -> Decision Log Draft
```

## 작업 1: AgentSpec와 Artifact 스키마

- [ ] 9종 AI 팀원 타입을 정의한다.
- [ ] 각 Agent가 받는 input artifact와 output artifact를 정의한다.
- [ ] frequency(빈도), document size(문서 크기), review level(검토 수준)을 구조화한다.
- [ ] schema test로 필수 필드 누락을 잡는다.

## 작업 2: 토큰 추정 템플릿

- [ ] Artifact 종류별 기본 입력/출력 토큰 추정치를 둔다.
- [ ] 빈도와 문서량으로 월간 토큰을 계산한다.
- [ ] 추정치는 사용자가 수정 가능해야 한다.
- [ ] "정확한 실제 사용량"처럼 표시하지 않고 estimate(추정)로 표시한다.

## 작업 3: Calculator Mapper

- [ ] AgentSpec과 Artifact 추정치를 `calculateCost` 입력으로 변환한다.
- [ ] 모델 단가와 캐시/배치 가정을 연결한다.
- [ ] 계산 결과에는 tool ref와 snapshot ref를 붙인다.
- [ ] mapper가 calculator를 우회하지 않는지 테스트한다.

## 작업 4: Team Cost Summary

- [ ] 팀 전체 월 비용, 팀원별 비용, 산출물별 비용을 만든다.
- [ ] highest-cost agent(가장 비싼 팀원), highest-cost artifact(가장 비싼 산출물)를 표시한다.
- [ ] 사람이 확인해야 할 review gate를 보여 준다.

## 작업 5: Optimization Candidate Engine

- [ ] 모델 교체, 캐시, 배치, output cap(출력 제한), frequency 조정 후보를 만든다.
- [ ] 각 후보에는 예상 절감액과 리스크를 붙인다.
- [ ] 품질 민감 후보는 Risk Auditor를 반드시 통과한다.

## 작업 6: LangGraph.js Graph

- [ ] router가 workload 상태에 따라 분석 branch를 선택한다.
- [ ] cost interpretation, bottleneck analysis, optimization drafting branch를 병렬화한다.
- [ ] Risk Auditor와 approval gate는 직렬로 둔다.
- [ ] LLM key가 없으면 deterministic fallback narrative(결정론 미리보기 설명)를 반환한다.

## 작업 7: UI 통합

- [ ] 회사 유형과 업무 빈도를 입력받는다.
- [ ] 9종 AI 팀원에 업무를 배정한다.
- [ ] 비용 요약, 병목, 최적화 후보, 리스크 카드, Decision Log 초안을 한 흐름으로 보여 준다.
- [ ] Wedge A(설계 전)와 Wedge B(운영 후)를 라벨로 구분한다.

## 검증

- [ ] schema/unit tests
- [ ] mapper tests
- [ ] graph runtime tests
- [ ] UI smoke
- [ ] `npm run test:run`
- [ ] `npm run build`

## 완료 기준

- 사용자가 운영 전 AI 팀 구성을 넣으면 월 비용과 병목을 볼 수 있다.
- 모든 숫자는 deterministic tool ref를 가진다.
- 에이전트는 설명과 리스크 검토만 하고 산술 계산을 만들지 않는다.
