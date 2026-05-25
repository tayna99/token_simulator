# Metrics & Thresholds: 지표와 기준값

AgentPayroll은 사실과 판단을 분리한다.

- **Fact Ledger(사실 장부)**: token price(토큰 단가), cache discount(캐시 할인), batch discount(일괄 처리 할인), context window(한 번에 넣을 수 있는 문맥 길이), source URL, `lastVerifiedAt` 같은 provider/model 사실을 저장한다.
- **Judgment Ledger(판단 장부)**: loss(손실), thin margin(얇은 마진), waste(낭비), bottleneck(병목), risk(위험) 같은 제품 판단을 저장한다. 모든 판단은 `rule`, `self_baseline`, `peer_benchmark` 중 하나의 basis type(판단 근거 유형)을 인용해야 한다.

공식 API 문서는 가격과 모델 사실을 정당화할 수 있다. 하지만 어떤 workload(작업 부하)가 낭비인지, 위험한지는 공식 API 문서만으로 단정할 수 없다.

## P0 Threshold Policy(기준값 정책)

| ID | 기본값 | 근거 | 신뢰도 | 조정 가능 | 의미 |
|---|---:|---|---|---|---|
| `gross_margin_loss_usd` | `0` | `rule` | high | yes | gross margin(매출총이익)이 0달러보다 낮으면 손실이다. |
| `gross_margin_thin_pct` | `0.4` | `rule` | high | yes | gross margin(매출총이익률)이 40%보다 낮으면 기본적으로 얇은 마진이다. |
| `retry_rate_pct` | `0.1` | `rule` | high | yes | retry rate(재시도율)가 10%를 넘으면 실제 비용이 부풀 수 있다. |
| `cache_hit_low_pct` | `0.5` | `rule` | high | yes | 재사용되는 큰 입력의 cache hit(캐시 적중률)이 50%보다 낮으면 캐시 누락 후보로 본다. |
| `large_reused_input_tokens` | `5000` | `rule` | high | yes | 이 크기를 넘는 재사용 입력 artifact(공유 가능한 결과물/입력 묶음)는 caching(캐싱) 적용 여부를 확인해야 한다. |
| `top_agent_concentration_pct` | `0.4` | `rule` | medium | yes | AI team cost(AI 팀 비용)의 40% 이상을 한 agent가 차지하면 집중 병목이다. |
| `top_agent_concentration_high_pct` | `0.45` | `rule` | medium | yes | 한 agent가 45% 이상을 차지하면 높은 심각도의 집중 병목이다. |
| `agent_loop_depth_count` | `4` | `rule` | medium | yes | run(작업 실행)당 호출 수가 4회 이상이면 agent loop(에이전트 반복 호출) 병목일 수 있다. |
| `agent_loop_depth_high_count` | `5` | `rule` | medium | yes | run당 호출 수가 5회 이상이면 높은 심각도로 본다. |
| `output_heavy_input_ratio` | `0.8` | `self_baseline` | medium | yes | output tokens(출력 토큰)이 input tokens(입력 토큰)의 80%를 넘으면 응답이 과도하게 큰 것일 수 있다. |
| `output_heavy_min_tokens` | `2000` | `self_baseline` | medium | yes | output-heavy(출력이 큰) 판단은 절대 출력량이 충분할 때만 적용한다. |
| `human_review_monthly_runs` | `20` | `rule` | medium | yes | 월 run 수가 이 기준을 넘는데 전수 human review(사람 검수)를 요구하면 운영 병목이 될 수 있다. |
| `stale_fact_source_days` | `30` | `rule` | high | yes | 공식 가격/스펙 사실은 30일이 지나면 다시 확인해야 한다. |

## 필수 UI 동작

- 기준값은 숨은 상수가 아니라 policy value(정책값)로 보여야 한다.
- 사용자가 override(덮어쓰기)한 값은 현재 workspace policy(작업공간 정책)가 된다.
- 모든 flag(판단 표시)는 `rule:gross_margin_thin_pct`, `self_baseline:output_heavy_input_ratio`, `peer_benchmark:similar_team_frequency` 같은 basis label(근거 라벨)을 보여야 한다.
- peer benchmark corpus(비슷한 팀 비교 자료 묶음)가 부족하면 UI는 `No baseline` 또는 `Assumption-based`라고 말해야 한다. 평균을 지어내면 안 된다.
- 품질에 의존하는 recommendation(추천)은 확정적 낭비 판정이 아니라 what-if recommendation(가정 기반 제안)으로 표현해야 한다.

## Decision Log Snapshot(결정 기록 시점의 데이터 묶음)

모든 결정은 다음을 보존해야 한다.

- `thresholdSnapshot`: 결정 시점에 사용한 정책값.
- `factSourceSnapshot`: 공식 모델/provider 사실 출처와 freshness(신선도) 상태.
- `aiMode`: `llm_assisted`, `deterministic_fallback`, `unknown` 중 하나.

이렇게 해야 나중에 기준값이나 provider 가격이 바뀌어도 과거 결정을 설명할 수 있다.

## P1 Serving Economics(서빙 경제성)

Self-hosted GPU/vLLM optimization(직접 호스팅 GPU/vLLM 최적화)은 P1 모듈이며, P0 provider API cost math(API 사용 비용 계산)와 섞으면 안 된다.

P1 지표:

- TTFT(첫 토큰이 나오기까지 걸리는 시간)
- ITL/TPOT(토큰 사이 지연/토큰당 출력 시간)
- throughput(처리량)
- GPU utilization(GPU 사용률)
- KV cache usage(KV 캐시 사용량)
- P95/P99 latency(상위 5%/1% 지연 시간)

P1 병목:

- prefill-heavy workload(입력 준비 단계가 무거운 작업)
- decode-heavy workload(출력 생성 단계가 무거운 작업)
- KV cache pressure(KV 캐시 압박)
- 낮은 batching efficiency(묶음 처리 효율)
- 낮은 prefix cache hit rate(접두 프롬프트 캐시 적중률)

P1 what-if levers(가정 기반 조정 수단):

- prefix caching(반복 프롬프트 앞부분 캐싱)
- chunked prefill(입력 준비를 조각내 처리)
- continuous batching(계속 들어오는 요청을 묶어 처리)
- quantization(모델 가중치 정밀도 낮추기)
- tensor/pipeline parallelism(텐서/파이프라인 병렬 처리)
