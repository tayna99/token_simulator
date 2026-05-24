#!/usr/bin/env node
/**
 * check-provider-pricing.mjs
 *
 * 신규 모델 발표 / 가격 변경을 캐치하기 위한 모니터링 스크립트.
 *
 * 동작:
 *   1. 모든 모델의 priceSourceUrl을 모은 뒤 unique한 페이지 셋으로 줄인다.
 *   2. 각 페이지 본문을 fetch해서 SHA-256 hash를 계산.
 *   3. scripts/research/.pricing-hashes.json 에 저장된 직전 해시와 비교.
 *   4. 다른 경우 ⚠ 표시 + 변경 URL 목록 + 새 해시 저장.
 *   5. 추가로 카탈로그 안의 'estimated'/'tbd' 모델을 출력해
 *      "후속 확인이 필요한 모델"을 매주 brief에 노출할 수 있게 한다.
 *
 * 사용:
 *   node scripts/research/check-provider-pricing.mjs
 *   node scripts/research/check-provider-pricing.mjs --update   # 해시 baseline 갱신
 *
 * Exit code: 0 (변경 없음), 1 (변경 감지), 2 (네트워크 오류).
 *
 * 헌법 §리서치 인프라: 모델 단가 검증 자동화 / 수동 갱신은 주 1회 권장.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..')
const HASH_FILE = resolve(SCRIPT_DIR, '.pricing-hashes.json')
const MODELS_TS = resolve(REPO_ROOT, 'src', 'features', 'alternatives', 'data', 'models.ts')

const args = new Set(process.argv.slice(2))
const UPDATE_BASELINE = args.has('--update')

function extractSourceUrls(modelsSource) {
  // Naive but robust: find every priceSourceUrl: '...' literal.
  const re = /priceSourceUrl:\s*'([^']+)'/g
  const urls = new Set()
  let match
  while ((match = re.exec(modelsSource)) !== null) {
    urls.add(match[1])
  }
  return [...urls].sort()
}

function extractStatusRows(modelsSource) {
  // Pull model id + pricingStatus when a row still needs pricing confirmation.
  const blockRe = /id:\s*'([^']+)',\s*name:\s*'([^']+)'[\s\S]*?pricingStatus:\s*'(estimated|tbd|unavailable)'/g
  const rows = []
  let match
  while ((match = blockRe.exec(modelsSource)) !== null) {
    rows.push({ id: match[1], name: match[2], status: match[3] })
  }
  return rows
}

async function fetchHash(url, signal) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'token-simulator pricing monitor (research)' },
    signal,
  })
  if (!response.ok) {
    throw new Error(`${url} → HTTP ${response.status} ${response.statusText}`)
  }
  const text = await response.text()
  // Strip obvious dynamic fragments to reduce false positives.
  const normalized = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/csrf[a-z-]*=["'][^"']+["']/gi, '')
    .replace(/nonce=["'][^"']+["']/gi, '')
    .replace(/\d{10,13}/g, 'TS')           // unix timestamps
    .replace(/[a-f0-9]{32,}/gi, 'HASH')    // long hex tokens
    .replace(/\s+/g, ' ')
    .trim()
  return createHash('sha256').update(normalized).digest('hex')
}

function loadBaseline() {
  if (!existsSync(HASH_FILE)) return {}
  try {
    return JSON.parse(readFileSync(HASH_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveBaseline(map) {
  mkdirSync(dirname(HASH_FILE), { recursive: true })
  writeFileSync(HASH_FILE, JSON.stringify(map, null, 2) + '\n', 'utf8')
}

async function main() {
  const modelsSource = readFileSync(MODELS_TS, 'utf8')
  const urls = extractSourceUrls(modelsSource)
  const statusRows = extractStatusRows(modelsSource)

  if (urls.length === 0) {
    console.error('No priceSourceUrl entries found in catalog.')
    process.exit(2)
  }

  console.log(`Monitoring ${urls.length} provider pricing pages…\n`)

  const baseline = loadBaseline()
  const next = { ...baseline }
  const changed = []
  const errors = []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  await Promise.all(urls.map(async url => {
    try {
      const hash = await fetchHash(url, controller.signal)
      const previous = baseline[url]
      if (previous && previous !== hash) {
        changed.push({ url, previous, current: hash })
      } else if (!previous) {
        console.log(`  + new baseline   ${url}`)
      } else {
        console.log(`  · unchanged      ${url}`)
      }
      next[url] = hash
    } catch (err) {
      errors.push({ url, error: err.message })
      console.error(`  ! error          ${url} — ${err.message}`)
    }
  }))

  clearTimeout(timeout)

  if (changed.length > 0) {
    console.log(`\n⚠ ${changed.length} provider page(s) changed since last check:`)
    for (const row of changed) {
      console.log(`    ${row.url}`)
      console.log(`      was: ${row.previous.slice(0, 12)}…  now: ${row.current.slice(0, 12)}…`)
    }
    console.log('\n  → Re-verify affected model rows and update lastVerifiedAt.')
  }

  if (statusRows.length > 0) {
    console.log(`\nℹ ${statusRows.length} model(s) still need pricing confirmation:`)
    for (const row of statusRows) {
      console.log(`    [${row.status}] ${row.id} — ${row.name}`)
    }
  }

  if (UPDATE_BASELINE) {
    saveBaseline(next)
    console.log(`\n✓ Baseline written to ${HASH_FILE}`)
  } else if (changed.length > 0 || Object.keys(baseline).length === 0) {
    console.log('\n(run with --update to save current hashes as the new baseline.)')
  }

  if (errors.length > 0) process.exit(2)
  if (changed.length > 0) process.exit(1)
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(2)
  })
}
