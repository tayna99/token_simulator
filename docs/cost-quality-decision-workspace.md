# AI SaaS 비용·품질·마진 결정 워크스페이스 구현 계획

> **목표:** 시뮬레이터를 단순 cost calculator(비용 계산기)에서 LLM operational logs(LLM 운영 로그)를 고객·기능·모델·요금제·세션 단위 원가로 바꾸고, 그 원가를 gross margin(매출총이익률), pricing decision(가격 결정), cost-quality-latency-risk tradeoff(비용·품질·지연·위험 균형 판단)로 연결하는 workspace(작업공간)로 만든다.

## 아키텍처

- raw token pricing(토큰 단가)과 monthly cost math(월 비용 계산)는 `src/lib/calculator.ts`에 둔다.
- usage logs(사용 기록)를 customer, feature, model, plan, session, agent run별 attributed cost(귀속 원가)로 바꾸는 core engine(핵심 계산 엔진)을 추가한다.
- 결과는 6단계 UX로 노출한다.
  1. usage import(사용량 가져오기)
  2. operational signal summary(운영 신호 요약)
  3. cost attribution(비용 귀속)
  4. margin analysis(마진 분석)
  5. pricing simulation(가격 시뮬레이션)
  6. report output(리포트 출력)

## 제품 형태

제품 포지셔닝은 더 이상 "LLM 비용 계산기"가 아니다.

> LLM 운영 로그를 고객·기능·모델·플랜·세션 단위 원가로 재분류하고, AI SaaS의 마진과 가격정책 판단으로 연결하는 워크스페이스.

핵심 질문:

> 우리 AI 기능은 고객별·기능별로 얼마의 원가를 만들고, 어떤 고객이나 기능이 마진을 깨고 있는가?

## 제품 모델

- Group A: entry point(진입점). token spike(토큰 급증), cache miss(캐시 미스), quota(한도), agent loop(에이전트 반복 호출), provider delay(제공자 지연) 같은 운영 불편으로 첫 사용을 만든다.
- Core Engine: cost attribution layer(비용 귀속 레이어). 사용량을 고객, 기능, 모델, 요금제, 세션, 에이전트 실행 비용으로 매핑한다.
- Group B: paid value(유료 가치). 고객별 수익성, 요금제별 마진, heavy-user loss(과사용 고객 손실), usage-based pricing(사용량 기반 가격), credit pricing(크레딧 가격), CEO/CFO/Board reporting(경영진/이사회 보고)이 돈을 내는 이유다.

## 첫 실행 흐름

1. LLM usage(사용량)를 가져온다.
2. token spike, cache miss 후보, agent loop cost 같은 operational signal을 요약한다.
3. 비용을 customer, feature, model, plan, session, agent run별로 귀속한다.
4. raw cost(순수 모델 비용), effective cost(재시도·사람 검수·CS 비용 포함 실제 비용), plan/customer gross margin을 이해한다.
5. usage-based, credit, hybrid, cap, overage 같은 pricing choice를 시뮬레이션한다.
6. PM, developer, CEO/CFO, Finance용 report를 export한다.

headline savings number(대표 절감 숫자)는 강한 데모 산출물이지만, 모든 savings claim(절감 주장) 옆에는 quality/risk assessment(품질·위험 평가)를 붙인다. UI가 "싼 것이 항상 더 좋다"고 암시하면 안 된다.

## MVP 범위

- Usage input and presets(사용량 입력과 프리셋): RAG chatbot, document summary, code generation, customer inquiry classification, report generation.
- Current model vs candidate model comparison(현재 모델과 후보 모델 비교): 월 비용, 연 비용, 요청당 비용, 고객당 비용, input/output breakdown.
- Attribution and business unit economics(귀속과 단위경제성): 고객·기능·모델·요금제·세션·에이전트 실행별 원가, 고객/리포트/티켓/작업당 비용, 판매가, gross margin, heavy-user loss.
- Pricing scenarios(가격 시나리오): seat, usage-based, credit, hybrid, cap, overage.
- Savings simulation(절감 시뮬레이션): model switch, prompt caching, batch processing, output token cap, feature-level routing.
- Report generation(리포트 생성): PM summary, developer breakdown, CEO savings summary.

후순위:

- live eval harness integration(실시간 평가 하네스 연결)
- real benchmark ingestion(실제 벤치마크 수집)
- price auto-fetch(가격 자동 수집)
- anomaly detection(이상 탐지)
- budget time-series alerts(예산 시계열 알림)

MVP는 live production truth(실제 운영 사실)를 아는 척하지 않고 assumption(가정)을 명확히 보여줘야 한다.

## 파일 구조

- `src/data/models.ts`: 정적 모델 카탈로그, source URL, verified date.
- `src/data/workloadPresets.ts`: 다섯 사용 사례 프리셋과 feature mix(기능 비중).
- `src/data/qualityProfiles.ts`: 품질/지연/리스크/재시도/검수/CS escalation 가정.
- `src/lib/workload.ts`: 월 요청/토큰 계산과 기능별 비중 계산.
- `src/lib/calculator.ts`: token cost의 유일한 계산 경로.
- `src/lib/decisionMetrics.ts`: quality-adjusted cost(품질 보정 비용), retry/review/CS cost, latency/risk labels, decision verdicts.
- `src/lib/savingsLevers.ts`: 모델 전환, 캐싱, 배치, 출력 제한, 기능별 라우팅 절감 후보.
- `src/lib/format.ts`: 표시 숫자 formatter.
- `src/App.tsx`: 6단계 UX와 공유 상태.
- `src/components/UsageSetup/`: 프리셋, 요청 수, 토큰 수, 기능 비중 입력.
- `src/components/CostAttribution/`: 고객·기능·모델·요금제·세션·에이전트 실행별 원가 표.
- `src/components/MarginAnalysis/`: 마진과 손해 고객 분석.
- `src/components/PricingSimulator/`: 가격 시나리오 비교.
- `src/components/ReportOutput/`: 역할별 리포트.

## 구현 작업

1. usage import schema(사용량 가져오기 스키마)를 정의한다.
2. attribution engine(귀속 엔진)을 만든다.
3. operational signal summary를 만든다.
4. effective cost와 margin engine을 추가한다.
5. pricing scenario를 구현한다.
6. report output을 역할별로 나눈다.
7. 모든 숫자 표시를 formatter로 통일한다.

## 검증

- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] 샘플 CSV로 전체 흐름 스모크
- [ ] NaN/Infinity/음수 입력 처리
- [ ] 같은 입력에서 Developer/PM/CEO 숫자가 일치하는지 확인

## 완료 기준

- 사용량 로그가 고객·기능·요금제별 원가와 마진으로 이어진다.
- 절감 추천은 품질·지연·리스크와 함께 보인다.
- 가격 결정 후보와 리포트가 같은 snapshot을 참조한다.
