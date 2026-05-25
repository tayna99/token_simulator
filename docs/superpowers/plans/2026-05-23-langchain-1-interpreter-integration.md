# Python LangChain 1.0 Agent Service(에이전트 실행 서비스) 통합 계획

> 상태: Python 서비스 경로를 위한 P0(가장 먼저 닫아야 하는 핵심 범위) 활성 구현 계획이다. P1(다음 단계) `create_agent` + tool-calling(LLM이 도구를 호출해 작업을 나누는 방식) 지원은 제품이 개방형 분석을 필요로 할 때까지 의도적으로 dormant(대기 상태)로 둔다.

## 목표

provider-backed interpretation(실제 LLM 제공자 응답을 바탕으로 해석문을 만드는 기능)을 Vite client(브라우저에서 도는 기존 프론트엔드)에서 `agent_service/` 아래의 별도 Python FastAPI(FastAPI는 Python 웹 API 프레임워크) 서비스로 옮기되, 기존 frontend boundary(프론트엔드와 서버가 주고받는 계약)는 유지한다.

```text
runAgent(input) -> AgentEvent[]
runTeamCostAgentRuntime(input) -> TeamCostGraphEvent[] + llmMode
```

frontend(사용자 화면을 담당하는 쪽)는 cost(비용), margin(마진), team-cost workload(팀 작업량 기반 비용), optimization(최적화), budget math(예산 계산)의 deterministic authority(항상 같은 입력이면 같은 숫자를 내는 공식 계산 주체)로 남는다. Python은 미리 계산된 tool snapshot(도구가 읽을 분석 데이터 묶음)만 받고, interpretation/report event(해석/리포트 이벤트)만 작성한다.

## 제품 규칙

- `src/lib/calculator.ts`, `estimateAgentWorkload`, 그리고 인접한 TS(TypeScript) engine(계산 로직 묶음)만 numeric calculation path(숫자 계산 경로)가 된다.
- Python은 token cost(토큰 비용), margin, savings(절감액), budget delta(예산 차이), approval threshold(승인 기준값), bottleneck score(병목 점수)를 계산하면 안 된다.
- Python은 요약, 우선순위 정리, decision/report prose(결정/리포트 문장) 초안 작성, 기존 `tool:*` ref(도구 근거 참조) 부착만 할 수 있다.
- LLM(대규모 언어 모델) output schema(출력 구조)에는 숫자 필드가 들어가면 안 된다.
- provider key(LLM 제공자 API 키)가 없거나 provider response(제공자 응답)가 citation(근거 참조) 없는 숫자를 만들어내면, 서비스는 deterministic fallback prose(정해진 문장으로 된 대체 응답)를 반환한다.

## Architecture

```text
React app
  runAgent(input)
    local: existing browser fallback
    server: POST /api/agent

  runTeamCostAgentRuntime(input)
    always first runs TS deterministic team-cost graph
    local: returns deterministic events
    server: POST /api/team-cost-agent with deterministicEvents snapshot

Python FastAPI agent_service/
  /health
  /api/agent
  /api/team-cost-agent

P1 dormant extension
  interactive_agent.py
  create_agent + read-only tools
  no endpoint and no UI wiring yet
```

## Python Service 범위

파일:

- `agent_service/schemas.py`
  - `RunInput`, `RunOutput`, `AgentEvent`
  - `TeamCostRunInput`, `TeamCostRunOutput`, `TeamCostGraphEvent`
  - structured-output(정해진 구조로 받는 출력) `Analysis`
- `agent_service/interpreter.py`
  - LangChain `init_chat_model` 사용
  - `model.with_structured_output(Analysis)` 사용
  - `OPENAI_API_KEY` 또는 BYO(Bring Your Own, 사용자가 직접 제공하는) `apiKey`가 없으면 fallback(대체 경로) 사용
  - 근거 없는 숫자 주장 거부
- `agent_service/pipeline.py`
  - `/api/agent`: `tool_snapshot -> analysis -> pricing_strategy -> risk_audit -> report_draft`
  - `/api/team-cost-agent`: deterministic event(결정적 이벤트)는 보존하고 Python report event 추가
- `agent_service/main.py`
  - CORS(브라우저의 교차 출처 요청 허용 설정), `/health`, `/api/agent`, `/api/team-cost-agent`를 가진 FastAPI app
- `agent_service/scripts/smoke_provider.py`
  - `Interpreter -> run_pipeline`을 위한 opt-in(명시적으로 켤 때만 실행) live provider smoke(실제 제공자 연결 간단 점검)
  - `AGENT_LIVE_TESTS=1`이고 provider key가 있을 때만 실행
- `agent_service/interactive_agent.py`
  - dormant P1 `create_agent` skeleton(뼈대)
  - read-only tool(읽기 전용 도구)만 허용: risk card(위험 카드), snapshot lookup(스냅샷 조회), decision history(결정 이력)
  - cost, margin, savings, budget-delta 계산 도구는 없음

## Frontend 범위

- 기존 browser fallback graph(브라우저에서 도는 대체 그래프)가 아직 사용하므로 `@langchain/langgraph`는 유지한다.
- 중단된 JS 실험에서 들어온 직접 frontend dependency(프론트엔드 의존성)는 제거한다.
  - `@langchain/core`
  - `@langchain/openai`
  - `zod`
- `api/agent.ts`와 `api/team-cost-agent.ts`의 Vercel fallback shell(배포 환경용 대체 껍데기)은 유지한다.
- `serverAgentRuntime.ts`는 선택적 `VITE_AGENT_API_BASE_URL`을 지원한다.
- `teamCostAgentRuntime.ts`는 `VITE_TEAM_COST_RUNTIME=server`로 local deterministic mode(로컬 결정적 모드)와 server mode(서버 모드)를 고른다.
- `vite.config.ts`는 로컬 개발을 위해 `/api`를 `http://localhost:8000`으로 proxy(중계)한다.
- App integration(앱 연결 범위)은 의도적으로 runtime selection(실행 경로 선택), Python report-event rendering(Python 리포트 이벤트 렌더링), `LLM assisted` / `Deterministic fallback` chip(상태 배지)에만 제한한다. Team-cost는 graph를 직접 부르지 말고 `runTeamCostAgentRuntime`을 호출해야 한다.

## TDD(실패 테스트를 먼저 쓰고 통과시키는 개발 방식) Checklist

- Python:
  - key가 없을 때 fallback이 deterministic `Analysis`를 반환한다.
  - fake structured model path(가짜 구조화 모델 경로)가 provider prose(제공자 문장)를 반환한다.
  - 근거 없는 숫자 주장은 거부된다.
  - `/api/agent`가 5개 event 순서를 보존한다.
  - `/api/team-cost-agent`가 deterministic event를 보존하고 report event를 추가한다.
  - FastAPI contract(API 계약)가 `/health`, `/api/agent`, `/api/team-cost-agent`를 노출한다.
- TypeScript:
  - `runServerAgent`가 `/api/agent` 또는 `VITE_AGENT_API_BASE_URL + /api/agent`로 POST한다.
  - `runTeamCostAgentRuntime`는 local mode에서 fetch(네트워크 요청)를 하지 않는다.
  - server mode는 deterministic event를 `/api/team-cost-agent`로 POST한다.
  - server output(서버 출력)이 도착하면 App이 Python report event와 `LLM assisted` mode chip을 렌더한다.
- P1 dormant:
  - interactive tool catalog(대화형 도구 목록)는 read-only lookup tool(읽기 전용 조회 도구)만 노출한다.
  - 계산 도구 이름은 존재하지 않는다.
  - risk-card lookup result에는 `id`와 `source`가 모두 포함된다.
  - interactive answer guard(대화형 답변 보호 로직)는 근거 없는 숫자 주장을 거부한다.

## 검증

`agent_service/`에서 실행:

```bash
uv run pytest
```

`agent_service/`에서 선택적으로 provider smoke 실행:

```bash
$env:OPENAI_API_KEY="..."
$env:AGENT_MODEL="gpt-5-mini"
$env:AGENT_LIVE_TESTS="1"
uv run python scripts/smoke_provider.py
```

기대 결과: key/live flag가 없으면 skip(건너뜀)된다. 있으면 event 순서, AI prose의 `tool:*` ref, 근거 없는 숫자 주장 guard를 검증한다.

repo root(저장소 루트)에서 실행:

```bash
npm run test:run -- src/features/agent/lib/serverAgentRuntime.test.ts src/features/agent/lib/teamCostAgentRuntime.test.ts src/app/App.test.tsx
npm run test:run
npm run build
```

수동 smoke:

```bash
cd agent_service
uv run uvicorn main:app --reload --port 8000
```

두 번째 terminal에서 실행:

```bash
$env:VITE_AGENT_RUNTIME="server"
$env:VITE_TEAM_COST_RUNTIME="server"
npm run dev
```

기대 결과: SparkClaw demo가 로드되고, AI team-cost assistant(팀 비용 보조 패널)가 deterministic `tool:*` chip을 계속 보여주며, server mode가 공식 TS 렌더 숫자를 바꾸지 않고 Python-backed report/analysis prose(Python 기반 리포트/분석 문장)를 추가할 수 있다.
