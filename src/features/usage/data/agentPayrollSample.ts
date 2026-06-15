export const AGENT_PAYROLL_SAMPLE_CSV = [
  'timestamp,request_id,customer_id,customer_name,plan_id,feature,model,session_id,agent_run_id,input_tokens,output_tokens,total_cost,latency_ms,status',
  '2026-05-01T10:00:00Z,req_001,northstar_health,Northstar Health,pro,report_generation,claude-sonnet-4.6,sess_001,run_001,180000,90000,82,1400,success',
  '2026-05-01T10:03:00Z,req_002,northstar_health,Northstar Health,pro,agent_workflow,claude-sonnet-4.6,sess_001,run_001,240000,120000,96,2200,success',
  '2026-05-01T11:00:00Z,req_003,atlas_legal,Atlas Legal,pro,report_generation,claude-sonnet-4.6,sess_002,run_002,160000,80000,74,1300,success',
  '2026-05-01T12:10:00Z,req_004,bluebird_support,Bluebird Support,team,document_summary,gemini-3.1-flash,sess_003,run_003,70000,30000,18,820,success',
  '2026-05-01T12:20:00Z,req_005,orbit_finance,Orbit Finance,team,chat_assistant,gemini-3.1-flash,sess_004,run_004,60000,22000,12,610,success',
  '2026-05-01T13:00:00Z,req_006,indie_ops,IndieOps,free,chat_assistant,gemini-3.1-flash,sess_005,run_005,40000,12000,5,520,success',
  '2026-05-01T14:30:00Z,req_007,brightdesk_ai,BrightDesk AI,pro,report_generation,claude-sonnet-4.6,sess_006,run_006,150000,70000,69,1250,success',
  '2026-05-01T15:00:00Z,req_008,cobalt_sales,Cobalt Sales,team,agent_workflow,claude-sonnet-4.6,sess_007,run_007,210000,110000,88,2100,success',
  '2026-05-01T15:20:00Z,req_009,bluebird_support,Bluebird Support,team,chat_assistant,gemini-3.1-flash,sess_003,run_003,12000,4000,0,1320,retry',
  '2026-05-01T15:24:00Z,req_010,orbit_finance,Orbit Finance,team,faq_summary,gemini-3.1-flash,sess_004,run_004,9000,3000,0,980,failed',
  '2026-05-01T15:30:00Z,req_011,indie_ops,IndieOps,free,chat_assistant,gemini-3.1-flash,sess_005,run_005,8000,2000,0,540,success',
  '2026-05-01T15:45:00Z,req_012,brightdesk_ai,BrightDesk AI,pro,document_summary,gemini-3.1-flash,sess_006,run_006,10000,3000,0,1210,retry',
].join('\n')

export const PLAN_MONTHLY_REVENUE: Record<string, number> = {
  free: 0,
  pro: 29 * 3,
  team: 99 * 3,
}

export const CUSTOMER_MONTHLY_REVENUE: Record<string, number> = {
  northstar_health: 29,
  atlas_legal: 29,
  bluebird_support: 99,
  orbit_finance: 99,
  indie_ops: 0,
  brightdesk_ai: 29,
  cobalt_sales: 99,
}

export const AGENT_PAYROLL_TOKEN_ALLOWANCE_CSV = [
  'customer_id,customer_name,plan_id,revenue_collected,included_tokens,overage_rate_usd_per_1k_tokens',
  'northstar_health,Northstar Health,pro,29,185000,0.18',
  'atlas_legal,Atlas Legal,pro,29,185000,0.18',
  'bluebird_support,Bluebird Support,team,99,320000,0.12',
  'orbit_finance,Orbit Finance,team,99,320000,0.12',
  'indie_ops,IndieOps,free,0,50000,0.25',
  'brightdesk_ai,BrightDesk AI,pro,29,185000,0.18',
  'cobalt_sales,Cobalt Sales,team,99,320000,0.12',
].join('\n')

export const AGENT_PAYROLL_OUTCOME_SAMPLE_CSV = [
  'timestamp,customer_id,customer_name,feature,agent_run_id,outcome_type,outcome_count,outcome_value_usd,accepted',
  '2026-05-01T10:30:00Z,northstar_health,Northstar Health,report_generation,run_001,report_downloaded,0,0,false',
  '2026-05-01T10:40:00Z,northstar_health,Northstar Health,agent_workflow,run_001,workflow_completed,1,25,true',
  '2026-05-01T11:30:00Z,atlas_legal,Atlas Legal,report_generation,run_002,report_shared,0,0,false',
  '2026-05-01T15:40:00Z,cobalt_sales,Cobalt Sales,agent_workflow,run_007,workflow_completed,0,0,false',
].join('\n')

export const CUSTOMER_TOKEN_ALLOWANCE: Record<string, number> = {
  northstar_health: 185_000,
  atlas_legal: 185_000,
  bluebird_support: 320_000,
  orbit_finance: 320_000,
  indie_ops: 50_000,
  brightdesk_ai: 185_000,
  cobalt_sales: 320_000,
}

export const PLAN_TOKEN_ALLOWANCE: Record<string, number> = {
  free: 50_000,
  pro: 185_000 * 3,
  team: 320_000 * 3,
}

export const CUSTOMER_OVERAGE_RATE_USD_PER_1K_TOKENS: Record<string, number> = {
  northstar_health: 0.18,
  atlas_legal: 0.18,
  bluebird_support: 0.12,
  orbit_finance: 0.12,
  indie_ops: 0.25,
  brightdesk_ai: 0.18,
  cobalt_sales: 0.12,
}

export const PLAN_OVERAGE_RATE_USD_PER_1K_TOKENS: Record<string, number> = {
  free: 0.25,
  pro: 0.18,
  team: 0.12,
}
