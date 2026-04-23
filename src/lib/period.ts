export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'

export const PERIOD_DAYS: Record<Period, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
}

export function toMonthly(value: number, period: Period): number {
  if (!Number.isFinite(value)) return 0
  const monthsPerPeriod = PERIOD_DAYS[period] / 30
  return value / monthsPerPeriod
}

export function fromMonthly(monthlyValue: number, period: Period): number {
  if (!Number.isFinite(monthlyValue)) return 0
  const monthsPerPeriod = PERIOD_DAYS[period] / 30
  return monthlyValue * monthsPerPeriod
}

export function periodLabel(p: Period): string {
  return p
}
