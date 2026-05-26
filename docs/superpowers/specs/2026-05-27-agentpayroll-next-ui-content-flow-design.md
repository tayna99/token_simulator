# AgentPayroll Next.js UI Content Flow Design

작성일: 2026-05-27
상태: 구현 전 화면 구성 기준
범위: 현재 구현된 기능을 Next.js App Router 화면과 사용자 흐름으로 재배치한다.

## 1. 목적

AgentPayroll의 현재 구현은 이미 단순 토큰 계산기를 넘어섰다. 구현 표면은 usage import(사용량 가져오기), Trust Gate(신뢰 관문), money leak diagnosis(비용 누수 진단), role projection(역할별 투영), RAG evidence(근거 검색), Watchtower review(공식 소스 검토), agent runtime(에이전트 실행), HITL checkpoint(사람 승인 대기 지점), decision ledger(결정 장부), report artifact(리포트 산출물)까지 넓어졌다.

Next.js 화면 구성의 목표는 이 기능들을 모두 한 화면에 나열하는 것이 아니다. 첫 사용자가 5분 안에 이해해야 하는 흐름은 다음 하나다.

```text
사용량 근거 입력
-> Trust Gate
-> 손해 고객/마진 깨는 기능 진단
-> 결정 후보 선택
-> Adopt/Reject/Hold
-> 저장된 PDF report
```

나머지 기능은 이 흐름을 보강하는 보조 레이어로 배치한다. 고객 화면은 결정과 리포트를 먼저 보여주고, 내부 ref와 runtime 세부사항은 expert/admin surface에 둔다.

## 2. 현재 구현 앵커

| 구현 앵커 | 화면에서 맡을 역할 |
|---|---|
| `app/(app)/w/[workspaceId]/page.tsx` | Next workspace route. 서버에서 session, production demo status, audience를 판정한다. |
| `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx` | 첫 고객 경험. Money Leak Run, Trust Gate, decision choice, PDF gate를 포함한다. |
| `src/features/report-first/lib/moneyLeakRun.ts` | `CSV/summary -> Trust Gate -> Money Leak -> Decision Candidate -> Adopt/Reject/Hold -> PDF Report` step rail 상태 계산. |
| `src/features/report-first/lib/diagnosis.ts` | 진단 snapshot, margin summary, report-first payload 생성. |
| `src/features/usage/lib/*` | usage import, attribution, analysis readiness, operational signal 계산. |
| `src/features/unit-economics/lib/*` | plan/customer/feature margin, heavy-user detection, unit economics. |
| `src/features/pricing/lib/*` | pricing scenario와 rate card draft. Billing 실행이 아니라 결정 초안이다. |
| `src/features/role-projection/lib/stageCards.ts` | Developer/PM/CEO가 같은 snapshot을 다른 순서로 보게 하는 shared layout policy. |
| `src/features/agent/lib/agentRunRuntime.ts` | provider, fallback, unavailable, interrupt, resumed 상태와 runtime proof. |
| `app/reports/[id]/page.tsx` | 저장된 report artifact viewer. 저장소가 없으면 fallback report를 만들지 않는다. |
| `app/(app)/w/[workspaceId]/admin/page.tsx` | owner/admin readiness, Watchtower queue, connector/billing/retention blocked state. |

## 3. 화면 철학

1. **Report-first, dashboard-second.** 첫 화면은 dashboard museum(카드 박물관)이 아니라 돈이 새는 지점과 결정 후보를 보여준다.
2. **Production truth first.** 연결되지 않은 기능은 성공처럼 렌더하지 않는다. `unavailable`, `deterministic_preview`, `connector_not_configured`, `baseline_unavailable`, `blocked`를 명시한다.
3. **Trust Gate first.** 업로드 직후 raw prompt, API key, PII, mapping gap을 먼저 설명한다. 이것은 보안 부가기능이 아니라 구매 장벽을 낮추는 핵심 UX다.
4. **Same snapshot, different emphasis.** Developer/PM/CEO는 같은 숫자를 보고 카드 우선순위만 달라진다.
5. **AI explains, deterministic modules calculate.** 숫자는 `calculator.ts`, `format.ts`, unit-economics/pricing 모듈에서만 나온다. AI/RAG는 ref가 있는 해석과 다음 행동 초안만 맡는다.
6. **Decision unlocks export.** Adopt/Reject/Hold가 없으면 PDF/report/rate-card export는 잠금 상태다.
7. **Admin shows why blocked.** 관리자 화면은 실행 버튼보다 env, 권한, ledger, approval, connector 조건 중 무엇이 막혔는지 먼저 보여준다.

## 4. Route Information Architecture

| Route | 사용자 질문 | 보여줄 콘텐츠 | 성공 상태 | 실패/빈 상태 |
|---|---|---|---|---|
| `/` | "이 제품이 무엇을 운영해 주는가?" | 제품명, AI SaaS 비용/마진/결정 운영체계 설명, production demo 조건, report 예시 링크 | demo/login CTA | fake screenshot 대신 demo 준비 조건 |
| `/login` | "어떤 workspace로 들어갈 수 있는가?" | Supabase Auth login, auth/env/session error | session 생성 후 `/w/demo` 또는 membership workspace 이동 | auth env 누락, 로그인 실패, membership 없음 |
| `/w/[workspaceId]` | "이번 달 AI 비용 때문에 어디서 돈이 새는가?" | Money Leak Run, Trust Gate, KPI, decision candidate, role view, PDF gate | production status connected + decision-backed report artifact | `production_demo_unavailable`, missing checklist, admin link |
| `/w/[workspaceId]/admin` | "왜 운영 경로가 막혔는가?" | workspace access, Supabase readiness, Watchtower review queue, connector/billing/retention blocked state | owner/admin이 readiness와 review rows 확인 | 권한 없음, env 없음, connector 미설정 |
| `/reports/[id]` | "이 리포트가 어떤 결정에서 나왔는가?" | PDF CTA, report proof, workspace/report id, artifact body | persisted artifact render | `production_report_unavailable` |

## 5. 메인 Workspace 콘텐츠 순서

`/w/[workspaceId]`는 아래 순서를 기본값으로 둔다. role projection은 이 블록의 순서를 조정할 수 있지만, 새 숫자를 만들면 안 된다.

1. **Health Header**
   - workspace id/name
   - production status
   - audience mode: customer/expert
   - role switch: Developer/PM/CEO
   - snapshot timestamp와 stale badge

2. **Money Leak Step Rail**
   - `CSV/summary`
   - `Trust Gate`
   - `Money Leak`
   - `Decision Candidate`
   - `Adopt/Reject/Hold`
   - `PDF Report`

3. **Data Intake + Trust Gate**
   - usage CSV upload
   - revenue CSV upload
   - SparkClaw sample
   - expert-only summary JSON
   - raw prompt/API key/PII/mapping warning
   - safe data request copy

4. **Diagnosis KPI Strip**
   - monthly AI cost
   - loss-making customers
   - margin-breaking feature
   - recommended next decision
   - report gate status

5. **Diagnosis Cards**
   - top leak
   - margin-breaking feature
   - recommended decision
   - customer-safe evidence summary

6. **Decision Candidate Panel**
   - candidate title/body
   - no default selection
   - selected candidate clears previous PDF artifact
   - Adopt/Reject/Hold required before report creation

7. **Role View Panel**
   - Developer: import/schema, retry/cache, operational signals, trace refs
   - PM: feature economics, customer/plan impact, pricing candidate
   - CEO: margin risk, loss customers, report/export
   - all roles show same snapshot id and same core KPI

8. **PDF Artifact Gate**
   - PDF button disabled until snapshot, candidate, decision choice, storage/report gate are ready
   - disabled reason is visible text
   - artifact exists only after persisted report creation succeeds

9. **Evidence Summary**
   - customer audience: plain evidence summary and report limitations
   - expert audience: `tool:*`, `snapshot:*`, `source:*`, `evidence:*`, runtime proof refs

## 6. 상세 기능의 배치

| 기능 | 고객 화면 | Expert 화면 | Admin 화면 |
|---|---|---|---|
| Trust/security intake | 첫 업로드 직후 표시 | raw reason code 표시 | policy/version/readiness 표시 |
| Usage attribution | KPI와 top rows | customer/feature/model/plan/session/agent_run 상세 | ingestion/persistence 상태 |
| Margin risk | 손해 고객/기능 요약 | margin basis, deferred judgment | data mapping/revenue readiness |
| Pricing scenario | 결정 후보와 rate card draft | risk card, freshness, source status | connector/billing gate |
| RAG evidence | accepted evidence 요약 | source/evidence refs, baseline unavailable | corpus readiness, pgvector/index 상태 |
| Watchtower | 숨김 또는 "검토된 사실" 요약 | source freshness warning | review queue, accepted fact diff |
| Agent runtime | provider/fallback 상태만 요약 | called agents, primary/reviewer, checkpoint proof | agent_service reachability |
| HITL checkpoint | 사람 결정 이후 proof 요약 | checkpoint id/status, approval mode | resume/readiness smoke |
| External actions | 기본 숨김 | connector_not_configured 상태 | approval/idempotency/rollback/ledger 조건 |
| Retention | 리포트 보관/삭제 상태 요약 | audit ref | retention jobs |

## 7. 사용자 플로우

### 7.1 Production Demo Readiness Flow

```text
/ -> /login -> Supabase session -> /w/demo
-> production checks
-> connected면 Money Leak Run
-> missing이면 production_demo_unavailable + admin deep link
```

성공처럼 보이면 안 되는 상태:

- Supabase env 없음
- workspace membership 없음
- usage snapshot 없음
- accepted facts 없음
- latest Watchtower run 없음
- RAG chunks 없음
- report artifact 없음
- `agent_service` unreachable

### 7.2 Money Leak Run Flow

```text
CSV/revenue CSV 입력
-> Trust Gate
-> allowedForSnapshot이면 diagnosis snapshot 생성
-> 손해 고객/기능/정책 후보 표시
-> candidate 선택
-> Adopt/Reject/Hold 선택
-> /api/reports POST
-> persisted PDF artifact 링크 표시
```

중단 조건:

- raw prompt/API key detected: snapshot/report로 진행하지 않는다.
- PII 또는 revenue mapping gap: cost/feature analysis는 가능해도 손익/PDF 판단은 deferred 또는 blocked로 둔다.
- decision choice 없음: PDF 버튼은 잠근다.
- storage/report route 실패: `production_report_unavailable`을 표시한다.

### 7.3 Evidence Review Flow

```text
risk/diagnosis card
-> evidence summary 열기
-> customer는 plain summary
-> expert는 refs와 source status
-> admin은 Watchtower review queue
```

원칙:

- RAG는 숫자를 override하지 않는다.
- accepted fact와 review candidate를 같은 상태처럼 보이지 않는다.
- baseline이 없으면 peer average 대신 `baseline_unavailable`을 보여준다.

### 7.4 Agent Runtime + HITL Flow

```text
사용자 질문 또는 all-hands review
-> /api/agent/run
-> Python agent_service
-> provider_llm | deterministic_preview | unavailable | interrupt_requested
-> interrupt_requested면 사용자 결정
-> resumeCheckpoint
-> resumed + humanApproval + runtimeProof 저장
```

고객 화면은 `resumed`, `human approval recorded`, `provider/fallback status` 정도만 보여준다. raw `resumePayload`, agent route details, tool claims는 expert/admin에서만 본다.

### 7.5 Rate Card Decision Flow

```text
margin/pricing diagnosis
-> rate card draft
-> decision choice
-> report/rate-card export
-> admin readiness에서 connector/billing blocked reason 확인
```

초기 MVP에서 primary outcome은 billing push가 아니라 decision-backed draft다. Stripe/Metronome 실행 CTA는 approval, idempotency, rollback metadata, ledger row가 모두 준비되기 전까지 secondary blocked state다.

### 7.6 Report Flow

```text
decision-backed report created
-> /reports/[id]?workspaceId=...
-> persisted artifact lookup
-> PDF first CTA
-> markdown/json body secondary
```

report page는 storage가 없을 때 새 report를 생성하지 않는다. `production_report_unavailable`이 올바른 빈 상태다.

## 8. Role Projection 기준

| Role | 첫 질문 | Primary panels | Auxiliary panels |
|---|---|---|---|
| Developer | "어디서 비용이 튀었고 어떤 로그/모델/재시도가 원인인가?" | Trust Gate, operational signals, cost attribution, bottleneck, runtime/evidence refs | CEO report, high-level margin story |
| PM | "어떤 기능/플랜/고객 경험을 바꿔야 하는가?" | feature cost, plan/customer margin, pricing candidate, report-safe summary | low-level trace, agent route |
| CEO | "얼마가 새고 지금 어떤 결정을 해야 하는가?" | margin risk, loss customers, rate card draft, one-page report, PDF | import schema, trace/debug |
| Customer viewer | "공유 가능한 결론과 근거 제한은 무엇인가?" | accepted evidence summary, report, decision status | internal refs, raw routes, debug |

## 9. Next.js 컴포넌트 경계

### Server Components

- route-level auth/session 확인
- workspace membership/readiness 확인
- production demo status 확인
- persisted report artifact lookup
- admin review rows 조회
- SEO/metadata와 notranslate root 유지

### Client Components

- CSV/summary 입력
- Trust Gate 결과 표시
- role switch
- decision candidate 선택
- Adopt/Reject/Hold
- report 생성 요청
- evidence drawer toggle
- expert-only PDCA/input controls

### Route Handlers

- `/api/usage/import`: Trust Gate + normalized usage snapshot
- `/api/reports`: report run/artifact 생성
- `/api/reports/[id]/download`: persisted artifact serving
- `/api/agent/run`: Python agent_service bridge
- `/api/rag/*`: evidence retrieval/index
- `/api/watchtower/*`: source run/review queue
- `/api/runtime/status`: service/env/connector capability
- `/api/retention/run`: retention/audit job
- `/api/decisions`: decision ledger CRUD

### Server Actions 후보

- workspace 내부 decision 저장
- report 생성 요청
- role/language/workspace preference 저장

외부에서 호출될 수 있는 public API나 큰 payload는 Route Handler로 유지한다.

## 10. 구현 슬라이스

### P0: Money Leak Run 고정

- `/w/[workspaceId]` 첫 화면에서 Money Leak Run을 primary로 유지한다.
- production status가 실패하면 KPI/chart/agent success를 보여주지 않는다.
- PDF gate는 decision-backed + persisted artifact 조건을 요구한다.
- customer/expert audience copy를 분리한다.

### P1: Workspace Shell 정리

- `HealthHeader`, `ProductionStatusBanner`, `MoneyLeakStepRail`, `RoleLensSwitch`, `PdfArtifactGate`, `EvidenceSummary`로 분리한다.
- 기존 Vite `App.tsx`의 stage panel은 Next-native block으로 점진 이전한다.
- `stageCards.ts` layout policy를 Next workspace도 직접 사용한다.

### P2: Admin Readiness 확장

- corpus readiness C1/C2/C4/C9 표시
- Watchtower latest run + review queue
- connector/billing/retention blocked reason
- agent_service reachability

### P3: Report/Runtime Proof 강화

- `/reports/[id]`에 source decision ids, runtime proof, human approval metadata를 customer-safe 형태로 표시한다.
- expert mode에서 checkpoint id/status와 fallback reason을 펼친다.
- raw resume payload는 렌더하지 않는다.

### P4: Legacy Vite 축소

- Next route parity가 확보된 stage부터 legacy Vite surface를 baseline 전용으로 낮춘다.
- `legacy:vite:*` 명령은 회귀 비교용으로만 남긴다.

## 11. 카피 기준

사용자에게 보이는 문구는 기능 설명보다 상태와 다음 행동을 말해야 한다.

- `완료`: ledger row, artifact, external ref가 있을 때만 사용한다.
- `추천`: evidence/ref가 있을 때만 사용한다.
- `실행 가능`: readiness 조건이 모두 충족될 때만 사용한다.
- `샘플`: production-connected data처럼 표현하지 않는다.
- `PDF`: 저장된 artifact가 있을 때만 다운로드 CTA를 연다.
- provider/model/source/ref id는 `translate="no"`로 보호한다.

## 12. 모바일 우선순위

모바일은 desktop dashboard 축소판이 아니다. 순서는 다음으로 재배치한다.

1. production status
2. next decision
3. KPI 3개
4. Trust Gate summary
5. current primary diagnosis card
6. decision choice
7. PDF gate
8. evidence summary
9. admin/expert link

버튼과 긴 상태 문자열은 375px 폭에서 줄바꿈되어야 하며, ref id는 필요하면 expert drawer 안에서만 보여준다.

## 13. 수용 조건

- Next production route/page에서 `DEMO_*`, `VITE_AGENTCOST_DEMO_SEED`, memory fallback, request fixture를 production success처럼 import/render하지 않는다.
- `/w/demo` production checks 실패 시 KPI/chart/agent success가 나타나지 않는다.
- Trust Gate blocked 상태는 snapshot/report/decision-history로 넘어가지 않는다.
- role을 바꿔도 core KPI와 snapshot id가 바뀌지 않는다.
- customer audience에서 internal refs, raw route, raw checkpoint resume payload가 숨겨진다.
- RAG evidence는 fact/calculator 숫자를 override하지 않는다.
- baseline이 없으면 `baseline_unavailable`을 보여주고 peer average를 만들지 않는다.
- report page는 persisted artifact가 없으면 `production_report_unavailable`을 보여준다.
- billing/connector 실행은 approval, idempotency, rollback metadata, ledger 조건 전까지 blocked state다.
- `<meta name="google" content="notranslate" />`와 root `translate="no"`가 유지된다.
- `npm run test:run`과 `npm run build`가 UI 변경 후 통과해야 한다.

## 14. 구현자가 먼저 볼 파일

1. `app/(app)/w/[workspaceId]/page.tsx`
2. `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx`
3. `src/features/report-first/lib/moneyLeakRun.ts`
4. `src/features/report-first/lib/diagnosis.ts`
5. `src/features/role-projection/lib/stageCards.ts`
6. `src/features/agent/lib/agentRunRuntime.ts`
7. `app/(app)/w/[workspaceId]/admin/page.tsx`
8. `app/reports/[id]/page.tsx`
9. `docs/ux/2026-05-25-agentpayroll-webapp-ui-ux-brief.md`
10. `docs/PRD-current-state-2026-05-25.md`

## 15. 명시적 비범위

- Billing/Stripe/Metronome mutation을 customer primary flow로 올리지 않는다.
- Gateway/proxy 제품을 P0에 넣지 않는다.
- AI가 비용/마진/절감액 숫자를 생성하지 않는다.
- report artifact가 없는데 client에서 즉석 report를 만들어 성공처럼 보여주지 않는다.
- PRD 전체를 다시 쓰지 않는다. 이 문서는 Next UI content flow의 실행 기준이다.
