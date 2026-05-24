# MVP Research Collection Checklist

**Purpose:** 다음 40개 evidence를 모을 때 "많이 보이는 불만"과 "적게 보여도 돈 되는 신호"를 섞지 않기 위한 수집 체크리스트다.

## 1. 수집 전 원칙

- 새 pain tag를 만들지 않는다. 새 태그가 필요하면 먼저 [pain_taxonomy.md](pain_taxonomy.md)와 validator의 허용 태그를 같이 업데이트한다.
- evidence마다 `pain_tag`는 1~3개만 붙인다.
- 개인 구독/한도 불만과 팀/제품/마진 문제를 분리한다.
- `frequency_signal`과 `business_keyword_frequency`를 섞지 않는다.
- `pain_margin_unknown`은 기능/고객/보고서/job 단위 원가나 판매 가격 대비 마진이 있을 때만 붙인다.
- URL/날짜/quote가 모두 확인된 row만 [evidence_board.csv](evidence_board.csv)에 넣는다.
- quote가 없거나 직접 검증하지 못한 후보, 중복 후보, Group C 내부 도구 후보는 [evidence_candidates_unverified.csv](evidence_candidates_unverified.csv)에 보관한다.

## 2. Stream A: 많이 보이는 불만

**목표:** 다음 40개 중 최대 16개만 채택한다.

| 확인 항목 | 기준 |
| --- | --- |
| 주요 키워드 | usage limit, session limit, token cost, burning tokens, wrong token count, cost tracking, provider cost |
| 좋은 evidence | 반복 불만, 다수 공감, GitHub issue에서 여러 사용자가 재현 |
| 낮은 WTP 신호 | my plan, personal subscription, hobby, too expensive for me |
| MVP 연결 | CSV import, 비용 추적 신뢰도, provider 비교, 캐시/출력 절감 설명 |

## 3. Stream B: 적게 보여도 돈 되는 신호

**목표:** 다음 40개 중 최소 24개를 채택한다.

| keyword_group | 핵심 키워드 | 목표 채택 수 | 우선 채택 조건 |
| --- | --- | ---: | --- |
| `cost_per_customer` | cost per customer, cost per user, customer usage | 5 | 고객별 원가/손익/usage가 언급됨 |
| `gross_margin` | gross margin, margin, effective margin | 5 | 판매가 대비 원가/마진이 언급됨 |
| `usage_based_pricing` | usage-based pricing, metered billing, usage based billing | 5 | 요금제/가격정책/종량제 전환이 언급됨 |
| `ai_saas_margin` | AI SaaS margin, LLM unit economics, AI feature pricing | 5 | AI SaaS의 원가율/가격 설계가 언급됨 |
| `pm_ceo_finance` | PM, CEO, Finance, CFO, board report | 4 | 개발자가 아닌 의사결정자에게 공유해야 함 |

## 4. Evidence 채택 체크

아래 중 2개 이상이면 강한 채택 후보다.

- customer, production, pricing, margin, finance, PM, CEO, CFO가 명시됨
- 현재 스프레드시트, SQL, 수동 계산, 로그 export로 해결 중
- 고객/기능/보고서/job 단위 원가가 등장함
- usage-based billing, plan design, gross margin, pricing decision과 연결됨
- 알림을 받은 뒤 action이 명확함: 모델 교체, rate limit, 고객 연락, plan 변경, budget cap

## 5. Evidence 입력 순서

1. 후보를 찾는다.
2. 원문 링크와 날짜를 확인한다.
3. `exact_quote`는 짧게 보존한다.
4. `summary_ko`는 한국어로 쉽게 쓴다.
5. persona를 붙인다: solo dev, startup CTO, PM, infra engineer, finance/ops 등.
6. group을 붙인다: `A`, `B`, `A+B`.
7. `pain_tag`를 1~3개만 붙인다.
8. `frequency_signal`, `wtp_score`를 1~5로 입력한다.
9. `evidence_strength`를 `low`, `medium`, `high` 중 하나로 입력한다.
10. `quote_verified`를 `true`, `false`, `pending` 중 하나로 입력한다.
11. business keyword 후보 수와 채택 수를 `business_keyword_frequency.csv`에 업데이트한다.
12. `npm run research:validate`로 CSV 계약을 검증한다.

## 6. 후보 시트 사용 규칙

공식 Evidence Board는 제품 주장에 쓸 수 있는 검증 원장이다. 후보 시트는 버리기 아까운 리서치 재료를 보관하는 곳이다.

| 시트 | 사용 기준 | 제품 주장 사용 가능 여부 |
| --- | --- | --- |
| `evidence_board.csv` | URL, 날짜, quote가 확인됨 | 가능 |
| `evidence_candidates_unverified.csv` | quote 없음, 접근 제한, 중복, off-domain, Group C 후보 | 불가. 재검증 후 승격 필요 |

후보를 공식 원장으로 승격할 때는 `candidate_id`를 `GR-*`로 새로 부여하고, `quote_status`가 아니라 `quote_verified=true/false/pending` 규칙을 따른다.

## 7. 50개 이후 판정

아래 빈칸을 채울 수 있어야 한다.

```text
많이 보이는 불만은 _______였다.
하지만 돈 되는 신호는 _______에서 더 강했다.
그래서 MVP 1은 _______로 유지/수정한다.
다음에 만들 기능은 _______이고, 만들지 않을 기능은 _______이다.
```
