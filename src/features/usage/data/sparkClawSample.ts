export const SPARK_CLAW_SAMPLE_CSV = [
  'timestamp,request_id,customer_id,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
  '2026-05-01T10:00:00Z,req_001,cust_001,pro,report_generation,claude-sonnet-4.6,sess_001,run_001,180000,90000,82,1400,success',
  '2026-05-01T10:03:00Z,req_002,cust_001,pro,agent_workflow,claude-sonnet-4.6,sess_001,run_001,240000,120000,96,2200,success',
  '2026-05-01T11:00:00Z,req_003,cust_002,pro,report_generation,claude-sonnet-4.6,sess_002,run_002,160000,80000,74,1300,success',
  '2026-05-01T12:10:00Z,req_004,cust_003,team,document_summary,gemini-3.1-flash,sess_003,run_003,70000,30000,18,820,success',
  '2026-05-01T12:20:00Z,req_005,cust_004,team,chat_assistant,gemini-3.1-flash,sess_004,run_004,60000,22000,12,610,success',
  '2026-05-01T13:00:00Z,req_006,cust_005,free,chat_assistant,gemini-3.1-flash,sess_005,run_005,40000,12000,5,520,success',
  '2026-05-01T14:30:00Z,req_007,cust_006,pro,report_generation,claude-sonnet-4.6,sess_006,run_006,150000,70000,69,1250,success',
  '2026-05-01T15:00:00Z,req_008,cust_007,team,agent_workflow,claude-sonnet-4.6,sess_007,run_007,210000,110000,88,2100,success',
].join('\n')

export const PLAN_MONTHLY_REVENUE: Record<string, number> = {
  free: 0,
  pro: 29 * 4,
  team: 99 * 3,
}

export const CUSTOMER_MONTHLY_REVENUE: Record<string, number> = {
  cust_001: 29,
  cust_002: 29,
  cust_003: 99,
  cust_004: 99,
  cust_005: 0,
  cust_006: 29,
  cust_007: 99,
}
