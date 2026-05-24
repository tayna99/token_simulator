# AgentCost Service MVP Runbook

## Flow

1. Lead intake
2. A/B/C fit scoring
3. Discovery call
4. Data request
5. Trust check
6. Normalized usage table
7. Deterministic cost snapshot
8. Operating team review
9. Report review gate
10. Customer review call
11. Decision/Operating Ledger entry

## Do Not Promise

- Real-time monitoring before SDK/gateway collection exists.
- Guaranteed savings without quality validation.
- Raw prompt analysis by default.
- Billing changes without explicit human approval.

## Definition Of Done For One Customer

- Usage export passed Trust check or blocked scopes were explained.
- Snapshot has formula and provider versions.
- Report has no raw prompt and no uncited numeric claim.
- Customer decision was recorded with refs.

## P1 Queue Link

Keep the P1 queue in `docs/superpowers/plans/2026-05-24-complete-service-mvp-trust-runtime.md` as the authority for the next build pass: supervisor agent-as-tool orchestration, full vector RAG, official docs change monitoring, SDK/gateway collection, vLLM/GPU economics, alerts, billing execution, benchmark marketplace, SaaS dashboard, and retention automation.
