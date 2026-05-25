import { describe, expect, it } from 'vitest'

import { parseRevenueCsv } from './revenueMapping'

describe('parseRevenueCsv', () => {
  it('parses Stripe-like MRR into customer and plan revenue mappings', () => {
    const result = parseRevenueCsv([
      'customer_id,plan_id,mrr',
      'cus_001,pro,99',
      'cus_002,team,249.50',
    ].join('\n'))

    expect(result.customerRevenueUsd).toEqual({
      cus_001: 99,
      cus_002: 249.5,
    })
    expect(result.planRevenueUsd).toEqual({
      pro: 99,
      team: 249.5,
    })
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toEqual([])
    expect(result.mappingWarnings).toEqual([])
  })

  it('sums duplicate customer and plan rows and accepts common header aliases', () => {
    const result = parseRevenueCsv([
      'customerId,plan,amount',
      'cus_001,pro,100',
      'cus_001,pro,25',
      'cus_002,pro,50',
      'cus_002,enterprise,300',
    ].join('\n'))

    expect(result.customerRevenueUsd).toEqual({
      cus_001: 125,
      cus_002: 350,
    })
    expect(result.planRevenueUsd).toEqual({
      pro: 175,
      enterprise: 300,
    })
    expect(result.rows.map(row => row.revenueUsd)).toEqual([100, 25, 50, 300])
  })

  it('warns on missing mappings while preserving available plan or customer mappings', () => {
    const result = parseRevenueCsv([
      'customer,planId,monthly_revenue',
      ',pro,42',
      'cus_003,,19',
      'cus_004,team,-8',
      'cus_005,team,not-a-number',
    ].join('\n'))

    expect(result.customerRevenueUsd).toEqual({
      cus_003: 19,
      cus_004: 0,
      cus_005: 0,
    })
    expect(result.planRevenueUsd).toEqual({
      pro: 42,
      team: 0,
    })
    expect(result.rows.map(row => row.revenueUsd)).toEqual([42, 19, 0, 0])
    expect(result.mappingWarnings).toEqual(expect.arrayContaining([
      'row_2_missing_customer_id',
      'row_3_missing_plan_id',
      'row_4_invalid_revenue_normalized_to_zero',
      'row_5_invalid_revenue_normalized_to_zero',
    ]))
    expect(result.errors).toEqual([])
  })

  it('warns when a revenue cell is blank instead of silently treating it as valid zero revenue', () => {
    const result = parseRevenueCsv([
      'customer_id,plan_id,revenue',
      'cus_blank,pro,',
    ].join('\n'))

    expect(result.customerRevenueUsd).toEqual({ cus_blank: 0 })
    expect(result.planRevenueUsd).toEqual({ pro: 0 })
    expect(result.mappingWarnings).toContain('row_2_missing_revenue_normalized_to_zero')
  })

  it('prefers explicit customer aliases before generic id columns', () => {
    const result = parseRevenueCsv([
      'id,customer,mrr,plan',
      'sub_001,cus_real,88,pro',
    ].join('\n'))

    expect(result.customerRevenueUsd).toEqual({ cus_real: 88 })
    expect(result.rows[0]?.customerId).toBe('cus_real')
  })
})
