# AI SaaS CFO / CEO / Board Reporting Expressions - 2026-05-07

## Purpose

이 문서는 제품 리포트, CEO 요약, CFO 월간 패키지, Board deck에 바로 넣을 수 있는 표현을 정리한다. 새로운 기능 목록이 아니라, Evidence Board의 `GR-*` 근거를 의사결정자가 이해하는 언어로 바꾸는 라이브러리다.

## Source Mapping

| Theme | Evidence row | Source | Report use |
| --- | --- | --- | --- |
| AI COGS | `GR-005` | TheSaaSCFO | AI COGS를 별도 라인 아이템으로 분리해야 한다는 설명 |
| Gross margin compression | `GR-005`, `GR-008`, `GR-038` | TheSaaSCFO, BVP, SaaSMag | 기존 SaaS margin 대비 AI-heavy margin 하락 설명 |
| Cost per customer | `GR-014`, `GR-027`, `GR-031` | ZopDev, Spendline, Tian Pan | 고객별 AI 원가와 feature cost attribution 설명 |
| Customer profitability | `GR-002`, `GR-027` | Reddit r/SaaS, Spendline | enterprise customer profitability와 heavy user 손실 설명 |
| Margin erosion | `GR-006`, `GR-038` | GetMonetizely, SaaSMag | margin erosion benchmark와 pricing alignment 필요성 설명 |
| Pricing alignment | `GR-006`, `GR-008`, `GR-021`, `GR-036` | GetMonetizely, BVP, Stripe | usage-based / hybrid / overage / cap 판단 설명 |
| Board reporting | `GR-004`, `GR-005`, `GR-038` | TheSaaSCFO, SaaSMag | AI unit economics를 Board metric으로 설명 |

## Report Phrase Templates

### 1. AI COGS

Source signal: TheSaaSCFO는 AI 기능 추가 후 COGS가 커지면 gross margin이 구조적으로 압축된다는 예시를 제시한다.

Report-ready wording:

> AI 기능 도입 후 AI-related COGS가 별도 비용층으로 생겼습니다. 기존 hosting 비용과 섞어 보면 원인을 알 수 없으므로, AI COGS를 별도 라인 아이템으로 분리하고 월별 gross margin에 미치는 영향을 추적해야 합니다.

Use in product:

- CEO summary
- CFO monthly package
- AI COGS isolation card

### 2. Gross Margin Compression

Source signal: BVP는 AI 회사의 gross margin이 전통 SaaS보다 낮아질 수 있다고 설명하고, SaaSMag는 AI infrastructure 비용으로 margin erosion이 발생한다고 보고한다.

Report-ready wording:

> AI inference 비용이 증가하면서 gross margin compression이 발생하고 있습니다. 단순 API 비용 증감이 아니라, 매출이 늘어날수록 COGS도 함께 늘어나는 구조인지 확인해야 합니다.

Use in product:

- Board deck one-liner
- Margin trend card
- Pricing risk note

### 3. Cost Per Customer

Source signal: ZopDev와 Spendline은 cost per customer를 계산하려면 request-level attribution이 필요하다고 설명한다.

Report-ready wording:

> 고객별 AI 원가가 보이지 않으면 ARR은 같아도 수익성은 전혀 다른 고객을 구분할 수 없습니다. 월별 cost per customer와 contribution margin per customer를 함께 봐야 합니다.

Use in product:

- Customer profitability table
- Heavy-user alert copy
- Sales/CS account review summary

### 4. Customer Profitability

Source signal: Reddit r/SaaS의 AI SaaS 운영자는 enterprise 고객별 profitability visibility 부족과 flat per-seat pricing의 위험을 직접 언급했다.

Report-ready wording:

> 일부 enterprise 고객은 매출 규모가 커 보여도 AI usage가 높아 실제 contribution margin이 낮을 수 있습니다. 고객별 revenue, AI COGS, gross margin을 같은 표에서 비교해야 합니다.

Use in product:

- Customer P&L report
- Top-decile user cost vs median report
- Enterprise renewal prep

### 5. Margin Erosion

Source signal: SaaSMag는 AI infrastructure cost가 gross margin erosion과 valuation multiple에 영향을 준다고 설명한다.

Report-ready wording:

> AI infrastructure 비용은 성장 지표와 별개로 margin erosion을 만들 수 있습니다. 투자자 보고에서는 AI 매출 성장과 함께 AI COGS, gross margin, margin improvement roadmap을 함께 제시해야 합니다.

Use in product:

- Investor update
- Board reporting note
- Margin erosion benchmark card

### 6. Pricing Alignment

Source signal: GetMonetizely, BVP, Stripe는 flat/seat pricing과 variable AI usage의 불일치를 지적하고 usage cap, overage, tier limit, hybrid pricing을 해결책으로 제시한다.

Report-ready wording:

> 현재 가격 구조가 usage-driven cost와 정렬되어 있지 않으면 heavy user가 전체 margin을 잠식할 수 있습니다. usage cap, overage, AI credit bundle, hybrid pricing을 시뮬레이션해 plan별 gross margin을 보호해야 합니다.

Use in product:

- Pricing simulator
- Plan margin scenario
- Credit / overage policy recommendation

### 7. Board Reporting

Source signal: TheSaaSCFO는 AI reporting을 consumption, work, outcomes, business impact의 단계로 나누고, Board/Investor가 원하는 것은 단순 token 수가 아니라 unit economics와 business impact라고 설명한다.

Report-ready wording:

> Board reporting에서는 token 사용량만으로는 충분하지 않습니다. AI가 무엇을 소비했는지, 어떤 work unit을 수행했는지, 어떤 outcome을 만들었는지, P&L에 어떤 영향을 줬는지를 함께 보여줘야 합니다.

Use in product:

- CEO / CFO report mode
- Board deck copy block
- Product positioning

## Product Implication

4번 검색 결과는 새로운 UI 기능보다 report output의 언어를 강화한다.

MVP에 반영할 방향:

- CEO report: margin erosion, AI COGS, plan-level gross margin 중심
- CFO report: cost per customer, AI COGS as % revenue, top-decile cost vs median 중심
- PM report: feature cost, usage-to-value, pricing alignment 중심
- Developer report: usage event, token, model, feature, session, agent-run attribution 중심

따라서 report 기능은 단순 export가 아니라 Evidence Board 기반의 decision narrative를 생성해야 한다.
