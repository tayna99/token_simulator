# 후보 수집 로그

이 문서는 evidence(검증 근거 사례) 후보 수집 명령을 실행했을 때의 관찰 결과를 남긴다. 후보 전체 저장소가 아니라, 어떤 검색어가 유효했고 어떤 후보가 공식 Evidence Board(검증 근거 표)로 승격됐는지 판단하기 위한 작업 로그다.

## 2026-05-05

### HN 검색: gross margin AI SaaS(AI SaaS 매출총이익률)

실행 명령:

```bash
npm run research:hn -- "gross margin AI SaaS" 5
```

관찰:

- 후보 5개를 확인했다.
- AI IDE/Cursor gross margin(매출총이익률) 관련 후보가 있었다.
- AI 회사 unit economics(단위경제성)와 finance(재무) 관점 후보가 있었다.

채택:

- legacy 후보로만 보관한다. 현재 공식 Evidence Board에는 URL, 날짜, quote(직접 인용)가 개별 확인된 `GR-*` 행만 반영한다.

### HN 검색: usage based pricing LLM(LLM 사용량 기반 가격)

실행 명령:

```bash
npm run research:hn -- "usage based pricing LLM" 5
```

관찰:

- 후보 5개를 확인했다.
- business user(비즈니스 사용자)가 surprise bill(예상 밖 청구서)을 피하고 싶어 하는 신호가 있었다.
- 일부 후보는 개인 가격 취향에 가까워 보류했다.

채택:

- legacy 후보로만 보관한다.

### GitHub 검색: LLM cost per customer(고객별 LLM 비용)

실행 명령:

```bash
npm run research:github -- "LLM cost per customer" 5
```

관찰:

- 후보 5개를 확인했다.
- 관련성이 낮은 issue(이슈)가 많이 섞였다.
- GitHub는 단순 keyword(검색어)보다 특정 repo(저장소)와 query(질의)를 좁혀야 한다.

채택:

- 없음.

다음 검색어:

```bash
npm run research:github -- "gross margin usage based billing AI" 20
npm run research:github -- "cost allocation customer usage LLM" 20
npm run research:github -- "AI SaaS usage based billing margin" 20
```

### GitHub 검색: gross margin usage based billing AI(사용량 과금과 매출총이익률)

관찰:

- AI SaaS pricing(가격정책), per-analysis cost(분석 1건당 원가), gross margin, tenant profitability(테넌트별 수익성) 후보가 있었다.
- 자동 생성 digest(요약본)나 무관한 business dashboard issue도 섞였다.

채택:

- legacy 후보로만 보관한다.

### GitHub 검색: cost allocation customer usage LLM(고객 사용량 비용 배분)

관찰:

- Claude Code/Copilot quota issue(할당량 이슈)가 많이 섞였다.
- 사용자별 usage/cost tracking(사용량·비용 추적)과 finance reconciliation(재무 대사: 청구서와 내부 기록 맞추기) 후보가 있었다.

채택:

- legacy 후보로만 보관한다.

### GitHub 검색: AI SaaS usage based billing margin(AI SaaS 사용량 과금과 마진)

관찰:

- AI SaaS monetization(수익화), credit-based billing(크레딧 기준 청구), per-user LLM cost(사용자별 LLM 비용) 후보가 있었다.
- 무관한 일반 pricing/website issue도 섞였다.

채택:

- 공식 Evidence Board에는 직접 URL/날짜/quote 확인이 되는 후보만 올린다.

## 2026-05-07 검색어 보강

다음 키워드는 evidence 수집에 유효했다.

- cost per customer(고객당 비용)
- gross margin(매출총이익률)
- AI COGS(AI 매출원가)
- customer profitability(고객별 수익성)
- heavy users unprofitable(과사용 고객이 손해 고객이 되는 문제)
- usage-based pricing(사용량 기반 가격)
- AI credits(AI 크레딧)
- hybrid pricing(혼합 과금)
- board reporting(이사회 보고)
- CFO dashboard(재무 대시보드)
- AI SaaS unit economics(AI SaaS 단위경제성)

## 공식 Evidence Board 반영 기록

### CAND → GR 승격

- `CAND-037` → `GR-023`
- `CAND-038` → `GR-024`
- `CAND-039` → `GR-025`
- `CAND-040` → `GR-026`
- `CAND-041` → `GR-027`
- `CAND-043` → `GR-028`
- `CAND-044` → `GR-029` (검증된 source text에서 quote 조정)

주의:

- `CAND-042` Forbes Tech Council 후보는 access/paywall(접근 제한/유료 장벽) 때문에 직접 quote 검증을 하지 못했다.

결과:

- 공식 Evidence Board는 29행이 됐다.
- validator top pain(검증기가 잡은 상위 고통)은 `pain_margin_unknown`, `pain_usage_pricing_mismatch`, `pain_heavy_user_loss`였다.
- 다음 공식 evidence id는 `GR-030`이었다.

## Grok 후보 재검토 원칙

초기 Grok 후보는 useful seed(유용한 씨앗)였지만, 공식 근거로 쓰려면 각 항목이 URL, 날짜, 원문 quote를 가져야 한다.

| Grok 후보 | 매핑 결과 | 처리 |
| --- | --- | --- |
| gross margin 후보 | 이미 `GR-001` 등으로 대표됨 | 중복 생성하지 않음 |
| customer profitability 후보 | `GR-002`로 대표됨 | 날짜와 quote를 보정 |
| GetMonetizely 후보 | `GR-006`으로 대표됨 | 짧은 검증 quote 유지 |
| BVP 후보 | `GR-008`로 대표됨 | 이미 승격 |
| Forbes/Metronome 후보 | quote 검증 실패 | `quote_verified=false` 유지 |

## Core Engine 귀속 근거

Core Engine(핵심 엔진)은 usage logs(사용량 로그)를 customer, feature, model, plan, session, trace, workflow, agent run으로 tag(태그)하고 roll-up(집계)해야 한다는 근거를 강화했다.

추가된 근거:

- CloudZero inference cost
- Tian Pan pricing page
- Revenium Tool Registry
- Particula per-tenant attribution

## Plan-level 가격 근거

plan_id(요금제 식별자) 축은 customer-level profitability(고객별 수익성)와 함께 plan-level COGS(요금제별 매출원가), cap(상한), overage(초과 요금), credit bundle(크레딧 묶음), AI add-on(AI 부가요금) 결정을 같이 봐야 한다.

추가된 근거:

- GetMonetizely / GitHub Copilot
- Reforge / Cursor
- Stripe AI SaaS pricing guardrails
- BuildMVPFast AI Tax

## Board/Investor 표현 근거

Board/investor(이사회/투자자)용 문구는 token 수가 아니라 AI COGS, gross margin, cost per customer, customer profitability, margin erosion, pricing alignment를 중심으로 작성한다.

추가된 근거:

- SaaSMag / ICONIQ margin erosion
- TheSaaSCFO AI COGS
- BVP gross margin compression
- ZopDev + Spendline cost per customer

## 경쟁 제품 비교 기록

`ai-saas-llm-cost-products-comparison-2026.md`를 만들었다.

해석:

- Observability tools(관측 도구)는 상류 데이터 소스로 강하다.
- Billing tools(과금 도구)는 하류 수익화 시스템으로 강하다.
- 빈 공간은 LLM usage를 feature/customer/plan margin과 pricing decision으로 바꾸는 Core Engine이다.
