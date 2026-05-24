# 토큰 시뮬레이터 작업 정리 - 2026-05-22

## 한 줄 결론

이 프로젝트는 더 이상 단순한 **LLM 비용 계산기**가 아니다.

현재 방향은 **LLM 운영 로그를 고객·기능·모델·플랜·세션 단위 원가로 재분류하고, AI SaaS의 마진과 가격정책 판단으로 연결하는 워크스페이스**다.

쉽게 말하면:

> "토큰을 얼마나 썼나?"가 아니라 "이 AI 기능을 계속 팔면 돈이 남나?"를 알려주는 도구.

## 제품 포지션

약한 포지션:

> LLM 비용 계산기

강한 포지션:

> 개발자의 LLM 운영 로그를 비즈니스 원가와 가격정책 판단으로 번역하는 AI SaaS unit economics workspace.

이 포지션이 강한 이유는 LLM 비용이 단순 운영비가 아니라 AI SaaS의 COGS, gross margin, pricing, customer profitability와 직접 연결되기 때문이다.

## 3-Layer Product Model

제품 구조는 아래 3층으로 정리했다.

```txt
Group A: Entry Point
실시간 비용/운영 문제
token spike, cache miss, quota, agent loop, provider delay
        ↓
Core Engine
비용 귀속 / 원인 분해 / 비즈니스 단위 변환
고객별, 기능별, 모델별, 플랜별, 세션별, agent-run별 비용
        ↓
Group B: Paid Value
마진/가격/수익성 의사결정
고객별 수익성, 플랜별 gross margin, heavy user 손실,
pricing simulation, CEO/CFO report
```

핵심은 Group A의 운영 문제에서 멈추지 않고, Core Engine을 통해 Group B의 유료 가치로 연결하는 것이다.

## 지금까지 한 일

### 1. UI/제품 방향 정리

- `개발자 진단`, `예산/쿼터 가드레일`, `고급 검토` 영역은 MVP 기본 흐름에서 제거하는 방향으로 정리했다.
- 해당 기능은 완전히 버리는 것이 아니라 research-gated 후보로 남겼다.
- MVP는 비용 절감 도구보다 **비용 귀속 + 마진 판단 + 가격정책 시뮬레이션** 중심으로 재정렬했다.

### 2. 리서치 원장 구축

공식 리서치 원장은 `docs/research/evidence_board.csv`다.

현재 상태:

- 공식 evidence: 38개
- 후보/검증 보류 evidence: 44개
- 다음 official evidence id: `GR-039`
- 검증 기준: URL, published date, exact quote, persona, group, pain tag
- 후보 자료는 버리지 않고 `docs/research/evidence_candidates_unverified.csv`에 보관

검증 명령:

```bash
npm run research:validate
```

현재 검증 결과:

```txt
Validated 38 evidence rows.
Top pain:
pain_margin_unknown:259
pain_heavy_user_loss:201
pain_usage_pricing_mismatch:193
```

### 3. Pain Taxonomy 재정렬

`docs/research/pain_taxonomy.md`를 3층 구조로 재분류했다.

Entry Point pain:

- `pain_cost_unpredictable`
- `pain_token_waste`
- `pain_tracking_wrong`
- `pain_limit_confusion`

Core Engine pain:

- `pain_feature_cost_unknown`
- `pain_customer_profitability_unknown`
- `pain_ai_cogs_untracked`
- `pain_provider_compare`
- `pain_quality_tradeoff`

Paid Value pain:

- `pain_margin_unknown`
- `pain_heavy_user_loss`
- `pain_usage_pricing_mismatch`
- `pain_board_reporting_gap`

MVP 핵심 pain은 아래 쪽이다.

- AI 기능이 gross margin을 얼마나 깎는지 모른다.
- heavy user가 많이 쓸수록 손해가 난다.
- 비용은 usage 기반인데 가격은 seat/flat이라 마진이 깨진다.
- 고객별/기능별/플랜별 원가가 보이지 않는다.

### 4. 온톨로지 재정렬

`docs/research/token_cost_ontology.md`를 토큰 중심에서 비즈니스 원가 중심으로 바꿨다.

기존 관점:

```txt
token usage → cost
```

현재 관점:

```txt
LLM Usage Event
→ Cost Event
→ Attribution Dimension
→ Business Cost Object
→ Margin Metric
→ Pricing Decision
```

즉 중요한 것은 토큰 수 자체가 아니라, 그 토큰 사용량이 어떤 고객, 기능, 플랜, 세션, agent run의 원가로 귀속되고 어떤 가격정책 판단으로 이어지는지다.

### 5. PRD 작성

`docs/research/ai-saas-cost-margin-prd.md`를 작성했다.

PRD 핵심:

- Primary buyer: Founder, CEO, CFO, Finance
- Primary user: AI SaaS developer, backend, ML, infra
- MVP 입력: CSV usage import
- MVP 출력: feature/customer/model/plan/session별 cost attribution
- 유료 가치: gross margin, customer profitability, pricing simulation, CEO/CFO report

MVP P0:

- CSV usage import
- usage/spike 요약
- 고객별 비용
- 기능별 비용
- 모델별 비용
- 플랜별 비용
- 세션/agent-run별 비용
- 고객별 수익성
- 플랜별 gross margin
- heavy-user 손실 탐지
- pricing / credit / overage simulation
- CEO/CFO/PM/Developer report

MVP P1:

- raw cost vs effective cost
- invoice vs internal usage reconciliation
- quality/risk 반영

MVP P2:

- SDK / Middleware
- Gateway / Proxy
- Slack/Email 알림

### 6. Grok 리서치 반영

Grok을 활용해 다음 주제로 리서치했다.

1. AI SaaS gross margin / cost per customer / usage-based pricing 사례
2. Core Engine attribution 사례
3. plan별 LLM cost / gross margin 사례
4. CFO / CEO / Board reporting 표현
5. 경쟁 제품 비교

반영 방식:

- URL, 날짜, exact quote가 확인된 것만 공식 Evidence Board에 승격
- quote가 없거나 접근 제한이 있는 것은 후보 시트로 보관
- 같은 URL/주장이 이미 있으면 중복 row를 만들지 않고 기존 `GR-*`에 연결

### 7. Core Engine 근거 강화

Core Engine attribution evidence를 추가했다.

핵심 근거:

- customer별 cost
- feature별 cost
- model별 cost
- plan별 gross margin
- session / workflow / trace / agent-run별 cost

제품적 의미:

```txt
usage event
→ request-level tagging
→ customer / feature / model / plan / session / agent-run rollup
→ unit cost and margin report
→ pricing, cap, overage, upsell, routing decision
```

이로 인해 Core Engine은 단순 집계가 아니라 **운영 로그를 비즈니스 원가로 번역하는 해석 레이어**로 정의됐다.

### 8. Plan-level margin 근거 추가

Free / Pro / Team / Enterprise plan별 LLM 비용과 gross margin 차이에 대한 근거를 추가했다.

핵심 사례:

- GitHub Copilot: heavy user가 subscription revenue보다 큰 compute cost 발생
- Cursor: $20/month plan에서 power user가 $500+ compute cost 발생
- Claude / Replit: high-cost users 때문에 pricing change와 usage cap 도입
- Stripe: usage cap, overage pricing, tier limit 권고
- BuildMVPFast: 같은 $99/month plan 안에서도 power user가 다른 고객에게 비용을 전가할 수 있음

제품적 의미:

고객별 비용만 보면 부족하다. 반드시 `plan_id`를 같이 봐야 한다.

```txt
customer_id + plan_id + feature + model
→ plan-level COGS
→ plan gross margin
→ heavy-user loss / subsidy detection
→ cap, overage, credit bundle, AI add-on, tier upgrade decision
```

### 9. CEO/CFO/Board reporting 언어 정리

`docs/research/ai-saas-cfo-ceo-board-reporting-expressions-2026.md`를 만들었다.

이 문서는 기능 명세라기보다 제품 리포트에서 쓸 표현 라이브러리다.

보고서에서 다뤄야 할 언어:

- AI COGS
- gross margin compression
- cost per customer
- customer profitability
- margin erosion
- pricing alignment
- Board reporting

리포트 방향:

- Developer report: token, model, feature, session, agent-run breakdown
- PM report: feature cost, rollout, pricing impact
- CEO/CFO report: AI COGS, gross margin, customer profitability, pricing risk
- Board-ready summary: AI unit economics, margin trend, customer concentration, plan risk

### 10. 경쟁 제품 비교

`docs/research/ai-saas-llm-cost-products-comparison-2026.md`를 만들었다.

비교 대상:

- Helicone
- LangSmith
- Langfuse
- Portkey
- CloudZero
- Vantage
- OpenMeter
- Metronome
- Stripe Usage-Based Billing

결론:

Observability 도구는 LLM trace/token/cost tracking에 강하다.

Billing 도구는 usage-based billing, credits, contracts, invoices에 강하다.

FinOps 도구는 cost allocation과 reporting에 강하다.

하지만 빈 공간은 아래다.

```txt
LLM usage / trace / bill
→ customer, feature, model, plan, session, agent-run cost attribution
→ gross margin and customer profitability
→ usage-based / credit / hybrid pricing decision
→ CEO / CFO / Board-ready explanation
```

즉 이 제품은 Helicone이나 Langfuse를 대체하는 것이 아니라, 그런 도구의 export/log를 받아 비즈니스 판단으로 바꿔주는 레이어가 되어야 한다.

## 중요한 생성/수정 파일

아래 표는 현재까지 만든 주요 파일의 **전체 파일 위치**, **파일 제목**, **어떤 파일인지**, **왜 만들었는지**를 정리한 것이다.

### 핵심 제품 문서

| 파일 제목 | 전체 파일 위치 | 어떤 파일인가 | 왜 만들었나 |
| --- | --- | --- | --- |
| PRD v0.2: AI SaaS Cost & Margin Workspace | `C:\token_simulator\docs\research\ai-saas-cost-margin-prd.md` | 제품 정의, 타깃 사용자, MVP 범위, 기능 우선순위, 리포트/시뮬레이터 요구사항을 담은 PRD | 프로젝트를 LLM 비용 계산기가 아니라 AI SaaS unit economics workspace로 재정의하기 위해 만들었다. |
| AI SaaS Cost & Margin Pain Report | `C:\token_simulator\docs\research\developer-token-cost-pain-report.md` | 리서치 결과를 바탕으로 pain, buyer, MVP 우선순위를 설명하는 보고서 | 개발자 pain과 CFO/CEO paid value를 분리하고, 제품 방향이 왜 margin/pricing 중심이어야 하는지 설명하기 위해 만들었다. |
| Pain Taxonomy | `C:\token_simulator\docs\research\pain_taxonomy.md` | pain tag를 Entry Point, Core Engine, Paid Value로 분류한 택소노미 | 많이 보이는 불만과 돈 낼 가능성이 큰 pain을 섞지 않고 관리하기 위해 만들었다. |
| Token Cost Ontology | `C:\token_simulator\docs\research\token_cost_ontology.md` | LLM usage event가 cost event, attribution dimension, business cost object, margin metric, pricing decision으로 이어지는 온톨로지 | 토큰 중심 사고를 비즈니스 원가와 가격정책 판단 구조로 바꾸기 위해 만들었다. |
| Cost Quality Decision Workspace | `C:\token_simulator\docs\cost-quality-decision-workspace.md` | 비용, 품질, 리스크, 의사결정 흐름을 설명하는 제품 방향 문서 | 단순 절감률이 아니라 raw/effective cost, 품질 리스크, 의사결정 근거를 함께 다루기 위해 만들었다. |
| README | `C:\token_simulator\README.md` | 프로젝트 첫 소개와 사용 흐름을 설명하는 대표 문서 | repo를 처음 보는 사람이 제품 포지션, MVP 흐름, 폴더 구조를 이해할 수 있게 하기 위해 업데이트했다. |

### 리서치 원장

| 파일 제목 | 전체 파일 위치 | 어떤 파일인가 | 왜 만들었나 |
| --- | --- | --- | --- |
| Evidence Board | `C:\token_simulator\docs\research\evidence_board.csv` | URL, 날짜, exact quote가 확인된 공식 evidence 원장 | 제품 주장에 사용할 수 있는 검증된 근거만 따로 관리하기 위해 만들었다. 현재 공식 evidence는 38개다. |
| Unverified Evidence Candidates | `C:\token_simulator\docs\research\evidence_candidates_unverified.csv` | quote 미확인, 접근 제한, 중복, 보류 후보를 담는 후보 시트 | Grok이나 웹에서 나온 자료를 버리지 않되, 검증 전에는 제품 주장에 쓰지 않기 위해 만들었다. |
| Business Keyword Frequency | `C:\token_simulator\docs\research\business_keyword_frequency.csv` | cost per customer, gross margin, usage-based pricing 같은 비즈니스 키워드의 evidence 수를 정리한 CSV | 많이 보이는 불만과 돈 되는 신호를 별도 축으로 추적하기 위해 만들었다. |
| Candidate Collection Log | `C:\token_simulator\docs\research\candidate-collection-log.md` | Grok/웹 리서치 후보가 어떤 `GR-*` 또는 `CAND-*`로 처리됐는지 남긴 로그 | 중복 승격을 막고, 어떤 후보가 공식 evidence로 승격/보류됐는지 추적하기 위해 만들었다. |

### 주제별 리서치 문서

| 파일 제목 | 전체 파일 위치 | 어떤 파일인가 | 왜 만들었나 |
| --- | --- | --- | --- |
| AI SaaS LLM Cost Attribution Evidence | `C:\token_simulator\docs\research\ai-saas-llm-cost-attribution-evidence-2026.md` | customer, feature, model, plan, session, workflow, agent run 단위 attribution 근거 문서 | Core Engine이 왜 필요한지 증명하기 위해 만들었다. |
| AI SaaS Plan-Level LLM Cost & Margin Evidence | `C:\token_simulator\docs\research\ai-saas-plan-llm-cost-margin-evidence-2026.md` | Free/Pro/Team/Enterprise plan별 LLM cost와 margin 차이 근거 문서 | 고객별 비용만으로는 부족하고 `plan_id` 축이 필요하다는 점을 뒷받침하기 위해 만들었다. |
| AI SaaS CFO / CEO / Board Reporting Expressions | `C:\token_simulator\docs\research\ai-saas-cfo-ceo-board-reporting-expressions-2026.md` | CEO, CFO, Board 보고서에 바로 쓸 수 있는 표현 라이브러리 | 제품 리포트가 개발자용 숫자표에 그치지 않고 의사결정자 언어로 말하게 하기 위해 만들었다. |
| AI SaaS LLM Cost / Usage / Billing / Margin Product Comparison | `C:\token_simulator\docs\research\ai-saas-llm-cost-products-comparison-2026.md` | Helicone, LangSmith, Langfuse, Portkey, CloudZero, Vantage, OpenMeter, Metronome, Stripe 비교 문서 | observability와 billing 사이의 빈 공간이 이 제품의 기회라는 포지셔닝을 검증하기 위해 만들었다. |
| AI SaaS Evidence Candidate Verification | `C:\token_simulator\docs\research\ai-saas-evidence-candidate-verification-2026-05-07.md` | 초기 Grok 후보 10개의 quote 검증 결과 문서 | Grok이 준 quote를 그대로 믿지 않고, 공식 원장에 넣을 수 있는 것과 보류할 것을 나누기 위해 만들었다. |
| Sample PM/CEO Margin Report | `C:\token_simulator\docs\research\sample-pm-ceo-margin-report.md` | PM/CEO가 볼 수 있는 샘플 margin report | 제품 리포트가 어떤 형태로 읽혀야 하는지 예시를 만들기 위해 유지한다. |

### 계획/실행 문서

| 파일 제목 | 전체 파일 위치 | 어떤 파일인가 | 왜 만들었나 |
| --- | --- | --- | --- |
| Business Signal Research Plan | `C:\token_simulator\docs\research\2026-05-05-business-signal-research-plan.md` | 돈 되는 신호와 많이 보이는 불만을 분리해서 수집하는 리서치 계획 | 빈도와 WTP를 섞지 않고 리서치하기 위해 만들었다. |
| Research Ontology Sync Plan | `C:\token_simulator\docs\research\2026-05-05-research-ontology-sync-plan.md` | Obsidian 문서, taxonomy, ontology, MVP 방향을 싱크하는 계획 | 여러 md에 흩어진 제품 방향을 repo 공식 문서와 맞추기 위해 만들었다. |
| MVP Research Collection Checklist | `C:\token_simulator\docs\research\mvp-research-collection-checklist.md` | evidence 수집과 검증 체크리스트 | 리서치를 반복 가능한 작업으로 만들기 위해 만들었다. |
| MVP WTP Interview Guide | `C:\token_simulator\docs\research\mvp-wtp-interview-guide.md` | 구매 의향과 실제 pain을 검증하기 위한 인터뷰 질문지 | “좋네요” 수준의 반응이 아니라 실제 돈 낼 신호를 확인하기 위해 만들었다. |
| Research / Ontology / MVP Alignment Plan | `C:\token_simulator\docs\superpowers\plans\2026-05-07-research-ontology-mvp-alignment.md` | 3-Layer Product Model에 맞춰 PRD, ontology, taxonomy, README를 정렬하는 실행 계획 | 문서 정렬 작업을 임시 판단이 아니라 실행 가능한 plan으로 남기기 위해 만들었다. |

### 검증 스크립트

| 파일 제목 | 전체 파일 위치 | 어떤 파일인가 | 왜 만들었나 |
| --- | --- | --- | --- |
| Evidence Board Validator | `C:\token_simulator\scripts\research\validate-evidence-board.mjs` | `evidence_board.csv`의 컬럼, pain tag, 점수, quote 상태를 검증하는 Node 스크립트 | 공식 evidence 원장이 깨지지 않게 하고 Top Pain을 자동 계산하기 위해 만들었다. |

### 현재 정리 파일

| 파일 제목 | 전체 파일 위치 | 어떤 파일인가 | 왜 만들었나 |
| --- | --- | --- | --- |
| 토큰 시뮬레이터 작업 정리 - 2026-05-22 | `C:\token_simulator\docs\research\2026-05-22-token-simulator-work-summary.md` | 지금까지의 작업, 제품 방향, 리서치 결과, 주요 파일, 다음 액션을 한 번에 정리한 요약 문서 | 대화와 여러 md/csv에 흩어진 내용을 한 곳에서 다시 볼 수 있게 하기 위해 만들었다. |

## 현재 MVP 방향

MVP는 아래 흐름으로 가는 것이 맞다.

```txt
1. 사용량 가져오기
CSV upload / paste / sample data

2. 운영 문제 요약
token spike, cache miss, quota, agent loop 후보

3. 비용 귀속
고객별 / 기능별 / 모델별 / 플랜별 / 세션별 / agent-run별

4. 마진 분석
고객별 수익성 / 플랜별 gross margin / heavy-user 손실

5. 가격 시뮬레이션
usage-based / credit / hybrid / cap / overage

6. 보고서 출력
CEO/CFO / PM / Developer
```

## CSV 권장 스키마

필수 컬럼:

```csv
timestamp,feature,model,input_tokens,output_tokens
```

권장 컬럼:

```csv
request_id,customer_id,plan_id,session_id,agent_run_id,total_cost,latency_ms,status
```

전체 권장 스키마:

```csv
timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status
```

중요한 점:

- 토큰량은 사용자가 추측하게 하면 안 된다.
- 가능한 한 provider usage log, API response, gateway export, observability export에서 가져와야 한다.
- 사용자가 직접 입력해야 하는 것은 business denominator다.
  - 월 고객 문의 수
  - 월 리포트 생성 수
  - 월 유료 고객 수
  - 월 workflow/job 실행 수

## 다음 액션

### 1. Evidence 50개까지 확장

현재 공식 evidence는 38개다. 다음은 `GR-039`부터 50개까지 확장한다.

우선 더 모을 키워드:

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

### 2. MVP UI에 3층 구조 반영

문서 구조는 정리됐다. 다음은 실제 UI 흐름을 이 구조로 맞추는 것이다.

- Entry Point: usage/spike summary
- Core Engine: attribution tables
- Paid Value: margin/pricing/report

### 3. Report Output 강화

리포트는 단순 export가 아니라 decision narrative여야 한다.

우선순위:

- CEO/CFO 1-pager
- PM feature cost report
- Developer breakdown
- Board-ready summary

### 4. Pricing Simulator 강화

high-WTP pain 대부분은 what-if 질문으로 이어진다.

필요한 시뮬레이션:

- flat pricing 유지
- usage-based pricing 전환
- credit bundle
- overage pricing
- usage cap
- AI add-on
- tier upgrade

### 5. 인터뷰에서 확인할 질문

가장 중요한 질문:

- 고객별 AI 원가를 알고 있나요?
- heavy user 때문에 손해 본 적 있나요?
- AI 기능별 gross margin을 보나요?
- usage-based pricing이나 credit pricing을 고민 중인가요?
- 이 숫자를 CEO/CFO/투자자에게 보고해야 하나요?
- 지금은 이 계산을 spreadsheet, SQL, 감으로 하고 있나요?
- 이 리포트를 매주 받으면 누구에게 공유하나요?

## 검증 상태

마지막으로 확인한 명령:

```bash
npm run research:validate
```

결과:

```txt
Validated 38 evidence rows.
Top pain: pain_margin_unknown:259, pain_heavy_user_loss:201, pain_usage_pricing_mismatch:193
```

이 문서는 지금까지의 제품 방향, 리서치 원장, 온톨로지, 경쟁 분석, MVP 우선순위를 한 번에 보기 위한 요약본이다.
