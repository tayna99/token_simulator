import { describe, expect, it } from 'vitest'

import {
  buildRunMarkdown,
  buildWeeklyMarkdown,
  formatDateInTimeZone,
  sanitizeSlug,
  validateCommitMessage,
} from './core.mjs'

describe('company memory core', () => {
  it('sanitizes branch and title text into stable slugs', () => {
    expect(sanitizeSlug('codex/langchain 1: interpreter integration!!')).toBe(
      'codex-langchain-1-interpreter-integration',
    )
    expect(sanitizeSlug('')).toBe('update')
  })

  it('formats operating dates in the configured timezone', () => {
    expect(formatDateInTimeZone(new Date('2026-05-25T19:00:00.000Z'), 'Asia/Seoul')).toBe(
      '2026-05-26',
    )
  })

  it('builds run markdown from metadata without leaking diff contents or env values', () => {
    const markdown = buildRunMarkdown({
      id: 'RUN-2026-05-26-ai-memory',
      title: 'AI memory capture',
      status: 'review',
      branch: 'codex-langchain-1-interpreter-integration',
      head: 'abc1234',
      workItem: 'WI-2026-05-26-ai-memory',
      decision: 'ADR-2026-05-26-recordkeeping',
      humanReview: 'required',
      verification: ['npm run test:run -- scripts/company-memory/core.test.mjs'],
      stagedFiles: [
        { status: 'A', path: 'scripts/company-memory/capture-update.mjs' },
        { status: 'M', path: '.env.local' },
        { status: 'A', path: 'docs/company-memory/sk-live-abc12345.md' },
      ],
      diffStat: 'do not include OPENAI_API_KEY=sk-test-secret or raw diff hunks',
      workingTreeSummary: [' M src/app/App.test.tsx'],
      sourceDocs: ['docs/ai-native-company-recordkeeping.md'],
      nowIso: '2026-05-26T12:00:00.000Z',
    })

    expect(markdown).toContain('id: RUN-2026-05-26-ai-memory')
    expect(markdown).toContain('WI-2026-05-26-ai-memory')
    expect(markdown).toContain('scripts/company-memory/capture-update.mjs')
    expect(markdown).toContain('[redacted-sensitive-path]')
    expect(markdown).not.toContain('sk-live-abc12345')
    expect(markdown).not.toContain('OPENAI_API_KEY=')
    expect(markdown).not.toContain('raw diff hunks')
  })

  it('keeps draft state semantics explicit in generated run records', () => {
    const markdown = buildRunMarkdown({
      id: 'RUN-2026-05-26-ai-memory',
      title: 'AI memory capture',
      status: 'draft',
      branch: 'main',
      head: 'abc1234',
      stagedFiles: [],
      workingTreeSummary: [],
      verification: [],
      nowIso: '2026-05-26T12:00:00.000Z',
    })

    expect(markdown).toContain('status: "draft"')
    expect(markdown).toContain('## Review State')
    expect(markdown).toContain('This record is generated as `draft`')
    expect(markdown).toContain('## Next State\nreview')
  })

  it('requires AI-readable commit footers and rejects likely secrets', () => {
    expect(validateCommitMessage(`\uFEFFfeat: add memory capture

Work-Item: WI-2026-05-26-ai-memory
Decision: ADR-2026-05-26-recordkeeping
Verification: npm run test:run -- scripts/company-memory/core.test.mjs
Human-Review: required
`)).toEqual({ ok: true, errors: [], warnings: [] })

    expect(validateCommitMessage('feat: add memory capture').ok).toBe(false)
    expect(validateCommitMessage(`feat: leak

Work-Item: WI-2026-05-26-ai-memory
Verification: npm run test:run
Human-Review: not_required
OPENAI_API_KEY=sk-test-secret
`).errors).toContain('Commit message appears to contain a secret or credential.')
  })

  it('allows explicit skip only with a reason', () => {
    expect(validateCommitMessage(`chore: generated lock refresh

Company-Memory: skip
Skip-Reason: lockfile-only dependency metadata refresh
`).ok).toBe(true)

    expect(validateCommitMessage(`chore: generated lock refresh

Company-Memory: skip
`).ok).toBe(false)
  })

  it('builds weekly review markdown from commits and agent run files', () => {
    const markdown = buildWeeklyMarkdown({
      id: 'WEEKLY-2026-W22',
      period: '2026-W22',
      generatedAt: '2026-05-26T12:00:00.000Z',
      branch: 'codex-langchain-1-interpreter-integration',
      commits: [
        { hash: 'abc1234', subject: 'feat: add memory capture' },
        { hash: 'def5678', subject: 'test: cover memory capture' },
      ],
      runFiles: [
        'docs/company-memory/40-agent-runs/2026-05-26-ai-memory.md',
      ],
      openItems: ['production demo tenant'],
    })

    expect(markdown).toContain('id: WEEKLY-2026-W22')
    expect(markdown).toContain('abc1234')
    expect(markdown).toContain('2026-05-26-ai-memory.md')
    expect(markdown).toContain('production demo tenant')
  })
})
