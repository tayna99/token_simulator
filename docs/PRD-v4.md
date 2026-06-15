# PRD: AgentPayroll v4

부제: **AI 기능별 단위경제 의사결정 원장**
문서 버전: 4.0 · 2026-05-29
상태: Draft · 커넥터 준비형 PRD
관계: `docs/PRD-v3.md`는 Next.js 웹앱과 Money Leak Run 방향 PRD로 보존한다. `docs/PRD-current-state-2026-05-25.md`는 구현 사실 기록이다. 이 문서는 AgentPayroll을 CSV 데모에서 실제 회사 데이터가 들어올 수 있는 의사결정 원장으로 확장하기 위한 제품 정본이다.

---

## 1. 한 줄 정의

AgentPayroll은 AI SaaS 팀이 LLM 사용량, 매출, 제품 성과 이벤트, 정책 결정 기록을 한 원장으로 묶어 **AI 기능별 단위경제 의사결정**을 내리게 해주는 운영 제품이다.

핵심은 비용을 많이 쓴 기능을 바로 줄이는 것이 아니다. **비용 높음 ≠ 누수**다. 중요한 기능은 원래 비용이 높을 수 있다. AgentPayroll은 기능별로 성과 기준과 원가 기준을 먼저 정하고, 그 기준으로 유지, 제한, 유료화, 초과 과금, 모델 교체, 캐시 적용 여부를 판단한다.

---

## 2. 데이터 출처

AgentPayroll v4는 네 종류의 데이터를 받는다.

| 데이터 | 예시 출처 | 제품 안에서 하는 일 |
| --- | --- | --- |
| LLM 사용량 | OpenAI, Anthropic, Gemini, Langfuse, Helicone, Vercel AI Gateway, generic gateway | 고객, 기능, 모델, 세션, agent run 단위의 AI 원가로 정규화 |
| 매출/요금제 | Stripe, billing DB, manual revenue CSV | 고객별 매출, 포함 토큰, 초과 과금 단가로 정책 누수 계산 |
| 제품 성과 이벤트 | product analytics, manual outcome CSV | 다운로드, 공유, 저장, 완료, 채택, 해결 같은 성과 기준 검증 |
| 정책 결정 기록 | AgentPayroll Decision Ledger, manual policy CSV | 사람이 채택/보류/거절한 정책과 다음 달 검산 기준 보존 |

raw export는 바로 믿지 않는다. 모든 입력은 normalized usage table, normalized revenue table, normalized outcome table, decision ledger 중 하나로 변환된다. raw prompt, messages, API key, secret, email, phone 같은 민감 필드는 기본 수집 금지다.

---

## 3. 토큰 경제 트렌드

2026년 기준 AI SaaS 원가는 단순 input/output tokens만으로 설명되지 않는다.

- cached tokens: 반복 context는 캐시 적중 여부에 따라 원가가 달라진다.
- batch/flex: 급하지 않은 작업은 batch나 flex 처리로 단가를 낮출 수 있다.
- small-model routing: 모든 요청을 고급 모델로 보내지 않고 난이도별로 라우팅한다.
- long context: 긴 문서, RAG, agent memory는 입력 토큰 원가를 크게 만든다.
- multimodal/tool cost: image, audio, video, web search, tool call 비용이 텍스트 외 원가를 만든다.
- session/workflow cost: 에이전트 기능은 호출 1회가 아니라 여러 호출, 검색, 도구 실행, 재시도 묶음으로 원가를 봐야 한다.
- output/reasoning cost: 긴 출력, 추론 토큰, 재생성이 실제 원가를 밀어 올린다.

AgentPayroll은 이 트렌드를 가격 숫자로 자동 반영하지 않는다. 공식 가격 숫자는 Fact Ledger 승인 전까지 계산 상수로 승격하지 않고, 사용량 CSV의 explicit cost 또는 검증된 모델 카탈로그만 쓴다.

---

## 4. 기능별 성과 측정 계약

성과는 회사마다 다르므로 AgentPayroll이 임의로 성과를 단정하지 않는다. AI는 후보를 제안하고, 사람은 기능별 성과 측정 계약을 선택한다.

| 기능 | 원가 기준 | 성과 기준 | 누수 판정 |
| --- | --- | --- | --- |
| 리포트 생성 | 출력 토큰, 재생성, 파일 생성 | 다운로드, 공유, 저장 | 실제 사용률 30% 미만 |
| 에이전트 워크플로우 | 여러 번의 모델 호출, 도구 호출, 재시도 | 완료, 승인, 자동 처리 | 성공 1건당 원가가 기준 초과 또는 완료율 30% 미만 |
| 고객지원 AI | 답변 비용, 상담 길이, 재시도 | 해결, 상담원 전환 감소, 만족도 통과 | 해결 없이 비용만 반복 |
| RAG/Q&A | 임베딩, 검색, 긴 컨텍스트, 생성 | 채택 답변, 출처 클릭, 재질문 감소 | 검색 비용 대비 채택 낮음 |
| 코드/데이터 에이전트 | 모델 호출, 실행 환경, 재실행 | 테스트 통과, 쿼리 성공, 리뷰 수정 감소 | 실패/재시도 비중 높음 |
| 미디어 생성 | 생성 비용, GPU 비용, 재생성 | 다운로드, 게시, 납품 | 사용률 30% 미만 |

outcome CSV가 없으면 성과 누수는 확정하지 않는다. 이때 리포트는 `부분 검증`으로 표시하고 다음 달 필요한 outcome event를 알려준다.

---

## 5. 커넥터 준비 범위

이번 v4 범위는 **커넥터 준비형**이다.

- 한다: source별 required/optional/forbidden column 계약.
- 한다: Langfuse, Helicone, OpenAI, Anthropic, Gemini, Vercel AI Gateway, Stripe, billing DB, outcome, policy CSV 샘플.
- 한다: CSV 계약 준비, 샘플 지원, API 미연결 상태 표시.
- 한다: 리포트에 어떤 source columns로 판단했는지 남김.
- 하지 않는다: 외부 API key 저장.
- 하지 않는다: 실제 provider API 호출.
- 하지 않는다: Stripe/Metronome 과금 변경.
- 하지 않는다: 고객 제한, plan 변경, 모델 라우팅을 자동 실행.

상태 표시는 다음 네 가지로 고정한다.

| 상태 | 의미 |
| --- | --- |
| 샘플 지원 | 데모 샘플과 CSV 계약이 같이 준비됨 |
| CSV 계약 준비 | 실제 export를 맞춰 넣을 수 있는 column 계약이 있음 |
| API 미연결 | live connector나 credential은 구성되지 않음 |
| 미지원 | 현재 계약 밖의 source |

---

## 6. 의사결정 문장

리포트는 숫자만 보여주지 않고 실제 결정 문장으로 끝난다.

- 비용이 높지만 다운로드율도 높아서 누수 아님.
- 비용은 높고 다운로드/공유가 없어 성과 누수 후보.
- 성과 데이터가 없어 확정 불가, 다음 달 outcome CSV 필요.
- 저가 요금제 고객에게 agent_workflow 포함량 제한 필요.
- 개발자는 report_generation 출력 토큰 제한과 캐시 적용 검토.
- CEO는 확정 손실, 회수 후보, 검증 부족, 다음 달 필요한 데이터를 분리해서 본다.

---

## 7. 비목표

- AgentPayroll은 Langfuse, Helicone, Stripe를 대체하지 않는다.
- AgentPayroll은 raw prompt를 수집하는 observability 제품이 아니다.
- AgentPayroll은 자동 과금 실행 도구가 아니다.
- AgentPayroll은 성과를 AI가 임의 판정하는 제품이 아니다.
- AgentPayroll은 production connector 없이 provider 실행 완료처럼 렌더하지 않는다.

---

## 8. 성공 기준

- `/w/demo` 첫 화면에서 지원 데이터 출처와 준비 상태가 보인다.
- 모든 usage template은 normalized usage row로 파싱된다.
- Stripe/billing DB 샘플은 고객별 매출, 포함 토큰, 초과 과금 단가로 파싱된다.
- outcome CSV는 성과 검증 row로 파싱된다.
- 리포트에는 성과 기준, 검증 등급, source coverage가 포함된다.
- 전체 테스트와 Next.js build가 통과한다.

---

## 9. 구현 계획

v4 구현은 실제 API 연동보다 먼저 **의사결정 원장으로 쓸 수 있는 입력 계약과 검증 표시**를 닫는다.

1. 커넥터 계약: source kind, source id, readiness status, required/optional/forbidden columns를 순수 모듈로 정의한다.
2. 샘플 확장: OpenAI, Anthropic, Gemini, Langfuse, Helicone, Vercel AI Gateway, Stripe, billing DB, outcome, policy CSV 템플릿을 제공한다.
3. 정규화 검증: usage, revenue, outcome parser가 각 샘플을 normalized row로 바꾸는지 테스트한다.
4. 진단 연결: snapshot과 report payload에 source coverage, 검증 등급, 필요한 다음 데이터 문장을 남긴다.
5. 데모 표시: `/w/demo` 진단 화면에 지원 데이터 출처 패널을 추가하고, live connector는 `API 미연결`로만 표시한다.
6. 회귀 검증: 순수 테스트, 컴포넌트 테스트, `npm run test:run`, `npm run build`, `git diff --check`를 통과시킨다.
