# AgentPayroll Web App UI/UX Planning Brief

Date: 2026-05-25

## 1. Product In One Sentence

AgentPayroll is an AI cost and margin operations web app for AI SaaS teams. It converts usage logs into customer, feature, model, plan, session, and agent-run economics, then connects RAG evidence, Watchtower review, rate cards, reports, and external actions so operators can decide what to approve, hold, or change.

## 2. Core UX Principles

- Even the demo must succeed only on the production path.
- If Supabase, Auth, pgvector, reports, or `agent_service` are missing, show `unavailable` instead of a fake dashboard.
- RAG must not create numbers. RAG is evidence; numeric authority comes from the calculator and accepted fact ledger.
- Every execution path is gate-first. Without approval, idempotency, rollback metadata, and ledger rows, show a blocked state instead of an execution CTA.
- The default persona is `developer`.
- The product name is `AgentPayroll`.
- The first report CTA is PDF.
- Trust Gate is not a hidden security feature; it is the first reassurance moment. Immediately after upload, explain raw prompt/API key/PII handling and the limited analysis scope.
- Role-specific UX means one truth, three lenses. Developer/PM/CEO use the same snapshot id and KPI values while changing only questions, emphasis, and card order.
- PDF is not a secondary export. It is the value proof that a founder, board, or customer can share.
- The MVP sells decision confidence before billing automation. Connector execution belongs in an admin readiness/locked section; the primary outcome is a Rate Card Draft plus a human decision.

## 3. Primary Users

| User | Main Interest | Default Emphasis |
|---|---|---|
| Developer | Import schema, traces, retry/cache behavior, model usage, agent-run bottlenecks | Operational signals, debug refs, serving bottlenecks |
| PM | Feature/customer/plan economics, pricing scenarios | Feature economics, decision readiness, customer-safe report |
| CEO | Margin risk, loss-making customers, rate card, report | Margin risk, one-page summary, export/billing gate |
| Admin/Owner | Auth, membership, corpus, connectors, retention | Readiness checklist, blocked reasons, sandbox controls |
| Customer viewer | Results without internal refs | Report, accepted evidence, masked refs |

## 4. Route Structure

| Route | Purpose | Success State | Failure State |
|---|---|---|---|
| `/` | SSR marketing and production demo entry | Product name, category, demo CTA, report example | No fake screenshot |
| `/login` | Supabase Auth login | User enters seeded demo account credentials | Auth/env/session error |
| `/w/[workspaceId]` | Main operations workspace | Production checks + KPIs + decision flow | `production_demo_unavailable` |
| `/w/[workspaceId]/admin` | Operations readiness/admin | Corpus, connector, retention, billing status | Missing permission or env |
| `/reports/[id]` | Persisted artifact viewer | PDF first + Markdown/JSON secondary | Missing artifact |

## 5. Main Workspace Layout

1. Health header: workspace id/name, role switch, audience mode, production status, stale badge.
2. KPI strip: monthly AI cost, margin risk, loss-making customers/features, recommended next decision.
3. Stage navigator: `Design -> Cost -> Bottleneck -> Optimize+Risk -> Decision Log`.
4. Primary work area: role-specific primary cards.
5. Evidence/Agent rail: RAG refs, accepted facts, provider proof, fallback reason.
6. Decision footer/rail: adopt/reject/hold, report export gate, last actor/time.

## 6. Stage Features

| Stage | Main Features | Representative UI |
|---|---|---|
| Design | Usage import, schema mapping, team/agent setup, trust gate | Import panel, schema checklist, trust warnings |
| Cost | Customer/feature/model/plan/session/agent-run attribution | Tables, KPI cards, cost breakdown |
| Bottleneck | Retry/cache/model/serving bottlenecks | Operational signal cards, trace refs |
| Optimize+Risk | Routing, pricing, benchmark, rate card, risk cards | Scenario panel, risk cards, rate-card readiness |
| Decision Log | Adopt/reject/hold, report gate, ledger | Decision list, export gate, report CTA |

## 6.1 Trust Gate First

The first success moment in the Design/Import stage is not a cost chart. It is reassurance about what AgentPayroll did not collect or use.

- Required reassurance copy:
  - "raw prompt는 수집하지 않았습니다."
  - "API key 후보는 차단했습니다."
  - "PII 후보가 있어 매핑 검토가 필요합니다."
  - "이 데이터는 원가/마진 분석에 필요한 범위로만 사용됩니다."
- `ready`: show that cost/margin analysis can continue.
- `needs_mapping`: require PII/plan/customer/revenue mapping review without presenting fake success.
- `blocked`: state that blocked data cannot become a usage snapshot, decision history corpus, or report artifact.
- Put detailed security and retention metadata in a secondary panel; the first panel should focus on trust and next action.

## 7. Role Projection

All roles use the same snapshot, but the central content order changes. Numeric values must not change.

| Role | Primary | Auxiliary/Hidden |
|---|---|---|
| Developer | Operational signals, import/schema, trace, retry/cache, serving | CEO summary, customer-facing report |
| PM | Feature economics, pricing scenario, customer/plan readiness | Low-level debug refs |
| CEO | Margin risk, loss-making customers, rate card/report/export | Detailed trace/debug |
| Customer audience | Accepted facts, public-safe report | Internal refs, debug, raw trace |

Every role header should show a `same snapshot` proof badge. Developer asks "why cost increased", PM asks "which feature or plan is the problem", and CEO asks "how much is leaking and what decision is needed", but monthly cost, margin, customer count, and snapshot id must remain identical.

## 7.1 PDF And Decision Draft

- The first report CTA should use value-oriented copy such as "Share board-ready PDF".
- The report page should show persisted artifact metadata, source decision, content type, and generated time around the PDF preview/download.
- The primary rate-card panel is a decision draft, not a billing execution panel.
- The decision draft must include why pricing needs to change, the recommended mechanism, affected customers, expected margin improvement, and required approval.
- Stripe/Metronome execution belongs in an admin `Execution deferred`/readiness area and remains secondary locked UI until all safety gates are satisfied.

## 8. Core State Model

- `connected`: Data was read from production store/service.
- `unavailable`: Env, DB, service, membership, or corpus is missing.
- `blocked`: Missing permission, approval, idempotency, rollback, or ledger.
- `connector_not_configured`: Slack, Resend, Stripe, or Metronome env is missing.
- `deterministic_preview`: Calculator preview only; not a completed agent execution.
- `provider_llm`: Real provider-backed agent run.
- `needs_review`: Benchmark, parser, or source needs review.
- `baseline_unavailable`: Benchmark is missing. Do not invent peer averages.
- `stale`: Watchtower, fact, or corpus freshness SLA has expired.

## 9. Full Feature List

- Supabase Auth login
- Workspace membership/RLS gate
- Production demo readiness check
- Usage CSV/summary/SDK-lite import
- Trust Gate: raw prompt/API key blocked, PII needs mapping, file type/size checks
- Deterministic cost/margin calculator
- Customer/feature/model/plan/session/agent-run attribution
- C1 official source corpus
- C2 benchmark corpus
- C3 serving economics corpus
- C4 usage schema corpus
- C9 decision history corpus
- pgvector-backed RAG search
- Watchtower runs/review/accepted facts
- Provider-backed agent runtime
- Runtime status API
- Risk cards
- Optimization recommendations
- Rate-card state machine
- Billing readiness panel
- Slack/Email/Stripe/Metronome connector readiness
- External action approval/execution ledger
- Persisted report artifacts: PDF, Markdown, JSON
- Retention jobs: deletion/export audit
- Admin readiness/review surface

## 10. Admin UX

Admin is primarily where operators see why something is blocked, not where they blindly execute actions.

Required panels:

- Supabase/Auth readiness
- Workspace membership status
- Corpus readiness: C1/C2/C3/C4/C9
- Watchtower latest run + review queue
- Accepted facts ledger status
- RAG index status
- Connector status
- Rate card/billing gate
- Retention jobs
- Report artifacts
- `agent_service` reachability

Mutation buttons are blocked by default:

- Owner/admin permission required
- Sandbox/test env required
- Human approval required
- Idempotency key required
- Rollback metadata required
- Ledger row required

## 11. Report UX

The report page is a persisted artifact viewer.

Priority:

1. PDF download primary CTA
2. Markdown secondary
3. JSON secondary/internal

Must show:

- report id
- workspace id
- artifact format/content type
- source decision ids
- generated timestamp
- evidence refs
- unavailable/deleted status

## 12. Copy Principles

- Use "completed" only when there is a ledger row and external ref.
- Use "recommended" only when evidence/ref exists.
- Use "executable" only when every readiness condition is true.
- Without production connectivity, the state is "demo unavailable", not "sample data shown".
- Protect provider/model/source ids with `translate="no"`.

## 13. Mobile UX

Do not shrink the desktop dashboard. Reorder the flow.

Mobile order:

1. production status
2. next decision
3. top 3 KPIs
4. current stage primary card
5. evidence summary
6. decision action
7. report/export gate

## 14. Design Tone

- Calm, dense SaaS operations tool.
- Avoid decorative hero/card excess.
- Avoid purple gradients, neon, and glassmorphism.
- Status colors must be clear: connected, caution, blocked, unavailable.
- Avoid nested cards.
- Tables and lists should support repeated scanning.

## 15. UI Acceptance Criteria

- No `DEMO_*` imports in production routes.
- If `/w/demo` checks fail, no KPI/chart/agent success is shown.
- Changing role must not change cost/margin numbers.
- Customer audience hides internal refs/debug.
- Reports render only from saved artifacts.
- RAG does not override facts or calculator numbers.
- Billing push is blocked without connector + approval + idempotency + rollback + ledger.
- No text or button overflow at 375px mobile width.

## 16. Language Switch / i18n Requirements

AgentPayroll must provide Korean and English as separate language resources, and users must be able to switch between them inside the web app.

Core requirements:

- Korean and English share the same screen structure, but visible copy/source text is managed in separate resources.
- The language switch should live in the workspace header or user/account menu.
- The selected language is stored as a workspace/user preference. Before login, preserve it as a browser/session preference.
- Do not translate provider names, model ids, source ids, ref ids, or code-like tokens.
- Keep `translate="no"` protections. Do not rely on browser auto-translation.
- Report artifacts must include locale metadata, for example `locale: ko-KR | en-US`.
- PDF/Markdown/JSON report downloads must distinguish locale-specific artifacts.
- Korean and English versions should carry the same meaning, but the copy should sound natural in each language rather than mechanically translated.

Required locales:

- `ko-KR`: default Korean operations UI.
- `en-US`: English operations UI and customer-facing reports.

Localized resources:

- route/page visible copy
- status/error/blocked reason copy
- stage/card titles and descriptions
- role projection copy
- Trust Gate warning copy
- Admin readiness copy
- Rate-card/billing readiness copy
- Report artifact copy
- Email/Slack connector draft copy

Language switch acceptance criteria:

- Changing language must not change cost, margin, token, or percentage values.
- Provider/model/source/ref ids stay identical in both languages.
- Unavailable/blocked/error states are available in both languages.
- Customer audience internal ref masking is identical across languages.
- Korean and English text both fit at 375px mobile width without button/card overflow.
