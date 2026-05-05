import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const REQUIRED_COLUMNS = [
  'evidence_id',
  'source',
  'url',
  'date',
  'community',
  'persona',
  'raw_quote',
  'summary_ko',
  'tool_model',
  'context',
  'pain_tag',
  'severity',
  'frequency_signal',
  'wtp_signal',
  'wtp_score',
  'possible_feature',
  'competitor_mentioned',
  'cost_object',
  'business_metric',
  'opportunity_score',
  'notes',
]

const NONEMPTY_COLUMNS = [
  'evidence_id',
  'source',
  'url',
  'date',
  'community',
  'persona',
  'raw_quote',
  'summary_ko',
  'pain_tag',
  'severity',
  'frequency_signal',
  'wtp_score',
  'possible_feature',
  'cost_object',
  'business_metric',
  'opportunity_score',
]

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1
      }
      row.push(value)
      if (row.some(cell => cell.trim() !== '')) {
        rows.push(row)
      }
      row = []
      value = ''
      continue
    }

    value += char
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value)
    if (row.some(cell => cell.trim() !== '')) {
      rows.push(row)
    }
  }

  return rows
}

function parseNumber(row, field, rowLabel, errors) {
  const value = Number(row[field])
  if (!Number.isFinite(value)) {
    errors.push(`${rowLabel}: ${field} must be a number`)
    return null
  }
  return value
}

function validateBoard(filePath) {
  const csvPath = resolve(filePath)
  const rows = parseCsv(readFileSync(csvPath, 'utf8'))
  const [header, ...dataRows] = rows
  const errors = []

  if (!header) {
    return { errors: [`${csvPath}: file is empty`], rowCount: 0, painScores: new Map() }
  }

  const missing = REQUIRED_COLUMNS.filter(column => !header.includes(column))
  const extraOrMisordered = REQUIRED_COLUMNS.some((column, index) => header[index] !== column)

  if (missing.length > 0) {
    errors.push(`Missing required columns: ${missing.join(', ')}`)
  }

  if (extraOrMisordered || header.length !== REQUIRED_COLUMNS.length) {
    errors.push(`CSV columns must match the fixed contract exactly: ${REQUIRED_COLUMNS.join(', ')}`)
  }

  const painScores = new Map()
  const seenIds = new Set()

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 2
    const rowLabel = `row ${rowNumber}`
    const row = Object.fromEntries(header.map((column, columnIndex) => [column, cells[columnIndex]?.trim() ?? '']))

    if (cells.length !== header.length) {
      errors.push(`${rowLabel}: expected ${header.length} columns but found ${cells.length}`)
    }

    NONEMPTY_COLUMNS.forEach(column => {
      if (!row[column]) {
        errors.push(`${rowLabel}: ${column} is required`)
      }
    })

    if (seenIds.has(row.evidence_id)) {
      errors.push(`${rowLabel}: duplicate evidence_id ${row.evidence_id}`)
    }
    seenIds.add(row.evidence_id)

    const tags = row.pain_tag
      .split(';')
      .map(tag => tag.trim())
      .filter(Boolean)

    if (tags.length < 1 || tags.length > 3) {
      errors.push(`${rowLabel}: pain_tag must contain 1 to 3 semicolon-separated tags`)
    }

    const severity = parseNumber(row, 'severity', rowLabel, errors)
    const frequency = parseNumber(row, 'frequency_signal', rowLabel, errors)
    const wtpScore = parseNumber(row, 'wtp_score', rowLabel, errors)
    const opportunityScore = parseNumber(row, 'opportunity_score', rowLabel, errors)

    for (const [field, value] of [
      ['severity', severity],
      ['frequency_signal', frequency],
      ['wtp_score', wtpScore],
    ]) {
      if (value !== null && (!Number.isInteger(value) || value < 1 || value > 5)) {
        errors.push(`${rowLabel}: ${field} must be an integer from 1 to 5`)
      }
    }

    if (
      severity !== null &&
      frequency !== null &&
      wtpScore !== null &&
      opportunityScore !== null
    ) {
      const expectedScore = severity * frequency * wtpScore
      if (opportunityScore !== expectedScore) {
        errors.push(`${rowLabel}: opportunity_score should be ${expectedScore}, got ${opportunityScore}`)
      }

      tags.forEach(tag => {
        painScores.set(tag, (painScores.get(tag) ?? 0) + expectedScore)
      })
    }
  })

  return { errors, rowCount: dataRows.length, painScores }
}

const target = process.argv[2] ?? 'docs/research/evidence_board.csv'
const result = validateBoard(target)

if (result.errors.length > 0) {
  console.error(result.errors.join('\n'))
  process.exit(1)
}

const topPain = [...result.painScores.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([tag, score]) => `${tag}:${score}`)
  .join(', ')

console.log(`Validated ${result.rowCount} evidence rows. Top pain: ${topPain}`)
