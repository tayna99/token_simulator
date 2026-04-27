// src/lib/format.ts
// 모든 사용자 표시 숫자는 이 모듈을 통과한다.
// CLAUDE.md CRITICAL: 통화/퍼센트/토큰 표시는 inline 포맷 금지.

const INVALID = '—'

function isValid(n: number): boolean {
  return Number.isFinite(n)
}

export function fmtCurrency(n: number, decimals = 0): string {
  if (!isValid(n)) return INVALID
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}

export function fmtDelta(n: number): string {
  if (!isValid(n)) return INVALID
  if (n === 0) return '$0'
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return n < 0 ? `-$${formatted}` : `+$${formatted}`
}

export function fmtPercent(ratio: number, decimals = 0): string {
  if (!isValid(ratio)) return INVALID
  const pct = ratio * 100
  return pct.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%'
}

export function fmtTokens(n: number): string {
  if (!isValid(n)) return INVALID
  if (n >= 1_000_000_000) {
    const b = n / 1_000_000_000
    return (b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)) + 'B'
  }
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'M'
  }
  if (n >= 1_000) {
    const k = n / 1_000
    return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'K'
  }
  return n.toLocaleString('en-US')
}

export function fmtNumber(n: number, decimals = 0): string {
  if (!isValid(n)) return INVALID
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtPricePerMillion(input: number, output: number): string {
  if (!isValid(input) || !isValid(output)) return INVALID
  const fmt = (p: number) => `$${p.toFixed(2)}`
  return `${fmt(input)} / ${fmt(output)} per 1M tokens`
}
