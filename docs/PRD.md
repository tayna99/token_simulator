# PRD: AgentPayroll

부제: **AI SaaS Cost & Margin Workspace**  
문서 버전: 1.0 (canonical) · 2026-05-23  
상태: Draft · 작성: 제품팀

> 이 PRD는 표준 제품 PRD 양식(개요 → 문제 → 목표/비목표 → 성공지표 → 페르소나 → 사용자 흐름 → 기능 요구 → UX → 기술 → 데이터/용어 → 로드맵 → 리스크 → 미해결)을 따른다. 그동안 `docs/research/`에 흩어진 문서(v1.0, v2.0, v0.3, v0.4 아키텍처, Wedge A 시뮬레이터, 고도화)를 하나로 통합한 정본이다. 세부는 §14 부록 링크.

## 0.1 Google I/O 2026 반영 원칙 (2026-05-24)

공식 발표 모델은 가격이 없어도 제품 카탈로그와 모델 레이더에 올라간다. 다만 **공식 발표됨**과 **공식 API 단가로 계산 가능함**은 분리한다.

- **Gemini 3.5 Flash**는 Gemini API pricing 기준으로 계산 가능한 `verified` 모델이다. 2026-05-24 기준 input $1.50 / 1M tokens, output $9.00 / 1M tokens, context caching $0.15 / 1M tokens, batch input/output 50% 할인으로 기록한다.
- **Gemini 3.5 Pro, Gemini Omni, Gemini Omni Flash**는 공식 발표 모델로 카탈로그에 노출하되 API 가격이 미공개이므로 `pricingStatus='unavailable'`, `apiPricingAvailable=false`, `requiresCustomPricing=true`로 둔다. 사용자 단가가 없으면 비용, 마진, 절감액 계산에 쓰지 않는다.
- **Gemini Omni**는 멀티모달/비디오 비용 모델 확장의 근거다. 현재 P0는 text-token 계산을 유지하고, 미공개 modality 단가는 `unsupported_pricing` warning으로 막는다.
- **AI Ultra 같은 구독 가격**은 API COGS가 아니다. 별도 subscription benchmark로만 쓰며 Cost Engine의 공식 원가 계산에는 넣지 않는다.
- 고객 화면에는 “최신 단가 반영”, “가격 출처 확인일”, “공식 API 단가 확인 필요”처럼 의사결정에 필요한 상태만 보여준다. `tool:*`, `asset:*`, `snapshot:*`, source URL, agent route 같은 내부 근거는 admin/debug 모드에서만 보여준다.
- Python/LangChain Agent는 가격 미공개 모델의 숫자를 만들 수 없다. 숫자는 계속 TypeScript deterministic engine과 Fact Ledger가 권위다.

---

## 1. 개요 (TL;DR)

**AgentPayroll**은 AI를 팀처럼 쓰는 회사를 위한 **"AI 팀 급여명세서"** 다. 각 AI 팀원(에이전트)이 어떤 일을 하는지 정해두면, 한 달에 얼마 드는지·어디서 돈이 새는지·어떻게 줄일지를 보여주고, 그 결정을 기록한다.

핵심은 단순 비용 계산기가 아니라는 점이다. 질문이 *"토큰 얼마 썼나"* 가 아니라 *"이 AI 기능/팀을 계속 굴리면 돈이 남나"* 다. 숫자는 정확히 계산하고(결정론 엔진), 설명·추천은 AI가 돕는다.

- **직관형 한 줄**: AI 팀의 급여명세서 — 이번 달 AI 팀이 한 일과 그 비용.
- **분석형 한 줄**: AI SaaS 팀이 LLM 사용량을 고객·기능·요금제별 원가·이익·가격 결정으로 바꾸는 워크스페이스.
- **장기 비전**: AI Native Company의 CFO/Ops 레이어.

---

## 2. 배경 & 문제

AI 기능이 들어간 SaaS에서 LLM 비용은 단순 운영비가 아니라 **매출 원가(COGS)** 가 된다. 전통 SaaS는 고객이 많이 써도 한계비용이 낮지만, AI SaaS는 요청 수·입력/출력 길이·재시도·모델 선택에 따라 원가가 계속 변한다. 고객이 많이 쓸수록 비용이 오른다.

지금 팀들은 OpenAI 같은 provider 대시보드나 observability 도구에서 **총액**만 본다. 그 비용이 어떤 고객·기능·요금제의 원가인지, 이익을 얼마나 깎는지, 가격을 바꿔야 하는지는 알기 어렵다.

검증된 Top Pain (공식 evidence 38개 기준):
1. AI 기능이 남는 비율(gross margin)을 얼마나 깎는지 모른다.
2. 많이 쓰는 고객이 오히려 손해 고객이 된다.
3. 비용은 쓴 만큼인데 가격은 정액제라 마진이 깨진다.

또 한 부류 — **1인 창업자**는 운영을 시작하기도 전에 "이 AI 팀 구성으로 한 달에 얼마 들지, 어디서 사고 날지, 사람이 어디서 검토해야 할지"를 모른다.

빈 시장: Observability(Helicone/Langfuse), Billing(Stripe/Metronome), FinOps(CloudZero) 사이에서 **"LLM 사용량 → 고객·기능·요금제별 원가 → 이익·수익성 → 가격 결정 → 경영진 설명"** 으로 잇는 레이어가 비어 있다.

---

## 3. 목표 & 비목표

### 3.1 목표 (Goals)
- 사용자가 자기 AI 사용을 **업무/팀원 단위로 구조화**하게 한다(첫 가치).
- LLM 사용량을 **고객·기능·모델·요금제·작업별 비용**으로 쪼개 보여준다.
- **남는 돈(이익), 손해 고객, 가격 시나리오**를 판단 가능한 숫자와 문장으로 제공한다.
- 결정을 **이유·가정과 함께 기록**해 나중에 재검토 가능하게 한다.
- 제품 내부도 AI Native하게: 계산은 결정론, 해석은 AI 에이전트.

### 3.2 비목표 (Non-Goals)
- 실시간 예산/쿼터 가드레일, 알림(Slack/Email) — 초기 제외.
- SDK/Gateway 자동 수집 — 후순위(P2).
- observability 자체(트레이스 수집) 대체 — 우리는 그 export를 받아 *비즈니스 판단*으로 번역.
- billing 집행(과금) — 가격 *결정*을 돕고 집행은 Stripe 등이.
- AI가 숫자를 계산하거나 사람 대신 최종 결정 — 금지(원칙 §9.1).

---

## 4. 성공 지표

### 4.1 정량
- 사용 기록 가져오기 성공률, 필수 항목 오류율.
- 고객/기능/요금제 비용 쪼개기 커버리지.
- 리포트 복사·다운로드 횟수, 가격 바꿔보기 실행 횟수.
- 사용자가 입력한 비즈니스 기준값(월 매출/고객 수 등) 수.

### 4.2 정성 (강한 구매 신호)
- "이 고객이 손해인지 몰랐다" / "경영진에 공유해도 되겠다" / "이걸로 가격을 바꿔야겠다".
- "우리 사용 기록으로 해볼 수 있나?" (익명 CSV 자발 제공).
- 다음 달에도 리포트를 받고 싶다는 요청.

### 4.3 안티지표 (이게 보이면 방향 오류)
- "토큰 계산기로 쓸게요" → 포지셔닝 실패.
- 운영 일지(Decision Log)를 한 번도 안 엶 → 시뮬레이터로만 쓰임.
- 모든 추천이 무비판 채택됨 → 주의 카드가 형식적.

---

## 5. 타깃 사용자 & 페르소나

| 구분 | 대상 | 원하는 것 |
| --- | --- | --- |
| 주 구매자 | Founder/CEO/CFO/Finance | 고객별 손익, 남는 돈, 가격 결정, 보고 자료 |
| 주 사용자 | AI SaaS 개발자/백엔드/ML/인프라 | 사용 기록 올리기, 비용 쪼개기, 모델/캐싱/라우팅 판단 |
| 보조 사용자 | PM, RevOps, CS/Ops | 기능별 원가, 출시 판단, 고객별 비용 설명 |

두 진입점(Wedge):

| | Wedge A (설계 시점) | Wedge B (운영 후) |
| --- | --- | --- |
| 페르소나 | 혼자 AI 팀 굴리는 창업자 | AI 기능이 매출·비용을 만드는 SaaS Founder |
| 입력 | 의도·가정·업무 빈도 | 실제 사용 기록(CSV) |
| 산출 | 팀 설계·비용 예측·주의 카드 | 손익 진단·가격 시나리오·리포트 |
| MVP 우선순위 | **P0 (데모)** | P1 (실측 검증) |

> 메시지 전략: 첫 메시지는 Founder 언어(쉬운 말), 실제 진입은 개발자가 사용 기록을 올리는 구조.

---

## 6. 사용자 흐름 (제품 척추)

앱은 화면 묶음이 아니라 하나의 결정 흐름이다. 각 단계는 "다음으로 넘어갈 수 있나"로 끝난다.

```
팀 짜기(Design) → 비용 보기(Cost) → 새는 곳 찾기(Bottleneck) → 줄이기(Optimize+Risk) → 기록(Decision Log)
```

데모 시나리오(1인 창업자, 9단계, SparkClaw용): 회사 유형 선택 → 업무 선택 → AI 팀원에 배정(입력·출력 정의) → 빈도·문서량 입력 → "이번 달 ₩612,000" 계산 → 병목("48%가 개발 AI") → 줄이기 + 주의 카드 → "₩612,000 → ₩280,000, 사람 검토 2시간 → 40분" 비교 → 운영 일지 기록.

---

## 7. 기능 요구사항

### 7.1 P0 (MVP / SparkClaw 데모, 클라이언트 only + 샘플)
- **사용 기록 가져오기**: CSV 업로드/붙여넣기/샘플 로드, 필수 항목 검증. 토큰량은 사용자가 추측하지 않고 기록·템플릿에서 가져옴.
- **AI 팀 설계(Wedge A)**: 회사/업무 입력, 9종 AI 팀원 카탈로그, 각 팀원 입력·출력 정의 → 설계시점 비용 추정(입력+출력+호출수+모델가+재시도율).
- **비용 쪼개기**: 고객·기능·모델·요금제·작업별 비용 roll-up.
- **이익/손익**: 요금제별 남는 비율, 손해 고객, 많이 쓰는 고객 탐지.
- **업무 산출물(고도화 축1)**: 호출 수가 아니라 "AI 팀이 한 일"(리포트 N건, 문의 N건 분류) + 1건당 비용, 처리량/재작업률.
- **가격 바꿔보기**: 정액제 / 쓴 만큼 / 충전식 / 상한 / 초과 / 하이브리드 비교.
- **줄이기 + 주의 카드**: 절감안마다 주의할 점(영향/조건/안전망, 근거 ID) 자동 부착.
- **사람이 정하기(고도화 축2)**: 승인뿐 아니라 자동화/권한/기준/실패 귀인/책임 결정.
- **운영 일지(Decision & Approval Log)**: 결정·이유·가정 스냅샷·근거·주의 카드 저장, 삭제/내보내기.
- **리포트**: 개발자용 / PM용 / 경영진(CEO·CFO) 1장 / 이사회용.

### 7.2 P1 (실측 + 반복 사용)
- 실제 사용 CSV/observability export 분석(Wedge B 완성).
- 예상 vs 실제(Plan vs Actual) 보정, 주간/월간 자동 리포트.
- 원가 = 기본 + 재시도 + 사람 검토 + CS 에스컬레이션(가정 기반 what-if).
- 얇은 서버 백엔드(키 보관, 영속성), Python LangChain 에이전트 서버.

### 7.3 P2 (확장)
- SDK/Gateway 자동 수집, Helicone/Langfuse import, Stripe/Metronome 연동.
- 멀티테넌트, 이사회 패키지 export, 지속 수익성 모니터링.

---

## 8. UX & 디자인

- **디자인 시스템**: Montage/WDS — `DESIGN.md`. 인터랙션 색 `#0066FF` 단일, 12px 카드·gutter 분리·rest 무그림자, Pretendard 단일 서체.
- **단일 웹앱**: 별도 랜딩 라우트를 만들지 않고, 웹앱 첫 화면에 제품 설명·샘플 실행·usage export 업로드·기존 workspace 열기를 합친다. 상세: `PRODUCT_UX.md`, `PRODUCT_UX_DETAILED.md`, `LANDING_UX.md`.
- **3-pane 콘솔**: 좌측(단계 네비 + AI 팀원), 중앙(결정론 입력·표·차트), 우측(AI 해석 + 근거 + 주의 카드 + 결정 버튼).
- **숫자/해석 시각 분리**: 숫자는 단단한 표/타일(`format.ts` 통과), AI 해석은 주석형 callout + "근거" 칩. 근거 없는 AI 문장은 렌더 금지.
- **상태 5종**: 빈 화면/샘플 · 가정 기반 추정 · 예상 vs 실제 · 결정 후 · 실패(fallback 명시).

---

## 9. 시스템 아키텍처 & 기술

### 9.1 절대 원칙
> **계산은 결정론 엔진(TypeScript 순수 함수), 해석은 AI.** AI는 숫자를 만들지 않는다. AI가 내보내는 모든 수치는 도구(=단일 계산 경로) 결과를 그대로 인용한다(근거 칩). 사람이 최종 결정한다(승인 게이트).

### 9.2 레이어
- **L1 프런트(React/Vite, client-only 유지)** — Montage UI, 3-pane.
- **L2 결정론 계산(TypeScript 순수 함수)** — `calculateCost`, 비용 쪼개기, 이익, 가격 시나리오, 산출물 단위. 브라우저/서버 공용 단일 소스.
- **L3 AI 에이전트(Python LangChain 1.0 서비스)** — 해석 전용. 프런트가 계산한 결과(snapshot)를 받아 설명/추천/리포트 문장 생성. `POST /api/agent` 계약. structured output(숫자 필드 없음). 숫자 재계산 금지.
- **L4 RAG / 저장** — 벤치마크·주의 카드 corpus, 운영 일지 영속(P1).

### 9.3 단계
- **P0**: 프런트 client-only + 샘플, BYO-key. Python 에이전트 서비스(`agent_service/`)는 선택적으로 켜고, 미구성 시 결정론 fallback.
- **P1**: 얇은 서버 백엔드로 키 보관·영속·반복 리포트. 헌법의 "서버 없음"은 "프런트=client-only, AI/영속성=얇은 backend"로 개정.

---

## 10. 데이터 & 용어

### 10.1 사용 기록 스키마(권장)
```
timestamp, request_id, customer_id, plan_id, feature, model,
session_id, agent_run_id, input_tokens, output_tokens, total_cost, latency_ms, status
```
필수: `timestamp, feature, model, input_tokens, output_tokens`. 사용자가 직접 입력하는 건 토큰량이 아니라 **비즈니스 기준값**(월 고객 수, 리포트 수, 요금제별 매출, 1건당 판매가 등).

### 10.2 용어 노출 정책 (사용자 노출 vs 내부)
> 원칙: **사용자에게 보일 카피가 아니면 화면에 노출하지 않는다.**

- **화면/랜딩 = 쉬운 말**(`TERMINOLOGY.md`): AI 팀원, 한 일, 이번 달 비용, 남는 돈, 근거, 주의할 점, 운영 일지. 전문용어는 괄호/툴팁으로만 보조.
- **내부/코드/개발문서 = 기술용어 유지**: `deterministic`, `tool ref`, `agent-run`, `toolResults`, `gross margin` — 협업·검색용. **화면엔 노출 금지.**

---

## 11. 의존성 & 로드맵

| 단계 | 내용 | 대응 |
| --- | --- | --- |
| MVP 1 | 샘플 기반 데모(쪼개기·이익·가격·경영진 1장) | P0 / SparkClaw |
| MVP 2 | 실제 기록 업로드 분석 | P1 |
| MVP 3 | 주간/월간 반복 리포트 | P1 |
| 확장 | SDK/연동/멀티테넌트 | P2 |

핵심 의존성: Python 에이전트 서비스(LangChain 1.0), Montage 토큰/Pretendard 폰트, evidence/벤치마크 corpus.

---

## 12. 리스크 & 완화

| # | 리스크 | 완화 |
| --- | --- | --- |
| R1 | 구매자가 실제 돈 낼지 미검증 | P0 후 인터뷰 20건 WTP 검증, 안티지표 자체 점검 |
| R2 | 사용 기록 데이터 민감성 | 익명 샘플 우선, 로컬 분석, CSV 삭제 정책, PII 제거 |
| R3 | 설계시점 추정 신뢰성 | 벤치마크 노란불 + 예상 vs 실제 보정 |
| R4 | 포지션 줄타기(CFO↔개발자) | 첫 메시지 Founder 언어, 진입은 개발자 |
| R5 | "AI Native" 추상 슬로건 | 전면은 구체("한 달에 얼마 드는지") |
| R6 | "payroll=고정급여" 오해 | 카피는 "실적 기반 급여명세서"(한 일 + 그 비용) |
| R7 | AI 환각(숫자 지어냄) | §9.1 원칙 + 근거 칩 + 수치-도구 매칭 검증 |

---

## 13. 미해결 질문

- 라우팅: 마케팅 `/` + 앱 분리 vs base `/token_simulator/` 유지.
- repo/제품명 정리: 코드 repo는 아직 `token_simulator` — AgentPayroll로 통일 시점.
- Pretendard 단일 서체를 유지하면서 첫 화면의 제품 가치 설명을 얼마나 밀도 있게 보여줄지.
- P1 서버 전환 시점(어떤 WTP 신호를 트리거로).
- 데모 미디어: 인터랙티브 vs 녹화(SparkClaw엔 녹화 안전).

---

## 14. 부록 (세부 문서)

| 문서 | 역할 |
| --- | --- |
| `docs/PRODUCT_UX.md` / `PRODUCT_UX_DETAILED.md` | 앱 UX 원칙·상세 |
| `docs/LANDING_UX.md` | 랜딩(마케팅 surface) 상세 |
| `docs/TERMINOLOGY.md` | 용어 친화화 가이드 |
| `DESIGN.md` | Wanted Montage 디자인 시스템 |
| `docs/research/2026-05-22-ai-team-ops-architecture-prd.md` | 에이전트/아키텍처 상세 |
| `docs/research/2026-05-22-ai-team-cost-simulator-prd.md` | Wedge A 시뮬레이터 상세 |
| `docs/research/2026-05-22-고도화-기획-문서.md` | 산출물/책임/명칭 3축 |
| `agent_service/` | Python LangChain 해석 서비스 |
| `prototypes/landing-montage.html` | 랜딩 프로토타입 |
