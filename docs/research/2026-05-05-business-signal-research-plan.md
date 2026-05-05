# Business Signal Research Plan

**Goal:** MVP를 만들기 전에 지금까지 생산한 제품/리서치 문서를 기준으로, "많이 보이는 불만"과 "적게 보여도 돈 되는 신호"를 분리해서 검증한다.

**결론:** MVP 방향은 유지한다. 다만 기능을 더 늘리지 않고 `CSV usage import -> 기능별 원가 -> 비즈니스 단위 원가 -> gross margin -> PM/CEO/개발자 리포트`로 좁힌다. 다음 리서치는 이 방향에 실제 구매 신호가 있는지 확인하는 데 집중한다.

---

## 1. 전수 조사 범위

이번 계획은 아래 문서를 기준으로 세웠다.

| 문서 | 역할 | 확인한 결론 |
| --- | --- | --- |
| `README.md` | 현재 제품 정의와 구현 상태 | 토큰 계산기가 아니라 AI 기능 원가/마진 의사결정 도구로 정의되어 있다. |
| `docs/cost-quality-decision-workspace.md` | cost-quality-risk UX 계획 | 싼 모델 추천만으로는 위험하며 quality/risk/effective cost가 필요하다. |
| `PLAN.md` | developer-first decision workspace 계획 | 기능 갤러리가 아니라 의사결정 흐름을 좁혀야 한다. |
| `docs/architecture/folder-structure.md` | MVP 구조와 archive 기준 | guardrails/developer diagnostics는 research-gated로 보류되어 있다. |
| `docs/research/pain_taxonomy.md` | pain 분류 기준 | `pain_margin_unknown`, `pain_quality_tradeoff`, `pain_provider_compare`, `pain_cost_unpredictable`이 제품 정의상 핵심이다. |
| `docs/research/token_cost_ontology.md` | Evidence -> Pain -> Feature 연결 | 제품은 Evidence를 PM/CEO/개발자 리포트로 변환하는 구조다. |
| `docs/research/developer-token-cost-pain-report.md` | 10개 pilot 결과 | 현재 pilot은 tracking/cost bug에 치우쳐 있고 margin/pricing evidence가 부족하다. |
| `docs/research/2026-05-05-research-ontology-sync-plan.md` | repo/Obsidian 싱크 계획 | 다음 40개 evidence는 business keyword를 의도적으로 모아야 한다. |
| `docs/research/business_keyword_frequency.csv` | business keyword 빈도표 | business keyword 빈도는 evidence별 `frequency_signal`과 분리해야 한다. |
| Obsidian 제품 정의/핵심/프로토콜/온톨로지 문서 | 기획 원본 | 최종 포지션은 "AI 기능의 원가·마진·가격정책을 해석해주는 도구"다. |

## 2. 현재까지 얻은 결론

### 2.1 방향성은 맞다

모든 문서는 같은 방향을 말한다.

```text
Evidence Board
-> Pain Taxonomy
-> Product Ontology
-> MVP Feature
```

MVP는 "토큰 수 입력 계산기"가 아니라 아래 질문에 답해야 한다.

- 어떤 기능이 비용을 가장 많이 쓰는가?
- 고객/보고서/문의/job 1개당 AI 원가는 얼마인가?
- 판매 가격 대비 gross margin은 남는가?
- 싼 모델로 바꾸면 raw cost만 줄고 effective cost는 늘지 않는가?
- PM/CEO/Finance에게 바로 설명할 수 있는가?

### 2.2 현재 evidence는 치우쳐 있다

10개 pilot의 Top Pain은 아래와 같다.

```text
pain_tracking_wrong: 286
pain_cost_unpredictable: 180
pain_provider_compare: 124
```

이 결과는 개발자 도구와 usage/cost tracking 문제를 잘 보여준다. 하지만 제품 정의의 가장 돈 되는 축인 `cost per customer`, `gross margin`, `usage-based pricing`, `AI SaaS margin`, `PM/CEO/Finance` evidence는 아직 부족하다.

### 2.3 그래서 리서치 표본을 두 갈래로 나눠야 한다

많이 보이는 불만은 제품 진입점이 될 수 있다. 하지만 돈 내는 이유는 아닐 수 있다.

적게 보이는 business signal은 빈도는 낮아도 구매 이유가 될 수 있다.

따라서 다음 리서치는 하나의 빈도표로 섞지 않는다.

## 3. 두 갈래 리서치 프레임

### Stream A. 많이 보이는 불만

목적: 개발자들이 실제로 자주 겪는 표면 pain을 확인한다.

예시 키워드:

- usage limit
- session limit
- token cost
- burning tokens
- wrong token count
- cost tracking
- provider cost
- prompt caching bug

기록 위치:

- `docs/research/evidence_board.csv`

평가 기준:

- `frequency_signal`
- `severity`
- `pain_tag`
- `possible_feature`

주의:

- 개인 플랜 불만은 많아도 `wtp_score`를 낮게 둔다.
- 이 stream이 많다고 해서 바로 MVP 핵심으로 올리지 않는다.
- 최대 채택량을 제한한다. 다음 40개 중 16개까지만 Stream A로 채운다.

### Stream B. 적게 보여도 돈 되는 신호

목적: 실제 구매 가능성이 있는 B2B pain을 확인한다.

핵심 키워드:

- cost per customer
- gross margin
- usage-based pricing
- AI SaaS margin
- PM / CEO / Finance / CFO

보조 키워드:

- cost per report
- cost per request
- cost per user
- unit economics
- pricing decision
- customer usage
- production cost
- effective margin

기록 위치:

- `docs/research/evidence_board.csv`
- `docs/research/business_keyword_frequency.csv`

평가 기준:

- `wtp_score`
- buyer persona
- business metric 명확성
- 리포트 공유 대상
- pricing/margin/action 가능성

주의:

- 빈도가 낮아도 버리지 않는다.
- PM/CEO/Finance, customer, production, margin 맥락이 있으면 우선 채택한다.
- 다음 40개 중 최소 24개는 Stream B로 채운다.

## 4. 빈도 표시 분리 규칙

### 4.1 Evidence frequency

`frequency_signal`은 개별 evidence가 얼마나 반복/공감/업보트/이슈화되었는지 나타낸다.

예:

```text
usage limit 불만이 Reddit에서 여러 번 반복됨 -> frequency_signal 높음
GitHub issue에서 billing mismatch가 여러 사람이 확인함 -> frequency_signal 높음
```

### 4.2 Business keyword frequency

`business_keyword_frequency.csv`는 business keyword 후보가 검색 과정에서 얼마나 보였는지 따로 기록한다.

예:

```text
gross margin 후보 3개 발견, 그중 2개 채택
cost per customer 후보 5개 발견, 그중 4개 채택
usage-based pricing 후보 12개 발견, 그중 6개 채택
```

### 4.3 비교 방식

두 stream은 같은 방식으로 비교하지 않는다.

| 항목 | 많이 보이는 불만 | 돈 되는 신호 |
| --- | --- | --- |
| 핵심 질문 | 자주 보이는가? | 돈 낼 이유가 되는가? |
| 중요 지표 | `frequency_signal` | `wtp_score`, buyer persona |
| 좋은 evidence | 반복 불만, 다수 공감 | 가격/마진/고객/예산 의사결정 |
| 위험 | 개인 불만에 끌려감 | 표본이 적어서 과해석 |
| MVP 반영 | 진입점/설명 보강 | 핵심 기능/가격 검증 |

## 5. 다음 40개 Evidence 수집 설계

현재 EV-001~EV-010은 pilot이다. 다음은 EV-011~EV-050까지 채운다.

| 구분 | 목표 채택 수 | 목적 |
| --- | ---: | --- |
| Stream A: 많이 보이는 불만 | 16 | 제품 진입점과 개발자 pain 확인 |
| Stream B: 돈 되는 신호 | 24 | 구매 가능성과 MVP 핵심 가치 확인 |
| 합계 | 40 | 50개 v1 evidence 완성 |

Stream B 안에서는 아래 목표를 둔다.

| keyword_group | 목표 채택 수 | 핵심 pain |
| --- | ---: | --- |
| `cost_per_customer` | 5 | `pain_margin_unknown` |
| `gross_margin` | 5 | `pain_margin_unknown` |
| `usage_based_pricing` | 5 | `pain_margin_unknown`, `pain_cost_unpredictable` |
| `ai_saas_margin` | 5 | `pain_margin_unknown`, `pain_quality_tradeoff` |
| `pm_ceo_finance` | 4 | `pain_margin_unknown`, `pain_team_budget` |

## 6. 채택 기준

### 강한 채택

아래 중 2개 이상 있으면 우선 채택한다.

- customer, production, pricing, margin, finance, PM, CEO, CFO가 명시됨
- 현재 스프레드시트/SQL/수동 계산으로 처리 중
- 특정 고객/기능/리포트/job 단위 원가를 말함
- 가격정책, gross margin, plan design, usage-based billing과 연결됨
- 팀 예산 또는 고객별 비용 폭증에 대한 action이 있음

### 약한 채택

아래는 수집하되 낮은 점수로 둔다.

- 개인 구독 한도 불만
- 그냥 비싸다는 감정적 불평
- 모델 취향 논쟁
- quota가 불편하다는 말만 있고 business metric이 없음

## 7. MVP 판단 게이트

50개 evidence 이후 아래 게이트로 판단한다.

### Gate 1. 원가/마진 리포트 MVP 유지

다음 조건 중 2개 이상이면 현재 MVP 방향을 계속 밀고 간다.

- `pain_margin_unknown`이 Top 5 안에 들어온다.
- `pain_quality_tradeoff`가 Top 5 안에 들어온다.
- Stream B evidence가 20개 이상 채택된다.
- `pm_ceo_finance` evidence가 4개 이상 채택된다.
- business keyword evidence의 평균 `wtp_score >= 4`다.

### Gate 2. 개발자 사용량 검증 도구로 보정

다음 조건이면 MVP 문구를 일부 조정한다.

- `pain_tracking_wrong`이 압도적 1위다.
- `pain_margin_unknown` evidence가 5개 미만이다.
- 대부분의 강한 evidence가 LiteLLM/Langfuse/Helicone 같은 infra tool issue다.

이 경우 제품 문장은 아래처럼 바꾼다.

```text
LLM usage log와 billing 숫자를 검증하고, 기능별 원가 리포트로 변환하는 도구
```

### Gate 3. Guardrails 재검토

다음 조건이면 archive의 예산/쿼터 가드레일을 다시 검토한다.

- `pain_team_budget` 또는 `pain_cost_unpredictable`이 Top 3다.
- 해당 evidence 평균 `wtp_score >= 4`다.
- 알림 이후 action이 명확하다: rate limit, 모델 교체, 고객 연락, plan 변경, budget cap.

## 8. 7일 실행 계획

### Day 1. 문서 기준 고정

- `pain_taxonomy.md`의 포함/제외 기준을 읽고 태그를 고정한다.
- `business_keyword_frequency.csv`의 5개 keyword group을 유지한다.
- 새 태그를 만들지 않는다.

산출물:

- 수집 체크리스트 1장
- 검색 키워드 목록 확정

### Day 2. HN 후보 수집

명령:

```bash
npm run research:hn -- "gross margin AI SaaS" 20
npm run research:hn -- "usage based pricing LLM" 20
npm run research:hn -- "cost per customer LLM" 20
```

작업:

- 후보 수를 `business_keyword_frequency.csv`에 기록한다.
- 채택할 evidence만 `evidence_board.csv`에 넣는다.

목표:

- Stream B 8개 채택

### Day 3. GitHub 후보 수집

명령:

```bash
npm run research:github -- "LLM cost per customer" 20
npm run research:github -- "usage based pricing AI SaaS" 20
npm run research:github -- "gross margin LLM" 20
```

작업:

- Langfuse, LiteLLM, Helicone, Portkey, OpenMeter, Stripe usage-based billing 주변 issue/discussion을 본다.
- 단순 tracking bug와 pricing/margin issue를 분리한다.

목표:

- Stream A 5개
- Stream B 7개

### Day 4. Reddit 수동 수집

검색 대상:

- `r/SaaS`
- `r/startups`
- `r/ExperiencedDevs`
- `r/ClaudeCode`
- `r/OpenAI`
- `r/LocalLLaMA`

검색어:

```text
AI SaaS margin
LLM unit economics
usage based pricing AI
cost per user LLM
gross margin AI
AI feature pricing
```

목표:

- Stream A 6개
- Stream B 6개

### Day 5. 분류와 점수화

작업:

- pain_tag 1~3개만 부여
- `severity`, `frequency_signal`, `wtp_score` 입력
- business keyword 후보/채택 수 업데이트
- 개인 불만과 B2B signal 분리

검증:

```bash
npm run research:validate
```

### Day 6. Top Pain과 MVP 게이트 판정

산출물:

- Top Pain 10
- Stream A Top 5
- Stream B Top 5
- MVP P0/P1/P2 재정렬

판정:

- 원가/마진 리포트 유지
- usage/billing 검증 도구로 보정
- guardrails 재검토

### Day 7. 샘플 리포트와 인터뷰 준비

산출물:

- Developer Token Cost Pain Report v1
- PM/CEO용 1-page 샘플 원가/마진 리포트
- 인터뷰 질문지

핵심 질문:

```text
이 리포트를 보고 가격정책, 고객별 마진, 모델 교체 결정을 할 수 있는가?
이걸 매주/매월 자동으로 받으면 돈을 낼 이유가 있는가?
```

## 9. MVP 실행 계획

리서치 중에도 MVP 구현 방향은 유지한다. 다만 새 기능 확장은 멈춘다.

### 지금 유지할 P0

- CSV usage import
- 기능별 비용 Top 분석
- 비즈니스 단위 원가
- 기능별 판매가와 gross margin
- raw cost vs effective cost
- PM/CEO/개발자용 보고서

### 아직 만들지 않을 것

- 예산/쿼터 가드레일
- 개발자 진단 화면
- Gateway/Proxy
- Jarvis형 assistant
- ontology 화면
- anomaly detection

### 리서치 결과에 따라 바꿀 것

- `pain_margin_unknown`이 강하면: 원가/마진 리포트 포지션 강화
- `pain_tracking_wrong`이 강하면: usage/billing reconciliation 문구 추가
- `pain_team_budget`이 강하면: guardrails 복귀 검토
- business signal이 약하면: MVP를 "무료/포트폴리오/컨설팅 리포트"로 낮춰 검증

## 10. 성공 기준

아래 중 3개 이상이면 MVP를 계속 밀고 간다.

- Stream B evidence가 20개 이상 채택된다.
- `pain_margin_unknown`이 Top 5 안에 들어온다.
- business keyword evidence 평균 `wtp_score >= 4`다.
- PM/CEO/Finance 공유 니즈 evidence가 4개 이상이다.
- 실제 로그 분석 요청 또는 "우리 데이터로 해볼 수 있나" 반응이 2개 이상 나온다.

아래가 나오면 방향을 줄인다.

- 대부분 개인 플랜/한도 불만뿐이다.
- margin/pricing evidence가 5개 미만이다.
- 리포트 공유 대상이 없다.
- 이미 기존 observability 도구로 충분하다는 반응이 대부분이다.

## 11. 최종 판단 문장

이 리서치가 끝나면 아래 빈칸을 채울 수 있어야 한다.

```text
많이 보이는 불만은 _______였다.
하지만 돈 되는 신호는 _______에서 더 강했다.
그래서 MVP 1은 _______로 유지/수정한다.
다음에 만들 기능은 _______이고, 만들지 않을 기능은 _______이다.
```
