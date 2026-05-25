# AgentPayroll Money Leak Run 설계

작성일: 2026-05-26
상태: 리뷰용 초안
범위: 첫 5분 제품 흐름 재설계

## 1. 요약

AgentPayroll은 넓은 SaaS 대시보드로 시작하면 안 된다. 첫 경험은 아래 한 줄의 돈 발견 흐름이어야 한다.

```text
CSV/summary -> Trust Gate -> 손해 고객 / 마진 깨는 기능 -> 정책 후보 -> Adopt/Reject/Hold -> PDF 리포트
```

사용자는 운영 스택을 이해하기 전에 돈의 문제를 먼저 느껴야 한다. RAG, agent_service, Supabase, Watchtower, Admin, Connector, retention, runtime status는 이 흐름을 신뢰하게 만드는 기반이지, 첫 5분의 주인공이 아니다.

## 2. 문제

현재 제품은 usage import, attribution, margin analytics, pricing simulator, risk cards, decision ledger, report artifacts, RAG, production readiness, admin surface까지 강한 기반을 갖고 있다. 하지만 이 기능들이 첫 화면에 함께 보이면 사용자는 돈의 문제를 느끼기 전에 복잡한 운영 콘솔을 보게 된다.

AI SaaS 팀의 첫 구매 신호는 "기능이 많다"가 아니다. 다음 문장이 바로 보여야 한다.

- "이 고객은 손해입니다."
- "이 기능이 마진을 깨고 있습니다."
- "이 정책 후보가 지금 검토할 만합니다."
- "이 내용을 내부 공유용 PDF로 만들 수 있습니다."

첫 화면에서 RAG, agent route, source corpus, Watchtower, connector readiness, admin status를 설명하면 AgentPayroll은 의사결정 제품이 아니라 dashboard museum이 된다.

## 3. 설계 결정

제품의 1차 척추를 **Money Leak Run**으로 둔다.

Money Leak Run은 사용량 근거를 하나의 결정과 하나의 리포트로 바꾸는 단방향 guided workflow다. 기존 dashboard, RAG, agent, admin, connector 기능은 evidence drawer, expert mode, blocked/readiness surface 뒤로 내려간다.

### 추천안: Report-first guided run

기존 report-first diagnosis 경로를 workspace의 기본 경험으로 승격한다.

이유:

- 사용자가 제시한 성공 흐름과 정확히 맞는다.
- 이미 존재하는 report-first 코드와 deterministic margin/pricing 모듈을 재사용한다.
- PDF라는 명확한 paid-value artifact가 생긴다.
- 전체 앱을 또 다른 대시보드로 재작성하지 않아도 된다.
- backend trust 시스템은 필요할 때만 드러난다.

대가:

- power user는 깊은 운영 화면까지 한 번 더 들어가야 한다.
- 이미 구현된 일부 dashboard surface는 기술적으로 훌륭해도 첫 화면에서 내려야 한다.

### 대안 A: Role-based dashboard first

Developer/PM/CEO 대시보드를 먼저 열고 role에 따라 카드를 재정렬한다.

약한 이유:

- 여전히 "많은 기능"처럼 보인다.
- 사용자가 money leak을 보기 전에 탐색을 시작한다.
- PDF와 decision이 핵심 흐름이 아니라 탐색 결과물이 된다.

### 대안 B: Admin/production readiness first

production demo status, RAG readiness, connector, Watchtower health를 먼저 보여준다.

약한 이유:

- buyer가 아니라 operator에게 유용한 화면이다.
- backend 설정 누락이 제품 실패처럼 느껴진다.
- 비즈니스 가치를 증명하기 전에 기계를 설명한다.

## 4. 사용자 약속

AI SaaS 운영자는 5분 안에 다음을 할 수 있어야 한다.

1. usage CSV 또는 구조화 summary를 붙여 넣거나 업로드한다.
2. 데이터가 안전하고 분석 가능한지 확인한다.
3. 손해 고객과 마진 깨는 기능을 찾는다.
4. 가격, 제한, 모델/라우팅 중 하나의 정책 후보를 고른다.
5. 후보를 Adopt, Reject, Hold 중 하나로 기록한다.
6. persistence가 가능하면 내부 공유용 PDF artifact를 만든다.

## 5. 첫 화면 정보 구조

workspace home은 Money Leak Run만 보여준다.

### 5.1 Run Header

- 제품명: AgentPayroll.
- 약속: 손해 고객과 마진 깨는 기능을 찾는다.
- 상태 배지: production status, preview/report gate.
- RAG, Watchtower, agent route 용어는 노출하지 않는다.

### 5.2 Step Rail

순서는 고정한다.

```text
CSV/summary -> Trust Gate -> Money Leak -> Decision Candidate -> Adopt/Reject/Hold -> PDF Report
```

단계가 많아 보이면 stage navigation이 아니라 progress rail로 표현한다.

### 5.3 Input Panel

- CSV paste/upload를 첫 입력으로 둔다.
- 구조화 summary JSON은 두 번째 입력으로 둔다.
- sample diagnosis는 세 번째 보조 액션으로 둔다.
- revenue/billing CSV는 첫 구현에서는 disabled 또는 later 상태로만 보인다.

### 5.4 Trust Gate Panel

- raw prompt, API key, PII를 수집하지 않았거나 차단했음을 먼저 보여준다.
- blocked 또는 needs_mapping 상태를 분석 결과보다 먼저 보여준다.
- blocked 데이터는 snapshot, decision, report로 넘어가지 않는다.

### 5.5 Diagnosis Panel

세 장만 보여준다.

- 손해 고객
- 마진 깨는 기능
- 정책/모델/제한 후보

각 카드는 쉬운 문장, 핵심 수치, 작은 evidence status만 가진다. 내부 ref는 evidence detail을 열 때만 보인다.

### 5.6 Decision Panel

- 한 번에 하나의 선택 후보를 보여준다.
- Adopt / Reject / Hold는 명시적 선택이다.
- 기본 선택값은 없다. 사용자가 직접 선택하기 전까지 PDF는 decision-backed 상태가 아니다.
- Hold는 안전한 기본 권장 행동일 수 있지만 자동 선택되면 안 된다.
- decision copy는 risk와 후속 조치를 설명한다.

### 5.7 PDF Artifact Gate

- PDF가 첫 CTA다.
- 저장된 artifact가 없으면 왜 잠겼는지 보여준다.
- Markdown/JSON은 보조 artifact다.

### 5.8 Expert Mode

- 기본은 접힌 상태다.
- production readiness, role layout, RAG/source status, admin link, debug refs를 여기에 둔다.

## 6. 첫 5분 밖으로 내릴 것

아래 항목은 첫-run 제품 primitive가 아니라 supporting system이다.

- RAG corpus details
- Watchtower source review queue
- provider-backed agent route metadata
- runtime status
- retention jobs
- Slack/Email/Stripe/Metronome connector readiness
- admin mutation controls
- full six-section AI Team Ops dashboard
- raw `tool:*`, `evidence:*`, `source:*`, `asset:*` refs

이들은 사라지는 것이 아니라 다음 위치로 내려간다.

- evidence drawer
- expert mode
- admin route
- blocked/readiness panel
- report metadata

## 7. 데이터와 Trust 규칙

1. CSV와 summary는 Trust Gate를 통과해야 snapshot을 만들 수 있다.
2. Summary JSON은 구조화된 `UsageImportSummary`와 `trustInspection`을 포함해야 한다.
3. 자연어 summary는 파싱하지 않는다.
4. raw prompt, API key, secret, PII 후보는 blocked 또는 needs_mapping으로 처리한다.
5. customer, plan, revenue mapping이 없으면 preview는 가능할 수 있지만 persisted PDF 생성은 잠근다.
6. 비용과 마진 숫자는 deterministic TypeScript module에서만 온다.
7. AI/RAG는 설명하거나 근거를 붙일 수 있지만 숫자를 만들 수 없다.
8. 사용자 표시 숫자는 `src/lib/format.ts`를 통과한다.
9. Next.js production route는 demo seed, memory fallback, request-body fixture를 production-connected evidence처럼 다루지 않는다.

## 8. Decision 모델

초기 decision candidate는 일부러 좁게 둔다.

- `usage_limit`: 손해 고객 사용량 cap 또는 제한 검토
- `pricing_policy`: credit, usage, cap, overage, hybrid 정책 후보
- `model_routing`: 품질/리스크 검토가 필요한 모델 또는 라우팅 변경

각 candidate는 다음을 가져야 한다.

- title
- plain-language body
- 사용자가 고른 `decisionChoice`: adopt, reject, hold
- refs
- 가능한 경우 영향 고객 또는 기능 근거
- report eligibility 영향

Adopt는 billing 실행이 아니다. "현재 운영 결정 또는 draft로 승인한다"는 뜻이다. Stripe/Metronome push는 connector, approval, idempotency, rollback, ledger 조건이 모두 충족되기 전까지 admin-only blocked 상태다.

## 9. Report 모델

리포트는 가치 증명물이다. 저장된 artifact가 생기면 PDF가 첫 번째 report action이어야 한다.

리포트에는 반드시 다음이 들어간다.

- executive summary
- key metrics
- top loss customer 또는 loss count
- margin-breaking feature
- 사용자가 선택한 decision candidate와 decisionChoice
- risks and limitations
- trust status
- source refs 또는 evidence refs
- snapshot/report ids

PDF는 persistence 성공 전에는 완료된 것처럼 보이면 안 된다. 실패 시 `production_report_unavailable`, `storage_not_configured`처럼 명시적인 blocked state를 보여준다.

## 10. Persistence 기준

첫 구현에서 remote decision row가 아직 없더라도 report payload에는 반드시 decision candidate id, explicit decisionChoice, refs가 들어가야 한다. 단, UI는 이를 "ledger persisted"라고 표현하지 않는다.

정식 decision ledger가 연결되면 PDF 생성 조건은 다음으로 강화한다.

```text
explicit decisionChoice
-> decision row persisted
-> report artifact persisted
-> PDF download shown
```

즉, report payload만 있는 상태는 "decision-backed report draft"이고, persisted decision row가 있는 상태만 "ledger-backed report"다.

## 11. Revenue Mapping 기준

실제 고객 CSV에서 revenue/customer/plan mapping이 없으면 다음처럼 처리한다.

- Trust Gate: needs_mapping
- Diagnosis preview: 가능
- Persisted PDF: 잠금
- 문구: "revenue mapping이 없어 손해 고객 판단은 검토용입니다."

sample mode에서는 sample revenue assumption을 사용할 수 있다. 이때도 sample assumption임을 배지로 보여주고 production evidence처럼 표현하지 않는다.

## 12. Component 경계

기존 attachment point는 다음과 같다.

- `src/features/report-first/lib/diagnosis.ts`
  - Money Leak Run snapshot construction을 담당한다.
  - deterministic이어야 한다.
  - LLM이나 RAG를 직접 호출하지 않는다.

- `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx`
  - 첫-run UI를 담당한다.
  - `/w/[workspaceId]`의 primary body가 된다.
  - 내부 machinery는 기본으로 숨긴다.

- `src/features/trust/components/TrustAssurancePanel.tsx`
  - Trust Gate reassurance와 blocked/needs_mapping 문구를 담당한다.
  - diagnosis 결과보다 앞에 보여야 한다.

- `app/(app)/w/[workspaceId]/page.tsx`
  - Next.js workspace entry를 담당한다.
  - Money Leak Run을 먼저 렌더한다.
  - readiness와 role layout은 collapsed expert mode에 둔다.

- `app/reports/[id]/page.tsx`
  - persisted artifact review를 담당한다.
  - PDF를 primary, Markdown/JSON을 secondary로 둔다.

## 13. Visual / UX 제약

- SaaS 운영 도구처럼 조용하고 밀도 있게 만든다.
- 앱 workspace 안에서 landing hero처럼 만들지 않는다.
- 카드 수를 늘리지 않는다.
- repeated item이나 modal 성격이 아니면 card 안에 card를 중첩하지 않는다.
- purple gradient, neon, glassmorphism을 쓰지 않는다.
- mobile 순서: status -> next decision -> KPI -> trust/evidence summary -> decision -> PDF gate.
- provider/model/source id는 자동번역 보호를 유지한다.
- 375px 폭에서 텍스트가 부모 영역을 넘지 않아야 한다.

## 14. 수용 조건

재설계는 다음을 만족해야 한다.

1. `/w/[workspaceId]`는 broad dashboard가 아니라 Money Leak Run으로 시작한다.
2. 첫 화면 문구는 손해 고객, 마진 깨는 기능, decision candidate, PDF를 직접 말한다.
3. RAG, Watchtower, agent route, parser strategy, source id, tool ref는 첫 화면에서 보이지 않는다.
4. CSV 입력 state가 바뀌면 diagnosis preview도 갱신된다.
5. `trustInspection` 없는 Summary JSON은 거절된다.
6. Trust-blocked CSV는 diagnosis preview와 report action을 만들지 않는다.
7. needs_mapping 데이터는 preview는 가능하지만 persisted PDF를 만들 수 없다.
8. Adopt/Reject/Hold 중 하나를 사용자가 직접 선택하기 전까지 PDF는 decision-backed 상태가 아니다.
9. PDF download는 persisted report artifact 생성 성공 후에만 보인다.
10. 모든 money/percent/token 표시 값은 format helper를 통과한다.
11. customer-facing mode에서는 internal refs가 숨겨진다.
12. expert/admin readiness는 reachable하지만 primary path 밖에 있다.

## 15. 구현 단계

### Phase 1: Run shape 고정

- `ReportFirstDiagnosisWorkspace` copy와 layout을 six-step Money Leak Run에 맞춘다.
- Trust Gate를 panel copy가 아니라 명시적 step으로 만든다.
- diagnosis와 PDF CTA 문구를 첫 5분 가치 중심으로 바꾼다.
- hidden internals와 state-change test를 보강한다.

### Phase 2: Decision choice gate

- Money Leak Run candidate에 explicit Adopt/Reject/Hold control을 추가한다.
- 아무 선택도 없으면 PDF 생성 버튼을 잠근다.
- report payload에 selected candidate와 decisionChoice를 실어 보낸다.

### Phase 3: Evidence without console sprawl

- compact evidence drawer 또는 details section을 추가한다.
- RAG/Watchtower/source/debug refs는 initial viewport 밖에 둔다.
- `baseline_unavailable`, `needs_review`, `stale`은 dashboard module이 아니라 trust state로 보여준다.

### Phase 4: Report artifact polish

- persistence 성공 후 PDF download를 첫 CTA로 둔다.
- Markdown/JSON은 secondary로 둔다.
- report body를 raw diagnostic dump가 아니라 내부 공유 artifact처럼 다듬는다.

### Phase 5: Expert mode containment

- production readiness, role layout, admin route, connector status, runtime checks는 expert/admin surface에 둔다.
- first-run UI가 production demo fixture를 evidence처럼 import하지 않게 한다.

## 16. Non-goals

- 넓은 dashboard를 새로 만들지 않는다.
- billing execution을 primary outcome으로 만들지 않는다.
- RAG가 사용자가 돈 문제를 보기 전에 제품을 설명하게 하지 않는다.
- admin readiness를 main first screen으로 만들지 않는다.
- mapping이 없는데 benchmark나 margin 값을 지어내지 않는다.
- deterministic calculator 또는 format path를 대체하지 않는다.

## 17. 결정된 구현 기준

- 기본 decisionChoice는 없다. 사용자가 직접 Adopt, Reject, Hold 중 하나를 선택해야 한다.
- first pass에서는 report payload에 explicit decisionChoice와 refs를 포함하면 PDF draft 생성까지 허용할 수 있다.
- persisted decision ledger가 연결된 뒤에는 decision row persistence를 PDF 조건으로 강화한다.
- 실제 CSV의 revenue mapping이 없으면 preview만 허용하고 PDF는 잠근다.
- sample mode의 revenue assumption은 sample badge로만 표시하며 production evidence로 쓰지 않는다.

## 18. 리뷰 메모

이 spec은 의도적으로 visible product surface를 줄인다. AgentPayroll의 backend와 operating stack은 그대로 중요하지만, 첫-run 사용자는 그것을 trust, evidence, blocked-state honesty, report persistence로만 경험해야 한다.

핵심 베팅은 단순하다. AgentPayroll은 모든 기능을 빨리 보여줘서 10배 제품이 되는 것이 아니라, 팀이 하나의 돈 결정을 빠르게 내리게 해서 10배 제품이 된다.
