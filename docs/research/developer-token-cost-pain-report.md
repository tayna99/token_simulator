# AI SaaS Cost & Margin Pain Report

## Summary

Grok 조사와 Evidence Board 정리 결과, 이 제품의 핵심 방향은 단순한 LLM 비용 계산기가 아니라 **LLM 운영 로그를 고객·기능·모델·플랜·세션 단위 원가로 재분류하고, AI SaaS의 마진과 가격정책 판단으로 연결하는 워크스페이스**다.

결론은 명확하다.

> Group A는 entry point, Core Engine은 비용 귀속 레이어, Group B는 paid value다.

개발자 운영 pain은 빈도가 높다. 하지만 그 자체만으로는 고액 지불 의향이 약할 수 있다. 제품의 핵심은 이 운영 로그를 customer-level cost, feature cost, model cost, plan margin, session/agent run cost로 재분류한 뒤 gross margin, heavy-user loss, usage-based pricing, Finance/CEO/Board reporting으로 연결하는 것이다.

## Evidence 상태

현재 공식 원본은 [evidence_board.csv](evidence_board.csv)다.

- 공식 evidence: `GR-001`부터 `GR-038`까지 38개 row-level evidence
- 후보/검증 이력: `evidence_candidates_unverified.csv`에 44개 보관
- 검증 기준: URL, published_date, crawled_date, exact_quote, persona, group, pain_tag
- 원문 확인 상태: `quote_verified=true/false/pending`으로 분리
- 점수 계산: `frequency_signal * wtp_score`
- 제외 기준: URL/날짜/quote가 개별 evidence로 확인되지 않은 묶음 후보

Forbes/Metronome 후보처럼 원문 확인에 실패한 자료는 `quote_verified=false`로 남기고, 제품 주장에는 쓰지 않는다.

## Group A: Frequent Developer / Operations Complaints

Group A는 많이 보이는 불만이다. 주로 개발자, 운영자, 소규모 AI 제품 오너가 겪는다.

대표 pain:

- 토큰 비용이 갑자기 튄다.
- cache miss 또는 cache TTL 변화로 비용이 늘어난다.
- quota가 예상보다 빨리 소진된다.
- provider dashboard가 늦게 반영된다.
- session이나 agent loop가 예상보다 많은 토큰을 쓴다.
- usage limit이나 AI credit 정책이 헷갈린다.

제품적 의미:

- CSV import, usage log, usage/spike 요약으로 진입 장벽을 낮춘다.
- 개발자가 평균 토큰을 추측하지 않게 만든다.
- budget guardrail이나 developer diagnostics는 유용하지만, 현재는 research-gated 기능으로 둔다.

## Core Engine: Cost Attribution Layer

Core Engine은 Group A의 운영 문제를 Group B의 유료 의사결정으로 바꾸는 중간 레이어다.

해야 할 일:

- LLM usage event를 cost event로 바꾼다.
- 비용을 고객별, 기능별, 모델별, 플랜별, 세션별, agent run별로 귀속한다.
- business denominator와 판매가를 연결해 원가와 margin을 계산한다.
- raw cost와 effective cost를 분리한다.

제품적 의미:

- 단순히 "비용이 많이 나왔다"가 아니라 "어느 고객/기능/플랜/세션이 마진을 깨는가?"로 질문을 바꾼다.
- Core Engine이 없으면 제품은 개발자 비용 알림 도구에 머문다.
- Core Engine이 있으면 CEO/CFO/PM에게 공유 가능한 unit economics report가 된다.

## Group B: Less Frequent but High-WTP Business Signals

Group B는 덜 자주 보이지만 돈 낼 가능성이 큰 신호다. 주로 AI SaaS Founder, CEO, CFO, Finance, PM이 말한다.

대표 pain:

- AI 기능 때문에 gross margin이 80~90% SaaS 구조에서 50~60% 수준으로 압박된다.
- 일부 heavy user가 사용량을 많이 만들어 손해 고객이 된다.
- 고객별 AI 원가와 수익성을 모른다.
- 기능별 또는 workflow별 원가를 모른다.
- flat per-seat pricing과 variable AI usage가 맞지 않는다.
- usage-based, credit, hybrid pricing을 검토해야 한다.
- CEO/CFO/Board/투자자에게 설명할 AI unit economics 지표가 필요하다.

제품적 의미:

- 구매 이유는 "토큰을 아껴준다"보다 "손해 보는 고객과 잘못된 가격정책을 찾는다"에 가깝다.
- MVP는 cost dashboard보다 margin/pricing decision workspace로 설명해야 한다.
- 리포트는 개발자뿐 아니라 PM/CEO/Finance가 바로 공유할 수 있어야 한다.

## Top Pain 해석

현재 Evidence Board 기준 Top Pain은 validator 출력으로 확인한다.

```bash
npm run research:validate
```

핵심적으로 추적해야 할 pain은 다음 5개다.

| pain_tag | 왜 중요한가 | MVP 반영 |
| --- | --- | --- |
| `pain_margin_unknown` | AI 기능이 gross margin을 얼마나 깎는지 모른다. | 판매가 대비 원가와 margin 계산 |
| `pain_customer_profitability_unknown` | 고객별로 누가 돈이 되는지 모른다. | customer-level cost, business denominator |
| `pain_heavy_user_loss` | heavy user가 best customer가 아니라 worst margin customer가 될 수 있다. | heavy-user profitability 분석 |
| `pain_usage_pricing_mismatch` | 비용은 usage 기반인데 가격은 seat/flat이면 손해가 난다. | usage/credit/hybrid pricing simulator |
| `pain_feature_cost_unknown` | 어떤 기능이 비용과 margin을 먹는지 모른다. | 기능별 비용 Top, workflow-level attribution |

## MVP 우선순위

| 우선순위 | 기능 | 이유 |
| --- | --- | --- |
| P0 | CSV usage import | 토큰을 모르는 사용자도 실제 로그로 시작하게 한다. |
| P0 | usage/spike 요약 | Group A 운영 문제가 어디서 시작됐는지 보여준다. |
| P0 | 고객별/기능별/모델별 비용 | Core Engine의 기본 귀속 축이다. |
| P0 | 플랜별/세션별/agent run별 비용 | 가격정책과 운영 원인 분해를 연결한다. |
| P0 | 고객별 수익성 | 요청당 비용보다 고객/보고서/job당 원가가 사업 판단에 가깝다. |
| P0 | 플랜별 gross margin | 사용량이 늘수록 깨지는 플랜을 찾는다. |
| P0 | heavy-user profitability | 많이 쓰는 고객이 손해인지 확인한다. |
| P0 | usage-based / credit / hybrid / cap / overage simulation | SaaS 가격정책 전환을 판단하게 한다. |
| P0 | CEO/CFO/PM/Developer report | 개발자 데이터가 의사결정 언어로 번역된다. |
| P1 | raw cost vs effective cost | 싼 모델 교체가 품질 비용을 만들 수 있음을 보여준다. |
| P1 | invoice vs internal usage reconciliation | provider bill과 내부 feature/customer cost를 맞춘다. |
| P2 | SDK / Middleware | CSV 검증 후 자동 수집으로 확장한다. |
| P2 | Gateway / Proxy | 장기적으로 routing, guardrail, fallback까지 확장한다. |

## 지금 UI에 다시 넣지 않을 것

- 예산/쿼터 가드레일: Group A pain은 강하지만 현재 구매 이유의 중심은 아니다.
- 개발자 진단: tracking/waste pain은 유입에는 좋지만, 우선은 CSV import와 계산 신뢰도 강화로 처리한다.
- 온톨로지 화면: 내부 제품 판단 문서로 먼저 사용한다.

## 다음 리서치

50개 evidence 확장 전에는 큰 UI 기능을 새로 만들지 않는다. 현재 `GR-038`까지 정리했으므로 다음 리서치는 `GR-039`부터 아래 키워드를 의도적으로 더 모은다.

- cost per customer
- gross margin
- usage-based pricing
- AI SaaS margin
- AI COGS
- heavy user unprofitable
- PM / CEO / Finance / CFO / Board reporting
- per-customer / per-feature / per-plan / per-session attribution
- workflow / trace / agent-run cost attribution

빈도와 WTP는 섞지 않는다. 자주 보이는 불만과 돈 낼 가능성이 큰 신호를 별도 축으로 관리한다.

## 결론

MVP 방향은 유지하되 표현을 바꾼다.

약한 표현:

> LLM 비용 계산기

강한 표현:

> 개발자의 LLM 운영 로그를 비즈니스 원가와 가격정책 판단으로 번역하는 AI SaaS unit economics workspace

이 포지션이 더 사업적이고, Grok 리서치와 Evidence Board가 보여준 WTP 신호와도 더 잘 맞는다.
