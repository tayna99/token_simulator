const DEFAULT_STATUS = 'draft'
const SENSITIVE_PATH_RE = /(^|[/\\])(\.env|.*\.local$|.*secret.*|.*credential.*|.*token.*)([/\\]|$)/i
const SECRET_VALUE_RE =
  /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|API_KEY|SECRET|TOKEN|PASSWORD)\s*[:=]|sk-[A-Za-z0-9_-]{8,}/i

export function sanitizeSlug(value) {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return slug || 'update'
}

export function redactSensitiveText(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .filter(line => !SECRET_VALUE_RE.test(line))
    .map(line => line.replace(/sk-[A-Za-z0-9_-]{8,}/g, '[redacted-secret]'))
    .join('\n')
}

export function sanitizePath(value) {
  const path = String(value ?? '').replaceAll('\\', '/')
  return SENSITIVE_PATH_RE.test(path) || SECRET_VALUE_RE.test(path)
    ? '[redacted-sensitive-path]'
    : path
}

export function parseNameStatus(output) {
  return String(output ?? '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(/\t+/)
      const status = parts[0] ?? '?'
      const path = parts.length > 2 ? parts[parts.length - 1] : parts[1]
      return {
        status,
        path: sanitizePath(path ?? ''),
      }
    })
}

export function parseLog(output) {
  return String(output ?? '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [hash, ...subjectParts] = line.split(/\t/)
      return {
        hash: hash || 'unknown',
        subject: subjectParts.join('\t') || 'No subject',
      }
    })
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ''))
}

function yamlList(values) {
  const list = values.filter(Boolean)
  return list.length > 0 ? list.map(value => `  - ${yamlString(value)}`).join('\n') : '  []'
}

function formatTableRows(rows) {
  return rows.length > 0 ? rows.join('\n') : '| none | none |'
}

export function buildRunMarkdown(input) {
  const nowIso = input.nowIso ?? new Date().toISOString()
  const id = input.id ?? `RUN-${nowIso.slice(0, 10)}-${sanitizeSlug(input.title ?? input.branch)}`
  const status = input.status ?? DEFAULT_STATUS
  const stagedFiles = input.stagedFiles ?? []
  const workingTreeSummary = (input.workingTreeSummary ?? []).map(line => redactSensitiveText(line))
  const verification = input.verification ?? []
  const sourceDocs = input.sourceDocs ?? ['docs/ai-native-company-recordkeeping.md']
  const stagedRows = stagedFiles.map(file => `| ${file.status || '?'} | \`${sanitizePath(file.path)}\` |`)
  const workingRows = workingTreeSummary
    .filter(Boolean)
    .map(line => `- \`${sanitizePath(redactSensitiveText(line))}\``)

  return `---
id: ${id}
type: agent_run
title: ${yamlString(input.title ?? 'Company memory capture')}
status: ${yamlString(status)}
created_at: ${yamlString(nowIso)}
branch: ${yamlString(input.branch ?? 'unknown')}
head: ${yamlString(input.head ?? 'unknown')}
work_item_id: ${yamlString(input.workItem ?? 'WI-pending')}
decision_id: ${yamlString(input.decision ?? 'ADR-pending')}
human_review: ${yamlString(input.humanReview ?? 'required')}
source_docs:
${yamlList(sourceDocs)}
---

# ${input.title ?? 'Company memory capture'}

## Purpose
Capture the current repository update as an AI-readable operating record without copying raw diffs, secrets, or broad chat history.

## Scope
| field | value |
|---|---|
| branch | \`${input.branch ?? 'unknown'}\` |
| head | \`${input.head ?? 'unknown'}\` |
| work item | \`${input.workItem ?? 'WI-pending'}\` |
| decision | \`${input.decision ?? 'ADR-pending'}\` |
| status | \`${status}\` |

## Staged Files
| status | path |
|---|---|
${formatTableRows(stagedRows)}

## Working Tree Snapshot
${workingRows.length > 0 ? workingRows.join('\n') : '- No additional working tree summary captured.'}

## Verification
${verification.length > 0 ? verification.map(item => `- ${redactSensitiveText(item)}`).join('\n') : '- pending'}

## Review State
This record is generated as \`${status}\`. Human review must move it to \`review\`, \`approved\`, \`blocked\`, or \`done\` with evidence.

## Leakage Controls
- Raw diffs are intentionally omitted.
- Sensitive paths are redacted.
- Environment values and credential-looking strings are dropped.
- Draft records are not production evidence.

## Next State
review
`
}

function hasTrailer(message, name) {
  return new RegExp(`^${name}:\\s*\\S+`, 'im').test(message)
}

function trailerValue(message, name) {
  const match = message.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'))
  return match?.[1]?.trim() ?? ''
}

export function validateCommitMessage(message) {
  const text = String(message ?? '').replace(/^\uFEFF/, '')
  const errors = []
  const warnings = []
  const subject = text.split(/\r?\n/, 1)[0] ?? ''

  if (SECRET_VALUE_RE.test(text)) {
    errors.push('Commit message appears to contain a secret or credential.')
  }

  if (!/^(feat|fix|docs|test|chore|refactor|perf|build|ci|style|revert)(\([^)]+\))?: .+/.test(subject)) {
    errors.push('Subject must use a conventional commit prefix.')
  }

  if (/^Company-Memory:\s*skip\s*$/im.test(text)) {
    if (!hasTrailer(text, 'Skip-Reason')) {
      errors.push('Company-Memory: skip requires Skip-Reason.')
    }
    return { ok: errors.length === 0, errors, warnings }
  }

  for (const required of ['Work-Item', 'Verification', 'Human-Review']) {
    if (!hasTrailer(text, required)) {
      errors.push(`Missing required trailer: ${required}.`)
    }
  }

  const humanReview = trailerValue(text, 'Human-Review')
  if (humanReview && !/^(required|not_required)$/i.test(humanReview)) {
    errors.push('Human-Review must be required or not_required.')
  }

  if (!hasTrailer(text, 'Decision')) {
    warnings.push('Decision trailer is recommended when a product or architecture decision is involved.')
  }

  return { ok: errors.length === 0, errors, warnings }
}

export function buildWeeklyMarkdown(input) {
  const commits = input.commits ?? []
  const runFiles = input.runFiles ?? []
  const openItems = input.openItems ?? []

  return `---
id: ${input.id}
type: weekly_review
period: ${yamlString(input.period)}
owner: "founder"
status: "draft"
generated_at: ${yamlString(input.generatedAt)}
branch: ${yamlString(input.branch ?? 'unknown')}
---

# Weekly AI-Native Operating Review

## Done
| commit | subject |
|---|---|
${formatTableRows(commits.map(commit => `| \`${commit.hash}\` | ${redactSensitiveText(commit.subject)} |`))}

## Agent Run Records
${runFiles.length > 0 ? runFiles.map(file => `- \`${sanitizePath(file)}\``).join('\n') : '- none'}

## Still Open
${openItems.length > 0 ? openItems.map(item => `- ${redactSensitiveText(item)}`).join('\n') : '- pending review'}

## Verification
- Missing verification remains \`pending\` or \`unknown\`; this review does not infer completion.

## Risks
- Dirty worktree changes may be unrelated unless linked by Work-Item trailers.
- Production-connected evidence must remain separate from deterministic previews.

## Next Week
1. Close pending work items with verification evidence.
2. Review stale decisions and guardrails.
3. Refresh weekly summary after the next scoped commit batch.
`
}

export function getIsoWeek(date = new Date()) {
  const working = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = working.getUTCDay() || 7
  working.setUTCDate(working.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((working - yearStart) / 86400000 + 1) / 7)
  return `${working.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function formatDateInTimeZone(date = new Date(), timeZone = 'Asia/Seoul') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
