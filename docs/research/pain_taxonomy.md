# AI SaaS 비용 Pain Taxonomy(문제 분류표)

이 문서는 [evidence_board.csv](evidence_board.csv)의 `pain_tag` 기준표다. 공식 원본은 Evidence Board(검증 근거 원장)이며, taxonomy(분류 체계)는 evidence(검증 근거 사례)를 제품 판단 언어로 바꾸는 분류표다.

## 분류 원칙

이 taxonomy는 "불만이 많이 보이는가"와 "돈을 낼 가능성이 큰가"를 분리하되, 둘을 끊어내지 않는다. Group A는 entry point(제품을 처음 쓰게 만드는 진입점), Core Engine(비용 귀속과 의사결정 계산을 맡는 핵심 엔진)은 비용 귀속 레이어, Group B는 paid value(돈을 내고 살 만한 의사결정 가치)다.

```txt
Group A: Entry Point
실시간 비용/운영 문제
        ↓
Core Engine
비용 귀속 / 원인 분해 / 비즈니스 단위 변환
        ↓
Group B: Paid Value
마진/가격/수익성 의사결정
```

분류할 때는 다음 순서로 판단한다.

1. 개인 구독/한도 불만인가, 제품/팀/고객/마진 문제인가?
2. 비용이 들어온 지점은 무엇인가: token spike, cache miss, quota, agent loop, provider delay.
3. 비용을 귀속할 수 있는 축은 무엇인가: customer, feature, model, plan, session, agent run.
4. 구매 신호가 있는가: customer profitability(고객별 수익성), gross margin(매출총이익률), pricing(가격정책), finance(재무), board(이사회), revenue(매출), COGS(매출원가).
5. 현재 MVP(최소 기능 제품)가 바로 해결할 수 있는가, 아니면 research-gated(리서치로 검증된 뒤 재도입할) 후보인가?

## 3-Layer Pain Map(3층 문제 지도)

| 레이어 | 역할 | pain_tag | MVP 연결 |
| --- | --- | --- | --- |
| Entry Point | 개발자가 로그를 가져오게 만드는 운영 pain | `pain_cost_unpredictable` | usage/spike 요약, 비용 변화 시뮬레이션 |
| Entry Point | 개발자가 로그를 가져오게 만드는 운영 pain | `pain_token_waste` | 입력/출력 분해, 출력 제한, 라우팅 후보 |
| Entry Point | 개발자가 로그를 가져오게 만드는 운영 pain | `pain_tracking_wrong` | CSV import, provider별 가격 출처, 계산 검증 |
| Entry Point | 개발자가 로그를 가져오게 만드는 운영 pain | `pain_limit_confusion` | quota/limit evidence 축적, research-gated guardrail |
| Core Engine | 비용을 비즈니스 단위로 재분류하는 pain | `pain_feature_cost_unknown` | 기능별 비용 Top, workflow-level attribution(워크플로우 기준 비용 귀속) |
| Core Engine | 비용을 비즈니스 단위로 재분류하는 pain | `pain_customer_profitability_unknown` | 고객별 원가, heavy-user 손익, customer-level report |
| Core Engine | 비용을 비즈니스 단위로 재분류하는 pain | `pain_ai_cogs_untracked` | AI COGS 분리, margin report |
| Core Engine | 비용을 비즈니스 단위로 재분류하는 pain | `pain_provider_compare` | 모델별 비용, provider/model 비교 |
| Core Engine | 비용을 비즈니스 단위로 재분류하는 pain | `pain_quality_tradeoff` | raw/effective cost, risk 포함 절감 추천 |
| Paid Value | 회사가 결제할 마진/가격/보고 pain | `pain_margin_unknown` | gross margin, raw/effective margin, 가격정책 판단 |
| Paid Value | 회사가 결제할 마진/가격/보고 pain | `pain_heavy_user_loss` | heavy-user profitability, tier/overage 시뮬레이션 |
| Paid Value | 회사가 결제할 마진/가격/보고 pain | `pain_usage_pricing_mismatch` | usage/credit/hybrid/cap/overage pricing simulator(사용량·크레딧·혼합·상한·초과 과금 시뮬레이터) |
| Paid Value | 회사가 결제할 마진/가격/보고 pain | `pain_board_reporting_gap` | CEO/CFO/PM/Finance 보고서 |

## Pain Tag 정의

| pain_tag | 정의 | 포함되는 말 | 제외되는 말 |
| --- | --- | --- | --- |
| `pain_cost_unpredictable` | 월말/주간/세션 단위 AI 비용이 언제, 왜 튀는지 예측하기 어렵다. | token spike, bill surprise, agent loop, session cost | 가격정책/마진과만 연결된 추상 논의 |
| `pain_token_waste` | 불필요한 context, 반복 실행, 긴 출력 때문에 토큰이 낭비된다. | unnecessary context, repeated calls, long output, cache waste | 사용량이 많지만 매출이 충분히 따라오는 경우 |
| `pain_tracking_wrong` | 사용량/비용 추적 숫자가 실제 과금, cache, quota와 맞지 않는다. | dashboard lag, wrong token count, invoice mismatch | 단순히 비용이 높다는 불평 |
| `pain_limit_confusion` | quota, rate limit, usage limit 숫자가 체감과 맞지 않는다. | quota, usage limit, credit exhaustion | 고객별 마진/가격정책 문제 |
| `pain_feature_cost_unknown` | 어떤 AI 기능/워크플로우가 비용과 마진을 먹는지 모른다. | per-feature cost, cost per workflow, workflow margin | 모델 전체 비용만 비교하는 경우 |
| `pain_customer_profitability_unknown` | 고객별 AI 원가와 수익성을 모른다. | cost per customer, per-customer margin, tenant cost | 전체 월 비용만 보는 경우 |
| `pain_ai_cogs_untracked` | AI 관련 COGS(매출원가)가 P&L(손익계산), 제품 원가, finance report(재무 보고서)에서 분리되지 않는다. | AI COGS, inference cost, cost-to-serve | 개발자 개인 구독 불만 |
| `pain_provider_compare` | provider/model마다 가격, cache/batch 할인, 품질이 달라 비교가 어렵다. | model switch, provider compare, cache/batch price | 가격정책과 무관한 성능 취향 |
| `pain_quality_tradeoff` | 싼 모델로 바꾸면 재시도, 검수, CS 비용 때문에 effective cost가 다시 올라간다. | retry cost, human review, CS escalation, quality risk | raw API cost만 보는 비교 |
| `pain_margin_unknown` | AI 기능의 원가가 판매 가격 대비 gross margin(매출총이익률)을 얼마나 깎는지 모른다. | gross margin, contribution margin, margin compression | 단순히 "API가 비싸다"는 불평 |
| `pain_heavy_user_loss` | 일부 heavy/power user가 사용량을 많이 만들어 손해 고객이 된다. | power users, whales, top-decile user cost | 사용량이 많지만 plan/overage로 충분히 회수되는 경우 |
| `pain_usage_pricing_mismatch` | 비용은 사용량에 따라 늘어나는데 가격은 seat/flat subscription이라 마진이 깨진다. | flat per-seat, usage-based, hybrid, AI credits, overage | 가격 UX 불만만 있고 원가/마진 연결이 없는 경우 |
| `pain_board_reporting_gap` | CEO/CFO/Board/투자자에게 설명할 AI unit economics 지표가 없다. | board report, investor metric, CFO dashboard | 내부 개발자 디버깅만 필요한 경우 |
| `pain_team_budget` | 팀/고객/프로젝트별 예산과 비용 폭증을 늦게 알아차린다. | budget alert, team budget, cost overrun | 가격정책 의사결정과 연결되지 않는 개인 불만 |

## MVP 핵심 Pain

현재 MVP의 핵심은 Entry Point에서 들어온 로그를 Core Engine에서 재분류하고, Paid Value의 의사결정으로 내보내는 것이다.

| 우선순위 | pain_tag | 이유 |
| --- | --- | --- |
| P0 | `pain_feature_cost_unknown` | 비용을 기능별로 쪼개야 최적화와 rollout 판단이 가능하다. |
| P0 | `pain_customer_profitability_unknown` | 고객별 원가를 알아야 손해 고객을 찾을 수 있다. |
| P0 | `pain_margin_unknown` | 판매 가격과 원가를 비교해야 제품이 돈이 되는지 판단할 수 있다. |
| P0 | `pain_heavy_user_loss` | 최신 Evidence Board에서 Top 3로 올라온 고강도 paid pain이다. |
| P0 | `pain_usage_pricing_mismatch` | flat/seat pricing(정액·좌석 기준 가격정책)과 variable AI cost(사용량에 따라 늘어나는 AI 비용)의 충돌을 해결해야 한다. |
| P1 | `pain_cost_unpredictable` | 진입점으로 중요하지만, 실시간 alert(경고)는 아직 research-gated(리서치로 검증된 뒤 재도입할) 기능이다. |
| P1 | `pain_ai_cogs_untracked` | Finance/CEO 보고 가치가 크지만, 초기에는 report와 ontology에서 먼저 반영한다. |
| P1 | `pain_quality_tradeoff` | 비용 절감 추천의 안전장치로 raw/effective cost에 연결한다. |

## 점수 규칙

현재 Evidence Board는 `frequency_signal`과 `wtp_score`를 분리해서 관리한다.

| 필드 | 의미 |
| --- | --- |
| `frequency_signal` | 같은 유형의 문제가 얼마나 자주 보이는가. 1은 단일 후보, 5는 커뮤니티에서 반복되는 고빈도 불만. |
| `wtp_score` | WTP(지불 의향) 점수. 1은 가벼운 불만, 5는 pricing, margin, finance, board, 내부 대체 비용과 연결된 강한 신호. |
| `evidence_strength` | source의 신뢰도와 제품 의사결정 관련성. `low`, `medium`, `high` 중 하나. |
| `quote_verified` | 원문 quote 확인 상태. `true`, `false`, `pending` 중 하나. |

validator의 Top Pain 계산은 `frequency_signal * wtp_score`를 pain tag별로 합산한다. 과거의 `severity`와 `opportunity_score` 필드는 더 이상 공식 CSV 계약에 쓰지 않는다.

## 빈도와 WTP 분리

`token spike` evidence는 많이 보이지만 구매 예산과 직접 연결되지 않을 수 있다. 반대로 `gross margin` evidence는 덜 자주 보여도 CFO/CEO/Founder가 가격정책과 투자자 보고를 위해 찾는 지표라면 WTP(지불 의향)가 더 높다.

그래서 다음 리서치에서는 두 가지를 따로 기록한다.

| 구분 | 기록 위치 | 용도 |
| --- | --- | --- |
| 개별 evidence의 빈도 | `evidence_board.csv`의 `frequency_signal` | 반복적으로 보이는 pain인지 판단 |
| business keyword 후보 빈도 | `business_keyword_frequency.csv` | `cost per customer`, `gross margin`, `usage-based pricing`, `AI SaaS margin`, `PM/CEO/Finance` 후보군의 검색 빈도 추적 |

## MVP 재도입 기준

- `pain_team_budget` 또는 `pain_cost_unpredictable`이 50개 evidence 기준 Top 3이고 평균 `wtp_score >= 4`일 때만 예산/쿼터 가드레일을 다시 UI 후보로 올린다.
- `pain_tracking_wrong` 또는 `pain_token_waste`가 Top 3일 때만 개발자 진단을 별도 화면으로 재검토한다.
- 큰 UI 기능 추가는 50개 evidence 이후에 판단한다. 그 전에는 CSV import, usage/spike 요약, 고객/기능/모델/플랜/세션별 비용 귀속, gross margin, pricing simulation, report를 우선한다.
