# PRD v2.0: AI SaaS Cost & Margin Workspace(비용·마진 의사결정 워크스페이스)

작성일: 2026-05-22  
이전 버전: `docs/research/ai-saas-cost-margin-prd.md` (v1.0)  
기준 문서: `docs/research/2026-05-22-token-simulator-work-summary.md`  
공식 리서치 원장: `docs/research/evidence_board.csv`

---

## 0. v1.0 → v2.0에서 무엇이 바뀌었나

v1.0은 이 제품을 **"AI SaaS unit economics workspace(고객/기능/요금제 단위 수익성을 보는 업무 공간)"** 로 재정의했다. 그 방향은 유지한다. 바뀐 것은 **"AI Native(AI를 제품/운영의 핵심 방식으로 쓰는 구조)"** 라는 한 겹이다.

v1.0이 답한 질문:

> LLM 운영 로그를 고객·기능·플랜별 원가와 마진, 가격정책 판단으로 어떻게 바꿀 것인가?

v2.0이 추가로 답하는 질문:

> 이 제품 자체를 **AI Native하게** 만들면 어떤 모습인가? 즉, 단순히 "CSV를 올리면 대시보드를 보여주는 SaaS"가 아니라, 내부에 분석 Agent / Pricing Agent / CFO Report Agent가 돌아가는 **AI Native Company의 CFO/Ops 레이어(재무/운영 판단을 돕는 층)** 가 되려면 무엇이 필요한가?

핵심 정리:

| 구분 | v1.0 | v2.0 |
| --- | --- | --- |
| 제품 정의 | LLM unit economics workspace | 동일 + AI Native 운영 레이어 |
| 내부 작동 | 대시보드/계산기 | deterministic 계산 엔진 + 해석 Agent 파이프라인 |
| 화면 수 | 7단계 흐름 | **6개 핵심 화면** 으로 압축 |
| 출시 단위 | Phase 0~4 | **MVP 1/2/3** 으로 재정렬 (샘플 → 실제 로그 → 반복 리포트) |
| 장기 비전 | Enterprise/Finance workflow | **AI Native Company의 CFO/Ops Agent** |
| 피칭 | (없음) | SparkClaw 제출용 문제/해결/AI Native성/왜 지금 프레이밍 포함 |

**가장 중요한 결정 한 줄**: 아이템을 바꾸는 게 아니라 **프레이밍을 바꾼다.** "토큰 계산기 만들까?"가 아니라, "AI SaaS 회사들이 고객별·기능별·플랜별로 AI 원가를 알고, 손해 고객과 깨지는 마진을 보고, 가격정책을 바꾸게 해주는 CFO/Ops 워크스페이스를 만든다."

---

## 1. 제품 요약

이 제품은 **LLM 운영 로그를 고객·기능·모델·플랜·세션·agent-run 단위 원가로 재분류하고, AI SaaS의 마진과 가격정책 판단으로 연결하는 워크스페이스**다.

한 문장:

> 개발자의 LLM 운영 로그를 비즈니스 원가와 가격정책 판단으로 번역하는 AI SaaS unit economics workspace(고객/기능/요금제 단위 수익성을 보는 업무 공간).

핵심 질문은 "이번 달 LLM 비용이 얼마인가?"가 아니다.

> 우리 AI 기능은 고객별·기능별·플랜별로 얼마의 원가를 만들고, 어떤 고객이나 기능이 마진을 깨고 있는가? 이 AI 기능을 계속 팔면 돈이 남는가?

### 1.1 제품 구조 (이름 정리)

"토큰 시뮬레이터"는 제품 전체 이름이 아니라 **핵심 모듈 중 하나**로 내려간다.

```txt
전체 제품:   AI SaaS Cost & Margin Workspace
핵심 엔진:   LLM Cost Attribution Engine (deterministic)
핵심 모듈:   Pricing & Token Simulator
해석 레이어: Margin / Pricing / CFO Report Agent (AI)
출력물:     CEO/CFO 1-pager, PM feature cost report, Developer breakdown, Board-ready summary
장기 비전:   AI Native Company의 CFO/Ops Agent
```

발표용 포지션 후보:

- AI SaaS Cost & Margin Workspace(비용·마진 의사결정 워크스페이스)
- AI Agent Unit Economics Workspace(AI Agent 단위 수익성 워크스페이스)
- 한국어: AI 기능을 운영하는 SaaS 팀이 LLM 사용량을 고객별·기능별·플랜별 원가로 바꾸고, gross margin과 가격정책까지 판단하게 해주는 워크스페이스

---

## 2. 배경: 왜 AI SaaS는 unit economics가 흔들리나

AI 기능이 들어간 SaaS에서는 LLM 비용이 단순 운영비가 아니라 **매출 원가(COGS, Cost of Goods Sold)** 가 된다.

전통 SaaS는 고객이 많이 써도 marginal cost가 낮았다. 그러나 AI SaaS에서는 요청 수, 입력 토큰, 출력 토큰, agent loop, cache miss, 모델 선택에 따라 원가가 계속 변한다. 고객이 많이 쓸수록 LLM 비용이 변동 원가로 발생한다.

그래서 약한 질문은 "어떤 모델이 더 싼가?"이고, 강한 질문은 다음이다.

> 우리가 이 AI 기능을 얼마에 팔아야 손해를 안 보는가? 어떤 고객이 많이 써서 오히려 손해 고객이 되는가? 어떤 기능이 멋있어 보이지만 gross margin을 갉아먹는가?

이 제품의 본질은 "토큰비 아끼기"가 아니다. **AI 제품의 가격을 어떻게 매겨야 손해를 안 보는가** 에 답하는 것이다.

---

## 3. 리서치 근거

현재 공식 리서치 상태:

- 공식 evidence: 38개
- 후보/검증 보류 evidence: 44개
- 다음 official evidence id: `GR-039`
- 검증 기준: URL, published date, exact quote, persona, group, pain tag

검증 명령:

```bash
npm run research:validate
```

현재 Top Pain:

| 순위 | pain tag | 점수 | 의미 |
| --- | --- | ---: | --- |
| 1 | `pain_margin_unknown` | 259 | AI 기능이 gross margin을 얼마나 깎는지 모른다. |
| 2 | `pain_heavy_user_loss` | 201 | 많이 쓰는 고객이 오히려 마진을 깨는 고객이 된다. |
| 3 | `pain_usage_pricing_mismatch` | 193 | 비용은 usage 기반인데 가격은 seat/flat이라 마진이 깨진다. |

검증된 pain의 우선순위가 이미 **"비용 절감"이 아니라 "마진/가격정책"** 으로 나와 있다는 것이 핵심 신호다. MVP를 비용 절감 도구가 아니라 unit economics와 pricing decision 도구로 잡아야 한다.

plan-level margin 실사례(근거 강화용):

- GitHub Copilot: heavy user가 subscription revenue보다 큰 compute cost 발생
- Cursor: $20/month plan에서 power user가 $500+ compute cost 발생
- Claude / Replit: high-cost user 때문에 pricing change와 usage cap 도입
- Stripe: usage cap, overage pricing, tier limit 권고

→ 고객별 비용만 보면 부족하다. 반드시 `plan_id` 축을 같이 봐야 한다.

---

## 4. 경쟁 포지션과 빈 공간

- Helicone, Langfuse, LangSmith, Portkey → LLM **observability** 에 강함
- OpenMeter, Metronome, Stripe → **usage-based billing** 에 강함
- CloudZero, Vantage → **FinOps / cost allocation** 에 강함

이 제품의 빈 공간:

```txt
LLM usage / trace / bill
→ customer, feature, model, plan, session, agent-run cost attribution
→ gross margin and customer profitability
→ usage-based / credit / hybrid pricing decision
→ CEO / CFO / Board-ready explanation
```

차별점:

> Observability는 개발자에게 무슨 일이 있었는지 보여주고, billing은 고객에게 사용량을 청구한다. 이 제품은 그 사이에서 **그 사용량이 이익인지 손실인지, 가격정책을 어떻게 바꿔야 하는지** 를 설명한다.

즉 Helicone이나 Langfuse를 대체하지 않는다. 그런 도구의 export/log를 받아 **비즈니스 판단으로 바꿔주는 레이어** 가 된다.

---

## 5. 3-Layer Product Model(3층 제품 모델)

```txt
Group A: Entry Point
실시간 비용/운영 문제
token spike, cache miss, quota, agent loop, provider delay
        ↓
Core Engine
비용 귀속 / 원인 분해 / 비즈니스 단위 변환
고객별, 기능별, 모델별, 플랜별, 세션별, agent-run별 비용
        ↓
Group B: Paid Value
마진/가격/수익성 의사결정
고객별 수익성, 플랜별 gross margin, heavy user 손실,
pricing simulation, CEO/CFO report
```

Group A의 운영 문제에서 멈추지 않고, Core Engine을 거쳐 Group B의 유료 가치로 연결하는 것이 핵심이다.

---

## 6. AI Native 아키텍처 (v2.0 신규)

이 제품이 "일반 SaaS"가 아니라 "AI Native Company의 운영 레이어"로 보이려면, **제품 내부도 Agent 방식으로 작동** 해야 한다.

### 6.1 가장 중요한 설계 원칙

> **계산은 deterministic(결정론적), 해석은 AI.**

AI가 숫자를 "계산"하면 안 된다. 비용·마진·시나리오 숫자는 rule-based(규칙 기반) / 결정론적 엔진에서 나와야 한다. AI는 그 숫자를 **해석하고 설명하고 제안** 한다. 이래야 신뢰성이 생긴다. 숫자는 흔들리면 안 되고, 해석은 AI가 돕는 구조.

| 구분 | 담당 | 예시 |
| --- | --- | --- |
| **계산 (deterministic engine)** | rule-based 코드 | 월 AI COGS, 고객별 cost, 기능별 cost, 플랜별 gross margin, heavy-user cost share, pricing scenario별 margin |
| **해석 (AI agent)** | LLM | 왜 이 비용이 문제인지 설명, 가격정책 대안 제안, CEO/CFO 문장으로 번역, PM용 rollout 리스크, Developer용 원인 후보, Decision Log 문장 작성 |

> 참고: `C:\token_simulator\CLAUDE.md`의 헌법과도 일치한다. "모든 비용 계산은 `src/lib/calculator.ts`의 단일 경로를 통과한다. 컴포넌트 내 가격 연산 금지." Agent는 이 단일 계산 경로의 출력을 **읽어서 해석만** 한다. Agent가 직접 산술을 수행하지 않는다.

### 6.2 파이프라인

```txt
Usage Import
사용량 CSV / paste / sample log 업로드
        ↓
Cost Attribution Engine  ← deterministic
customer / feature / model / plan / session / agent-run 비용 귀속
        ↓
Margin Analyst Agent  ← AI 해석
gross margin, customer profitability, heavy-user loss 해석
        ↓
Pricing Strategy Agent  ← AI 해석 + deterministic 재계산
flat / usage-based / credit / hybrid / cap / overage 시뮬레이션 해석
        ↓
CFO Report Agent  ← AI 작문
CEO/CFO/Board-ready narrative 생성
        ↓
Decision Log
가격정책 변경 이유, 가정, 예상 효과 저장
```

각 Agent의 입력/출력 계약(개념 수준):

| Agent | 입력 | 출력 | 비고 |
| --- | --- | --- | --- |
| Margin Analyst Agent | attribution table, plan별 매출, 고객별 MRR, 판매가 | "왜 이 마진이 문제인지" 해석, 손해 고객/heavy user 설명 | 숫자는 엔진에서 받음 |
| Pricing Strategy Agent | 현재 가격정책, attribution table, what-if 시나리오 파라미터 | 시나리오별 비교 해석, 가격정책 추천 + 근거 | 시나리오 숫자는 엔진이 재계산, Agent는 선택/설명 |
| CFO Report Agent | 위 두 Agent의 해석 + 핵심 숫자 | CEO/CFO 1-pager, PM report, Developer breakdown, Board summary | 의사결정자 언어로 번역 |
| Decision Log | 사용자가 채택한 결정 + Agent 근거 | 결정/가정/예상 효과 기록 | "왜 이렇게 정했나"를 남김 |

이 구조의 한 줄 의미:

> "AI가 답변합니다"가 아니라 **"AI가 회사의 가격정책 판단을 돕습니다."**

---

## 7. 타깃 사용자

| 구분 | 대상 | 원하는 것 |
| --- | --- | --- |
| Primary buyer(핵심 구매자) | Founder, CEO, CFO, Finance | 고객별 수익성, gross margin(매출총이익률), 가격정책 판단, Board reporting(이사회/투자자 보고) |
| Primary user(핵심 사용자) | AI SaaS developer, backend, ML, infra | CSV/log import(파일/로그 가져오기), feature mapping(기능 매핑), cost attribution(비용 귀속), 모델/캐싱/라우팅 판단 |
| Secondary user(보조 사용자) | PM, RevOps, CS/Ops | 기능별 원가, rollout(출시/배포) 판단, 고객별 비용 설명 |
| Expansion user(확장 사용자) | 내부 AI 도구 운영팀 | 팀별 비용 추적, bill surprise(예상 못 한 청구서 폭증) 방지, 내부 RAG 비용 관리 |

초기 MVP의 핵심 구매자는 개발자가 아니라 **Founder/CEO/CFO/Finance** 다. 다만 실제 데이터 연결과 CSV 준비는 개발자가 담당할 가능성이 높다.

메시지 전략 주의:

- 너무 CFO 쪽으로만 가면 초기 스타트업에는 무겁고, 너무 developer 쪽으로만 가면 observability 제품과 겹친다.
- 따라서 **첫 메시지는 "Founder/CEO/CFO가 보는 마진 리포트"** 로, **실제 사용 진입은 "개발자가 CSV를 올리는 구조"** 로 간다.

---

## 8. 해결할 문제

### 8.1 Entry Point Pain (진입점)

토큰 비용 급증, cache miss/TTL, quota 조기 소진, provider dashboard 반영 지연, session/agent loop 과다 토큰. 진입점이지만 여기서만 머물면 고액 지불 의향은 약하다.

### 8.2 Core Engine Pain (핵심)

어떤 기능/고객/플랜이 비용을 만드는지 모름, agent-run/session 단위 비용 불가시, provider invoice와 내부 usage 불일치. **이 레이어가 제품의 핵심.**

### 8.3 Paid Value Pain (돈 내는 이유)

gross margin 영향 불명, heavy user 손익 불명, flat/seat pricing과 variable usage 불일치, usage-based/credit/hybrid/overage 검토 필요, CEO/CFO/Board 설명용 지표 필요.

---

## 9. MVP 목표

> AI SaaS 팀은 LLM 운영 로그를 올리면, 고객·기능·모델·플랜·세션·agent-run별 원가를 보고 gross margin과 가격정책 결정을 할 수 있다.

MVP의 핵심은 예쁜 대시보드가 아니라 **의사결정 가능한 숫자와 보고 문장** 이다.

---

## 10. 6개 핵심 화면 (v2.0 MVP)

v1.0의 7단계 흐름을 6개 화면으로 압축한다.

### 화면 1 — Import

사용자는 CSV를 올리거나 sample data를 선택한다. **원칙: 토큰 수를 직접 추측하지 않는다.** 사용자가 직접 입력하는 것은 토큰량이 아니라 **business denominator** (월 고객 문의 수, report 수, workflow 수, 플랜별 매출, 고객별 MRR, 기능별 판매가, credit/overage 단가)다.

### 화면 2 — Cost Attribution

customer / feature / model / plan / session / agent-run별 비용. **주 사용자: 개발자, PM.**

### 화면 3 — Margin Risk

plan별 gross margin, 손해 고객, heavy user 집중도. **주 사용자: Founder/CEO/CFO.**

### 화면 4 — Pricing Simulator

flat 유지, usage-based 전환, credit bundle, overage, usage cap, AI add-on, tier upgrade 비교. high-WTP pain 대부분이 what-if 질문으로 이어지므로 가장 강화할 화면.

### 화면 5 — Report Output

Developer breakdown / PM report / CEO/CFO 1-pager / Board-ready summary 선택. 목표는 개발자 숫자를 의사결정자가 이해하는 문장으로 바꾸는 것.

### 화면 6 — Decision Log

"왜 credit pricing을 추천했는가", "왜 Pro 플랜에 cap을 넣었는가", "왜 특정 기능을 add-on으로 분리했는가"를 기록. **AI Native Company 운영 OS 느낌을 주는 화면.**

---

## 11. 출시 단위: MVP 1 / 2 / 3

v1.0의 Phase 0~4를 사용자 검증 흐름에 맞춰 3단계로 재정렬한다.

### MVP 1 — 샘플 CSV 기반 데모 (SparkClaw용)

실제 고객 데이터 없이 가능. 기능 딱 5개:

1. CSV 업로드 / 샘플 데이터 로드
2. 비용 귀속 테이블: customer / feature / model / plan / session / agent-run
3. 마진 분석: plan별 gross margin, 손해 고객, heavy user
4. 가격 시뮬레이션: flat vs usage-based vs credit vs cap
5. CEO/CFO 1-pager 자동 생성

> "실제 데이터가 아닌데?"라는 걱정은 여기서 풀린다. 이 제품의 입력은 **개인정보가 아니라 usage log 구조** 이기 때문에 샘플 CSV로도 핵심 구조가 그대로 설득된다. (도메인 SaaS와 달리 근로자 정보·학생 데이터 같은 민감 데이터가 필요 없다.)

### MVP 2 — 실제 로그 업로드형

사용자가 자기 OpenAI/Anthropic usage CSV나 observability export를 올려 분석. 핵심 반응: **"우리 로그로 해볼 수 있나?"** 강한 구매 신호 = 익명화된 usage CSV 제공.

### MVP 3 — 반복 리포트형 (SaaS 반복 사용 이유)

매주/매월 CEO/CFO 리포트 자동 생성. 예:

```txt
지난달 대비 AI COGS 18% 증가
Team 플랜 gross margin 72% → 58% 하락
상위 5개 고객이 전체 AI 비용의 41% 차지
agent loop 비용 2.3배 증가
credit cap 도입 시 예상 margin 회복
```

한 번 쓰고 끝나는 계산기가 아니라 **AI SaaS의 월간 재무/운영 리포트** 가 된다.

---

## 12. 데이터 입력 정책

사용자가 토큰 수를 추측하게 만들지 않는다. 토큰 사용량은 provider usage log, API response usage field, gateway export, observability export, CSV log에서 가져온다.

사용자가 직접 입력하는 값은 **business denominator** 뿐이다: 월 고객 문의 수, 월 report 생성 수, 월 workflow/job 실행 수, 플랜별 월 매출, 고객별 MRR, 기능별 판매가, credit/overage 단가.

---

## 13. CSV 스키마

최소 필수 컬럼:

```csv
timestamp,feature,model,input_tokens,output_tokens
```

권장 컬럼:

```csv
request_id,customer_id,plan_id,session_id,agent_run_id,total_cost,latency_ms,status
```

전체 권장 스키마:

```csv
timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status
```

`customer_id`, `plan_id`, `session_id`, `agent_run_id`는 선택 컬럼이지만 Core Engine 가치가 커지려면 샘플 데이터·데모에서는 반드시 보여줘야 한다.

### 13.1 샘플 회사 (데모/MVP1용)

```txt
회사:   "AI 리포트 생성 SaaS"
플랜:   Free / Pro($29) / Team($99)
기능:   report_generation / chat_assistant / document_summary / agent_workflow
고객:   cust_001 ~ cust_100
모델:   gpt-4.1 / gpt-4.1-mini / claude / gemini
세션:   session_id
agent run: agent_run_id
사용 패턴: 일부 heavy user가 report_generation을 과도하게 사용
```

---

## 14. 기능 요구사항 (P0)

deterministic 엔진이 책임지는 계산:

- **Usage Import**: CSV upload/paste, sample template, 필수 컬럼 검증, total_cost 있으면 사용 / 없으면 모델 단가 기반 계산
- **Operational Signal Summary**: token spike 후보, cache miss/cacheable 비중, session/agent-run 상위 비용 (알림이 아니라 "어떤 로그를 더 봐야 하는지" 안내)
- **Attribution Cost Engine**: customer/feature/model/plan/session/agent-run 축별 roll-up, input/output 분해, 요청 수·평균 token·평균 cost, top cost item, missing dimension 안내
- **Feature / Customer / Plan-Level Cost**: 기능별·고객별·플랜별 월 비용, 기여도, top cost 강조, heavy-user 후보
- **Unit Economics**: `rawCostPerMetric = rawMonthlyCost / denominator`, `effectiveCostPerMetric = effectiveMonthlyCost / denominator` (report/ticket/workflow/user/customer/transaction당 원가)
- **Gross Margin**: `grossMargin = (sellingPrice - effectiveUnitCost) / sellingPrice`, raw vs effective margin 분리, 음수/저마진 강조
- **Heavy-User Profitability**: top 10% cost share, top-decile vs median, flat pricing 손실 가능성, plan 집중도
- **Pricing & Token Simulator**: seat/usage-based/credit/hybrid/overage/cap/AI add-on/tier upgrade/model switch/volume growth/token 증가/concentration/plan mix/loop reduction/cache·batch·output cap savings → 출력: 월 AI COGS, 고객당·기능별 원가, 플랜별 gross margin, 손해 고객 수, 예상 margin 개선, pricing recommendation
- **Raw vs Effective Cost**: `effectiveCost = rawCost + retryCost + humanReviewCost + csEscalationCost` (초기엔 assumption 기반 what-if)

AI Agent가 책임지는 해석/작문:

- **Report Output(리포트 출력)**: Developer breakdown(개발자 상세 분해) / PM report(제품 리포트) / CEO·CFO 1-pager(대표·재무 1페이지 요약) / Board-ready summary(이사회·투자자 공유용 요약)

CEO/CFO용 문장 템플릿:

```txt
지난 30일 AI COGS는 $X이며, 비용의 Y%는 [기능]에서 발생했습니다.
상위 10% 고객이 전체 AI 비용의 Z%를 만들고 있어 현재 [가격정책]에서는 margin risk가 있습니다.
[대안 가격정책]으로 바꾸면 예상 gross margin은 A%에서 B%로 개선됩니다.
```

---

## 15. 데모 시나리오 (v2.0 신규)

### 15.1 데모 제목

> "AI 기능이 잘 팔릴수록 손해가 나는 회사를 구하는 CFO Agent"

### 15.2 시나리오

월 $29 Pro 플랜으로 AI 리포트 생성 기능을 파는 SaaS. 처음엔 괜찮았는데 heavy user가 들어오며 LLM 비용 폭증. 개발자는 provider dashboard에서 총 토큰 비용만 보고 있고, CEO는 "왜 매출은 늘었는데 마진이 줄지?"를 모른다.

사용자가 usage CSV를 올린다. 시스템이 말한다:

```txt
지난 30일 AI COGS는 $4,820입니다.
비용의 62%는 report_generation 기능에서 발생했습니다.
상위 10% 고객이 전체 AI 비용의 54%를 만들고 있습니다.
Pro 플랜 고객 중 13명이 월 구독료보다 높은 AI 원가를 발생시키고 있습니다.
현재 flat pricing을 유지하면 Pro 플랜 gross margin은 41%까지 하락합니다.
월 1,000 credits + overage pricing을 도입하면 예상 gross margin은 68%로 개선됩니다.
단, Team 플랜에는 credit cap보다 AI add-on 분리가 더 적합합니다.
```

마지막에 CEO/CFO 1-pager가 생성된다.

### 15.3 데모 9단계 (1인 창업자가 AI 팀을 운영한다 — 확장 버전)

1. 회사 유형 선택: "1인 B2B SaaS / MVP 단계 / 월 예산 30만 원"
2. 업무 선택: 리서치, PRD, 디자인, 개발, 마케팅, 세일즈, CS
3. 각 업무를 AI Agent에 배정 (Research/PM/Engineer Agent 등)
4. 업무 빈도·문서량 입력 (인터뷰 주 5개, 코드 수정 주 10회, CS 월 300건)
5. 시뮬레이터가 비용 계산: "현재 월 예상 비용 61만 원"
6. 병목 알림: "비용의 48%가 Engineering Agent" / "Research Agent가 매번 긴 문서를 다시 읽어 캐싱 필요" / "CS Agent는 고객 수 증가 시 선형 증가"
7. 최적화안 제안: "요약 캐시" / "단순 분류는 저비용 모델 라우팅" / "최종 답변만 고성능 모델 검토" / "고객 발송 전 승인 게이트 유지"
8. 최적화 후 비교: "월 61만 → 28만 원" / "사람 검토 시간 하루 2시간 → 40분" / "고위험 자동 실행 업무 5개 → 1개"
9. Decision Log 저장: "왜 이 모델 라우팅을 선택했는지 기록"

→ 단순 계산기가 아니라 **AI 팀 운영 설계 → 비용 예측 → 리스크 통제 → 의사결정 기록.**

---

## 16. MVP에서 하지 않을 것

실시간 예산/쿼터 가드레일, 개발자 진단 전용 화면, Slack/Email 알림, SDK 자동 수집, Gateway/Proxy, 실시간 provider price sync, 실제 eval harness 연동, ontology 화면, Jarvis형 assistant, 실시간 anomaly detection. 이유: 현재 구매 pain은 실시간 알림보다 **마진/가격정책 판단** 에 더 강하다.

### Research-Gated 기능

| 기능 | 재검토 조건 |
| --- | --- |
| Budget / quota guardrails | `pain_team_budget` 또는 `pain_cost_unpredictable`이 50개 evidence 기준 Top 3 & 평균 `wtp_score >= 4` |
| Developer diagnostics | `pain_tracking_wrong` 또는 `pain_token_waste`가 Top 3 |
| Internal Mode | Group C 후보가 검증 evidence 15개 이상 & 팀 예산/내부 RAG WTP >= 4 |
| SDK / Middleware | CSV 실제 로그 분석 요청 반복 & 자동 수집 니즈 인터뷰 확인 |
| Gateway / Proxy | routing, fallback, budget cap이 유료 action과 직접 연결됨 |

---

## 17. SparkClaw 피칭 프레이밍 (v2.0 신규)

### 17.1 문제

> AI SaaS는 기존 SaaS와 다르게 고객 사용량이 늘어날수록 LLM 비용이 COGS로 발생한다. 하지만 대부분의 팀은 provider dashboard나 observability tool에서 토큰 사용량만 보고 있고, 그 비용이 어떤 고객·기능·플랜·agent-run의 원가인지 모른다. 그 결과 heavy user가 손해 고객이 되는지, 특정 플랜이 gross margin을 깨고 있는지, flat pricing을 유지해도 되는지 판단하기 어렵다.

### 17.2 해결

> 우리는 LLM usage log를 customer, feature, model, plan, session, agent-run 단위로 재분류하고, AI COGS, customer profitability, plan-level gross margin, pricing simulation, CEO/CFO report로 연결하는 AI SaaS unit economics workspace를 만든다.

### 17.3 AI Native성

> 이 제품은 AI를 쓰는 회사의 비용 구조를 관리하는 도구이면서, 제품 내부도 AI Analyst/CFO Agent 방식으로 작동한다. deterministic engine이 비용과 마진을 계산하고, AI agent가 원인 해석, 가격정책 대안, 보고 문장, 의사결정 로그를 생성한다.

### 17.4 왜 지금

> AI 기능이 SaaS의 기본 기능이 되면서 LLM 비용은 더 이상 실험비가 아니라 매출원가가 되고 있다. 그런데 observability, billing, FinOps 사이에서 AI usage를 business unit economics로 번역하는 레이어는 아직 비어 있다.

### 17.5 메시지 선명도 (전면 카피)

| 등급 | 메시지 |
| --- | --- |
| 나쁨 | "AI Native Company를 위한 운영 OS" (너무 추상적) |
| 좋음 | "AI 기능이 고객별·플랜별로 돈이 남는지 계산하세요." |
| 더 좋음 | "LLM usage log를 AI COGS, gross margin, pricing decision으로 바꿔드립니다." |

→ "AI Native Company"는 **장기 비전 문구** 로만 쓰고, 전면 카피는 구체적으로 간다.

---

## 18. 리스크 (v2.0 신규, 냉정하게)

1. **buyer가 진짜 돈을 낼지 미검증.** 문서상 Top Pain은 좋지만 Founder/CFO가 "지금 돈 내고 해결할 문제"로 보는지는 인터뷰 필요.
2. **초기 고객이 데이터를 줄지 애매.** usage log에 고객 ID·비용·플랜이 들어가 민감. → 익명화 샘플, 로컬 분석, CSV 삭제 정책, PII 제거를 반드시 강조.
3. **포지션 줄타기.** 너무 CFO 쪽이면 초기 스타트업에 무겁고, 너무 developer 쪽이면 observability와 겹침. → 첫 메시지는 마진 리포트, 진입은 개발자 CSV 업로드.
4. **"AI Native Company" 과대 문구.** 전면에 세우면 추상적. → 구체 카피로 대체.

---

## 19. 성공 기준

사용자가 다음 10개 질문에 답할 수 있어야 한다.

1. 이번 달 AI 기능 총 원가는 얼마인가?
2. 어떤 기능이 비용을 가장 많이 쓰는가?
3. 어떤 고객이 AI 원가를 가장 많이 만드는가?
4. 어떤 플랜이 사용량이 늘수록 손해가 되는가?
5. 어떤 모델, 세션, agent run이 비용을 키우는가?
6. report/ticket/workflow당 원가는 얼마인가?
7. 판매 가격을 넣었을 때 gross margin은 얼마인가?
8. heavy user 때문에 손해 보는 고객이 있는가?
9. usage-based, credit, hybrid, overage, cap 중 어떤 가격정책이 더 나은가?
10. CEO/CFO/Board에 공유할 수 있는 문장형 리포트가 나오는가?

### 성공 지표

정량: CSV import 성공률, 필수 컬럼 오류율, attribution coverage, 보고서 복사/다운로드 횟수, pricing simulation 실행 횟수, 입력된 business denominator 수.

정성: "이 고객이 손해인지 몰랐다" / "CEO/CFO에게 공유해도 되겠다" / "이걸로 가격정책을 바꿔야겠다" / "우리 로그로 해볼 수 있나?"

강한 구매 신호: 익명화 usage CSV 제공, 다음 달 리포트 요청, finance/CEO/PM 공유, 가격정책 변경 논의 사용, SDK/Gateway 자동 수집 문의.

---

## 20. 인터뷰 질문 (WTP 검증)

- 고객별 AI 원가를 알고 있나요?
- heavy user 때문에 손해 본 적 있나요?
- AI 기능별 gross margin을 보나요?
- usage-based pricing이나 credit pricing을 고민 중인가요?
- 이 숫자를 CEO/CFO/투자자에게 보고해야 하나요?
- 지금은 이 계산을 spreadsheet, SQL, 감으로 하고 있나요?
- 이 리포트를 매주 받으면 누구에게 공유하나요?
- 이 숫자가 없어서 가격정책이나 영업 의사결정이 늦어진 적 있나요?
- 지금 당장 결제하려면 어떤 조건이 필요하나요?

---

## 21. 로드맵 (v1.0 Phase ↔ v2.0 MVP 매핑)

| v2.0 | 대응 v1.0 Phase | 목표 |
| --- | --- | --- |
| **MVP 1** (샘플 데모) | Phase 1 | CSV import, attribution table, 마진 분석, pricing simulator, CEO/CFO 1-pager |
| **MVP 2** (실제 로그) | Phase 1~2 | 자기 usage CSV/observability export 분석, raw vs effective cost, invoice reconciliation |
| **MVP 3** (반복 리포트) | Phase 2~3 | 월간 자동 리포트, model switching/routing 시나리오, recurring report |
| **장기 비전** | Phase 3~4 | SDK/gateway 자동 수집, CFO monthly package, Board deck export, customer profitability monitoring → **AI Native Company의 CFO/Ops Agent** |

---

## 22. 결론

이 MVP는 `LLM 비용 계산기`로 설명하면 약하다. 가장 강한 설명:

> AI SaaS 팀이 LLM 운영 로그를 올리면, 고객·기능·모델·플랜·세션별 원가를 재분류하고, gross margin과 가격정책 판단까지 이어주는 unit economics workspace.

핵심 엔진은 **비용 귀속(deterministic)** 이고, 유료 가치는 **마진/가격/수익성 의사결정** 이며, AI Native성은 **그 해석을 Agent가 한다** 는 데서 나온다.

지금 해야 할 것은 아이템을 바꾸는 게 아니라 **프레이밍을 바꾸는 것** 이다.

> "토큰 계산기 만들까?" → "AI SaaS 회사들이 고객별·기능별·플랜별로 AI 원가를 알고, 손해 고객과 깨지는 마진을 보고, 가격정책을 바꾸게 해주는 CFO/Ops 워크스페이스를 만들자."

---

## 23. 주요 파일

| 파일 | 역할 |
| --- | --- |
| `docs/research/ai-saas-cost-margin-prd.md` | PRD v1.0 (이전 버전) |
| `docs/research/2026-05-22-ai-saas-cost-margin-prd-v2.md` | 본 문서 (PRD v2.0) |
| `docs/research/2026-05-22-token-simulator-work-summary.md` | 작업 전체 요약 |
| `docs/research/evidence_board.csv` | 공식 evidence 원장 |
| `docs/research/pain_taxonomy.md` | pain 분류 |
| `docs/research/token_cost_ontology.md` | 제품 온톨로지 |
| `docs/research/ai-saas-llm-cost-products-comparison-2026.md` | 경쟁 제품 비교 |
| `docs/research/ai-saas-cfo-ceo-board-reporting-expressions-2026.md` | 리포트 표현 라이브러리 |
| `scripts/research/validate-evidence-board.mjs` | evidence 검증 스크립트 |
