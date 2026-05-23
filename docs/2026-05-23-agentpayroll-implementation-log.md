# 2026-05-23 AgentPayroll 구현 기록

## 기준

- 날짜 기준: 2026-05-23.
- "어제"는 2026-05-22, "오늘"은 2026-05-23 기준으로 정리했다.
- 확인 기준: `git log --since "2026-05-22"`와 현재 작업트리 상태.
- 커밋된 구현: `122c68f feat: add Python agent service and AI team decision workspace`.
- 오늘 추가 구현 중 일부는 아직 미커밋 상태다.

## 커밋된 구현

1. **Python `agent_service/` 추가**
   - FastAPI 기반 `/health`, `/api/agent`, `/api/team-cost-agent` 서비스를 만들었다.
   - TS가 계산한 숫자를 Python이 해석 이벤트로 바꾸는 P0 fixed pipeline이다.

2. **LangChain 1.0 structured output 연결**
   - `init_chat_model`과 `with_structured_output` 흐름을 `interpreter.py`에 넣었다.
   - API key가 없으면 deterministic fallback을 유지한다.

3. **provider live smoke harness 추가**
   - `agent_service/scripts/smoke_provider.py`를 추가했다.
   - 실제 provider key가 있을 때만 live smoke를 돌리고, 일반 pytest에는 live call을 넣지 않는다.

4. **P1 dormant `create_agent + @tool` 골격 추가**
   - `interactive_agent.py`에 risk card 조회, snapshot 조회, decision history 조회 도구를 둔 비활성 확장 모듈을 만들었다.
   - 비용 계산, 마진 계산, savings 추정, budget delta 계산 도구는 금지했다.

5. **Python agent service 테스트 추가**
   - interpreter, pipeline, main API, team-cost pipeline, smoke skip/live 조건, dormant tool catalog 테스트를 추가했다.
   - 현재 기준 `uv run pytest`는 16개 테스트가 통과한다.

6. **Vercel/API fallback shell 추가**
   - `api/agent.ts`, `api/team-cost-agent.ts`, `api/decisions.ts`, `api/reports.ts`, `api/usage/import.ts` 등을 추가했다.
   - Python 별도 서비스와 Vercel fallback shell을 분리했다.

7. **P1 persistence/server handlers 추가**
   - `src/server/p1ApiHandlers.ts`, `kvStore.ts` 등을 추가했다.
   - decision, configuration, usage, report, calibration 저장 흐름을 테스트 가능한 서버 핸들러로 만들었다.

8. **AI Team Cost Simulator 구현**
   - 회사 업무 선택, AgentSpec 편집, 팀 비용 예측, 병목 탐지, 최적화 추천, 결정 기록 흐름을 추가했다.
   - Wedge A 시뮬레이터가 제품의 AI 팀 운영 비용 판단 흐름을 담당한다.

9. **팀 비용 deterministic 계산 엔진 추가**
   - `estimateAgentWorkload`, `summarizeTeamCost`, `agentSpec`, `agentCatalog` 등을 만들었다.
   - 팀 비용 숫자는 계속 TS 결정론 경로에서 계산된다.

10. **병목 탐지 엔진 추가**
    - `bottleneckAnalysis.ts`에서 예산 초과, top agent 집중, cache candidate, agent loop, retry, output-heavy, human review bottleneck 등을 탐지한다.
    - 이 단계는 "어디서 비용이 새는가"를 찾는 deterministic 판단 레이어다.

11. **최적화 정책 엔진 추가**
    - cache, loop depth 감소, output cap, batch, human review gate 조정, 저가 모델 라우팅 추천을 만들었다.
    - before/after 비용과 savings는 deterministic 계산으로 산출된다.

12. **Team-cost LangGraph/runtime 추가**
    - `teamCostGraph`, `teamCostRuntime`, `teamCostLlmRuntime`, `teamCostAgentRuntime` 등을 추가했다.
    - local deterministic fallback과 server Python runtime을 전환할 수 있다.

13. **Risk Card/Risk Auditor 추가**
    - `riskCards.ts`와 관련 테스트를 추가했다.
    - 추천 채택 전에 risk card가 붙어야 하는 구조를 만들었다.

14. **Decision Log 도입**
    - `decisionLog.ts`, `decisionStore.ts`를 추가했다.
    - 채택, 거부, 운영 결정 기록을 저장, 불러오기, 삭제, export할 수 있다.

15. **Pricing scenario engine 추가**
    - flat, usage, credit, hybrid, cap, overage 정책별 마진 시나리오를 계산하는 엔진과 테스트를 추가했다.
    - 가격 정책별 "남는 돈" 비교의 기반이다.

16. **Usage import/attribution 확장**
    - SparkClaw sample CSV, usage import, customer/feature/model/plan/session/agent-run attribution rollup을 강화했다.
    - AI 팀이 한 일과 든 비용을 여러 축으로 나눠 볼 수 있게 했다.

17. **Unit economics / margin analytics 추가**
    - plan margin, customer profitability, heavy-user detection, effective cost 계산을 추가했다.
    - 고객과 플랜 단위로 손해, 얇은 마진, heavy user를 볼 수 있는 기반이다.

18. **Operational Signal Summary 추가**
    - token spike, failed share, missing dimension, top session/agent run 같은 운영 신호 요약을 추가했다.
    - 비용 계산 전에 살펴야 할 운영 이상 신호를 보여준다.

19. **Deliverable/accountability/Plan vs Actual 추가**
    - deliverable cost attribution, performance summary, agent accountability, calibration loop를 추가했다.
    - "AI 팀이 실제로 한 일"과 "예상 대비 실제"를 연결한다.

20. **App.tsx를 3-pane 운영 콘솔로 확장**
    - 좌측 lifecycle nav, 중앙 workspace, 우측 AI interpretation/risk/decision panel 구조가 들어갔다.
    - 앱 본체는 landing page가 아니라 Montage/WDS 운영 콘솔 방향으로 정리됐다.

21. **PRODUCT_UX.md 추가/정리**
    - 앱 UX 기준을 Montage/WDS 운영 콘솔 기준으로 정리했다.
    - DESIGN.md는 landing visual reference로 좁히는 방향이다.

22. **LangChain integration plan 문서 추가**
    - `docs/superpowers/plans/2026-05-23-langchain-1-interpreter-integration.md`를 추가했다.
    - Python fixed pipeline, provider smoke, P1 dormant 확장 방향을 정리했다.

23. **Montage 스타일/primitive 보강**
    - `montage.css`, `primitives.tsx`가 3-pane console, WDS surface, dense workspace에 맞게 확장됐다.
    - Apple풍 앱 본체가 아니라 운영 콘솔 UI를 지향한다.

24. **대규모 테스트 보강**
    - App 테스트, agent graph/runtime, team-cost, usage, pricing, decision log, P1 API handler 테스트가 추가됐다.
    - 제품 흐름이 단일 화면뿐 아니라 계산, 저장, runtime 경계까지 검증된다.

## 오늘 추가 구현

25. **`ThresholdPolicy` 레이어 추가**
    - `src/features/metrics/lib/thresholdPolicy.ts`를 추가했다.
    - 마진 40%, retry 10%, cache 50%, top agent 40% 같은 기준을 숨은 상수가 아니라 정책 객체로 관리한다.

26. **`docs/METRICS_THRESHOLDS.md` 추가**
    - Fact Ledger와 Judgment Ledger를 분리해 문서화했다.
    - 기준값, 출처, 신뢰도, 조정 가능 여부, P1 vLLM serving economics를 정리했다.

27. **마진 기준 하드코딩 제거**
    - `unitEconomics.ts`, `margin.ts`의 `0.4` thin margin 기준을 `ThresholdPolicy` 주입 방식으로 바꿨다.
    - 기본값은 유지하지만 workspace 정책으로 바꿀 수 있다.

28. **병목 탐지에 판단 근거 추가**
    - `detectBottlenecks`가 `basisRef`, `thresholdUsed`, `observedValue`, `confidence`를 포함한다.
    - "왜 이걸 병목이라고 했는지"를 UI와 로그에서 추적할 수 있다.

29. **병목 기준 조정 가능화**
    - top agent concentration, retry rate, cache hit, loop depth, output-heavy, human review 기준이 정책값을 통해 재계산된다.
    - 기준 숫자가 코드 안에만 고정되지 않는다.

30. **모델 라우팅 추천을 what-if로 변경**
    - 저가 모델 라우팅은 "낭비 확정"이 아니라 `what_if`와 품질 검증 caveat를 붙인다.
    - 품질 의존 판단을 단정하지 않게 했다.

31. **Decision Log 스냅샷 확장**
    - Decision Log에 `thresholdSnapshot`, `factSourceSnapshot`, `aiMode`를 추가했다.
    - 나중에 기준이나 가격 출처가 바뀌어도 당시 결정 근거를 복원할 수 있다.

32. **우측 AI 패널에 Judgment policy UI 추가**
    - thin margin, retry rate, top agent share 기준을 슬라이더로 보여주고 조정할 수 있게 했다.
    - 조정값은 deterministic flag 재계산에 반영된다.

33. **Decision Log UI에 policy/fact/AI mode 표시**
    - 결정 기록 row에서 policy version, fact source count, AI mode를 확인할 수 있게 했다.
    - 결정 기록이 단순 결과 목록이 아니라 감사 가능한 ledger가 된다.

34. **Threshold/Policy 테스트 추가**
    - 기본 기준 유지, override 반영, basis 없는 flag 방지, fact source stale warning을 테스트했다.
    - 기준이 다시 숨은 상수로 퇴행하지 않게 막는다.

35. **마진/병목/추천/로그 통합 테스트 추가**
    - threshold 변경 시 마진 위험이 바뀌는지, 병목 threshold override가 먹는지, Decision Log snapshot이 보존되는지 테스트했다.
    - 정책 레이어가 실제 제품 판단 경로에 연결됐는지 확인한다.

36. **App 정책 UI 테스트 추가**
    - 우측 패널에 `Judgment policy`가 보이고 threshold slider가 값 변경을 반영하는지 테스트했다.
    - 사용자 조정 가능한 기준 UI가 사라지지 않도록 고정했다.

## 검증 결과

- `cd agent_service && uv run pytest`: 16 passed.
- `npm run test:run`: 66 files, 264 tests passed.
- `npm run build`: passed.
- Preview smoke: 3-pane shell, `Judgment policy`, `Thin margin below`, `tool:team.monthlyCostUsd` 확인.

## 남은 상태

- 기존 문서/리서치 WIP와 untracked 문서들이 작업트리에 남아 있다.
- 오늘 추가한 threshold policy 구현은 아직 커밋 전이다.
- 제품적으로 다음 큰 덩어리는 App.tsx 책임 축소와 stage별 workspace 분리다.
