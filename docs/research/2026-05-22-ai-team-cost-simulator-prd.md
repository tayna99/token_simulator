# PRD: AI Team Cost Simulator — AI Native Company의 설계시점 운영 도구 (Wedge A)

작성일: 2026-05-22  
성격: **제품 PRD (Wedge A 전용)** — "AI 팀을 차리면 한 달에 얼마 드는지"를 설계 시점에 시뮬레이션  
상위/형제 문서:
- v1.0 `ai-saas-cost-margin-prd.md` (Wedge B, 사후형 마진/가격)
- v2.0 `2026-05-22-ai-saas-cost-margin-prd-v2.md` (AI Native 프레이밍)
- v0.3 `2026-05-22-ai-team-ops-workspace-prd.md` (Wedge A+B 통합, AITeamConfiguration)
- v0.4 `2026-05-22-ai-team-ops-architecture-prd.md` (기술 아키텍처, LangGraph/Tool/RAG)

---

## 0. 이 문서가 채우는 빈 곳

v0.3은 Wedge A(설계 시점의 1인 창업자/소규모 팀 시나리오, "AI 팀을 운영하기 전 비용을 예측")를 **이름**으로 정의했다(AITeamConfiguration, Team Designer). 하지만 그 핵심 메커닉 — **"각 Agent의 입력·출력을 정의하면, 그것으로 토큰과 비용을 계산한다"** — 의 *엔진*은 어느 문서에도 구체화돼 있지 않았다.

또한 기존 코드(`domain/cost/calculator.ts`)의 `calculateCost`는 토큰을 **직접 입력받기만** 한다. "Research Agent가 경쟁사 링크 + 인터뷰 녹취를 먹고 고객군 정의를 만든다"를 토큰으로 환산하지 못한다.

> 태나의 핵심 지적: **"시뮬레이터가 각 Agent를 단순 이름표로 두면 안 된다. 각 Agent가 매번 어떤 입력을 먹고 어떤 출력물을 만드는지가 있어야 토큰 계산이 가능해진다."**

이 PRD는 그 엔진을 정의한다. 즉 **Agent I/O(Input/Output, 입력/출력) 명세 → 토큰 추정 → 비용 예측**의 결정론적 모델, 그리고 그것을 감싸는 5화면 MVP.

---

## 1. 포지셔닝

### 1.1 한 줄

> **AI 팀(에이전트들)을 차리면 한 달에 얼마 드는지, 어디서 사고날지, 어떻게 줄일지를 — 운영을 시작하기 전에 설계 시점에 시뮬레이션하는 도구.**

### 1.2 두 시점, 하나의 제품

| | Wedge A (이 문서) | Wedge B (v1.0/v2.0) |
| --- | --- | --- |
| 시점 | **설계 전 (pre-flight, 실행 전 점검)** | 운영 후 (post-hoc, 일이 끝난 뒤 분석) |
| 입력 | Agent I/O 정의 + 빈도 추정 | 실제 usage 로그 (CSV) |
| 엔진 | **I/O → 토큰 추정 → 비용** | 로그 → 비용 귀속 |
| 산출 | 팀 설계안, 비용 예측, 병목, 리스크 | 마진 진단, 가격 시뮬, 리포트 |
| 대상 | 1인 창업자 / 소규모 팀 | AI SaaS 팀 |
| 데이터 없음 문제 | **없음** (추정으로 시작) | sample CSV로 해결 |

핵심: 두 Wedge는 **같은 객체(AITeamConfiguration)와 같은 Decision Log를 공유**한다(v0.3 §5, v0.4 §8). 설계 시점 추정(A)은 운영 후 실측(B)으로 **보정(Plan vs Actual)** 된다. 그래서 A는 B의 "예고편"이 아니라 *생애주기의 앞단*이다.

### 1.3 AI Native Company와의 관계

AI Native Company(AI를 팀원처럼 쓰는 회사)는 **AI 팀의 인건비(=토큰 원가)** 를 관리해야 한다. 이 제품은 그 회사들의 **설계시점 CFO/Ops 레이어(재무/운영 판단을 돕는 층)**다.

- 사람 팀: "이 직무를 채용하면 인건비 얼마? 어디에 매니저 검토를 둘까?" → Workday/조직 설계
- AI 팀: "이 Agent를 두면 토큰비 얼마? 어디에 사람 승인 게이트를 둘까?" → **이 제품**

> 메시지(전면): ❌ "AI Native Company를 위한 운영 OS"(추상) → ✅ **"AI 팀 차리면 한 달에 얼마 드는지 5분 안에 확인하세요."**

---

## 2. 핵심 메커닉 — Agent를 "이름표"가 아니라 "I/O를 가진 직무"로

### 2.1 왜 I/O가 있어야 토큰 계산이 되나

토큰 비용은 결국:

```
비용 = (입력 길이 + 출력 길이) × 호출 횟수 × 모델 가격 × (1 + 재시도율) × 빈도
```

따라서 각 Agent가 **무엇을 입력으로 먹고(입력 길이) 무엇을 출력하는지(출력 길이)** 가 정의돼야 추정이 가능하다. Agent를 이름표로만 두면 입력/출력 길이를 모르고, 그러면 토큰을 못 센다.

### 2.2 Agent 정의 스키마(데이터 구조)

```jsonc
AgentSpec {
  role: "Research Agent",
  model: ModelId,                 // 기존 models.ts 재사용
  inputs:  [Artifact],            // 먹는 것
  outputs: [Artifact],            // 뱉는 것
  calls_per_run: number,          // 1회 실행당 LLM 호출 수 (agent loop 깊이)
  retry_rate: number,             // 0–1
  cache_hit_rate: number,         // 0–1 (재로드 절감)
  human_review_gate: 'none'|'sample'|'all',
  assigned_tasks: [TaskId],
  frequency: Frequency            // 일/주/월 N회 또는 "고객 1명당", "문서 1개당"
}

Artifact {
  name: "고객 인터뷰 녹취",
  est_tokens: number,             // 기본값은 템플릿 라이브러리에서, 사용자 조정 가능
  reused_each_run: boolean        // 매번 다시 읽나? (캐싱 후보 탐지용)
}
```

`est_tokens`는 **사용자가 토큰 수를 추측하게 하지 않는다**는 원칙(v2.0 §12)을 지키기 위해, Artifact(입력/출력 산출물) 종류별 **기본 토큰 템플릿 라이브러리**에서 자동 채워진다. 사용자는 "인터뷰 녹취 1건 ≈ 길다/보통/짧다" 수준만 고르거나 그대로 둔다.

### 2.3 토큰 추정 → 기존 엔진 재사용

Agent별 월간 토큰을 산출해 **기존 `calculateCost`에 그대로 넣는다** (헌법: 단일 계산 경로 유지).

```
runs_per_month   = frequency × business_denominator
in_tokens/run    = Σ(inputs.est_tokens)
out_tokens/run   = Σ(outputs.est_tokens)

monthlyInputTokens  = in_tokens/run  × calls_per_run × (1 + retry_rate) × runs_per_month
monthlyOutputTokens = out_tokens/run × calls_per_run × (1 + retry_rate) × runs_per_month
monthlyRequests     = calls_per_run × (1 + retry_rate) × runs_per_month

calculateCost({ model, monthlyInputTokens, monthlyOutputTokens,
                monthlyRequests, cacheHitRate, batchEnabled })
```

> 신규 코드는 **`AgentSpec → CalcInput` 매퍼** 하나뿐. 비용 산식은 기존 `calculateCost`가 책임진다. 즉 Wedge A는 새 계산기를 만드는 게 아니라, **기존 계산기에 들어갈 토큰을 I/O로부터 도출**하는 얇은 층이다. (v0.4 Tool Contract의 `estimateAgentWorkload` tool에 해당.)

### 2.4 계산 vs AI 역할 (절대 원칙, v2.0/v0.3/v0.4 동일)

- **Deterministic(결정론적 계산)**: 위 산식 전부 — 월 비용, Agent별 비용, 병목 비중, 최적화 후 비용.
- **AI(해석)**: "왜 Engineering Agent가 비싼지", "어디에 캐싱·승인 게이트를 둘지", 리스크 카드, Decision Log 문장. AI는 숫자를 만들지 않는다.

---

## 3. Agent 카탈로그 (MVP 기본 9종)

각 Agent는 기본 입력/출력과 토큰 템플릿을 갖고 출고된다. 사용자는 추가/수정만 한다.

| Agent | 입력 (먹는 것) | 출력 (뱉는 것) | 기본 빈도 단위 |
| --- | --- | --- | --- |
| **Research Agent** | 시장, 타깃 고객, 경쟁사 링크, 고객 인터뷰 녹취 | 고객군 정의, 문제 리스트, 경쟁사 표, 구매 트리거, 리스크, 검증 가설 | 인터뷰 1건당 |
| **PM Agent** | 리서치 결과, 고객 문제, 사업 목표 | 문제 정의, MVP 범위, 유저 플로우, 성공 지표, 데모 시나리오 | PRD 1건당 |
| **Design Agent** | PRD, 유저 플로우, 브랜드 가이드 | 화면 명세, 와이어프레임 설명, 컴포넌트 목록 | 화면 세트당 |
| **Engineering Agent** | PRD, 화면 명세, 코드베이스, 에러 로그 | 구현 계획, 코드 변경안, 테스트 결과, 배포 체크리스트 | 코드 수정 1회당 |
| **Marketing Agent** | 제품 설명, 타깃, 톤앤매너 | 랜딩 카피, 광고 문구, SEO 키워드, 콘텐츠 초안 | 캠페인/콘텐츠당 |
| **Sales Agent** | 리드 정보, 제품 정보, ICP | 콜드메일, 시퀀스, 반론 대응 스크립트 | 리드 1명당 |
| **CS Agent** | 고객 문의, 지식베이스 | 답변 초안, 에스컬레이션 판단, FAQ 갱신 | 문의 1건당 |
| **Ops Agent** | 회의록 녹취, 일정, 문서 | 회의록 정리, 액션아이템, 문서 검색 결과 | 회의/문서당 |
| **Finance/Legal Review Agent** | 계약서, 비용 데이터, 정책 | 리스크 플래그, 검토 코멘트, 승인/보류 판단 | 검토 1건당 |

토큰 템플릿 예시(기본값, 조정 가능):

```
"고객 인터뷰 녹취"  ≈ 8,000 tok   (긴 입력, reused_each_run=false)
"경쟁사 링크 묶음"   ≈ 1,500 tok
"PRD"               ≈ 3,000 tok   (PM 출력 / Eng 입력)
"코드베이스 컨텍스트" ≈ 12,000 tok  (reused_each_run=true → 캐싱 후보!)
"고객 문의 1건"      ≈ 400 tok
"답변 초안"          ≈ 600 tok
```

`reused_each_run=true`인 큰 입력(코드베이스, 지식베이스)이 곧 "매번 다시 읽고 있다 → 캐싱 필요" 병목 탐지의 근거가 된다.

---

## 4. 5화면 MVP

태나의 원안대로 **5개 화면**. (Wedge B의 마진/가격 화면은 별도 경로로, v2.0/v0.3 자산 재사용.)

### 화면 1 — 회사 & 업무 입력

- 회사 유형 선택: "1인 B2B SaaS / MVP 단계 / 월 예산 30만 원"
- 업무 카탈로그 다중 선택: 제품기획, 시장리서치, 고객인터뷰분석, PRD작성, UX화면기획, 코드구현, 테스트, 랜딩페이지작성, 콜드메일, 고객문의응답, 회의록정리, 문서검색, 보고서작성
- 각 업무 빈도 입력: 일1회 / 주3회 / 월10회, 또는 "고객 1명당", "문서 1개당"

> 이 화면만으로도 가치: 사용자가 처음으로 **"내가 AI를 어디에 쓰고 있지?"** 를 업무 단위로 구조화한다.

### 화면 2 — AI 팀 구성

- 선택한 업무를 Agent에 배정 (조직도 형태)
- 각 Agent의 입력/출력 확인·수정 (§3 카탈로그 기본값 제공)
- 모델 선택, calls_per_run, retry_rate, cache, **사람 검토 게이트**(none/sample/all) 설정

> Agent는 이름표가 아니라 I/O를 가진 직무. 여기서 정한 I/O가 화면 3의 토큰 계산을 가능하게 한다.

### 화면 3 — 비용 예측 & 병목

- deterministic 계산: "현재 월 예상 비용 **61만 원**"
- Agent별·업무별 breakdown 테이블 + 차트(Recharts 재사용)
- **Cost Analyst Agent** 해석: "비용의 48%가 Engineering Agent에서 발생", "Research Agent가 매번 긴 문서를 다시 읽음 → 캐싱 필요", "CS Agent는 고객 수에 선형 증가 → 100명 넘으면 위험"
- 입력 옆 **벤치마크**(RAG, v0.4 §7): "비슷한 1인 B2B SaaS 평균 주 3회. 현재 입력은 3배 ⚠️"

### 화면 4 — 최적화 & 비교

- **Optimization Agent** 절감/재배치안 + 각 안에 **Risk Auditor 서브에이전트의 리스크 카드**(v0.4 §5.3):
  - "요약 캐시 적용", "단순 분류는 저비용 모델 라우팅", "최종 답변만 고성능 모델 검토", "고객 발송 전 승인 게이트 유지"
  - 리스크 카드 예: "Haiku 라우팅 월 8만 원 절감. 단 의료/법률 키워드 시 정확도 12%↓ 가능. 권장: 키워드 화이트리스트."
- **승인 게이트(interrupt)**: 사람이 채택/거부
- 최적화 후 비교: "월 61만 → 28만 원", "사람 검토 2시간 → 40분", "고위험 자동 실행 5개 → 1개"

### 화면 5 — Decision Log(의사결정 기록)

- 결정 + 이유 + **가정 스냅샷** 기록:
  - 결정: "CS Agent 모델 Sonnet → Haiku"
  - 이유: "비용 60% 절감, 의료/법률 키워드는 Sonnet fallback"
  - 가정: "CS 월 300건, 의료/법률 비율 5% 가정. 변하면 재검토"
- 이게 "단순 계산기"와 "운영 OS"를 가르는 화면.

---

## 5. 데모 시나리오 (9단계) — "1인 창업자가 AI 팀을 운영한다"

1. 회사 유형 선택: "1인 B2B SaaS / MVP / 월 예산 30만 원"
2. 업무 선택: 리서치, PRD, 디자인, 개발, 마케팅, 세일즈, CS
3. 각 업무를 Agent에 배정 (Research/PM/Engineer 등) — **입력/출력 정의**
4. 빈도·문서량 입력: 인터뷰 주 5개, 코드 수정 주 10회, CS 월 300건
5. 비용 계산: **"현재 월 예상 비용 61만 원"**
6. 병목: "비용 48% = Engineering Agent" / "Research가 긴 문서 재로드 → 캐싱" / "CS는 고객 수에 선형"
7. 최적화안 + 리스크 카드: 요약 캐시 / 저비용 모델 라우팅 / 최종 답변만 고성능 검토 / 발송 전 승인 게이트
8. 최적화 후: "61만 → 28만 원" / "검토 2시간 → 40분" / "고위험 자동 5개 → 1개"
9. Decision Log 저장: "왜 이 모델 라우팅을 택했는지" 기록

> 단순 계산기가 아니라 **AI 팀 운영 설계 → 비용 예측 → 리스크 통제 → 의사결정 기록.** "AI가 답변합니다"가 아니라 **"AI가 회사 운영 결정을 돕습니다."**

---

## 6. 토큰 추정 방법론 — "추측하게 하지 않는다"

설계 시점엔 실측 로그가 없다. 그래도 사용자에게 토큰 수를 묻지 않는다.

1. **Artifact 토큰 템플릿 라이브러리**: 종류별 기본 토큰(§3). 사용자는 길다/보통/짧다만 고름.
2. **벤치마크 RAG**(v0.4 §7): 유사 회사 유형의 빈도·토큰 기준선 제시. 입력이 범위 밖이면 노란불.
3. **Plan vs Actual 보정**(생애주기): 1주 운영 후 실제 로그(Wedge B)를 올리면 "예상 61만 → 실제 73만(+20%). 원인: Research 호출 빈도가 가정의 2.1배" → 가정 업데이트 → Decision Log 기록.

추정의 한계를 숨기지 않는다. 모든 숫자에 "가정 기반 추정" 라벨 + 보정 경로를 붙인다 (신뢰성 = 정직한 불확실성 + 보정).

---

## 7. 기존 코드베이스 / 다른 문서와의 정합성

| 요소 | 상태 | 비고 |
| --- | --- | --- |
| `calculateCost` (계산) | ✅ 재사용 | Wedge A는 새 산식 안 만듦 |
| `AgentSpec → CalcInput` 매퍼 | 🆕 신규 (순수 TS) | 유일한 신규 계산 코드. TDD·100% 커버리지 |
| Artifact 토큰 템플릿 라이브러리 | 🆕 신규 (정적 데이터) | models.ts 옆 데이터 모듈 |
| Recharts / jsPDF / role 언어 | ✅ 재사용 | 화면3 차트, 리포트 |
| AITeamConfiguration | 공유 (v0.3 §5) | Wedge A가 *설계*로 채움 |
| Decision Log | 공유 (v0.4 §8.1) | 동일 스키마 |
| Agent 레이어(Cost Analyst/Optimization/Risk Auditor) | v0.4 아키텍처 | LangGraph.js, 승인 게이트 interrupt |
| 벤치마크/리스크 RAG | v0.4 §7 | corpus 공유 |

**충돌 없음 확인**: 계산은 단일 경로(`calculateCost`) 유지(헌법 준수). Wedge A는 그 앞에 "I/O→토큰" 매퍼만 추가. AI 역할 분담·Decision Log·RAG는 v0.4와 동일. Wedge B(v1.0/v2.0)는 그대로.

---

## 8. MVP 범위 / 비범위

P0 (이 문서, SparkClaw 데모):
- 5화면, 9종 Agent 카탈로그, I/O→토큰 매퍼, 병목 탐지, 최적화+리스크 카드, Decision Log
- 비용 추정은 deterministic, 해석은 Agent (BYO-key 클라이언트, v0.4 §3 방식 A)

비범위 (P1+):
- Plan vs Actual 자동 보정(실측 연동), 주간 리뷰 자동 발송 → 서버리스 백엔드(v0.4 방식 B)
- Wedge B 전체(실로그 마진/가격) → v1.0/v2.0 경로
- 실제 Agent 실행(이 제품은 *시뮬레이터*지 Agent 실행 런타임이 아님)

---

## 9. 성공 기준 & 리스크

성공(P0): 1인 창업자가 5분 내 5화면 완주, "내 AI 팀 월 비용/병목"을 처음으로 숫자로 봄, Decision Log 1건 기록. 안티지표: "토큰 계산기로 쓸게요"(포지셔닝 실패), Decision Log 미사용(운영 OS 아님), 모든 추천 무비판 수용(리스크 카드 형식적).

리스크: (R1) 추정 신뢰성 → 벤치마크 노란불 + Plan vs Actual 보정. (R2) "AI Native Company" 추상 슬로건 → 전면은 "한 달에 얼마 드는지" 구체 메시지. (R3) 객단가 낮음($20–50) → Wedge B로 확장(고객단가 높음). (R4) 토큰 템플릿 정확도 → 벤치마크 corpus 확장 + 사용자 조정.

---

## 10. 다음 액션

1. `AgentSpec` / `Artifact` 타입 + `estimateAgentWorkload` 매퍼 — 실패 테스트 먼저(TDD), `calculateCost`로 위임
2. Artifact 토큰 템플릿 라이브러리 v0 (20종, 기본 토큰값 + 출처/근거)
3. 9종 Agent 카탈로그 데이터 (기본 I/O + 빈도 단위)
4. 화면 1·2·3 (입력 → 팀 구성 → 비용/병목) — deterministic만으로 동작
5. Cost Analyst / Optimization / Risk Auditor Agent (v0.4 LangGraph.js) + 승인 게이트
6. Decision Log(localStorage/export, v0.4 §8.1 스키마)
7. SparkClaw 1분 데모 영상 (9단계 클릭 흐름)

---

## 11. 한 줄 요약

> AI Native Company는 AI를 팀원처럼 쓴다. 그러면 **AI 팀의 인건비(토큰 원가)** 를 채용 전에 설계해야 한다. 이 제품은 각 Agent의 입력·출력을 정의하게 해서 — 이름표가 아니라 직무로 — 설계 시점에 월 비용·병목·리스크를 계산하고, 최적화안과 그 결정을 기록한다. 숫자는 deterministic 엔진(기존 `calculateCost`)이, 해석·추천·서술은 Agent가. 운영 후엔 Wedge B의 실측이 이 추정을 보정한다. 같은 객체, 같은 Decision Log, 하나의 AI Native Company 운영 OS.
