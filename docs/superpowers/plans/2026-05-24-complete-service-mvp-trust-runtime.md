# Service MVP Trust Runtime 구현 계획

> **목적:** AgentCost/AgentPayroll을 "데이터를 맡겨도 되는 1회 진단 서비스"로 팔 수 있게, Trust Gate(업로드 전 신뢰 검문), snapshot contract(분석 데이터 계약), report review gate(리포트 공유 전 검토 관문), decision/operating ledger(결정·운영 장부)를 P0 범위에서 닫는다.

## 검토 결론

방향은 맞다. 다만 고객이 처음 겪는 경험은 기능 설명이 아니라 "무엇을 받지 않는지, 무엇을 차단했는지, 숫자가 어디서 왔는지"를 먼저 증명해야 한다. 이 계획은 그 신뢰 흐름을 제품의 첫 번째 판매 장치로 승격한다.

## 보존해야 할 다이어그램 수정 사항

- AI가 숫자를 만드는 것처럼 보이면 안 된다. deterministic calculator(결정론 계산기)가 숫자를 만들고 AI는 설명한다.
- raw prompt/API key/PII(개인정보)는 분석 전 Trust Gate에서 막힌다.
- RAG(검색 증강 생성)는 근거 스니펫만 제공하고, Fact Ledger(승인된 사실 장부)를 사람 승인 없이 덮어쓰지 않는다.
- billing execution(과금 실행)은 P0에서 하지 않는다. rate card는 draft(초안)까지만 만든다.

## P0 큐

### 작업 1: Trust Pipeline Domain Model

**의미:** 업로드 파일을 바로 분석하지 않고, 먼저 "받아도 되는 데이터인지"를 판정하는 도메인 모델을 만든다.

- [ ] `TrustCheckResult` 타입에 `ready`, `needs_mapping`, `blocked` 상태를 둔다.
- [ ] `BlockedField`에는 raw prompt, API key, PII candidate(개인정보 후보), unsupported file type(지원하지 않는 파일 형식), oversized file(크기 초과)을 구분한다.
- [ ] `AnalysisScope`에는 가능한 분석과 막힌 분석을 분리한다.
- [ ] retention policy(보관/삭제 정책)는 30일 기본 안내와 삭제 요청 경로를 포함한다.
- [ ] 테스트는 prompt/API key/PII가 분석 snapshot으로 넘어가지 않음을 확인한다.

### 작업 2: Import & Trust Check UI

**의미:** 고객이 업로드 전에 "이 제품이 민감한 데이터를 받지 않는다"는 것을 화면에서 체감하게 한다.

- [ ] 첫 화면에서 raw prompt 미수집, API key 즉시 차단, PII 후보 분리 표시, 숫자 결정론 계산 원칙을 먼저 보여 준다.
- [ ] CSV/JSONL 업로드 후 차단된 컬럼과 분석에 사용될 컬럼을 나눠 보여 준다.
- [ ] 고객/요금제/매출 매핑이 없으면 `needs_mapping`으로 표시하고 손익 분석 범위를 제한한다.
- [ ] 버튼 문구는 "업로드"보다 "안전 검사 후 분석"처럼 신뢰를 먼저 말한다.

### 작업 3: Snapshot Contract v2

**의미:** 리포트가 언제나 같은 입력과 계산식으로 재현되도록 분석 데이터 묶음에 메타데이터를 붙인다.

- [ ] `snapshotVersion`, `formulaVersion`, `providerPriceVersion`, `generatedAt`을 포함한다.
- [ ] `trustCheckRef`를 포함해 어떤 데이터가 차단됐는지 추적한다.
- [ ] 숫자 필드는 source tool ref(어떤 계산 도구가 만들었는지)를 가진다.
- [ ] RAG 근거는 evidence ref(문서 근거 참조)로만 붙고 숫자를 바꾸지 않는다.

### 작업 4: Trust-Aware Operating Agent Routing

**의미:** 에이전트가 분석 범위를 알고 말하게 한다. 데이터가 부족한데 손해 고객을 단정하면 안 된다.

- [ ] customer revenue mapping(고객별 매출 연결)이 없으면 손익 단정 대신 "추정 불가"를 말한다.
- [ ] raw prompt가 차단됐으면 prompt quality 분석을 약속하지 않는다.
- [ ] provider LLM이 없으면 `deterministic_preview`로 표시한다.
- [ ] connector가 없으면 `connector_not_configured`로 표시한다.

### 작업 5: Report Review Gate와 One-Page Service Report

**의미:** PDF나 이미지 리포트를 공유하기 전에, 결정이 Adopt/Reject/Hold(채택/거절/보류) 중 하나로 남아 있어야 한다.

- [ ] 리포트 첫 장에는 누수 금액, 손해 고객/기능, 추천 가격 결정, 데이터 제한 사항을 넣는다.
- [ ] export 전에 human review gate(사람 검토 관문)를 통과하게 한다.
- [ ] 숫자마다 formula/source ref를 붙인다.
- [ ] "AI가 만든 숫자"처럼 보이는 문구를 금지한다.

### 작업 6: Decision and Operating Ledger Audit Fields

**의미:** 고객에게 보여준 주장과 내부 결정이 나중에 다시 추적 가능해야 한다.

- [ ] decision ledger(가격·기능 결정을 남기는 장부)에 decision, rationale(이유), assumption snapshot(가정), evidence refs, reviewer를 남긴다.
- [ ] operating ledger(운영 실행 기록)에는 run id, trust status, report status, customer action을 남긴다.
- [ ] 삭제/보관 상태와 report artifact id를 함께 기록한다.

### 작업 7: Service MVP Runbook과 고객용 템플릿

**의미:** SaaS 구독 전에 팔 수 있는 "1회 AI 비용 진단" 운영 절차를 문서화한다.

- [ ] `docs/runbooks/agentcost-service-mvp-runbook.md`
- [ ] `docs/templates/agentcost-first-reply.md`
- [ ] `docs/templates/agentcost-data-request.md`
- [ ] `docs/templates/agentcost-report-disclaimer.md`

고객에게 약속하지 말 것:

- SDK/gateway collection(자동 수집)이 없는데 실시간 모니터링을 말하지 않는다.
- 품질 검증 없이 절감액 보장을 말하지 않는다.
- raw prompt 분석을 기본 제공처럼 말하지 않는다.
- human approval(사람 승인) 없이 billing 변경을 말하지 않는다.

### 작업 8: P0 최종 검증

- [ ] trust 검사 단위 테스트
- [ ] snapshot contract 테스트
- [ ] report gate 테스트
- [ ] decision/operating ledger 테스트
- [ ] 브라우저 스모크: CSV 업로드 → Trust Gate → 분석 → 결정 → 리포트

## P1 백로그 큐

### P1-A: Supervisor Agent-as-Tool Orchestration

Supervisor agent(감독 에이전트)가 margin/pricing/risk/report 에이전트를 tool(도구)처럼 호출한다. 단, 숫자는 여전히 deterministic tool에서만 나온다.

### P1-B: Full Vector RAG

벡터 검색 기반 RAG로 official docs(공식 문서), benchmark(비교 자료), serving economics(서빙 비용), usage schema(사용량 스키마), decision history(결정 이력)를 검색한다.

### P1-C: Official Docs Change Monitor

OpenAI/Anthropic/Google 가격·모델 문서 변경을 감지하고, 사람 승인 전에는 Fact Ledger를 갱신하지 않는다.

### P1-D: SDK-lite Automatic Collection

사용량 CSV를 넘어 SDK-lite로 이벤트를 자동 수집한다. CSV import는 fallback path(대체 경로)로 유지한다.

### P1-E: vLLM/GPU Serving Economics

vLLM, TTFT(time to first token, 첫 토큰까지 걸리는 시간), TPOT(time per output token, 출력 토큰당 시간), KV cache(키-값 캐시), batching(묶음 처리) 비용을 자체 호스팅 판단에 붙인다.

### P1-F: Slack/Email Alerts

margin degradation(마진 악화), runaway loop(에이전트 반복 폭주), plan-level loss(요금제 단위 손실)를 알린다. 알림은 검토 후보이지 자동 실행 명령이 아니다.

### P1-G: Stripe/Billing Execution

rate card draft가 사람 승인 후 Stripe/Metronome/OpenMeter로 갈 수 있게 한다. P0에서는 draft-only다.

### P1-H: Benchmark Marketplace

비교 기준을 외부에서 가져오되, source quality(출처 품질)와 freshness(최신성)를 명시한다.

### P1-I: Customer-Facing SaaS Dashboard

고객이 반복 리포트와 결정 이력을 보는 SaaS 화면을 만든다.

### P1-J: Retention and Data Room Automation

보관/삭제 자동화와 data room(감사·투자 검토용 자료 공간) 내보내기를 제공한다.

## 최종 승인 기준

- 고객 첫 경험에서 "raw prompt/API key/PII를 받지 않는다"가 먼저 보인다.
- Trust Gate가 blocked/needs_mapping/ready를 명확히 나눈다.
- 분석 snapshot에 formula/provider/trust metadata가 있다.
- 리포트 export는 결정 기록 없이 진행되지 않는다.
- 데모/fixture/preview가 production evidence처럼 표시되지 않는다.
