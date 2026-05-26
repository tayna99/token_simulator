# 리서치 온톨로지 MVP 정렬 구현 계획

> **Ontology(온톨로지)**는 제품이 세상을 어떤 개념으로 나눠 보는지 정한 지도다. 이 계획은 리서치 근거, pain taxonomy(고통 지점 분류), 제품 개념, README 포지셔닝, MVP 우선순위를 모두 "AI SaaS 비용·마진·가격 결정"으로 맞춘다.

## 목표

AI SaaS cost, margin, pricing decision(비용·마진·가격 결정)을 중심으로 아래 문서를 정렬한다.

- research evidence(리서치 근거)
- pain taxonomy(고객 고통 분류)
- product ontology(제품 개념 지도)
- README positioning(첫 설명 문구)
- MVP priorities(우선 구현 범위)

## 아키텍처

- `docs/research/evidence_board.csv`를 source of truth(근거의 기준 파일)로 둔다.
- `pain_taxonomy.md`는 허용된 pain language(고객 문제 표현)를 정의한다.
- `token_cost_ontology.md`는 근거를 제품 결정으로 연결한다.
- report/README는 근거를 MVP 방향으로 번역한다.
- 코드 변경은 CSV 계약이 바뀌지 않는 한 `scripts/research/validate-evidence-board.mjs`로 제한한다.

## 파일 구조

- `docs/research/evidence_board.csv`: 검증됐거나 검증 대기 중인 후보를 한 행씩 담는 공식 evidence board(근거 표).
- `scripts/research/validate-evidence-board.mjs`: 필수 컬럼, pain tag 수, group 값, 점수, quote verification(인용 검증 상태), top pain ranking을 검증한다.
- `docs/research/pain_taxonomy.md`: 잦은 불평과 돈을 낼 만한 business pain(사업 고통)을 분리한다.
- `docs/research/token_cost_ontology.md`: `LLM usage -> feature cost -> customer cost -> gross margin -> pricing decision` 흐름으로 재정의한다.
- `docs/research/developer-token-cost-pain-report.md`: 개발자 불편은 유지하되 CFO/CEO/Founder willingness to pay(지불 의사)를 명확히 한다.
- `docs/research/mvp-wtp-interview-guide.md`: 고객별 수익성, 마진, 가격 결정에 돈을 낼지 묻는 질문을 추가한다.
- `README.md`: token simulator가 아니라 AI SaaS cost/margin/pricing workspace로 설명한다.

## 작업 1: Evidence Board 계약 고정

- [ ] CSV 첫 행의 필수 컬럼을 고정한다.
- [ ] 각 근거 행에는 URL, 날짜, 짧은 인용 또는 요약을 둔다.
- [ ] 묶음 메모를 여러 근거처럼 쪼개지 않는다.
- [ ] `quote_verified`는 `true`, `false`, `pending` 중 하나로 표시한다.
- [ ] Reddit, paywall(유료 장벽), 접근 불가, 미확인 소스는 `pending`으로 둔다.
- [ ] `npm run research:validate`가 통과해야 한다.

## 작업 2: Pain Taxonomy 재정렬

- [ ] 단순 token cost anxiety(토큰 비용 불안)와 구매 가능한 margin pain(마진 고통)을 분리한다.
- [ ] customer-level cost(고객별 비용), feature-level cost(기능별 비용), gross margin, heavy-user loss(과사용 고객 손실), pricing mismatch(가격제 불일치)를 상위 pain으로 올린다.
- [ ] 개발자 불편은 entry point(진입점)로 남기고, 유료 가치는 business decision(사업 결정)에 둔다.

## 작업 3: Product Ontology 재작성

- [ ] `LLM usage`를 `feature cost`, `customer cost`, `plan margin`, `pricing decision`으로 연결한다.
- [ ] observability(관측 도구), billing(과금 도구), FinOps(클라우드 비용 운영) 사이에서 비어 있는 레이어를 명확히 설명한다.
- [ ] "토큰 계산기" 표현은 역사적 설명으로만 남긴다.

## 작업 4: Report와 README 정렬

- [ ] README 첫 문장은 "AI SaaS 비용·마진·가격 결정 워크스페이스"로 쓴다.
- [ ] report는 총 비용보다 손해 고객, 마진 깨는 기능, 가격 변경 후보를 먼저 말한다.
- [ ] 내부 용어는 괄호 설명을 붙인다.

## 작업 5: Interview Guide 업데이트

- [ ] "고객별/기능별 AI 비용을 보고 있나요?"를 묻는다.
- [ ] "많이 쓰는 고객이 손해 고객인지 확인했나요?"를 묻는다.
- [ ] "이 리포트로 가격제나 기능 제한을 바꿀 수 있나요?"를 묻는다.
- [ ] 반응 문장을 여섯 반론 bucket(가격/신뢰/필요성/대체재/타이밍/메시지)으로 코딩한다.

## 검증

- [ ] `npm run research:validate`
- [ ] README와 research docs에서 "token calculator"가 주 포지셔닝으로 남아 있지 않은지 확인한다.
- [ ] evidence board의 quote_verified 상태가 솔직한지 확인한다.

## 완료 기준

- 리서치, 제품 문서, README가 같은 언어로 말한다.
- AgentPayroll의 유료 가치는 "비용 보기"가 아니라 "마진과 가격 결정"으로 설명된다.
- 고객 인터뷰 질문이 실제 구매 거부 문장 수집에 바로 쓰일 수 있다.
