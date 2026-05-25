# P1 Extension Backlog(다음 단계 후보 목록) 계획

## 범위

P0(가장 먼저 닫아야 하는 핵심 범위)는 이제 AI Team Cost Decision Workspace(팀 AI 비용 의사결정 작업공간)에 집중한다. 포함 범위는 SparkClaw sample flow, work ledger(작업 기록 장부), cost attribution(비용 귀속), margin/profitability(마진/수익성), adjustable threshold policy(조정 가능한 기준 정책), bottleneck flag(병목 표시), optimization plus risk(최적화와 위험), decision log(결정 기록), agentic AI panel(에이전트형 AI 패널), one-page report export(한 페이지 리포트 내보내기)다.

이 파일은 MVP(최소 기능 제품)의 초점을 흐리면 안 되는 항목을 따로 보존하면서, P0 runtime(실행 계층)이 확장 가능하게 남도록 한다. P0는 이미 `/api/agent/run`, read-only Tool Registry(읽기 전용 도구 목록), local RAG(검색으로 근거 문서를 붙여 답하는 방식) adapter(연결 어댑터)를 통해 canonical agentic boundary(공식 에이전트 실행 경계)를 노출한다. P1은 deterministic TypeScript engine(항상 같은 입력이면 같은 숫자를 내는 TypeScript 계산 엔진)에서 numeric authority(숫자 권한)를 옮기지 않고 이 adapter들을 교체하거나 확장한다.

## 타협 불가 경계

- TypeScript는 cost(비용), margin(마진), savings(절감액), budget delta(예산 차이), 공식 숫자 렌더링의 유일한 source(출처)로 남는다.
- Python agent(파이썬 에이전트)는 검색, 해석, 인용, 초안 작성만 할 수 있다.
- Agent tool(에이전트 도구)은 미래 계획에서 human-approved mutation path(사람이 승인한 변경 경로)를 명시적으로 추가하기 전까지 read-only(읽기 전용)여야 한다.
- 숫자 값을 언급하는 모든 AI prose claim(AI가 쓴 문장형 주장)은 기존 `tool:*` ref(도구 근거 참조)를 인용해야 한다.
- SDK-lite(가벼운 사용량 수집 SDK)와 alert(알림) 작업은 Trust boundary(신뢰/보안 경계)를 보존해야 한다. 기본값으로 raw prompt(원문 프롬프트), message(대화 원문), API key, secret(비밀값), PII(개인 식별 정보)를 수집하지 않는다.
- Alert state(알림 상태)는 deterministic(결정적)이고 rule-based(규칙 기반)이다. AI는 explanation(설명)과 next-action text(다음 조치 문장) 초안만 작성할 수 있다.

## MVP 2-4 제품 방향

| Area | Backlog decision |
| --- | --- |
| MVP 2: SDK-lite automatic collection | Gateway(요청을 중계하고 통제하는 관문)가 아니라 SDK-lite부터 시작한다. `timestamp`, `request_id`, `customer_id`, `plan_id`, `feature`, `model`, `session_id`, `agent_run_id`, `input_tokens`, `output_tokens`, `total_cost`, `latency_ms`, `status`, 그리고 business metadata(업무 맥락 데이터)만 수집한다. |
| MVP 3: Alert / Margin Guard | v1은 decision-needed alert family(결정이 필요한 알림 묶음) 4개로 제한한다: cost surge(비용 급증), projected budget overrun(예상 예산 초과), loss-making customer/feature(손실 고객/기능), model-change risk(모델 변경 위험). |
| MVP 4: Gateway / Proxy | SDK-lite가 가치를 증명한 뒤 Gateway를 optional advanced mode(선택형 고급 모드)로 둔다. blocking(차단), routing(라우팅), fallback(대체 경로), customer budget enforcement(고객 예산 강제)는 별도 trust, outage(장애), security planning(보안 계획)이 필요하다. |
| Guided first-run flow | 첫 경험은 blank dashboard(빈 대시보드)가 아니라 setup wizard(설정 마법사)다: usage import -> feature mapping -> business baselines -> cost/margin -> recommendations -> report. |
| Developer usability | Developer view(개발자 화면)는 log, model, latency(지연 시간), error, retry, cache를 강조한다. CEO view(대표 화면)는 margin, loss-making customer, pricing decision(가격 결정)을 강조한다. 둘 다 같은 deterministic snapshot(결정적 분석 데이터 묶음)을 읽는다. |
| AI interpretation trust | Guardrail(보호 규칙)과 alert condition(알림 조건)은 deterministic이다. AI는 설명하고 next action(다음 조치)을 초안화하지만, 숫자를 만들거나 alert state를 결정하지 않는다. |

## P1 Backlog

### vLLM / GPU Serving Economics(자체 GPU 추론 경제성)

open model(공개 가중치 모델)을 GPU에서 직접 운영하는 팀을 위한 별도 self-hosted inference economics(자체 호스팅 추론 경제성) module을 추가한다.

TTFT(첫 토큰까지 걸리는 시간), ITL/TPOT(토큰 간 지연/토큰당 출력 시간), throughput(처리량), GPU utilization(GPU 사용률), KV cache usage(KV 캐시 사용량), P95/P99 latency(상위 5%/1% 지연 시간), prefix cache hit rate(프리픽스 캐시 적중률), batching efficiency(묶음 처리 효율), context length distribution(컨텍스트 길이 분포)을 추적한다.

bottleneck(병목)은 prefill-heavy(입력 준비가 무거움), decode-heavy(출력 생성이 무거움), KV-cache pressure(KV 캐시 압박), low batching efficiency(낮은 배칭 효율), poor prefix caching(나쁜 프리픽스 캐싱), oversized context(과도하게 큰 컨텍스트)로 분류한다. Recommendation(권장안)에는 prefix caching, chunked prefill, continuous batching, quantization(양자화), tensor parallelism(텐서 병렬화), pipeline parallelism(파이프라인 병렬화)을 포함할 수 있지만, 모든 savings는 measured throughput(측정 처리량)과 quality(품질)로 검증되기 전까지 what-if(가정 시나리오)로 남긴다.

### Full RAG / Vector Search(벡터 기반 검색)

P0 lexical/tag retriever(키워드/태그 기반 검색기)를 별도 retriever(검색기)로 업그레이드한다.

- Official docs RAG: provider pricing/spec behavior(제공자 요금/스펙 동작)을 문장으로 설명한다.
- Benchmark RAG: evidence-board peer comparison(근거 보드의 동료/비교군 비교)을 설명한다.
- Decision-history RAG: prior operating decision(이전 운영 결정)을 검색한다.

Structured fact table(구조화된 사실 표)은 price(요금), model spec(모델 스펙), context window(컨텍스트 길이), last-verified date(마지막 검증일)의 권한을 계속 가진다. RAG는 이 사실을 설명할 수 있지만, 만들거나 덮어쓸 수 없다.

### Official Research Watchtower(공식 출처 감시탑)

pricing page(요금 페이지), model doc(모델 문서), release note(릴리스 노트), blog, RSS feed, changelog(변경 기록)를 보는 official-source monitoring pipeline(공식 출처 감시 파이프라인)을 추가한다.

이 범위는 Western provider(서구권 제공자)에 제한되지 않는다. P1은 Qwen/Alibaba, Kimi/Moonshot, DeepSeek, Z.ai/GLM, MiniMax, ByteDance Doubao/Volcano Ark, Baidu ERNIE/Qianfan, Tencent Hunyuan, StepFun, 그리고 01.AI/Yi, Baichuan, SenseTime, Huawei Pangu, iFlytek Spark 같은 radar source(추적 후보 출처)를 적극적으로 포함해야 한다.

Watchtower는 model catalog(모델 목록)를 직접 수정하지 않고 model-release candidate(모델 릴리스 후보)를 작성한다. model owner(모델 소유자), serving provider(제공/서빙 사업자), region(지역), native currency(원통화), FX snapshot(환율 기준 시점), official source trust(공식 출처 신뢰도), hosted third-party status(제3자 호스팅 여부)를 보존해야 한다. First-party API price(제공자 직접 API 요금), cloud-hosted price(클라우드 호스팅 요금), third-party router price(제3자 라우터 요금), subscription benchmark(구독형 기준)는 절대 섞지 않는다.

### SDK-lite Automatic Collection(가벼운 자동 수집)

개발자가 raw prompt를 보내지 않고 ongoing usage event(지속 사용량 이벤트)를 보낼 수 있는 작은 SDK path(수집 경로)를 추가한다.

SDK event는 기존 work-ledger dimension(작업 장부의 분석 축)으로 normalize(정규화)한다: customer, feature, model, plan, session, agent run, task type, retry, cacheability(캐시 가능성), human review(사람 검토), deliverable(산출물).

첫 event contract(이벤트 계약)는 shared usage schema(공유 사용량 스키마)다: `timestamp`, `request_id`, `customer_id`, `plan_id`, `feature`, `model`, `session_id`, `agent_run_id`, `input_tokens`, `output_tokens`, `total_cost`, `latency_ms`, `status`, 그리고 optional business metadata.

Gateway/Proxy는 SDK-lite 이후로 미룬다. OpenAI, Anthropic, Vercel AI Gateway, Helicone, Langfuse, customer gateway log를 위한 third-party adapter(제3자 연결 어댑터)는 snapshot 생성 전에 같은 Trust check(신뢰/보안 검사)를 따라야 한다.

### Slack / Email Alerts(슬랙/이메일 알림)

threshold policy(기준 정책), deterministic snapshot, Decision Log history(결정 기록 이력)를 alert source(알림 출처)로 사용한다.

초기 Margin Guard alert(마진 보호 알림)는 cost surge, projected budget overrun, loss-making customer/feature, model-change risk 4개 family로 제한한다.

Retry spike(재시도 급증), stale pricing source(오래된 요금 출처), low cache hit rate(낮은 캐시 적중률), decision follow-up due(결정 후속 조치 기한)는 developer/admin signal(개발자/관리자 신호)로 남길 수 있다. 하지만 4개의 decision-needed family 중 하나로 이어지지 않으면 customer-facing Margin Guard alert(고객에게 보이는 마진 보호 알림)가 되면 안 된다.

### Billing / Stripe Execution(청구/Stripe 실행)

P0는 recommendation(권장안)과 decision recording(결정 기록)까지만 유지한다. P1은 adopted pricing recommendation(채택된 가격 권장안)을 billing-plan draft(청구 요금제 초안) 또는 Stripe change(Stripe 변경)에 연결할 수 있지만, 반드시 explicit approval flow(명시적 승인 흐름) 뒤에 둔다.

### Complex Benchmark Marketplace(복합 벤치마크 마켓플레이스)

evidence board(근거 보드)를 verified external dataset(검증된 외부 데이터셋) 또는 customer-provided peer cohort(고객이 제공한 비교군)로 확장한다.

근거가 부족하면 product는 peer average(비교군 평균)를 만들어내지 말고 `baseline unavailable`을 보여줘야 한다.

### Supervisor Agent-as-Tool Orchestration(감독 에이전트가 다른 에이전트를 도구처럼 호출하는 구성)

P0 stage-routed operating worker(단계별로 배정된 운영 작업자)를 `call_*_agent` tool을 호출할 수 있는 LangChain Supervisor(감독자)로 승격한다.

product는 모든 stage request(단계 요청)마다 최소 1개의 operating agent가 실행된다는 보장을 유지해야 한다. Supervisor는 agent를 고를 수 있지만, code orchestration(코드가 실행 순서를 통제하는 부분)이 permission boundary(권한 경계)와 fallback behavior(대체 동작)를 강제해야 한다.

### Customer-Facing SaaS Dashboard(고객용 SaaS 대시보드)

operator-run internal admin flow(운영자가 돌리는 내부 관리자 흐름)를 guided customer-facing workspace(고객이 따라갈 수 있는 작업공간)로 옮긴다.

범위에는 workspace auth(작업공간 인증), setup wizard, customer upload flow(고객 업로드 흐름), monthly review history(월간 리뷰 이력), customer-visible Decision/Operating Ledger(고객에게 보이는 결정/운영 장부), one-page report export가 포함된다. Raw prompt와 PII는 기본값으로 차단한다.

setup wizard 순서는 usage import, feature mapping, business baselines, cost/margin, recommendations, report다.

role split(역할별 화면 분리)이 필요하다. Developer view는 log/model/latency/error/retry/cache에서 시작하고, CEO view는 margin/loss-making customer/pricing decision에서 시작한다. 두 화면은 같은 deterministic snapshot과 shared usage row(공유 사용량 행)를 사용해야 한다.

### Retention and Data Room Automation(보존 정책과 자료실 자동화)

service MVP data-room discipline(서비스 검증 자료실 관리 규칙)을 자동화한다.

범위에는 raw upload deletion reminder(원본 업로드 삭제 알림), customer artifact inventory(고객 산출물 목록), schema mapping profile version(스키마 매핑 프로필 버전), report review gate evidence(리포트 검토 게이트 근거), audit log export(감사 로그 내보내기)가 포함된다.

### Trust Pipeline Expansion(신뢰 파이프라인 확장)

모든 ingestion adapter(데이터 수집 어댑터)에서 Trust check를 강제 가능하게 만든다.

모든 SDK/gateway/import adapter는 데이터가 deterministic snapshot에 도달하기 전에 data intake policy(데이터 수집 정책), PII/API-key scanning(개인정보/API 키 검사), anonymization status(익명화 상태), schema health(스키마 상태), analysis-scope labeling(분석 범위 라벨링), retention note(보존 메모)를 거쳐야 한다.

## 활성화 규칙

P1 항목은 아래 조건을 가질 때만 승격한다.

- deterministic input contract(결정적 입력 계약).
- testable acceptance criterion(테스트 가능한 인수 기준).
- source/basis labeling strategy(출처/근거 라벨링 전략).
- rollback or fallback path(되돌리기 또는 대체 경로).
- mutation(데이터 변경)이 있는 경우 human approval boundary(사람 승인 경계).
