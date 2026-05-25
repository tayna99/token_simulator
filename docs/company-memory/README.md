# Company Memory

This folder stores AI-readable operating records for AgentPayroll work.

The canonical guide is `docs/ai-native-company-recordkeeping.md`. This folder is the operational form of that guide: small Markdown/JSONL records that can be read by humans and resumed by AI agents.

## Folders

```text
docs/company-memory/
  00-principles/   operating principles, guardrails, permission policy
  10-work-items/   stateful Work Item records
  20-decisions/    ADR-style decision records
  30-meetings/     meeting notes that generate decisions/work items
  40-agent-runs/   generated or curated agent run records
  50-evals/        eval cases and weekly reviews
```

## Commands

Create an agent run draft from current git metadata:

```powershell
npm run memory:capture -- --title "Money Leak Run decision gate" --work-item WI-2026-05-26-money-leak-run-decision-gate --decision ADR-2026-05-25-decision-log-before-export --verification "npm run test:run"
```

Preview without writing:

```powershell
npm run memory:capture -- --dry-run --title "Memory capture dry run"
```

Generate a weekly review from bounded sources:

```powershell
npm run memory:weekly -- --range HEAD~10..HEAD --open "production demo tenant"
```

Check a commit message file:

```powershell
npm run memory:check-commit -- .git/COMMIT_EDITMSG
```

Enable the local Git hook:

```powershell
git config core.hooksPath .githooks
```

## Commit Message Contract

Commit messages should use a conventional subject and these trailers:

```text
feat: add memory capture

Work-Item: WI-2026-05-26-ai-memory
Decision: ADR-2026-05-26-recordkeeping
Verification: npm run test:run -- scripts/company-memory/core.test.mjs
Human-Review: required
```

`Decision` is recommended when a product or architecture decision is involved. For mechanical changes, use an explicit skip:

```text
chore: refresh lockfile

Company-Memory: skip
Skip-Reason: lockfile-only dependency metadata refresh
```

## Leakage Rules

- Do not store raw diffs.
- Do not copy chat transcripts into records.
- Do not record `.env`, `*.local`, token, secret, credential, or API key values.
- Do not infer production evidence from fixture, memory fallback, deterministic preview, or request-body data.
- Write automation output only under `docs/company-memory/`.
- Mark missing verification as `pending` or `unknown`, never `done`.

## Status Model

Allowed operational states:

- `draft`
- `new`
- `in_progress`
- `review`
- `approved`
- `blocked`
- `done`
- `superseded`

Use `draft` for generated records that have not been checked by a human. Use `pending` only inside checklist fields such as verification result placeholders, not as a top-level record status. Use `done` only after fresh verification evidence exists.

## AI Draft vs Human Approval

AI-generated text belongs in an `AI Draft` or `agent_run` section. It is not approval.

Human approval must name the reviewer, decision, timestamp, and reason. For AgentPayroll, execution-like paths such as billing, connector calls, report export, and accepted Fact Ledger updates stay blocked until the human decision is recorded.

## Deterministic Preview vs Production Evidence

`deterministic_preview` means local deterministic code produced a preview. It must not be rendered or recorded as provider execution, connector success, Supabase-backed production evidence, or accepted Fact Ledger truth.

Production-connected evidence requires the real production path named in the current PRD: Supabase Auth/Postgres/pgvector, accepted facts, connector ledger, persisted report artifact, and reachable `agent_service` where applicable.
