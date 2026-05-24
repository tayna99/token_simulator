import { describe, expect, it } from 'vitest'
import { inspectUsageImportSecurity } from './securityMiddleware'

describe('inspectUsageImportSecurity', () => {
  it('blocks raw prompt and API key fields from snapshot ingestion', () => {
    const result = inspectUsageImportSecurity({
      filename: 'usage.csv',
      rawCsv: 'timestamp,prompt,api_key,input_tokens\n2026-05-01,"hello","sk-test",100',
    })

    expect(result.status).toBe('blocked')
    expect(result.warnings).toContain('raw_prompt_detected')
    expect(result.warnings).toContain('api_key_candidate_detected')
    expect(result.allowedForSnapshot).toBe(false)
  })

  it('marks plan margin analysis as blocked when plan_id is missing', () => {
    const result = inspectUsageImportSecurity({
      filename: 'usage.csv',
      rawCsv: 'timestamp,feature,model,input_tokens,output_tokens,total_cost\n2026-05-01,summary,gpt-5-mini,100,20,0.1',
    })

    expect(result.status).toBe('needs_mapping')
    expect(result.analysisScope.available).toContain('feature_cost')
    expect(result.analysisScope.blocked).toContain('plan_margin')
    expect(result.retentionNote).toContain('30 days')
  })
})
