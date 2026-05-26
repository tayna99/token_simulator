export type ServiceValidationIcpGrade = 'A' | 'B' | 'C'
export type ServiceValidationIntent = 'yes' | 'conditional' | 'no'
export type RepeatReportRequestSignal = 'monthly' | 'quarterly' | 'one_more_after_change' | 'no'
export type DominantRequestType = 'service_report' | 'broad_saas_feature' | 'data_readiness' | 'sample_only'
export type ServiceValidationVerdict = 'pass' | 'conditional_pass' | 'fail' | 'invalid'

export interface ServiceValidationLeadInput {
  leadId: string
  icpGrade: ServiceValidationIcpGrade
  offeredPriceKrw: number
  acceptedPriceKrw: number
  dataSharingIntent: ServiceValidationIntent
  reportSharingIntent: ServiceValidationIntent
  priceOrLimitDecisionIntent: ServiceValidationIntent
  repeatReportRequestSignal: RepeatReportRequestSignal
  dominantRequestType: DominantRequestType
  trustSafeExportPossible?: boolean
}

export interface ServiceValidationLedgerRow extends ServiceValidationLeadInput {
  trustSafeExportPossible: boolean
  verdict: ServiceValidationVerdict
  reasons: string[]
  recommendedNextAction: string
}

export interface WeeklyServiceValidationSummary {
  pass: number
  conditional_pass: number
  fail: number
  invalid: number
  repeatReportRequests: number
}

const repeatPassSignals: RepeatReportRequestSignal[] = ['monthly', 'quarterly']
const repeatRequestSignals: RepeatReportRequestSignal[] = ['monthly', 'quarterly', 'one_more_after_change']
const nonServiceRequestTypes: DominantRequestType[] = ['broad_saas_feature', 'data_readiness', 'sample_only']

export function evaluateServiceValidationLead(input: ServiceValidationLeadInput): ServiceValidationLedgerRow {
  const trustSafeExportPossible = input.trustSafeExportPossible ?? true
  const paidReportAccepted = Number.isFinite(input.acceptedPriceKrw) && input.acceptedPriceKrw > 0
  const repeatPassRequested = repeatPassSignals.includes(input.repeatReportRequestSignal)
  const positiveIntentCount = countPositiveIntents(input)

  if (!trustSafeExportPossible) {
    return buildRow(input, trustSafeExportPossible, 'invalid', [
      'trust-safe export is not possible without raw prompt, API key, or PII',
    ], 'Do not count this lead in Service MVP validation; redesign intake around prompt-free metadata export.')
  }

  if (repeatPassRequested) {
    return buildRow(input, trustSafeExportPossible, 'pass', [
      `repeat service report requested ${input.repeatReportRequestSignal}`,
    ], 'Schedule delivery, attach review-call notes, and ask whether the next report should be monthly or quarterly.')
  }

  if (input.dominantRequestType === 'service_report' && paidReportAccepted && input.icpGrade === 'A') {
    return buildRow(input, trustSafeExportPossible, 'pass', [
      'A-grade ICP accepted a paid service report',
    ], 'Schedule delivery, attach review-call notes, and ask whether the next report should be monthly or quarterly.')
  }

  if (paidReportAccepted && positiveIntentCount >= 2) {
    return buildRow(input, trustSafeExportPossible, 'conditional_pass', [
      `paid report accepted with ${positiveIntentCount} of 3 validation intents`,
    ], 'Deliver the paid report and use the review call to confirm repeat cadence and missing intent.')
  }

  if (nonServiceRequestTypes.includes(input.dominantRequestType) && !paidReportAccepted) {
    return buildRow(input, trustSafeExportPossible, 'fail', [
      `${input.dominantRequestType} request without paid or repeat service report demand`,
    ], 'Record as product-interest evidence, but do not count it as Service MVP validation pass.')
  }

  return buildRow(input, trustSafeExportPossible, 'fail', [
    'no paid report, repeat cadence, or A-grade paid service-report signal',
  ], 'Continue discovery or offer a paid AI Cost Snapshot report before counting this lead.')
}

export function summarizeWeeklyServiceValidationRows(
  rows: ServiceValidationLedgerRow[],
): WeeklyServiceValidationSummary {
  return rows.reduce<WeeklyServiceValidationSummary>(
    (summary, row) => {
      summary[row.verdict] += 1

      if (repeatRequestSignals.includes(row.repeatReportRequestSignal)) {
        summary.repeatReportRequests += 1
      }

      return summary
    },
    {
      pass: 0,
      conditional_pass: 0,
      fail: 0,
      invalid: 0,
      repeatReportRequests: 0,
    },
  )
}

function countPositiveIntents(input: ServiceValidationLeadInput): number {
  const intents = [input.dataSharingIntent, input.reportSharingIntent, input.priceOrLimitDecisionIntent]

  return intents.filter(intent => intent === 'yes' || intent === 'conditional').length
}

function buildRow(
  input: ServiceValidationLeadInput,
  trustSafeExportPossible: boolean,
  verdict: ServiceValidationVerdict,
  reasons: string[],
  recommendedNextAction: string,
): ServiceValidationLedgerRow {
  return {
    ...input,
    trustSafeExportPossible,
    verdict,
    reasons,
    recommendedNextAction,
  }
}
