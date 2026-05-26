export interface RevenueMappingRow {
  rowNumber: number
  customerId?: string
  planId?: string
  revenueUsd: number
  includedTokens?: number
  overageRateUsdPer1kTokens?: number
}

export interface RevenueMappingResult {
  customerRevenueUsd: Record<string, number>
  planRevenueUsd: Record<string, number>
  customerIncludedTokens: Record<string, number>
  planIncludedTokens: Record<string, number>
  customerOverageRateUsdPer1kTokens: Record<string, number>
  planOverageRateUsdPer1kTokens: Record<string, number>
  rows: RevenueMappingRow[]
  errors: string[]
  mappingWarnings: string[]
}

const CUSTOMER_HEADERS = ['customerid', 'customer', 'id']
const PLAN_HEADERS = ['planid', 'plan']
const REVENUE_HEADERS = [
  'revenue',
  'revenuecollected',
  'collectedrevenue',
  'mrr',
  'amount',
  'amountpaid',
  'monthlyrevenue',
  'subscriptionplanprice',
]
const INCLUDED_TOKEN_HEADERS = [
  'includedtokens',
  'includedcredits',
  'tokenallowance',
  'allowancetokens',
  'monthlytokenallowance',
]
const OVERAGE_RATE_HEADERS = [
  'overagerate',
  'overagerateusdper1ktokens',
  'overagepriceper1ktokens',
  'usdper1koverage',
]

export function parseRevenueCsv(rawCsv: string): RevenueMappingResult {
  const result: RevenueMappingResult = {
    customerRevenueUsd: {},
    planRevenueUsd: {},
    customerIncludedTokens: {},
    planIncludedTokens: {},
    customerOverageRateUsdPer1kTokens: {},
    planOverageRateUsdPer1kTokens: {},
    rows: [],
    errors: [],
    mappingWarnings: [],
  }

  const records = parseCsvRecords(rawCsv)
  const [headerRow, ...dataRows] = records

  if (!headerRow) {
    result.errors.push('empty_csv')
    return result
  }

  const headers = headerRow.map(normalizeHeader)
  const customerIndex = findHeaderIndex(headers, CUSTOMER_HEADERS)
  const planIndex = findHeaderIndex(headers, PLAN_HEADERS)
  const revenueIndex = findHeaderIndex(headers, REVENUE_HEADERS)
  const includedTokensIndex = findHeaderIndex(headers, INCLUDED_TOKEN_HEADERS)
  const overageRateIndex = findHeaderIndex(headers, OVERAGE_RATE_HEADERS)

  if (customerIndex === -1) {
    result.mappingWarnings.push('customer_id_header_missing')
  }

  if (planIndex === -1) {
    result.mappingWarnings.push('plan_id_header_missing')
  }

  if (revenueIndex === -1) {
    result.errors.push('revenue_header_missing')
    return result
  }

  dataRows.forEach((row, index) => {
    if (row.every(cell => cell.trim() === '')) {
      return
    }

    const rowNumber = index + 2
    const customerId = readCell(row, customerIndex)
    const planId = readCell(row, planIndex)
    const revenueUsd = normalizeRevenue(readCell(row, revenueIndex), rowNumber, result.mappingWarnings)
    const includedTokens = normalizeOptionalNumber(
      readCell(row, includedTokensIndex),
      'included_tokens',
      rowNumber,
      result.mappingWarnings,
    )
    const overageRateUsdPer1kTokens = normalizeOptionalNumber(
      readCell(row, overageRateIndex),
      'overage_rate',
      rowNumber,
      result.mappingWarnings,
    )

    result.rows.push({
      rowNumber,
      ...(customerId ? { customerId } : {}),
      ...(planId ? { planId } : {}),
      revenueUsd,
      ...(includedTokens !== undefined ? { includedTokens } : {}),
      ...(overageRateUsdPer1kTokens !== undefined ? { overageRateUsdPer1kTokens } : {}),
    })

    if (customerId) {
      result.customerRevenueUsd[customerId] = (result.customerRevenueUsd[customerId] ?? 0) + revenueUsd
      if (includedTokens !== undefined) {
        result.customerIncludedTokens[customerId] = (result.customerIncludedTokens[customerId] ?? 0) + includedTokens
      }
      if (overageRateUsdPer1kTokens !== undefined) {
        result.customerOverageRateUsdPer1kTokens[customerId] = overageRateUsdPer1kTokens
      }
    } else {
      result.mappingWarnings.push(`row_${rowNumber}_missing_customer_id`)
    }

    if (planId) {
      result.planRevenueUsd[planId] = (result.planRevenueUsd[planId] ?? 0) + revenueUsd
      if (includedTokens !== undefined) {
        result.planIncludedTokens[planId] = (result.planIncludedTokens[planId] ?? 0) + includedTokens
      }
      if (overageRateUsdPer1kTokens !== undefined) {
        result.planOverageRateUsdPer1kTokens[planId] = overageRateUsdPer1kTokens
      }
    } else {
      result.mappingWarnings.push(`row_${rowNumber}_missing_plan_id`)
    }
  })

  return result
}

function findHeaderIndex(headers: string[], acceptedHeaders: string[]): number {
  for (const acceptedHeader of acceptedHeaders) {
    const index = headers.findIndex(header => header === acceptedHeader)
    if (index !== -1) return index
  }
  return -1
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function readCell(row: string[], index: number): string {
  if (index < 0) {
    return ''
  }

  return (row[index] ?? '').trim()
}

function normalizeRevenue(rawValue: string, rowNumber: number, mappingWarnings: string[]): number {
  if (rawValue.trim() === '') {
    mappingWarnings.push(`row_${rowNumber}_missing_revenue_normalized_to_zero`)
    return 0
  }

  const revenue = Number(rawValue.replace(/[$,]/g, ''))

  if (!Number.isFinite(revenue) || revenue < 0) {
    mappingWarnings.push(`row_${rowNumber}_invalid_revenue_normalized_to_zero`)
    return 0
  }

  return revenue
}

function normalizeOptionalNumber(
  rawValue: string,
  fieldName: string,
  rowNumber: number,
  mappingWarnings: string[],
): number | undefined {
  if (rawValue.trim() === '') {
    return undefined
  }

  const parsed = Number(rawValue.replace(/[$,\s]/g, ''))

  if (!Number.isFinite(parsed) || parsed < 0) {
    mappingWarnings.push(`row_${rowNumber}_invalid_${fieldName}_ignored`)
    return undefined
  }

  return parsed
}

function parseCsvRecords(rawCsv: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < rawCsv.length; index += 1) {
    const char = rawCsv[index]
    const nextChar = rawCsv[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      record.push(field)
      field = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }
      record.push(field)
      records.push(record)
      record = []
      field = ''
      continue
    }

    field += char
  }

  record.push(field)

  if (record.length > 1 || record[0].trim() !== '') {
    records.push(record)
  }

  return records
}
