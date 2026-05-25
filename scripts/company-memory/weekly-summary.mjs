#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { buildWeeklyMarkdown, formatDateInTimeZone, getIsoWeek, parseLog } from './core.mjs'

function parseArgs(argv) {
  const options = {
    dryRun: false,
    range: 'HEAD~10..HEAD',
    openItems: [],
    timeZone: 'Asia/Seoul',
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--range') {
      options.range = next
      i += 1
    } else if (arg === '--period') {
      options.period = next
      i += 1
    } else if (arg === '--open') {
      options.openItems.push(next)
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

function listRunFiles() {
  const dir = 'docs/company-memory/40-agent-runs'
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(file => file.endsWith('.md'))
    .sort()
    .slice(-30)
    .map(file => join(dir, file).replaceAll('\\', '/'))
}

function ensureInsideCompanyMemory(path) {
  const base = resolve('docs/company-memory')
  const target = resolve(path)
  if (target !== base && !target.startsWith(`${base}\\`) && !target.startsWith(`${base}/`)) {
    throw new Error('Refusing to write outside docs/company-memory')
  }
  return target
}

const options = parseArgs(process.argv.slice(2))
const now = new Date()
const period = options.period ?? getIsoWeek(now)
const date = formatDateInTimeZone(now, options.timeZone)
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown'
const commits = parseLog(git(['log', '--pretty=format:%h%x09%s', options.range]))
const markdown = buildWeeklyMarkdown({
  id: `WEEKLY-${period}`,
  period,
  generatedAt: now.toISOString(),
  branch,
  commits,
  runFiles: listRunFiles(),
  openItems: options.openItems,
})

if (options.dryRun) {
  process.stdout.write(markdown)
  process.exit(0)
}

const output = ensureInsideCompanyMemory(
  options.output ?? `docs/company-memory/50-evals/${date}-weekly-review-${period}.md`,
)
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, markdown, 'utf8')
console.log(`Wrote ${output}`)
