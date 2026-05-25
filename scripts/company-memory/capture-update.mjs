#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { buildRunMarkdown, formatDateInTimeZone, parseNameStatus, sanitizeSlug } from './core.mjs'

function parseArgs(argv) {
  const options = {
    sourceDocs: ['docs/ai-native-company-recordkeeping.md'],
    verification: [],
    status: 'draft',
    humanReview: 'required',
    dryRun: false,
    timeZone: 'Asia/Seoul',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--title') {
      options.title = next
      i += 1
    } else if (arg === '--work-item') {
      options.workItem = next
      i += 1
    } else if (arg === '--decision') {
      options.decision = next
      i += 1
    } else if (arg === '--status' || arg === '--state') {
      options.status = next
      i += 1
    } else if (arg === '--human-review') {
      options.humanReview = next
      i += 1
    } else if (arg === '--verification') {
      options.verification.push(next)
      i += 1
    } else if (arg === '--source-doc') {
      options.sourceDocs.push(next)
      i += 1
    } else if (arg === '--output') {
      options.output = next
      i += 1
    } else if (arg === '--timezone') {
      options.timeZone = next
      i += 1
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return options
}

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function ensureInsideCompanyMemory(path) {
  const base = resolve('docs/company-memory')
  const target = resolve(path)
  if (target !== base && !target.startsWith(`${base}\\`) && !target.startsWith(`${base}/`)) {
    throw new Error('Refusing to write outside docs/company-memory')
  }
  return target
}

function uniquePath(path) {
  if (!existsSync(path)) return path
  const dot = path.lastIndexOf('.')
  const base = dot === -1 ? path : path.slice(0, dot)
  const ext = dot === -1 ? '' : path.slice(dot)
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}-${index}${ext}`
    if (!existsSync(candidate)) return candidate
  }
  throw new Error('Could not find a unique company-memory output path')
}

const options = parseArgs(process.argv.slice(2))
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown'
const head = git(['rev-parse', '--short', 'HEAD']) || 'unknown'
const stagedFiles = parseNameStatus(git(['diff', '--cached', '--name-status']))
const workingTreeSummary = git(['status', '--short']).split(/\r?\n/).filter(Boolean)
const now = new Date()
const date = formatDateInTimeZone(now, options.timeZone)
const title = options.title ?? `Company memory capture for ${branch}`
const slug = sanitizeSlug(options.workItem ?? title)
const id = `RUN-${date}-${slug}`
const markdown = buildRunMarkdown({
  id,
  title,
  status: options.status,
  branch,
  head,
  workItem: options.workItem,
  decision: options.decision,
  humanReview: options.humanReview,
  verification: options.verification,
  stagedFiles,
  workingTreeSummary,
  sourceDocs: [...new Set(options.sourceDocs)],
  nowIso: now.toISOString(),
})

if (options.dryRun) {
  process.stdout.write(markdown)
  process.exit(0)
}

const output = uniquePath(
  ensureInsideCompanyMemory(
    options.output ?? `docs/company-memory/40-agent-runs/${date}-${slug}.md`,
  ),
)
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, markdown, 'utf8')
console.log(`Wrote ${output}`)
