import { describe, expect, it } from 'vitest'
import { inspectUsageImportSecurity, validateUsageIngress } from './securityMiddleware'

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
    expect(result.blockedColumns).toEqual(['prompt', 'api_key'])
    expect(result.snapshotColumns).toEqual(['timestamp', 'input_tokens'])
    expect(result.retentionAction).toBe('raw_upload_delete_or_reconfirm_after_30_days')
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

  it('blocks oversized or disallowed upload files before snapshot ingestion', () => {
    const result = inspectUsageImportSecurity({
      filename: 'usage.xlsx',
      rawCsv: 'timestamp,feature,model,input_tokens,output_tokens,plan_id,customer_id,revenue\n2026-05-01,chat,gpt-5,100,20,10,customer-1,99',
      fileSizeBytes: 11 * 1024 * 1024,
      source: 'upload',
      workspaceId: 'workspace-demo',
    })

    expect(result.status).toBe('blocked')
    expect(result.warnings).toContain('file_type_not_allowed')
    expect(result.warnings).toContain('file_size_exceeded')
    expect(result.allowedForSnapshot).toBe(false)
    expect(result.blockedColumns).toEqual(['file_type:usage.xlsx', 'file_size:11534336'])
    expect(result.snapshotColumns).toEqual([
      'timestamp',
      'feature',
      'model',
      'input_tokens',
      'output_tokens',
      'plan_id',
      'customer_id',
      'revenue',
    ])
  })

  it('keeps PII imports in needs_mapping with anonymization required', () => {
    const result = inspectUsageImportSecurity({
      filename: 'usage.csv',
      rawCsv: 'timestamp,feature,model,input_tokens,output_tokens,plan_id,customer_id,revenue,email\n2026-05-01,chat,gpt-5,100,20,10,customer-1,99,ada@example.com',
    })

    expect(result.status).toBe('needs_mapping')
    expect(result.anonymizationStatus).toBe('required')
    expect(result.allowedForSnapshot).toBe(true)
  })

  it('validates CSV ingress with file metadata and retention job intent', () => {
    const result = validateUsageIngress({
      ingressKind: 'csv',
      rawCsv: 'timestamp,feature,model,input_tokens,output_tokens,plan_id,customer_id,revenue,email\n2026-05-01,chat,gpt-5,100,20,10,customer-1,99,ada@example.com',
      fileName: 'usage.csv',
      fileSizeBytes: 2048,
      source: 'upload',
      workspaceId: 'workspace-demo',
    })

    expect(result.decision).toBe('needs_mapping')
    expect(result.retentionJobRequired).toBe(true)
  })
})
