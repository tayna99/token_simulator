# AgentCost AI-Native Company 앞단 운영 장치 설계

> 목적: 이 문서는 AgentCost를 단순 서비스형 MVP가 아니라 **AI-native company의 초기 운영체제**로 만들기 위해, 기존 운영 플레이북 앞단에 붙여야 할 장치들을 정리한 실행 문서다.  
> 핵심은 고객 문의 이후의 처리뿐 아니라, **고객 유입 → 선별 → 데이터 게이트 → 유료 전환 → 운영 자산화 → 학습 루프**까지 닫힌 구조를 만드는 것이다.

---

## 1. 핵심 판단

지금의 AgentCost 운영 플레이북은 **고객 문의 이후 운영**에는 충분히 강하다.

하지만 AI-native company로 만들려면, 그 앞단에 다음 장치들이 더 붙어야 한다.

- ICP 필터
- Lead Magnet
- Self-Assessment
- Data Readiness Gate
- 샘플 리포트
- 유료 진입 상품 사다리
- Operating Asset Registry
- Human Approval Gate
- Learning Loop

한 줄로 정리하면 다음과 같다.

> 지금은 **서비스형 MVP 운영 매뉴얼**이고, 여기에 앞단의 **고객 선별·데이터 게이트·학습 루프**를 붙이면 AI-native company의 초기 운영체제가 된다.

---

## 2. AI나 사람에게 위임 가능한 작업 단위

앞단에 만들어야 할 장치는 크게 9개다.

---

### 2.1 ICP 필터 장치

ICP 필터 장치는 **“누가 좋은 고객인가”를 자동으로 판별하는 장치**다.

#### 입력값

- 회사명
- 제품 유형
- AI 기능
- 월 LLM 비용
- 로그 보유 여부
- 가격 모델
- 현재 고민 유형

#### 출력값

- A급: 바로 유료 진단 후보
- B급: Data Readiness Check 후보
- C급: 샘플 리포트 / 대기리스트 후보

#### AI에게 위임 가능한 일

AI가 홈페이지, 문의 내용, 답변 내용을 보고 다음 질문에 답하게 한다.

> “이 회사는 AgentCost에 적합한가?”

#### 분류 기준 예시

| 등급 | 조건 | 다음 액션 |
|---|---|---|
| A급 | 실제 AI 기능 운영 중, 월 LLM 비용 발생, usage log 보유, 가격/마진 고민 있음 | AI Cost Snapshot 제안 |
| B급 | AI 기능은 운영 중이나 데이터가 정리되지 않음 | Data Readiness Check 제안 |
| C급 | 아직 아이디어 단계이거나 비용/데이터 없음 | 샘플 리포트 제공, 대기리스트 등록 |

---

### 2.2 Lead Magnet 장치

문의가 그냥 오길 기다리면 안 된다.  
고객이 자기 문제를 인식하게 만드는 앞단 콘텐츠가 필요하다.

이 장치는 단순 블로그가 아니라 **문의 전환용 진단 콘텐츠**다.

#### 콘텐츠 예시

- AI 기능이 많이 쓰일수록 손해 보는 7가지 징후
- OpenAI 비용이 늘었는데 매출은 그대로라면 봐야 할 지표
- AI SaaS 정액제가 위험해지는 순간
- 고객별 LLM 원가를 모르면 생기는 문제
- AI COGS 1장 진단 샘플 리포트

#### AI에게 위임 가능한 일

- 콘텐츠 초안 작성
- 제목 후보 생성
- 고객 페르소나별 메시지 변형
- LinkedIn / 블로그 / 이메일용 버전 변환
- CTA 문구 생성

#### 사람이 승인해야 하는 일

- 문제의 날카로움
- 과장 표현 여부
- 실제 AgentCost가 해결 가능한 범위인지 여부
- 고객에게 보여줄 최종 메시지

---

### 2.3 Self-Assessment 장치

고객이 문의하기 전에 스스로 체크하게 해야 한다.

이 장치가 있으면 상담 전에 이미 고객을 선별할 수 있다.

#### 질문 예시

1. 현재 AI 기능이 실제 고객에게 제공되고 있나요?
2. 월 LLM/API 비용이 10만 원 이상 나오나요?
3. 고객별 사용량을 구분할 수 있나요?
4. 기능별 사용량을 구분할 수 있나요?
5. 요금제별 매출 정보를 연결할 수 있나요?
6. 실패/재시도 로그가 있나요?
7. raw prompt 없이 usage metadata만 export할 수 있나요?
8. 이번 분석으로 바꾸고 싶은 의사결정이 있나요?

#### 결과 유형

| 결과 | 의미 | 다음 액션 |
|---|---|---|
| 바로 AI Cost Snapshot 가능 | 데이터와 의사결정 니즈가 충분함 | 유료 진단 제안 |
| 먼저 Data Readiness Check 필요 | AI 기능은 있으나 데이터 구조가 부족함 | 저가/입문 상품 제안 |
| 아직 샘플 리포트로 학습 권장 | 비용/데이터/문제 강도가 약함 | 샘플 리포트 제공 |

---

### 2.4 Data Readiness Gate

AI-native company의 앞문은 단순 문의 폼이 아니라 **데이터 준비도 게이트**여야 한다.

고객이 CSV를 올리기 전, 어떤 데이터를 받고 어떤 데이터를 받지 않는지 명확히 안내해야 한다.

#### 받는 데이터

```csv
timestamp,
customer_id,
plan_id,
feature,
model,
input_tokens,
output_tokens,
total_cost,
status,
retry_count
```

#### 받지 않는 데이터

- raw prompt
- 대화 원문
- 이메일
- 전화번호
- 실명
- API key

#### 분석 가능한 범위

| 데이터가 있을 때 | 가능한 분석 |
|---|---|
| feature | 기능별 비용 |
| customer_id | 고객별 비용 |
| plan_id + revenue | 요금제별 마진 |
| model | 모델별 비용 |
| status + retry_count | 실패/재시도 비용 |

#### 제한되는 분석

| 없는 데이터 | 제한 사항 |
|---|---|
| customer_id 없음 | 고객별 원가 분석 불가 |
| plan_id 없음 | 요금제별 마진 분석 불가 |
| revenue 없음 | 손해 고객 판단 제한 |
| retry_count 없음 | 재시도 비용 분석 제한 |

이 장치는 고객 신뢰를 만든다.  
동시에 운영자의 시간을 지켜준다.

---

### 2.5 샘플 리포트 장치

초기 고객은 **“뭘 받는지”** 를 봐야 돈을 낸다.

따라서 공개 가능한 더미 데이터 기반 샘플 리포트가 필요하다.

#### 최소 구성

1. 1페이지 Executive Summary
2. 기능별 비용 breakdown
3. 고객별 비용 breakdown
4. 요금제별 gross margin
5. 손해 고객 여부
6. 추천 액션 3개
7. Decision Log 예시
8. 데이터 한계 표시

#### 샘플 리포트의 목적

화려한 문서가 목적이 아니다.

고객이 봤을 때 다음 느낌이 나와야 한다.

> “아, 이걸 팀 회의에 가져갈 수 있겠다.”

---

### 2.6 유료 진입 장치

현재 플레이북에는 가격 가설이 있지만, 결제 전환 장치가 약하다.  
초기에는 복잡한 결제 시스템보다 **상품 패키지**가 먼저 필요하다.

#### 상품 사다리 예시

| 상품 | 가격 가설 | 내용 | 목적 |
|---|---:|---|---|
| Free Fit Check | 무료 | 10분 비동기/메일 기반. 데이터 있는지 확인 | 진단 가능성 확인 |
| Data Readiness Check | 5만~15만 원 | CSV 구조를 보고 분석 가능 범위 안내 | 저가 유료 진입 |
| AI Cost Snapshot | 30만~100만 원 | 3~5일 내 1장 리포트 + 부록 + 30분 리뷰콜 | 핵심 유료 상품 |
| Monthly AI Cost Review | 월 30만~150만 원 | 매월 동일 지표 추적 + Decision Log 업데이트 | 반복 매출 |

이렇게 가격 사다리가 있어야 고객이 움직이기 쉽다.

---

### 2.7 Operating Asset Registry

AI-native company가 되려면 운영하면서 생기는 것들을 자산으로 저장해야 한다.

이걸 안 만들면 매번 새로 일하게 된다.  
이걸 만들면 5번째 고객부터 속도가 붙는다.

#### 저장해야 할 운영 자산

- ICP 기준표
- 고객 문의 기록
- Discovery 질문지
- 고객별 schema mapping profile
- provider price registry
- formula version
- calculation snapshot
- report template
- risk card
- decision log
- case study
- objection handling script

#### 폴더 구조 예시

```text
/agentcost-ops
  /00_icp
    icp_scorecard.md
    fit_rules_v0.1.md

  /01_leads
    lead_intake_log.csv
    lead_scoring_results.csv

  /02_discovery
    discovery_questions.md
    call_notes_template.md

  /03_data_readiness
    csv_template.csv
    data_readiness_checklist.md
    schema_mapping_examples.md

  /04_registry
    provider_price_registry.json
    formula_versions.md

  /05_reports
    sample_report.pdf
    report_template.md

  /06_decision_logs
    decision_log_template.md

  /07_learning_loop
    customer_learning_review.md
    productization_backlog.md
```

---

### 2.8 Human Approval Gate

AI-native company에서 중요한 것은 자동화 자체가 아니라 **승인 구조**다.

AI가 초안을 만들고, 사람은 판단·승인·예외 처리를 맡아야 한다.

#### AI가 해도 되는 일

- 문의 요약
- fit score 초안
- 질문지 초안
- 컬럼 매핑 초안
- 이상치 후보 탐지
- 리포트 초안
- 개선안 후보
- 후속 메일 초안

#### 사람이 반드시 해야 하는 일

- 고객 수락 여부
- 분석 범위 확정
- 보안/PII 판단
- 최종 숫자 승인
- 고객에게 보낼 리포트 승인
- 가격 제안
- 계약/환불/책임 문구

이 선이 없으면 AI-native가 아니라 **AI 난사형 운영**이 된다.

---

### 2.9 Learning Loop 장치

Learning Loop가 가장 중요하다.

각 고객이 끝날 때마다 반드시 기록을 남겨야 한다.  
이 기록이 쌓이면 SaaS 로드맵이 나온다.

상상해서 기능을 만드는 것이 아니라, 운영 로그에서 제품 기능이 추출되는 구조가 된다.

#### 고객별 종료 후 기록 질문

1. 이 고객은 왜 들어왔나?
2. 어떤 데이터가 있었나?
3. 어떤 컬럼이 없어서 분석이 막혔나?
4. 고객이 가장 관심 가진 지표는 뭐였나?
5. 돈을 냈나?
6. 안 냈다면 왜 안 냈나?
7. 리포트가 실제 결정에 쓰였나?
8. 다음 달 반복 의향이 있었나?
9. 이 작업 중 제품화할 수 있는 반복 업무는 뭐였나?

#### Learning Loop 결과물

| 입력 | 산출물 |
|---|---|
| 고객 문의 | ICP 기준 업데이트 |
| 데이터 누락 | Data Readiness Gate 개선 |
| 반복 질문 | FAQ / objection script |
| 반복 분석 | SaaS 기능 후보 |
| 반복 리포트 요청 | 월간 상품화 |
| 보안 우려 | Trust 문구 / 계약 조항 보강 |

---

## 3. 최종 결과물의 모양

기존 플레이북 앞단에 붙여야 할 최종 구조는 다음과 같다.

```text
콘텐츠/아웃바운드
→ Self-Assessment
→ Fit Check
→ Data Readiness Gate
→ 유료 상품 선택
→ Discovery Call
→ Data Health Check
→ AI Cost Snapshot
→ Review Call
→ Decision Log
→ Monthly Review / SaaS 기능 후보화
```

---

## 4. AI-native company 구조로 변환

위 흐름을 AI-native company 구조로 바꾸면 다음과 같다.

```text
Lead Research Agent
→ ICP Scoring Agent
→ Outreach/Content Agent
→ Intake Triage Agent
→ Data Readiness Agent
→ Discovery Agent
→ Usage Ingestion Agent
→ Cost Engine
→ Diagnostic Agent
→ Report Agent
→ Trust Review Agent
→ Decision Log Agent
→ Learning Loop Agent
```

다만 여기서 착각하면 안 된다.  
처음부터 이걸 전부 “진짜 Agent”로 구현할 필요는 없다.

초기에는 도구 조합으로 충분하다.

| 역할 | 초기 도구 |
|---|---|
| 운영 DB | Notion / Airtable / Google Sheet |
| Self-Assessment | Google Form / Tally |
| Data Gate | CSV 템플릿 |
| Cost Engine | Python / Spreadsheet |
| Report Draft Agent | ChatGPT / Claude |
| Approval Gate | 운영자 본인 |
| 고객 리포트 | Notion page / PDF |
| 고객별 운영 기록 | Decision Log |

진짜 중요한 것은 도구의 화려함이 아니다.

> **입력 → 처리 → 판단 → 기록 → 반복학습**이 끊기지 않는 것이다.

---

## 5. 지금 절대 단정하면 안 되는 것

### 5.1 “이 플레이북이면 바로 AI-native company다”라고 단정하면 안 된다

이건 좋은 운영 플레이북이지만, 아직 고객 유입·선별·유료 전환·학습 루프까지 완전히 닫힌 시스템은 아니다.

### 5.2 “SaaS를 아직 만들 필요 없다”도 단정하면 안 된다

초기에는 서비스형 MVP가 맞다.  
하지만 고객이 반복해서 같은 CSV를 주고 같은 리포트를 원하면 내부 어드민부터 빨리 만들어야 한다.

### 5.3 “국내 고객이 이 비용 문제를 강하게 느낄 것이다”도 단정하면 안 된다

국내 AI SaaS 팀이 실제로 LLM 비용을 얼마나 아프게 느끼는지, 고객별 마진까지 보고 싶어 하는지는 인터뷰로 확인해야 한다.

### 5.4 “AgentCost의 구매자는 개발자다 / Founder다 / CFO다”도 단정하면 안 된다

초기에는 technical founder가 제일 가능성 높다.  
하지만 리포트의 최종 소비자는 CEO, CFO, PM일 수 있다.

그래서 메시지는 기술보다 **의사결정**에 가까워야 한다.

---

## 6. 결론

지금 문서는 고객 문의 이후 운영에는 충분히 강하다.

하지만 AI-native company로 만들려면 앞단에 다음이 더 붙어야 한다.

- ICP 필터
- Self-Assessment
- Data Readiness Gate
- 샘플 리포트
- 유료 상품 사다리
- Operating Asset Registry
- Learning Loop

최종적으로 AgentCost의 초기 운영체제는 다음 구조가 되어야 한다.

```text
서비스형 MVP 운영 매뉴얼
+ 고객 선별 장치
+ 데이터 게이트
+ 유료 전환 장치
+ 운영 자산 저장소
+ 반복학습 루프
= AI-native company 초기 운영체제
```
