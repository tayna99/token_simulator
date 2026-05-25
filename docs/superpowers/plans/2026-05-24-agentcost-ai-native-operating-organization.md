# AgentCost AI-Native Operating Organization(AI 중심 운영 조직) 구현 계획

상태: P0(가장 먼저 닫아야 하는 핵심 범위) AI Team Cost Decision Workspace(팀 AI 비용 의사결정 작업공간) 위의 operating layer(운영 계층)로 구현됨.

## 요약

AgentCost는 단순한 token calculator(토큰 비용 계산기)가 아니다. provider/model fact(제공자/모델 사실), usage data(사용량 데이터), cost formula(비용 공식), margin diagnosis(마진 진단), optimization(최적화), risk(위험), decision record(결정 기록)를 연결하는 AI-native FinOps(AI 중심의 클라우드/AI 비용 운영) operating system이다.

이 계획은 기존 deterministic boundary(항상 같은 입력이면 같은 숫자를 내는 계산 경계)를 유지한다.

- TypeScript가 cost(비용), margin(마진), savings(절감액), budget delta(예산 차이), 공식 숫자 렌더링을 소유한다.
- Python agent(파이썬 에이전트)는 read-only tool(읽기 전용 도구)로 검색, 설명, 인용, 초안 작성을 수행한다.
- Human decision(사람의 결정)이 Decision & Approval Log(결정 및 승인 기록) / Operating Ledger(운영 장부)를 업데이트한다.

## P0 운영 조직

11개 operating agent(운영 에이전트)는 모두 제품 안에서 active organizational role(활성 조직 역할)로 노출된다.

1. Provider & API Intelligence Agent
2. Model & Inference Research Agent
3. Cost Modeling Agent
4. Usage Data Ingestion Agent
5. Cost Engine / QA Agent
6. Optimization & Routing Agent
7. Customer Diagnostic / Pricing Agent
8. Pricing & Revenue Ops Agent
9. Trust / Security / Compliance Agent
10. Finance Ops Agent
11. Knowledge & Release Ops Agent

앞의 6개는 SparkClaw P0 demo의 core execution path(핵심 실행 경로)로 남는다. 나머지 agent도 운영 조직 안에서는 active 상태지만, 더 무거운 automation(자동화)은 명시적 P1 activation criteria(활성화 기준) 뒤에 둔다.

## Operating Assets(운영 자산)

운영 조직은 아래 first-class asset(제품에서 독립적으로 다루는 핵심 자산)을 소유한다.

- `provider_registry`
- `model_perf_matrix`
- `cost_formula_registry`
- `usage_schema_mapping`
- `calculation_snapshots`
- `optimization_playbook`
- `pricing_policy_library`
- `customer_cost_review`
- `security_runbook`
- `operating_ledger`

각 asset은 `asset:*` ref(참조값)와 owner agent(담당 에이전트)를 가진다. UI는 cost/margin/risk decision(비용/마진/위험 결정) 옆에 asset health(자산 상태)를 보여줘야 한다.

## Operating Ledger(운영 장부)

Decision Log(결정 기록)는 기존 decision field(결정 필드)를 잃지 않고 Operating Ledger로 확장된다.

각 operating row(운영 행)는 아래 항목을 기록한다.

- workstream
- source
- agent used
- proposed change
- human decision
- artifact updated
- impact
- follow-up
- tool refs / risk refs / threshold snapshot / fact source snapshot / AI mode

SparkClaw sample load(샘플 불러오기)는 provider registry(제공자 목록), usage schema mapping(사용량 스키마 매핑), model routing quality gate(모델 라우팅 품질 기준)를 위한 sample operating row를 만든다.

## Agentic Runtime(에이전트 실행 계층)

`/api/agent/run`은 canonical endpoint(공식 API 경로)로 남는다.

Python `create_agent` runtime은 read-only tool을 노출한다.

- `lookup_snapshot_value`
- `retrieve_threshold_policy`
- `retrieve_metric_flags`
- `retrieve_risk_cards`
- `retrieve_benchmark_evidence`
- `retrieve_decision_history`
- `retrieve_fact_sources`
- `retrieve_operating_assets`
- `retrieve_provider_registry`
- `retrieve_model_perf_matrix`
- `retrieve_operating_ledger`

금지된 tool은 계속 금지한다.

- cost calculation
- margin calculation
- savings estimation
- budget delta calculation
- decision mutation
- billing mutation

## P1 Automation Roadmap(자동화 로드맵)

아래 항목은 버리지 않는다. 명시적인 `automation_ready` module(자동화 준비 모듈)로 둔다.

- Official docs change monitor(공식 문서 변경 감시)
- Full vector RAG(RAG는 검색으로 근거 문서를 붙여 답하는 방식)
- vLLM / GPU serving economics(자체 GPU 추론 경제성)
- Slack / Email alerts(슬랙/이메일 알림)
- Stripe billing execution(Stripe 청구 실행)
- Benchmark marketplace(벤치마크 마켓플레이스)

각 P1 module은 deterministic input contract(결정적 입력 계약), source labeling(출처 라벨링), testable acceptance criteria(테스트 가능한 인수 기준), fallback behavior(대체 동작), 그리고 mutation(데이터 변경) 전에 human approval(사람 승인)이 필요하다.

## 테스트 계획

Focused test(집중 테스트):

- Operating asset registry(운영 자산 목록)가 10개 asset과 11개 active operating agent를 반환한다.
- Operating Ledger row에는 workstream, source, agent, artifact(공유 가능한 결과물 파일), human decision, impact, follow-up이 필수다.
- Usage import(사용량 가져오기)는 값을 추측하지 않고 누락된 attribution dimension(귀속 분석 축)을 보고한다.
- Report artifact(리포트 산출물)는 operating asset health를 포함한다.
- Python agent tool registry는 operating-asset read tool만 노출하고 calculation/mutation tool은 노출하지 않는다.
- App shell(앱 껍데기)은 11개 operating agent, asset health, P1 automation-ready module, SparkClaw operating ledger row를 보여준다.

Final gate(최종 확인):

- `cd agent_service && uv run pytest`
- `npm run test:run`
- `npm run build`
- `.env`를 사용한 provider smoke(제공자 연결 간단 점검)
- browser smoke(브라우저 간단 점검): SparkClaw sample -> stage routing -> AI panel used tools -> Operating Ledger -> report export
