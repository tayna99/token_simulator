# AI SaaS LLM 비용 / 사용량 / 청구 / 마진 제품 비교 - 2026-05-07

## 목적

이 문서는 Helicone, LangSmith, Langfuse, Portkey, CloudZero, Vantage, OpenMeter, Metronome, Stripe usage-based billing(사용량 기준 청구)이 LLM cost(대규모 언어 모델 비용), usage tracking(사용량 추적), pricing(가격정책), billing(청구), margin analysis(마진 분석) 중 어디까지 다루는지 비교한다.

목표는 경쟁사를 깎아내리는 것이 아니라, 이 제품이 어느 빈 공간을 잡아야 하는지 명확히 하는 것이다.

## 포지셔닝 가설

한 줄 결론:

> Helicone/Langfuse/Portkey/LangSmith는 LLM observability(LLM 요청에서 무슨 일이 일어났는지 추적하는 관측 기능)에 강하고, OpenMeter/Metronome/Stripe는 usage-based billing에 강하다. CloudZero/Vantage는 AI cost allocation(AI 비용 배분)과 FinOps(클라우드·AI 비용을 재무 관점에서 관리하는 운영 방식)에 강하다. 하지만 LLM usage를 customer/feature/model/plan/session 원가로 재분류한 뒤 gross margin(매출총이익률), customer profitability(고객별 수익성), pricing simulation(가격정책 가정 실험), CEO/CFO report까지 한 흐름으로 연결하는 decision workspace(의사결정 작업공간)는 여전히 빈 공간이다.

따라서 이 제품의 포지션은 다음이다.

> LLM 운영 로그를 AI SaaS unit economics(단위 경제성)와 가격정책 판단으로 번역하는 Core Engine(비용 귀속과 의사결정 계산을 맡는 핵심 엔진).

## 비교표

| Product | LLM trace / observability | Token / cost tracking | Customer / feature attribution | Pricing / billing | Gross margin / AI COGS | CEO / CFO report | Gateway / proxy | Gap vs our product |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Helicone | 강함 | 강함 | custom properties로 강함 | 제한적 | 제한적, unit economics 지원 | 제한적 | 강함 | request-level observability(요청 단위 관측)는 좋지만 pricing/margin decision workspace는 아님 |
| LangSmith | 강함 | 강함 | metadata/project/thread로 제한적 | 없음 | 없음 | 없음 | 없음 | tracing/eval(추적·평가)은 뛰어나지만 customer profitability나 pricing layer는 아님 |
| Langfuse | 강함 | 강함 | user/tags/metadata/metrics API로 중간 | downstream use(후속 활용)는 제한적 | 없음 | 없음 | 없음 | open observability는 강하지만 margin/pricing layer는 외부에 있음 |
| Portkey | 강함 | 강함 | metadata와 user analytics로 중간 | budget controls는 제한적 | 제한적 | 제한적 | 강함 | Gateway와 analytics는 강하지만 business margin narrative(사업 마진 설명)는 약함 |
| CloudZero | trace는 제한적 | cost intelligence는 강함 | customer/feature cost context 강함 | 없음 | 강함 | FinOps 언어 강함 | 없음 | 가장 가까운 FinOps 인접 제품이지만 LLM workflow tracing이나 pricing simulator는 아님 |
| Vantage | trace는 제한적 | token allocation은 중간~강함 | team/user/application metadata로 중간 | 없음 | 제한적 | FinOps dashboard는 중간 | 없음 | cost allocation layer이지 AI SaaS pricing/margin workspace는 아님 |
| OpenMeter | 없음 | AI usage events 포함 metering | subject/customer usage attribution 강함 | usage-based billing 강함 | 제한적 | revenue insights 제한적 | 없음 | billing engine이지 LLM cost-to-margin analysis는 아님 |
| Metronome | 없음 | event-based metering | account/contract/product billing context 강함 | usage, credits, commits, hybrid 강함 | 제한적 | monetization reporting 강함 | 없음 | monetization infrastructure이지 LLM observability나 raw cost attribution은 아님 |
| Stripe Usage-Based Billing | AI usage context 제한적 | usage/revenue metering 강함 | account/product billing context 강함 | usage, credits, hybrid 강함 | margin protection 제한적 | finance reporting 제한적 | AI Gateway context 제한적 | billing/revenue layer이지 cost attribution과 model/feature analysis는 아님 |

## 각 범주의 의미

### Observability Tools(관측 도구)

예시: Helicone, LangSmith, Langfuse, Portkey.

이 도구들이 답하는 질문:

- 어떤 LLM request(요청)가 발생했는가?
- 어떤 model이 사용됐는가?
- token은 몇 개이고 cost는 얼마인가?
- 어떤 trace, user, metadata, feature label이 붙어 있는가?
- 어떤 request가 실패했거나 느렸거나 cache를 사용했는가?

대체로 developer-first(개발자 우선) 도구다. 중심은 debugging(디버깅), tracing(요청 흐름 추적), evaluation(평가), gateway, logs, provider cost에 있다.

우리 제품은 tracing 자체에서 이들을 이기려 해서는 안 된다. 이 도구들이 내보낸 데이터를 가져오거나 요약한 뒤 business cost object(고객·기능·요금제 같은 비즈니스 원가 단위)로 번역해야 한다.

### FinOps / Cost Allocation Tools(비용 배분 도구)

예시: CloudZero, Vantage.

이 도구들이 답하는 질문:

- 어떤 cloud 또는 AI spend(지출)가 어떤 team, user, application, customer, feature에 속하는가?
- spend가 왜 바뀌었는가?
- 어떤 cost center(비용 책임 조직)가 spend를 책임지는가?
- spend가 unit economics와 어떻게 연결되는가?

이들은 특히 CloudZero를 중심으로 우리 가설에 더 가깝다. 차이는 이들이 넓은 FinOps 제품인 반면, 이 MVP(최소 기능 제품)는 AI SaaS pricing/margin decision에 더 좁고 선명하게 집중할 수 있다는 점이다.

### Usage-Based Billing Tools(사용량 기준 청구 도구)

예시: OpenMeter, Metronome, Stripe.

이 도구들이 답하는 질문:

- usage를 어떻게 meter(측정·계량)할 것인가?
- 고객에게 usage를 어떻게 bill(청구)할 것인가?
- credits, commits, overages, hybrid pricing, subscriptions, invoices를 어떻게 지원할 것인가?
- 고객은 자신의 usage와 spend를 어떻게 볼 것인가?

이들은 보통 billable usage(청구 가능한 사용량)와 revenue(매출)에서 출발한다. 우리 제품은 한 단계 앞, 즉 raw LLM usage cost(원시 LLM 사용 비용)와 attribution(비용 귀속)에서 시작한다. 연결 다리는 billing implementation(청구 구현) 전 단계의 pricing simulation이다.

## 빈 공간

가장 가치 있는 빈 공간은 "또 하나의 LLM dashboard"도 아니고 "또 하나의 billing engine"도 아니다.

It is:

```txt
LLM usage / trace / bill
-> customer, feature, model, plan, session, agent-run cost attribution
-> business cost object
-> gross margin and customer profitability
-> usage-based / credit / hybrid pricing decision
-> CEO / CFO / Board-ready explanation
```

그래서 Core Engine이 중요하다. 제품은 observability와 billing 사이에 있어야 한다.

- upstream input(상류 입력): Helicone, Langfuse, LangSmith, Portkey, provider logs, CSV exports
- downstream output(하류 출력): pricing policy, plan design, credit bundles, overage, customer profitability reports, Board summaries

## MVP 시사점

P0에서 강조할 것:

- CSV import from provider / gateway / observability exports
- customer, feature, model, plan, session, agent-run attribution
- plan-level gross margin and heavy-user loss
- pricing / credit / overage scenario simulation
- CEO/CFO/PM/Developer report output

P0에서 피할 것:

- becoming a full tracing system
- becoming a full billing engine
- selling only budget alerts
- claiming to replace CloudZero, Stripe, Metronome, or Helicone

## 차별화 문장

외부에 쓸 문장:

> 우리는 기존 LLM observability나 billing stack(청구 시스템 묶음)을 대체하지 않는다. 그 로그를 AI SaaS unit economics로 바꾼다: feature-level cost, customer-level profitability, plan gross margin, pricing scenarios, CEO/CFO-ready reporting.

내부에서 쓸 문장:

> Observability는 개발자에게 무슨 일이 있었는지 보여준다. Billing은 고객에게 사용량을 청구한다. 이 제품은 그 사용량이 이익인지 손실인지, 가격정책을 어떻게 바꿔야 하는지 설명한다.

## 확인한 출처

- Helicone custom properties and unit economics support: https://docs.helicone.ai/features/advanced-usage/custom-properties
- LangSmith cost tracking: https://docs.langchain.com/langsmith/cost-tracking
- Langfuse token and cost tracking: https://langfuse.com/docs/observability/features/token-and-cost-tracking
- Portkey analytics and cost management: https://portkey.ai/docs/virtual_key_old/product/observability/analytics and https://portkey.ai/docs/product/observability/cost-management
- CloudZero cost intelligence: https://www.cloudzero.com/
- Vantage LLM token allocation: https://www.vantage.sh/blog/llm-token-allocation-preview
- OpenMeter docs and product page: https://openmeter.io/docs and https://openmeter.io/
- Metronome docs and product page: https://docs.metronome.com/ and https://metronome.com/
- Stripe usage-based billing: https://stripe.com/gb/billing/usage-based-billing
