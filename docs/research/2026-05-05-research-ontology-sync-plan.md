# Research Ontology Sync Plan

**Goal:** Obsidian 제품 정의와 repo research 문서를 같은 방향으로 맞추고, 50개 evidence 확장 전에 taxonomy 분류 기준을 고정한다.

## 현재 판정

방향성은 맞다. 모든 문서가 같은 흐름을 말한다.

```text
Evidence Board -> Pain Taxonomy -> Product Ontology -> MVP Feature
```

다만 repo 문서는 Obsidian 문서보다 압축되어 있었고, 제품 정의의 핵심인 "AI 기능의 원가·마진·가격정책" 축이 taxonomy에서 덜 강조되어 있었다.

## 싱크 기준

1. 제품 정의의 중심 pain은 `pain_margin_unknown`, `pain_quality_tradeoff`, `pain_provider_compare`, `pain_cost_unpredictable`이다.
2. `pain_tracking_wrong`은 중요하지만 제품의 최종 가치라기보다 신뢰도와 데이터 수집의 전제다.
3. `pain_team_budget`은 알림/가드레일 후보지만, MVP 기본 UI 복귀는 50개 evidence 이후로 미룬다.
4. `pain_token_waste`와 `pain_limit_confusion`은 개발자 불만이 크지만 B2B 구매 신호를 더 확인해야 한다.

## 다음 40개 evidence 수집 기준

현재 10개 pilot은 developer tooling과 tracking bug에 치우쳐 있다. 다음 evidence는 아래 표현이 있는 글을 우선 수집한다.

- cost per customer
- gross margin
- usage-based pricing
- AI SaaS margin
- PM, CEO, Finance, CFO

보조 키워드는 아래처럼 둔다.

- cost per report
- cost per request
- customer usage
- production cost
- pricing decision
- cost per user
- unit economics
- effective margin

## Business Keyword Frequency Tracking

중요: 위 키워드는 일반 개발자 불만보다 빈도가 낮을 수 있다. 그래서 `frequency_signal`과 별도로 기록한다.

- `frequency_signal`: 개별 evidence의 반복/공감/업보트/이슈 중요도 신호다.
- `business_keyword_frequency`: 특정 business keyword가 후보군에서 얼마나 자주 보였는지 따로 세는 값이다.
- `accepted_evidence_count`: 실제 `evidence_board.csv`에 채택한 evidence 수다.

이 세 값은 서로 다르다. 예를 들어 `usage limit` 불만은 많이 보일 수 있지만 WTP가 낮을 수 있고, `gross margin`은 적게 보여도 구매 신호가 높을 수 있다.

다음 리서치부터는 [business_keyword_frequency.csv](business_keyword_frequency.csv)를 같이 업데이트한다.

| keyword_group | 목적 | 목표 채택 수 | 빈도 해석 |
| --- | --- | ---: | --- |
| `cost_per_customer` | 고객 1명당 AI 원가 pain 검증 | 6 | 적게 보여도 PM/Finance 맥락이면 강한 신호 |
| `gross_margin` | AI 기능이 팔수록 돈이 되는지 검증 | 6 | 빈도보다 WTP가 중요 |
| `usage_based_pricing` | 종량제 과금 전환 pain 검증 | 6 | pricing/plan 문맥이면 우선 채택 |
| `ai_saas_margin` | AI SaaS 원가율/마진 구조 검증 | 6 | SaaS founder/CEO 맥락 우선 |
| `pm_ceo_finance` | 보고서 구매자 언어 검증 | 6 | PM/CEO/Finance 공유 니즈가 있으면 강한 신호 |

## 분류 규칙 보정

- `pain_margin_unknown`: 단순 월 사용액 공유에는 붙이지 않는다. 기능/고객/보고서/job 단위 원가나 판매 가격 대비 마진이 있어야 한다.
- `pain_team_budget`: 개인 한도 불만에는 붙이지 않는다. team, customer, project, API key, enterprise budget 맥락이 있어야 한다.
- `pain_quality_tradeoff`: "싼 모델이 별로다"가 아니라 retry, human review, CS escalation, effective margin이 연결될 때 붙인다.
- `pain_tracking_wrong`: billing console, provider usage, cache token, proxy log와 숫자가 맞지 않을 때 붙인다.

## MVP 반영 계획

### P0 유지

- CSV usage import
- 기능별 비용 Top 분석
- 비즈니스 단위 원가
- 기능별 판매가와 gross margin
- raw cost vs effective cost
- PM/CEO/개발자용 보고서

### P1 보류

- provider별 가격표 override
- usage/billing reconciliation
- customer/key별 비용 분석

### P2 또는 archive 유지

- 예산/쿼터 가드레일
- 개발자 진단 화면
- quota/session limit explainer
- ontology 화면

## 다음 실행 순서

- [ ] HN/GitHub 자동 후보 수집 스크립트로 margin/pricing 키워드 후보를 뽑는다.
- [ ] Reddit은 수동으로 usage-based pricing, AI SaaS margin, cost per user 키워드를 본다.
- [ ] EV-011부터 EV-050까지 evidence를 추가한다.
- [ ] `npm run research:validate`로 점수와 태그 규칙을 검증한다.
- [ ] Top Pain 10과 MVP P0/P1/P2를 다시 산출한다.
- [ ] 제품 정의 문구와 README를 50개 evidence 결과에 맞춰 갱신한다.
