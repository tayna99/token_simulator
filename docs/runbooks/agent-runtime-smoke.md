# 에이전트 런타임 스모크 런북

## 목적

AgentCost 운영팀 런타임이 deterministic snapshot(로컬 계산으로 만든 그 시점의 데이터 묶음)에서 `/api/agent/run`까지 이어지는지 확인합니다. 동시에 `tool:*` refs(어떤 도구와 근거를 썼는지 남기는 참조), 라우팅된 operating agents(역할별 운영 에이전트), provider(실제 AI 제공자)가 없을 때의 all-hands fallback(모든 역할이 참여하는 대체 흐름)이 화면과 응답에서 명확히 구분되는지 봅니다.

## Provider 스모크

실제 provider key(예: OpenAI API key)를 의도적으로 사용할 수 있을 때만 실행합니다.

```powershell
cd C:\token_simulator\agent_service
$env:AGENT_LIVE_TESTS = "1"
$env:OPENAI_API_KEY = "<provider key>"
uv run python scripts/smoke_provider.py
```

성공 기준:

- Interpretation smoke(해석 경로의 짧은 동작 확인)가 `/api/agent`에 대해 근거 있는 이벤트를 반환합니다.
- Agentic smoke(에이전트 실행 경로의 짧은 동작 확인)가 `/api/agent/run`의 provider 경로를 검증합니다.
- Provider 응답에 `providerRunId`와 `agentInvocationProof`가 포함됩니다.
- Agentic events(에이전트 실행 이벤트)가 `agentId`, `calledAgentTool`, `tool:*` refs를 보존합니다.
- All-hands fallback은 11개 에이전트 라우팅을 보여주지만 실제 provider 호출을 했다고 주장하지 않습니다.
- 응답에는 출처 없는 숫자 주장이 없어야 합니다.

## 로컬 브라우저 스모크

터미널 1:

```powershell
cd C:\token_simulator\agent_service
uv run uvicorn main:app --reload --port 8000
```

터미널 2:

```powershell
cd C:\token_simulator
$env:VITE_AGENT_RUNTIME = "server"
$env:VITE_AGENT_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev
```

열 주소:

```text
http://127.0.0.1:5173/token_simulator/
```

수동 확인 경로:

1. SparkClaw 샘플을 불러옵니다.
2. 비용 해석 전에 Trust check(업로드 데이터 안전성 확인)가 보이는지 확인합니다.
3. Design, Cost, Bottleneck, Optimize, Decision Log 단계로 이동합니다.
4. Stage committee review(현재 단계에 맞는 역할별 검토)를 실행합니다.
5. Full operating review(전체 운영 검토)를 실행합니다.
6. Adopt, Reject, Hold 중 하나를 기록합니다.
7. 1페이지 리포트를 내보냅니다.

성공 기준:

- 오른쪽 AI 패널에 실행 모드, 대표 에이전트, 검토자, snapshot version(분석 데이터 묶음 버전), refs(근거 참조)가 표시됩니다.
- Stage committee 경로에서 현재 단계에 맞게 라우팅된 운영 에이전트가 보입니다.
- Full operating review는 all-hands routing(모든 역할이 참여하는 라우팅)을 사용합니다.
- Decision Log 세부 정보가 `agentReview`, `trustReview`, threshold/fact snapshots(임계값과 사실의 시점별 데이터 묶음), report review metadata(리포트 검토 메타데이터)를 보존합니다.
- 사람의 결정이 기록되기 전에는 리포트 내보내기가 막혀 있어야 합니다.
- 브라우저 자동 번역 방지 장치가 유지되어야 합니다. 즉 `notranslate` meta와 루트 `translate="no"`가 그대로 있어야 합니다.
