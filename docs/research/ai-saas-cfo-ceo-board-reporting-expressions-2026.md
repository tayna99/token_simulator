# AI SaaS CFO/CEO/이사회 보고 표현 라이브러리 — 2026-05-07

## 목적

이 문서는 제품 리포트, CEO 요약, CFO 월간 패키지, Board deck(이사회 보고 자료)에 바로 넣을 수 있는 표현을 정리한다. 새로운 기능 목록이 아니라, Evidence Board의 `GR-*` 근거를 의사결정자가 이해하는 언어로 바꾸는 라이브러리다.

## Source Mapping(근거 매핑)

| 주제 | 근거 행 | 출처 | 리포트 사용처 |
| --- | --- | --- | --- |
| AI COGS(AI 매출원가) | `GR-005` | TheSaaSCFO | AI 비용을 별도 라인 아이템으로 분리해야 한다는 설명 |
| Gross margin compression(매출총이익률 압축) | `GR-005`, `GR-008`, `GR-038` | TheSaaSCFO, BVP, SaaSMag | 기존 SaaS margin 대비 AI-heavy margin 하락 설명 |
| Cost per customer(고객당 비용) | `GR-014`, `GR-027`, `GR-031` | ZopDev, Spendline, Tian Pan | 고객별 AI 원가와 feature cost attribution 설명 |
| Customer profitability(고객별 수익성) | `GR-002`, `GR-027` | Reddit r/SaaS, Spendline | enterprise customer profitability와 heavy user 손실 설명 |
| Margin erosion(마진 침식) | `GR-006`, `GR-038` | GetMonetizely, SaaSMag | margin erosion benchmark와 pricing alignment 필요성 설명 |
| Pricing alignment(가격 정렬) | `GR-006`, `GR-008`, `GR-021`, `GR-036` | GetMonetizely, BVP, Stripe | usage-based/hybrid/overage/cap 판단 설명 |
| Board reporting(이사회 보고) | `GR-004`, `GR-005`, `GR-038` | TheSaaSCFO, SaaSMag | AI unit economics를 Board metric으로 설명 |

## 리포트 문장 템플릿

### 1. AI COGS(AI 매출원가)

Source signal(근거 신호): TheSaaSCFO는 AI 기능 추가 후 COGS가 커지면 gross margin이 구조적으로 압축된다는 예시를 제시한다.

Report-ready wording(리포트용 문장):

> AI 기능 도입 후 AI-related COGS가 별도 비용층으로 생겼습니다. 기존 hosting 비용과 섞어 보면 원인을 알 수 없으므로, AI COGS를 별도 라인 아이템으로 분리하고 월별 gross margin에 미치는 영향을 추적해야 합니다.

사용처:

- CEO summary(대표 요약)
- CFO monthly package(재무 월간 패키지)
- AI COGS isolation card(AI 원가 분리 카드)

### 2. Gross Margin Compression(매출총이익률 압축)

Source signal: BVP는 AI 회사의 gross margin이 전통 SaaS보다 낮아질 수 있다고 설명하고, SaaSMag는 AI infrastructure 비용으로 margin erosion이 발생한다고 보고한다.

Report-ready wording:

> AI inference 비용이 증가하면서 gross margin compression이 발생하고 있습니다. 단순 API 비용 증감이 아니라, 매출이 늘어날수록 COGS도 함께 늘어나는 구조인지 확인해야 합니다.

사용처:

- Board deck one-liner(이사회 자료 한 줄)
- Margin trend card(마진 추세 카드)
- Pricing risk note(가격 위험 메모)

### 3. Cost Per Customer(고객당 비용)

Source signal: ZopDev와 Spendline은 cost per customer를 계산하려면 request-level attribution(요청 단위 귀속)이 필요하다고 설명한다.

Report-ready wording:

> 고객별 AI 원가가 보이지 않으면 ARR은 같아도 수익성은 전혀 다른 고객을 구분할 수 없습니다. 월별 cost per customer와 contribution margin per customer를 함께 봐야 합니다.

사용처:

- Customer profitability table(고객별 수익성 표)
- Heavy-user alert copy(과사용 고객 알림 문구)
- Sales/CS account review summary(영업/고객지원 계정 리뷰 요약)

### 4. Customer Profitability(고객별 수익성)

Source signal: Reddit r/SaaS의 AI SaaS 운영자는 enterprise 고객별 profitability visibility 부족과 flat per-seat pricing의 위험을 직접 언급했다.

Report-ready wording:

> 일부 enterprise 고객은 매출 규모가 커 보여도 AI usage가 높아 실제 contribution margin이 낮을 수 있습니다. 고객별 revenue, AI COGS, gross margin을 같은 표에서 비교해야 합니다.

사용처:

- Customer P&L report(고객별 손익 리포트)
- Top-decile user cost vs median report(상위 10% 사용자 비용과 중앙값 비교)
- Enterprise renewal prep(엔터프라이즈 갱신 준비)

### 5. Margin Erosion(마진 침식)

Source signal: SaaSMag는 AI infrastructure cost가 gross margin erosion과 valuation multiple에 영향을 준다고 설명한다.

Report-ready wording:

> AI infrastructure 비용은 성장 지표와 별개로 margin erosion을 만들 수 있습니다. 투자자 보고에서는 AI 매출 성장과 함께 AI COGS, gross margin, margin improvement roadmap을 함께 제시해야 합니다.

사용처:

- Investor update(투자자 업데이트)
- Board reporting note(이사회 보고 메모)
- Margin erosion benchmark card(마진 침식 비교 카드)

### 6. Pricing Alignment(가격 정렬)

Source signal: GetMonetizely, BVP, Stripe는 flat/seat pricing과 variable AI usage의 불일치를 지적하고 usage cap, overage, tier limit, hybrid pricing을 해결책으로 제시한다.

Report-ready wording:

> 현재 가격 구조가 usage-driven cost와 정렬되어 있지 않으면 heavy user가 전체 margin을 잠식할 수 있습니다. usage cap, overage, AI credit bundle, hybrid pricing을 시뮬레이션해 plan별 gross margin을 보호해야 합니다.

사용처:

- Pricing simulator(가격 시뮬레이터)
- Plan margin scenario(요금제별 마진 시나리오)
- Credit / overage policy recommendation(크레딧·초과요금 정책 추천)

### 7. Board Reporting(이사회 보고)

Source signal: TheSaaSCFO는 AI reporting을 consumption, work, outcomes, business impact의 단계로 나누고, Board/Investor가 원하는 것은 단순 token 수가 아니라 unit economics와 business impact라고 설명한다.

Report-ready wording:

> Board reporting에서는 token 사용량만으로는 충분하지 않습니다. AI가 무엇을 소비했는지, 어떤 work unit을 수행했는지, 어떤 outcome을 만들었는지, P&L에 어떤 영향을 줬는지를 함께 보여줘야 합니다.

사용처:

- CEO/CFO report mode(대표·재무 리포트 모드)
- Board deck copy block(이사회 자료 문구 블록)
- Product positioning(제품 포지셔닝)

## 제품 시사점

- 리포트의 첫 문장은 "AI 비용을 분석했다"보다 "AI 기능이 마진을 어디서 깎는지 확인했다"에 가까워야 한다.
- CEO/CFO용 화면은 총 토큰보다 AI COGS, gross margin, customer profitability, pricing action을 먼저 보여 줘야 한다.
- 투자자/이사회 문구는 "절감"만 말하지 말고 margin improvement roadmap(마진 개선 계획)을 함께 제시해야 한다.
