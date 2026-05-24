import { describe, expect, it } from 'vitest'
import { MODELS } from '../../../data/models'
import { parseUsageCsv } from './usageImport'

describe('UsageEvent v2 import fields', () => {
  it('parses multimodal and serving-operation columns without changing text totals', () => {
    const csv = [
      'feature,model,input_tokens,output_tokens,image_input_tokens,audio_input_seconds,video_input_seconds,video_output_seconds,cache_read_tokens,cache_write_tokens,tool_call_count,web_search_count',
      'video_brief,gemini-omni,1000,500,1200,30,12,4,800,200,3,2',
    ].join('\n')

    const result = parseUsageCsv(csv, MODELS)

    expect(result.totalInputTokens).toBe(1000)
    expect(result.totalOutputTokens).toBe(500)
    expect(result.rows[0]).toMatchObject({
      imageInputTokens: 1200,
      audioInputSeconds: 30,
      videoInputSeconds: 12,
      videoOutputSeconds: 4,
      cacheReadTokens: 800,
      cacheWriteTokens: 200,
      toolCallCount: 3,
      webSearchCount: 2,
    })
  })

  it('keeps unsupported multimodal pricing as a warning instead of inventing cost', () => {
    const csv = [
      'feature,model,input_tokens,output_tokens,video_input_seconds',
      'video_brief,gemini-omni,1000,500,10',
    ].join('\n')

    const result = parseUsageCsv(csv, MODELS)

    expect(result.rows[0].pricingWarnings).toContain('video_input_seconds: unsupported_pricing')
    expect(result.pricingWarnings).toContain('video_input_seconds: unsupported_pricing')
    expect(result.rows[0].costSource).toBe('missing_model')
    expect(result.totalCostUsd).toBe(0)
  })
})
