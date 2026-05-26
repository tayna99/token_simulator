import { describe, expect, it } from 'vitest'

import {
  BUYER_OBJECTION_BUCKETS,
  codeBuyerInterviewNotes,
} from './buyerInterviewCoding'

describe('codeBuyerInterviewNotes', () => {
  it('classifies refusal language into the six buyer objection buckets', () => {
    const result = codeBuyerInterviewNotes([
      '비용은 보는데 아직 마진 문제는 아니에요.',
      'prompt나 고객 데이터가 들어가는 것 아닌가요?',
      '엑셀이나 SQL로 보면 됩니다.',
      '그래서 얼마를 아끼는 건가요?',
      '아직 비용이 작아요.',
      'Payroll이면 HR 도구인가요?',
    ].join('\n'))

    expect(result.bucketSummaries.map(bucket => bucket.id)).toEqual([
      'objection_margin_not_felt',
      'objection_data_trust',
      'objection_excel_sql_console',
      'objection_roi_unclear',
      'objection_wrong_timing',
      'objection_positioning_confusing',
    ])
    expect(result.codedQuotes).toHaveLength(6)
    expect(result.codedQuotes[0]).toMatchObject({
      quote: '비용은 보는데 아직 마진 문제는 아니에요.',
      bucketId: 'objection_margin_not_felt',
    })
  })

  it('promotes repeated buyer language into product copy or requirements', () => {
    const result = codeBuyerInterviewNotes([
      '그래서 얼마를 아끼는 건가요?',
      '얼마를 아끼는지 바로 보여주나요?',
      'prompt나 고객 데이터가 들어가는 것 아닌가요?',
      'prompt나 고객 데이터가 들어가는 것 아닌가요?',
      'Payroll이면 HR 도구인가요?',
      'Payroll이면 HR 도구인가요?',
    ].join('\n'), { minPromotionCount: 2 })

    expect(result.promotions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        bucketId: 'objection_roi_unclear',
        kind: 'requirement',
        source: 'repeated_bucket',
        exactQuoteCount: 1,
        promotedText: expect.stringContaining('monthly leak'),
      }),
      expect.objectContaining({
        bucketId: 'objection_data_trust',
        kind: 'requirement',
        source: 'repeated_exact_quote',
        exactQuoteCount: 2,
        quote: 'prompt나 고객 데이터가 들어가는 것 아닌가요?',
      }),
      expect.objectContaining({
        bucketId: 'objection_positioning_confusing',
        kind: 'product_copy',
        source: 'repeated_exact_quote',
        exactQuoteCount: 2,
        promotedText: expect.stringContaining('AI Token Leakage Report'),
      }),
    ]))
  })

  it('keeps the taxonomy aligned with the interview guide six buckets', () => {
    expect(BUYER_OBJECTION_BUCKETS).toHaveLength(6)
    expect(BUYER_OBJECTION_BUCKETS.map(bucket => bucket.id)).toEqual([
      'objection_margin_not_felt',
      'objection_data_trust',
      'objection_excel_sql_console',
      'objection_roi_unclear',
      'objection_wrong_timing',
      'objection_positioning_confusing',
    ])
  })
})
