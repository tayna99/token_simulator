# 후보 수집 로그

이 문서는 evidence(검증 근거 사례) 후보 수집 명령을 실행했을 때의 관찰 결과를 짧게 남긴다. 후보 전체를 저장하는 문서가 아니라, 어떤 검색이 좋은지 나쁜지 판단하기 위한 로그다.

## 2026-05-05

### HN: gross margin AI SaaS

실행 명령:

```bash
npm run research:hn -- "gross margin AI SaaS" 5
```

관찰:

- 후보 5개 확인
- AI IDE/Cursor gross margin(매출총이익률) 후보가 있었다.
- AI 회사 unit economics(단위 경제성)/finance(재무) 관점 후보가 있었다.

채택:

- legacy 후보로만 보관. 현재 공식 Evidence Board에는 URL/날짜/quote가 개별 확인된 `GR-*` row만 반영한다.

### HN: usage based pricing LLM

실행 명령:

```bash
npm run research:hn -- "usage based pricing LLM" 5
```

관찰:

- 후보 5개 확인
- business user(비즈니스 사용자)가 usage-based pricing(사용량 기준 가격정책)에서 surprise bill(예상 밖 청구서)을 피하고 싶다는 후보가 있었다.
- 일부 후보는 개인 사용/가격 취향에 가까워 보류했다.

채택:

- legacy 후보로만 보관. 현재 공식 Evidence Board에는 URL/날짜/quote가 개별 확인된 `GR-*` row만 반영한다.

### GitHub: LLM cost per customer

실행 명령:

```bash
npm run research:github -- "LLM cost per customer" 5
```

관찰:

- 후보 5개 확인
- 관련성이 낮은 issue(이슈)가 많이 섞였다.
- GitHub는 단순 keyword(검색어)보다 특정 repo(저장소)와 query(검색 질의)를 좁혀야 한다.

채택:

- 없음

다음 검색어 조정:

```bash
npm run research:github -- "gross margin usage based billing AI" 20
npm run research:github -- "cost allocation customer usage LLM" 20
npm run research:github -- "AI SaaS usage based billing margin" 20
```

### GitHub: gross margin usage based billing AI

실행 명령:

```bash
npm run research:github -- "gross margin usage based billing AI" 20
```

관찰:

- 후보 20개 확인
- AI SaaS pricing(가격정책), per-analysis cost(분석 1건당 원가), gross margin(매출총이익률), tenant profitability(테넌트별 수익성) 후보가 있었다.
- 자동 생성 digest(요약본)나 무관한 business dashboard issue도 섞였다.

채택:

- legacy 후보로만 보관. 현재 공식 Evidence Board에는 URL/날짜/quote가 개별 확인된 `GR-*` row만 반영한다.

### GitHub: cost allocation customer usage LLM

실행 명령:

```bash
npm run research:github -- "cost allocation customer usage LLM" 20
```

관찰:

- 후보 20개 확인
- Claude Code/Copilot quota issue(할당량 관련 이슈)가 많이 섞였다.
- 사용자별 usage/cost tracking(사용량·비용 추적)과 finance reconciliation(재무 대사, 청구서와 내부 기록 맞추기) 후보가 있었다.

채택:

- legacy 후보로만 보관. 현재 공식 Evidence Board에는 URL/날짜/quote가 개별 확인된 `GR-*` row만 반영한다.

### GitHub: AI SaaS usage based billing margin

실행 명령:

```bash
npm run research:github -- "AI SaaS usage based billing margin" 20
```

관찰:

- 후보 20개 확인
- AI SaaS monetization(수익화), credit-based billing(크레딧 기준 청구), per-user LLM cost(사용자별 LLM 비용) 후보가 있었다.
- 무관한 일반 pricing/website issue도 섞였다.

채택:

- legacy 후보로만 보관. 현재 공식 Evidence Board에는 URL/날짜/quote가 개별 확인된 `GR-*` row만 반영한다.

## 2026-05-07

### Grok: Group B cost/margin/pricing candidates CAND-037~058

프롬프트 초점:

- cost per customer
- gross margin
- AI COGS
- customer profitability
- heavy users unprofitable
- usage-based pricing
- AI credits
- hybrid pricing
- board reporting
- CFO dashboard
- AI SaaS unit economics

관찰:

- 신규 후보 22개 수집.
- Grok 응답은 `quote_verified=true`라고 주장했지만, Codex가 원문 URL/날짜/exact quote를 직접 확인한 것은 아니다.
- Group B 후보가 대부분이며, 일부는 일반 SaaS pricing/finance 자료일 가능성이 있어 AI/LLM 직접 맥락 검증이 필요하다.

채택:

- 공식 `evidence_board.csv`에는 아직 반영하지 않음.
- `evidence_candidates_unverified.csv`에 `CAND-037`부터 `CAND-058`까지 추가.
- `quote_status=grok_claimed_unverified`로 표시해 공식 주장과 분리.

다음 단계:

- 직접 URL 접근 후 published date와 exact quote를 확인한다.
- AI/LLM 직접 맥락이 약한 후보는 off-domain supporting candidate로 유지한다.
- 검증 통과 후보만 `GR-023` 이후로 승격한다.

### CAND-037~044 partial verification

검증 후 승격:

- `CAND-037` -> `GR-023`
- `CAND-038` -> `GR-024`
- `CAND-039` -> `GR-025`
- `CAND-040` -> `GR-026`
- `CAND-041` -> `GR-027`
- `CAND-043` -> `GR-028`
- `CAND-044` -> `GR-029` with adjusted quote from verified source text

승격하지 않음:

- `CAND-042` Forbes Tech Council: access/paywall prevented direct quote verification.

Core Engine attribution(비용 귀속) 확장 전 historical snapshot(그 시점의 분석 데이터 묶음):

- Official Evidence Board: 29 rows.
- Validator top pain: `pain_margin_unknown:188`, `pain_usage_pricing_mismatch:152`, `pain_heavy_user_loss:140`.
- Next official evidence id: `GR-030`.

### Grok: initial 10-candidate quote verification

입력:

- 10 previously collected AI SaaS cost/margin candidates.
- Verification fields: URL access, published date, exact quote, AI/LLM/SaaS context, duplicate risk, promotion decision.

결과 매핑:

| Grok candidate | Mapped official / candidate row | Result | Action |
| --- | --- | --- | --- |
| 1 | `GR-001` Reddit gross margin | Initial long quote not verbatim, context direct | No duplicate. Keep official row's shorter verified quote. |
| 2 | `GR-002` Reddit customer profitability | Initial long quote not verbatim, context direct | No duplicate. Corrected `published_date` to `2026-02-12`. |
| 3 | `GR-006` GetMonetizely | Initial long quote not verbatim, context direct | No duplicate. Keep official row's shorter verified quote. |
| 4 | `GR-005` TheSaaSCFO | Initial long quote not verbatim, context direct | No duplicate. Keep official row's shorter verified quote. |
| 5 | `GR-007` / `CAND-027` HireFraction | Exact quote verified | Already promoted. |
| 6 | `GR-008` / `CAND-029` BVP | Exact quote verified | Already promoted. |
| 7 | `GR-009` / `CAND-009` / `CAND-030` Forbes-Metronome | Exact quote not verified | Keep `quote_verified=false`; do not use for product claim. |
| 8 | `GR-010` CloudZero webinar | Exact quote verified | Already promoted. |
| 9 | `GR-014` ZopDev | Exact quote verified | Already promoted. |
| 10 | `GR-011` / `CAND-028` Revenium | Exact quote verified | Already promoted. |

결론:

- No new Evidence Board rows needed.
- Five promoteable candidates were already represented in the official board.
- The useful change is verification discipline: initial Grok paraphrases should not overwrite official exact quotes.

### Grok: Core Engine attribution evidence

입력:

- Six attribution-focused examples for customer, feature, model, plan, session, and agent-run cost.
- Verification fields: URL, published date, exact quote, AI SaaS context, Core Engine relevance.

결과 매핑:

| Grok item | Mapped official row | Result | Action |
| --- | --- | --- | --- |
| 1 Spendline unit economics | `GR-027` | Duplicate, exact quote already represented | No new row. |
| 2 CloudZero inference cost | `GR-030` | New exact quote verified | Promoted. |
| 3 Tian Pan pricing page | `GR-031` | New exact quote verified | Promoted. |
| 4 Revenium Tool Registry | `GR-032` | New exact quote verified | Promoted. |
| 5 Reddit customer profitability | `GR-002` | Duplicate, exact quote already represented | No new row. |
| 6 Particula per-tenant attribution | `GR-033` | New exact quote verified | Promoted. |

결론:

- Four new Core Engine rows were added.
- This strengthens the middle layer: usage logs must be tagged and rolled up by customer, feature, model, plan, session, trace, workflow, and agent run.
- Next official evidence id: `GR-034`.

### Grok: plan-level LLM cost and gross margin evidence

입력:

- Seven plan-level examples for Free, Pro, Team, and Enterprise AI usage cost.
- Verification fields: URL, published date, exact quote, plan/pricing issue, WTP signal, possible feature.

결과 매핑:

| Grok item | Mapped official / candidate row | Result | Action |
| --- | --- | --- | --- |
| 1 GetMonetizely / GitHub Copilot | `GR-034` | New exact quote verified | Promoted. |
| 2 Reforge / Cursor | `GR-035` | New exact quote verified | Promoted. |
| 3 Reforge / Claude and Replit | `GR-035` notes | Same source and same pricing failure cluster | Kept as supporting detail in `GR-035`. |
| 4 Reddit enterprise customer margin | `GR-002` | Duplicate, exact quote already represented | No new row. |
| 5 Stripe AI SaaS pricing guardrails | `GR-036` | New exact quote verified | Promoted. |
| 6 BuildMVPFast AI Tax | `GR-037` | New exact quote verified | Promoted. |
| 7 Forbes / Metronome credit bundle | `CAND-059`, duplicate of `GR-009` | Access/paywall blocked exact quote verification | Kept in unverified candidates only. |

결론:

- Four new plan-level rows were added.
- This strengthens the `plan_id` axis: customer-level profitability must be paired with plan-level COGS, cap, overage, credit bundle, and AI add-on decisions.
- Next official evidence id: `GR-038`.

### Grok: CFO / CEO / Board reporting expressions

입력:

- Seven reporting-language examples for AI COGS, gross margin compression, cost per customer, customer profitability, margin erosion, pricing alignment, and Board reporting.
- Verification fields: URL, published date, exact short quote, report phrase, dashboard/deck usage.

결과 매핑:

| Grok item | Mapped official row | Result | Action |
| --- | --- | --- | --- |
| 1 TheSaaSCFO AI COGS | `GR-005` | Existing source/evidence, stronger report phrase | Added to report expression library. |
| 2 BVP gross margin compression | `GR-008` | Existing exact source | Added to report expression library. |
| 3 ZopDev + Spendline cost per customer | `GR-014`, `GR-027` | Existing exact sources | Added to report expression library. |
| 4 Reddit customer profitability | `GR-002` | Existing exact source | Added to report expression library. |
| 5 SaaSMag / ICONIQ margin erosion | `GR-038` | New exact quote verified | Promoted. |
| 6 GetMonetizely / BVP pricing alignment | `GR-006`, `GR-008` | Existing source/evidence | Added to report expression library. |
| 7 TheSaaSCFO Board reporting | `GR-004` | Existing source/evidence | Added to report expression library. |

결론:

- One new Board/investor benchmark row was added.
- The main product implication is report language: CEO/CFO/Board outputs should translate usage data into AI COGS, margin erosion, cost per customer, customer profitability, pricing alignment, and AI unit economics narrative.
- Next official evidence id: `GR-039`.

### Grok: competitor / adjacent product comparison

입력:

- Product comparison for Helicone, LangSmith, Langfuse, Portkey, CloudZero, Vantage, OpenMeter, Metronome, and Stripe usage-based billing.
- Comparison axes: LLM trace, token/cost tracking, customer/feature cost, pricing simulation, gross margin / AI COGS, CEO/CFO report, usage-based billing, gateway/proxy.

조치:

- Created `ai-saas-llm-cost-products-comparison-2026.md`.
- Did not add rows to Evidence Board because this is competitive positioning, not customer pain evidence.
- Updated the PRD differentiation section to link the comparison and frame the gap between observability and billing.

결론:

- Observability tools are strong upstream data sources.
- Billing tools are strong downstream monetization systems.
- The empty space is the Core Engine that turns LLM usage into feature/customer/plan margin and pricing decisions.
