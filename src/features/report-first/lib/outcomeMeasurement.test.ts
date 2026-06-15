import { describe, expect, it } from 'vitest'

import { MODELS } from '../../../data/models'
import { AGENT_PAYROLL_SAMPLE_CSV } from '../../usage/data/agentPayrollSample'
import { parseUsageCsv } from '../../usage/lib/usageImport'
import {
  buildDefaultFeatureMeasurementContracts,
  parseOutcomeCsv,
  verifyFeatureOutcomeMeasurements,
} from './outcomeMeasurement'

describe('outcomeMeasurement', () => {
  it('suggests verifiable outcome contracts from usage feature names', () => {
    const summary = parseUsageCsv(AGENT_PAYROLL_SAMPLE_CSV, MODELS)
    const contracts = buildDefaultFeatureMeasurementContracts(summary)

    expect(contracts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        feature: 'report_generation',
        featureType: 'document_generation',
        outcomeCriteriaLabel: '다운로드 또는 공유된 리포트',
        costCriteriaLabel: '생성 비용 + 재생성 비용',
        leakCriteriaLabel: '실제 사용률 30% 미만',
        requiredData: ['usage_csv', 'outcome_csv'],
      }),
      expect.objectContaining({
        feature: 'agent_workflow',
        featureType: 'agent_workflow',
        outcomeCriteriaLabel: '완료 또는 승인된 workflow',
      }),
    ]))
  })

  it('parses outcome CSV rows without accepting raw qualitative judgment', () => {
    const result = parseOutcomeCsv([
      'timestamp,customer_id,customer_name,feature,agent_run_id,outcome_type,outcome_count,outcome_value_usd,accepted',
      '2026-05-01,northstar_health,Northstar Health,report_generation,run_001,report_downloaded,1,15,true',
      '2026-05-01,northstar_health,Northstar Health,report_generation,run_002,report_shared,1,20,yes',
    ].join('\n'))

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      expect.objectContaining({
        customerId: 'northstar_health',
        customerName: 'Northstar Health',
        feature: 'report_generation',
        agentRunId: 'run_001',
        outcomeType: 'report_downloaded',
        outcomeCount: 1,
        outcomeValueUsd: 15,
        accepted: true,
      }),
      expect.objectContaining({
        agentRunId: 'run_002',
        outcomeType: 'report_shared',
        accepted: true,
      }),
    ])
  })

  it('marks outcome leakage as partial without outcome events and verifiable when events are joined', () => {
    const usage = parseUsageCsv([
      'timestamp,request_id,customer_id,feature,model,agent_run_id,input_tokens,output_tokens,total_cost,status',
      '2026-05-01,req_1,cus_a,report_generation,claude-sonnet-4.6,run_1,1000,500,20,success',
      '2026-05-01,req_2,cus_a,report_generation,claude-sonnet-4.6,run_2,1000,500,20,success',
      '2026-05-01,req_3,cus_a,report_generation,claude-sonnet-4.6,run_3,1000,500,20,success',
      '2026-05-01,req_4,cus_a,report_generation,claude-sonnet-4.6,run_4,1000,500,20,success',
    ].join('\n'), MODELS)
    const [contract] = buildDefaultFeatureMeasurementContracts(usage)

    const partial = verifyFeatureOutcomeMeasurements({
      summary: usage,
      contracts: [contract],
      outcomeEvents: [],
    })[0]

    expect(partial).toMatchObject({
      feature: 'report_generation',
      verificationStatus: 'partial',
      leakStatus: 'needs_outcome_data',
      usedWorkUnits: 4,
      successfulOutcomeCount: 0,
    })

    const outcomes = parseOutcomeCsv([
      'timestamp,customer_id,feature,agent_run_id,outcome_type,outcome_count,accepted',
      '2026-05-01,cus_a,report_generation,run_1,report_downloaded,1,true',
    ].join('\n'))
    const verifiable = verifyFeatureOutcomeMeasurements({
      summary: usage,
      contracts: [contract],
      outcomeEvents: outcomes.rows,
    })[0]

    expect(verifiable).toMatchObject({
      verificationStatus: 'verifiable',
      leakStatus: 'outcome_leak',
      usedWorkUnits: 4,
      successfulOutcomeCount: 1,
    })
    expect(verifiable.actualOutcomeRate).toBeCloseTo(0.25)
    expect(verifiable.costPerSuccessfulOutcomeUsd).toBe(80)
    expect(verifiable.summary).toContain('성과 누수 후보')
  })
})
