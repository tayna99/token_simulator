import { describe, it, expect } from 'vitest'
import { toMonthly, fromMonthly, periodLabel, PERIOD_DAYS } from './period'

describe('toMonthly', () => {
  it('day → month ≈ x30', () => expect(toMonthly(100, 'day')).toBeCloseTo(3000, 0))
  it('week → month ≈ x4.33', () => expect(toMonthly(100, 'week')).toBeCloseTo(433, -1))
  it('month → month x1', () => expect(toMonthly(100, 'month')).toBe(100))
  it('quarter → month /3', () => expect(toMonthly(300, 'quarter')).toBeCloseTo(100, 0))
  it('year → month /12', () => expect(toMonthly(1200, 'year')).toBeCloseTo(100, -1))
  it('handles NaN', () => expect(toMonthly(NaN, 'day')).toBe(0))
})

describe('fromMonthly', () => {
  it('inverts toMonthly', () => {
    const v = fromMonthly(toMonthly(100, 'day'), 'day')
    expect(v).toBeCloseTo(100, 0)
  })
})

describe('periodLabel', () => {
  it('returns human label', () => {
    expect(periodLabel('day')).toBe('day')
    expect(periodLabel('quarter')).toBe('quarter')
  })
})

describe('PERIOD_DAYS', () => {
  it('exports canonical day counts per period', () => {
    expect(PERIOD_DAYS.day).toBe(1)
    expect(PERIOD_DAYS.week).toBe(7)
    expect(PERIOD_DAYS.month).toBe(30)
    expect(PERIOD_DAYS.quarter).toBe(90)
    expect(PERIOD_DAYS.year).toBe(365)
  })
})
