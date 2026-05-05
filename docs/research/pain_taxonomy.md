# Token Cost Pain Taxonomy

이 문서는 `docs/research/evidence_board.csv`의 `pain_tag` 기준표다. Pilot 단계에서는 아래 8개 태그만 사용하고, 새 태그는 50개 evidence 확장 전까지 추가하지 않는다.

## 제품 정의와 분류 원칙

제품 정의는 "AI 기능의 LLM 사용량을 기능별 원가, 비즈니스 단위 마진, 비용 리스크로 바꿔주는 도구"다. 그래서 taxonomy도 단순 개인 불만이 아니라 제품 의사결정에 연결되는 pain을 우선한다.

분류할 때는 다음 순서로 판단한다.

1. 이 evidence가 개인 구독/한도 불만인가, 제품/팀/고객/마진 문제인가?
2. 실제 비용 단위가 무엇인가: token, request, feature, customer, report, job.
3. 구매 신호가 있는가: team, budget, production, customer, pricing, finance, margin.
4. 현재 MVP가 바로 해결할 수 있는가, 아니면 research-gated 후보인가?

## 태그

| pain_tag | 정의 | 포함되는 말 | 제외되는 말 | MVP 연결 |
| --- | --- | --- | --- | --- |
| `pain_cost_unpredictable` | 월말/주간/세션/팀 단위 AI 비용이 언제, 왜 튀는지 예측하기 어렵다. | cost spike, burn rate, 예상보다 큰 월 비용, 갑작스러운 사용량 증가 | 단순히 "비싸다"는 감정적 불평 | 월 비용, 기능별 비용 Top, 비용 변화 시뮬레이션 |
| `pain_tracking_wrong` | 사용량/비용 추적 도구의 숫자가 실제 과금, cache, quota와 맞지 않는다. | wrong token count, incorrect cost, billing console과 불일치, usage 누락 | 가격이 비싸다는 의견만 있는 경우 | CSV import, provider별 가격 출처, 계산 검증 |
| `pain_token_waste` | 불필요한 context, tool output, 반복 실행, 긴 출력 때문에 토큰이 낭비된다. | repeated context, file reread, long output, cache miss, tool output 누적 | 정상적으로 큰 작업이라 비용이 큰 경우 | 입력/출력 비용 분해, 출력 제한, 기능별 라우팅 |
| `pain_provider_compare` | provider/model마다 가격 구조, cache/batch 할인, 품질이 달라 비교가 어렵다. | provider cost, model pricing, cache hit/miss 차이, 모델 교체 고민 | 특정 모델 취향 또는 성능 선호만 있는 경우 | 현재 모델 vs 후보 모델 비교, 캐시/배치 조건 표시 |
| `pain_margin_unknown` | 기능/고객/요청/보고서/job 단위 원가와 판매 가격 대비 마진을 모른다. | cost per customer, cost per report, gross margin, AI SaaS margin, pricing | 개인 구독료 불만, 단순 월 사용액 공유 | 비즈니스 단위 원가, 기능별 판매가, gross margin |
| `pain_quality_tradeoff` | 싼 모델로 바꾸면 재시도, 사람 검수, CS 이관 비용 때문에 실제 원가가 다시 올라갈 수 있다. | retry, human review, CS escalation, quality drop, effective margin | 단순 모델 취향, 벤치마크 점수만 있는 경우 | raw cost vs effective cost, risk와 함께 보는 절감 추천 |
| `pain_limit_confusion` | quota, rate limit, usage limit 숫자가 실제 체감과 맞지 않거나 설명이 부족하다. | session limit, usage cap, quota reset, local tracker와 provider quota 불일치 | API 단가 비교, 팀 예산 문제 | 현재는 문서 evidence만 축적, UI 재도입 보류 |
| `pain_team_budget` | 팀/고객/프로젝트/API key별 예산과 비용 폭증을 늦게 알아차린다. | team budget, customer spend, project budget, virtual key, budget exceeded | 개인 플랜 한도 불만 | 현재는 archive 보관, Top pain 검증 후 guardrails 재도입 |

## 제품 정의 기준 우선순위

| 우선순위 | pain | 이유 |
| --- | --- | --- |
| P0 | `pain_margin_unknown` | 제품 정의의 중심이다. "얼마에 팔아야 손해를 안 보는가"에 직접 연결된다. |
| P0 | `pain_quality_tradeoff` | 싼 모델 추천의 위험을 막아준다. raw cost와 effective cost를 나누는 이유다. |
| P0 | `pain_provider_compare` | 현재 모델 vs 후보 모델 비교와 절감 시뮬레이션의 기본 pain이다. |
| P0 | `pain_cost_unpredictable` | 기능별 비용 Top과 월 비용 시뮬레이션의 직접 근거다. |
| P1 | `pain_tracking_wrong` | 제품 신뢰도의 전제다. 다만 "개발자 진단" 화면보다 CSV/계산 검증으로 먼저 해결한다. |
| P1 | `pain_team_budget` | 알림/가드레일 후보지만 MVP 기본 UI에서는 보류한다. |
| P2 | `pain_token_waste` | 개발자 진단 후보지만 50개 evidence 후 별도 기능으로 판단한다. |
| P2 | `pain_limit_confusion` | 불만은 크지만 provider quota 자체를 해결할 수 있는지는 더 검증해야 한다. |

## 점수 규칙

- `severity`: 사용자의 업무/비용 의사결정에 주는 영향. 1은 사소함, 5는 서비스 운영 또는 마진에 직접 영향.
- `frequency_signal`: 같은 유형의 문제가 반복적으로 보이는 정도. 1은 단일 사례, 5는 여러 커뮤니티/도구에서 반복.
- `wtp_score`: 돈을 낼 가능성. 1은 불만 표출, 5는 이미 도구/내부 작업/예산을 쓰는 강한 신호.
- `opportunity_score = severity * frequency_signal * wtp_score`

## 빈도 표시 분리

다음 리서치에서는 `cost per customer`, `gross margin`, `usage-based pricing`, `AI SaaS margin`, `PM/CEO/Finance` 키워드를 의도적으로 더 찾는다. 하지만 이 키워드들은 일반적인 usage limit 불만보다 빈도가 낮을 수 있다.

그래서 빈도는 두 층으로 나눈다.

| 빈도 필드 | 의미 | 어디에 기록하는가 |
| --- | --- | --- |
| `frequency_signal` | 개별 evidence가 얼마나 반복/공감/업보트/이슈화되었는지 | `evidence_board.csv` |
| `business_keyword_frequency` | business keyword 후보가 검색/후보군에서 얼마나 자주 보였는지 | `business_keyword_frequency.csv` |

이 둘을 섞지 않는다. `gross margin` evidence는 적게 보여도 WTP가 높을 수 있고, `usage limit` evidence는 많이 보여도 개인 불만이면 WTP가 낮을 수 있다.

## MVP 재도입 기준

- `pain_team_budget` 또는 `pain_cost_unpredictable`이 50개 evidence 기준 Top 3이고 평균 `wtp_score >= 4`일 때만 예산/쿼터 가드레일을 다시 UI 후보로 올린다.
- `pain_tracking_wrong` 또는 `pain_token_waste`가 Top 3일 때만 개발자 진단을 별도 화면으로 재검토한다.
- 10개 pilot은 방향 확인용이다. 큰 UI 기능 추가는 50개 evidence 이후로 미룬다.
