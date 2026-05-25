---
id: RUN-2026-05-26-wi-2026-05-26-company-memory-automation
type: agent_run
title: "Company memory automation"
status: "draft"
created_at: "2026-05-25T20:04:04.629Z"
branch: "codex-langchain-1-interpreter-integration"
head: "86d5130"
work_item_id: "WI-2026-05-26-company-memory-automation"
decision_id: "ADR-2026-05-26-commit-time-recordkeeping"
human_review: "required"
source_docs:
  - "docs/ai-native-company-recordkeeping.md"
---

# Company memory automation

## Purpose
Capture the current repository update as an AI-readable operating record without copying raw diffs, secrets, or broad chat history.

## Scope
| field | value |
|---|---|
| branch | `codex-langchain-1-interpreter-integration` |
| head | `86d5130` |
| work item | `WI-2026-05-26-company-memory-automation` |
| decision | `ADR-2026-05-26-commit-time-recordkeeping` |
| status | `draft` |

## Staged Files
| status | path |
|---|---|
| none | none |

## Working Tree Snapshot
- `M package.json`
- ` M src/app/App.test.tsx`
- ` M src/features/pricing/lib/rateCardDraft.test.ts`
- ` M src/features/pricing/lib/rateCardDraft.ts`
- ` M src/features/role-projection/lib/projectSnapshotForRole.test.ts`
- `?? .githooks/`
- `?? docs/ai-native-company-recordkeeping.md`
- `?? docs/company-memory/`
- `?? scripts/company-memory/`

## Verification
- npm run test:run -- scripts/company-memory/core.test.mjs => 1 file / 7 tests passed
- npm run test:run => failed outside this commit scope in `src/features/trust/components/TrustAssurancePanel.test.tsx` while unstaged trust changes were present
- npm run build => passed

## Review State
This record is generated as `draft`. Human review must move it to `review`, `approved`, `blocked`, or `done` with evidence.

## Leakage Controls
- Raw diffs are intentionally omitted.
- Sensitive paths are redacted.
- Environment values and credential-looking strings are dropped.
- Draft records are not production evidence.

## Next State
review
