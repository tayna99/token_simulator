#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..')
const REGISTRY_FILE = resolve(REPO_ROOT, 'src', 'features', 'research', 'data', 'modelBenchmarkRegistry.json')
const ARTIFACT_DIR = resolve(REPO_ROOT, 'artifacts', 'research', 'benchmark-corpus')

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown'
}

function metricName(value) {
  return slug(value).replace(/-/g, '_')
}

function tableRows(text) {
  const raw = String(text)
  const htmlTables = Array.from(raw.matchAll(/<table[\s\S]*?<\/table>/gi)).flatMap(tableMatch => (
    Array.from(tableMatch[0].matchAll(/<tr[\s\S]*?<\/tr>/gi)).map(rowMatch => (
      Array.from(rowMatch[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi))
        .map(cellMatch => stripTags(cellMatch[1]))
        .filter(Boolean)
    )).filter(row => row.length > 0)
  ))
  if (htmlTables.length > 0) return htmlTables

  return decodeEntities(raw)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.includes('|'))
    .map(line => line.split('|').map(cell => cell.trim()).filter(Boolean))
    .filter(row => row.length > 0 && !row.every(cell => /^-+$/.test(cell)))
}

function metricKind(name) {
  const normalized = metricName(name)
  if (/latency|speed|throughput|tps|tokens_s/.test(normalized)) return normalized.includes('latency') ? 'latency' : 'throughput'
  if (/intelligence|quality|elo|arena|score/.test(normalized)) return 'quality'
  return 'benchmark'
}

export function parseArtificialAnalysis({ source, text, capturedAt }) {
  const rows = tableRows(text)
  const [header, ...bodyRows] = rows
  if (!header || bodyRows.length === 0) {
    return { records: [], warnings: ['benchmark_rows_unavailable'] }
  }
  const modelIndex = header.findIndex(cell => /model/i.test(cell))
  if (modelIndex < 0) {
    return { records: [], warnings: ['benchmark_model_column_unavailable'] }
  }
  const metricColumns = header
    .map((label, index) => ({ label, index }))
    .filter(column => column.index !== modelIndex)
  const records = bodyRows.flatMap(row => {
    const modelName = row[modelIndex]
    if (!modelName) return []
    return metricColumns.flatMap(column => {
      const value = row[column.index]
      if (!value) return []
      const metricSlug = slug(column.label)
      return [{
        id: `${source.id}:${slug(modelName)}:${metricSlug}`,
        corpusId: 'model_benchmark',
        sourceId: source.id,
        modelName,
        benchmarkSuite: 'artificial_analysis',
        metricName: metricName(column.label),
        metricValue: value,
        metricKind: metricKind(column.label),
        capturedAt,
        sourceUrl: source.url,
        sourceRefs: [`evidence:${source.id}`],
        qualityBasis: 'third_party_benchmark',
        reviewStatus: 'needs_review',
        ownerAgentIds: source.ownerAgentIds ?? ['model_inference_research'],
        consumerAgentIds: source.consumerAgentIds ?? ['model_inference_research', 'optimization_routing'],
      }]
    })
  })

  return { records, warnings: records.length > 0 ? [] : ['benchmark_rows_unavailable'] }
}

export function buildBenchmarkEvidenceRecords(records) {
  return records.map(record => ({
    id: `evidence:${record.id}`,
    corpusId: 'model_benchmark',
    text: [
      `${record.modelName} ${record.metricName}: ${record.metricValue}.`,
      `${record.benchmarkSuite} benchmark evidence captured at ${record.capturedAt}.`,
      'Use for model quality/routing review only; it may not override Fact Ledger or calculator numbers.',
    ].join(' '),
    sourceUrl: record.sourceUrl,
    refs: [...record.sourceRefs],
    mayOverrideFacts: false,
    metadata: {
      sourceKind: 'benchmark',
      corpusTrust: 'third_party_benchmark',
      ownerAgentIds: [...record.ownerAgentIds],
      consumerAgentIds: [...record.consumerAgentIds],
      cadence: 'weekly',
      sourceId: record.sourceId,
      reviewStatus: record.reviewStatus,
      qualityBasis: record.qualityBasis,
      taskTags: ['routing', record.metricKind, 'quality'].filter((value, index, items) => value && items.indexOf(value) === index),
      modelIds: [slug(record.modelName)],
      benchmarkSuite: record.benchmarkSuite,
      metricName: record.metricName,
      metricValue: record.metricValue,
      capturedAt: record.capturedAt,
    },
  }))
}

export function serializeBenchmarkEvidenceJsonl(records) {
  return records.map(record => JSON.stringify(record)).join('\n') + (records.length ? '\n' : '')
}

function loadJson(file, fallback) {
  if (!existsSync(file)) return fallback
  return JSON.parse(readFileSync(file, 'utf8'))
}

async function fetchText(url, signal) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'token-simulator benchmark corpus collector' },
    signal,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
  return response.text()
}

function selectedSources(registry, args) {
  const sourceArgIndex = args.indexOf('--source')
  const selectedId = sourceArgIndex >= 0 ? args[sourceArgIndex + 1] : ''
  return registry.filter(source => source.active && (!selectedId || source.id === selectedId))
}

async function main() {
  const args = process.argv.slice(2)
  const registry = selectedSources(loadJson(REGISTRY_FILE, []), args)
  const capturedAt = new Date().toISOString()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)
  const parsedRecords = []
  const errors = []
  const warnings = []

  for (const source of registry) {
    try {
      const text = await fetchText(source.url, controller.signal)
      if (source.parserStrategy === 'parseArtificialAnalysis') {
        const parsed = parseArtificialAnalysis({ source, text, capturedAt })
        parsedRecords.push(...parsed.records)
        warnings.push(...parsed.warnings.map(warning => `${source.id}:${warning}`))
      } else {
        warnings.push(`${source.id}:manual_review_parser_not_implemented`)
      }
    } catch (error) {
      errors.push({
        id: source.id,
        url: source.url,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  clearTimeout(timeout)
  const evidenceRecords = buildBenchmarkEvidenceRecords(parsedRecords)
  mkdirSync(ARTIFACT_DIR, { recursive: true })
  writeFileSync(resolve(ARTIFACT_DIR, 'benchmark-evidence-records.jsonl'), serializeBenchmarkEvidenceJsonl(evidenceRecords), 'utf8')
  writeFileSync(
    resolve(ARTIFACT_DIR, 'latest-report.json'),
    `${JSON.stringify({
      generatedAt: capturedAt,
      sourceCount: registry.length,
      parsedMetricCount: parsedRecords.length,
      evidenceRecordCount: evidenceRecords.length,
      warnings,
      errors,
      mayOverrideFacts: false,
    }, null, 2)}\n`,
    'utf8',
  )
  writeFileSync(
    resolve(ARTIFACT_DIR, 'latest-report.md'),
    [
      '# Benchmark Corpus Report',
      '',
      `- Generated: ${capturedAt}`,
      `- Sources checked: ${registry.length}`,
      `- Parsed metrics: ${parsedRecords.length}`,
      `- Evidence records: ${evidenceRecords.length}`,
      `- Warnings: ${warnings.length}`,
      `- Errors: ${errors.length}`,
      '',
      ...warnings.map(warning => `- warning: ${warning}`),
      ...errors.map(error => `- error: ${error.id} (${error.error})`),
      '',
    ].join('\n'),
    'utf8',
  )
  console.log(JSON.stringify({
    sources: registry.length,
    parsedMetrics: parsedRecords.length,
    evidenceRecords: evidenceRecords.length,
    warnings: warnings.length,
    errors: errors.length,
    artifact: 'artifacts/research/benchmark-corpus/latest-report.json',
  }, null, 2))
  if (errors.length > 0) process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => {
    console.error(error)
    process.exit(2)
  })
}
