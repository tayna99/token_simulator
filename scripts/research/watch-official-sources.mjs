#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildCandidateFromDetectedModel,
  hashOfficialSourceText,
  officialWatchExitCode,
} from './official-watch-core.mjs'
import { extractOfficialFacts } from './extract-official-facts.mjs'
import { partitionCandidateInbox } from './candidate-inbox.mjs'
import {
  buildOfficialSourceSnippets,
  officialSourceSnippetsToRagRecords,
  serializeOfficialSourceSnippetsJsonl,
} from './official-source-snippets.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..')
const REGISTRY_FILE = resolve(REPO_ROOT, 'src', 'features', 'research', 'data', 'officialSourceRegistry.json')
const HASH_FILE = resolve(SCRIPT_DIR, '.official-source-hashes.json')
const ARTIFACT_DIR = resolve(REPO_ROOT, 'artifacts', 'research', 'official-watch')

const args = new Set(process.argv.slice(2))
const UPDATE_BASELINE = args.has('--update')
const DRY_RUN = !UPDATE_BASELINE
const FAIL_ON_CHANGE = args.has('--fail-on-change')

function loadJson(file, fallback) {
  if (!existsSync(file)) return fallback
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function saveJson(file, value) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function fetchText(url, signal) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'token-simulator official research watchtower' },
    signal,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
  return response.text()
}

function candidateFromParsedModel(source, model, pricingFacts) {
  return buildCandidateFromDetectedModel({
    detectedAt: new Date().toISOString(),
    sourceId: source.id,
    sourceUrl: source.url,
    title: `${source.id} official source update`,
    name: model.name,
    modelOwner: model.modelOwner,
    modelFamily: model.modelFamily,
    servingProvider: source.servingProvider,
    pricingRegion: source.pricingRegion,
    currency: source.pricingRegion === 'china_mainland' ? 'CNY' : 'USD',
    sourceLanguage: source.sourceLanguage,
    officialSourceTrust: source.officialSourceTrust,
    pricingFacts,
  })
}

async function main() {
  const registry = loadJson(REGISTRY_FILE, []).filter(source => source.active)
  const baseline = loadJson(HASH_FILE, {})
  const nextBaseline = { ...baseline }
  const allCandidates = []
  const snippets = []
  const changedSources = []
  const errors = []
  const capturedAt = new Date().toISOString()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)

  await Promise.all(registry.map(async source => {
    try {
      const text = await fetchText(source.url, controller.signal)
      const hash = hashOfficialSourceText(text)
      const previous = baseline[source.id]
      if (!previous || previous !== hash) {
        changedSources.push({
          id: source.id,
          url: source.url,
          previous: previous ?? null,
          current: hash,
        })
        const extracted = extractOfficialFacts({ source, text, capturedAt })
        allCandidates.push(...extracted.detectedModels.map(model => (
          candidateFromParsedModel(source, model, extracted.pricingFacts)
        )))
        snippets.push(...buildOfficialSourceSnippets({ source, text, capturedAt }))
      }
      nextBaseline[source.id] = hash
    } catch (error) {
      errors.push({
        id: source.id,
        url: source.url,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }))

  clearTimeout(timeout)
  const inbox = partitionCandidateInbox(allCandidates)
  const officialDocsRagRecords = officialSourceSnippetsToRagRecords(snippets)
  mkdirSync(ARTIFACT_DIR, { recursive: true })
  const report = {
    generatedAt: capturedAt,
    dryRun: DRY_RUN,
    sourceCount: registry.length,
    changedSources,
    candidateCount: inbox.reviewCandidates.length,
    noisyCandidateCount: inbox.noisyCandidates.length,
    needsFxReviewCount: inbox.needsFxReview.length,
    needsRegionReviewCount: inbox.needsRegionReview.length,
    allCandidateCount: allCandidates.length,
    candidates: inbox.reviewCandidates,
    noisyCandidates: inbox.noisyCandidates,
    needsFxReview: inbox.needsFxReview,
    needsRegionReview: inbox.needsRegionReview,
    inboxWarnings: inbox.warnings,
    snippetCount: snippets.length,
    officialDocsRagRecordCount: officialDocsRagRecords.length,
    errors,
  }
  saveJson(resolve(ARTIFACT_DIR, 'latest-report.json'), report)
  writeFileSync(
    resolve(ARTIFACT_DIR, 'official-source-snippets.jsonl'),
    serializeOfficialSourceSnippetsJsonl(snippets),
    'utf8',
  )
  writeFileSync(
    resolve(ARTIFACT_DIR, 'official-docs-rag.jsonl'),
    officialDocsRagRecords.map(record => JSON.stringify(record)).join('\n') + (officialDocsRagRecords.length ? '\n' : ''),
    'utf8',
  )
  writeFileSync(
    resolve(ARTIFACT_DIR, 'latest-report.md'),
    [
      '# Official Research Watchtower Report',
      '',
      `- Generated: ${report.generatedAt}`,
      `- Sources checked: ${report.sourceCount}`,
      `- Changed sources: ${changedSources.length}`,
      `- Review candidate count: ${report.candidateCount}`,
      `- Noisy candidate count: ${report.noisyCandidateCount}`,
      `- Needs FX review: ${report.needsFxReviewCount}`,
      `- Needs region review: ${report.needsRegionReviewCount}`,
      `- Snippet count: ${report.snippetCount}`,
      `- Official docs RAG records: ${report.officialDocsRagRecordCount}`,
      `- Errors: ${errors.length}`,
      '',
      ...changedSources.map(source => `- changed: ${source.id} (${source.url})`),
      ...inbox.warnings.map(warning => `- warning: ${warning}`),
      ...errors.map(error => `- error: ${error.id} (${error.error})`),
      '',
    ].join('\n'),
    'utf8',
  )

  if (UPDATE_BASELINE) saveJson(HASH_FILE, nextBaseline)
  console.log(JSON.stringify({
    sources: registry.length,
    changed: changedSources.length,
    candidates: inbox.reviewCandidates.length,
    noisyCandidates: inbox.noisyCandidates.length,
    needsFxReview: inbox.needsFxReview.length,
    needsRegionReview: inbox.needsRegionReview.length,
    snippets: snippets.length,
    officialDocsRagRecords: officialDocsRagRecords.length,
    errors: errors.length,
    artifact: 'artifacts/research/official-watch/latest-report.json',
  }, null, 2))
  const exitCode = officialWatchExitCode({
    errorCount: errors.length,
    changedSourceCount: changedSources.length,
    dryRun: DRY_RUN,
    failOnChange: FAIL_ON_CHANGE,
  })
  if (exitCode !== 0) process.exit(exitCode)
}

main().catch(error => {
  console.error(error)
  process.exit(2)
})
