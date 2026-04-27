import { describe, it, expect } from 'vitest'
import { fmtCurrency, fmtPercent, fmtTokens, fmtPricePerMillion, fmtDelta, fmtNumber } from './format'

describe('fmtCurrency', () => {
  it('formats integer dollars with $ prefix', () => {
    expect(fmtCurrency(195)).toBe('$195')
    expect(fmtCurrency(1634)).toBe('$1,634')
    expect(fmtCurrency(0)).toBe('$0')
  })

  it('rounds to 0 decimals by default', () => {
    expect(fmtCurrency(195.67)).toBe('$196')
  })

  it('supports decimals when requested', () => {
    expect(fmtCurrency(1.234, 2)).toBe('$1.23')
  })

  it('handles negatives with minus before $', () => {
    expect(fmtCurrency(-195)).toBe('-$195')
  })

  it('returns "—" for NaN or Infinity', () => {
    expect(fmtCurrency(NaN)).toBe('—')
    expect(fmtCurrency(Infinity)).toBe('—')
  })
})

describe('fmtPercent', () => {
  it('takes a 0-1 ratio and renders whole percent', () => {
    expect(fmtPercent(0.5)).toBe('50%')
    expect(fmtPercent(0)).toBe('0%')
    expect(fmtPercent(1)).toBe('100%')
  })

  it('supports decimals', () => {
    expect(fmtPercent(0.1234, 1)).toBe('12.3%')
  })

  it('returns "—" for NaN', () => {
    expect(fmtPercent(NaN)).toBe('—')
  })
})

describe('fmtDelta', () => {
  it('prefixes negative with -, positive with +, zero with no sign', () => {
    expect(fmtDelta(-195)).toBe('-$195')
    expect(fmtDelta(195)).toBe('+$195')
    expect(fmtDelta(0)).toBe('$0')
  })

  it('returns "—" for NaN', () => {
    expect(fmtDelta(NaN)).toBe('—')
  })
})

describe('fmtTokens', () => {
  it('formats millions with "M" suffix', () => {
    expect(fmtTokens(50_000_000)).toBe('50M')
    expect(fmtTokens(1_500_000)).toBe('1.5M')
  })

  it('formats billions with "B" suffix', () => {
    expect(fmtTokens(2_000_000_000)).toBe('2B')
  })

  it('formats thousands with "K" suffix', () => {
    expect(fmtTokens(5_000)).toBe('5K')
  })

  it('formats under 1000 as raw number', () => {
    expect(fmtTokens(500)).toBe('500')
  })

  it('returns "—" for NaN', () => {
    expect(fmtTokens(NaN)).toBe('—')
  })
})

describe('fmtPricePerMillion', () => {
  it('formats input/output price pair with unified unit', () => {
    expect(fmtPricePerMillion(2.5, 15)).toBe('$2.50 / $15.00 per 1M tokens')
  })

  it('shows two decimals consistently', () => {
    expect(fmtPricePerMillion(0.2, 1.25)).toBe('$0.20 / $1.25 per 1M tokens')
    expect(fmtPricePerMillion(5, 25)).toBe('$5.00 / $25.00 per 1M tokens')
  })

  it('returns "—" if either price is NaN', () => {
    expect(fmtPricePerMillion(NaN, 5)).toBe('—')
    expect(fmtPricePerMillion(5, NaN)).toBe('—')
  })
})

describe('fmtNumber', () => {
  it('formats full numbers with grouping separators', () => {
    expect(fmtNumber(1234567)).toBe('1,234,567')
  })

  it('supports decimal places', () => {
    expect(fmtNumber(1234.567, 2)).toBe('1,234.57')
  })

  it('returns "?? for NaN', () => {
    expect(fmtNumber(NaN)).toBe('—')
  })
})
