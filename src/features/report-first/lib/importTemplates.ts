import type { ConnectorSourceId } from './connectorContracts'

export type ImportTemplateKind = 'usage' | 'allowance' | 'outcome' | 'policy'

export interface ImportTemplateProfile {
  id: string
  kind: ImportTemplateKind
  label: string
  source: ConnectorSourceId
  requiredColumns: string[]
  optionalColumns: string[]
  sampleCsv: string
}

export const REPORT_FIRST_IMPORT_TEMPLATES: ImportTemplateProfile[] = [
  {
    id: 'helicone_usage',
    kind: 'usage',
    label: 'Helicone 사용량',
    source: 'helicone',
    requiredColumns: ['customer_id', 'feature', 'model', 'input_tokens', 'output_tokens'],
    optionalColumns: ['request_id', 'total_cost', 'latency_ms', 'status', 'session_id', 'agent_run_id', 'cache_read_tokens', 'cache_write_tokens', 'tool_call_count', 'web_search_count'],
    sampleCsv: [
      'timestamp,request_id,customer_id,feature,model,input_tokens,output_tokens,total_cost,latency_ms,status,session_id,agent_run_id,cache_read_tokens,cache_write_tokens,tool_call_count',
      '2026-05-01T10:00:00Z,hc_req_001,northstar_health,report_generation,claude-sonnet-4.6,180000,90000,82,1400,success,sess_report_001,run_report_001,30000,8000,2',
      '2026-05-01T10:03:00Z,hc_req_002,northstar_health,agent_workflow,claude-sonnet-4.6,240000,120000,96,2200,success,sess_agent_001,run_agent_001,10000,5000,5',
      '2026-05-01T11:00:00Z,hc_req_003,atlas_legal,faq_summary,gemini-3.1-flash,20000,7000,4,520,success,sess_faq_001,run_faq_001,4000,0,1',
    ].join('\n'),
  },
  {
    id: 'langfuse_usage',
    kind: 'usage',
    label: 'Langfuse 사용량',
    source: 'langfuse',
    requiredColumns: ['user_id', 'use_case', 'model_id', 'prompt_tokens', 'completion_tokens'],
    optionalColumns: ['id', 'cost_usd', 'latency', 'result', 'session_id', 'agent_run_id', 'cached_tokens', 'tool_call_count'],
    sampleCsv: [
      'created_at,id,user_id,use_case,model_id,prompt_tokens,completion_tokens,cost_usd,latency,result,session_id,agent_run_id,cached_tokens,tool_call_count',
      '2026-05-01T12:00:00Z,lf_obs_001,northstar_health,report_generation,claude-sonnet-4.6,150000,70000,69,1250,success,sess_report_002,run_report_002,22000,2',
      '2026-05-01T12:20:00Z,lf_obs_002,bluebird_support,document_summary,gemini-3.1-flash,70000,30000,18,820,success,sess_doc_001,run_doc_001,9000,1',
    ].join('\n'),
  },
  {
    id: 'openai_usage',
    kind: 'usage',
    label: 'OpenAI 사용량',
    source: 'openai',
    requiredColumns: ['customer_id', 'route', 'model', 'prompt_tokens', 'completion_tokens'],
    optionalColumns: ['request_id', 'cost_usd', 'session_id', 'agent_run_id', 'cached_tokens', 'web_search_count', 'image_input_tokens', 'audio_input_seconds'],
    sampleCsv: [
      'timestamp,request_id,customer_id,route,model,prompt_tokens,completion_tokens,cost_usd,status,session_id,agent_run_id,cached_tokens,web_search_count,image_input_tokens,audio_input_seconds',
      '2026-05-01T13:00:00Z,oai_req_001,northstar_health,report_generation,gpt-5.5,120000,60000,58,success,sess_report_003,run_report_003,28000,0,0,0',
      '2026-05-01T13:05:00Z,oai_req_002,atlas_legal,chat_assistant,gpt-5.4-mini,30000,9000,5,success,sess_chat_001,run_chat_001,7000,1,0,0',
    ].join('\n'),
  },
  {
    id: 'anthropic_usage',
    kind: 'usage',
    label: 'Anthropic 사용량',
    source: 'anthropic',
    requiredColumns: ['customer_id', 'feature', 'model', 'input_tokens', 'output_tokens'],
    optionalColumns: ['request_id', 'total_cost', 'latency_ms', 'status', 'session_id', 'agent_run_id', 'cache_read_tokens', 'cache_write_tokens', 'tool_call_count'],
    sampleCsv: [
      'timestamp,request_id,customer_id,feature,model,input_tokens,output_tokens,total_cost,latency_ms,status,session_id,agent_run_id,cache_read_tokens,cache_write_tokens,tool_call_count',
      '2026-05-01T14:00:00Z,ant_req_001,northstar_health,agent_workflow,claude-sonnet-4.6,220000,110000,88,2100,success,sess_agent_002,run_agent_002,15000,12000,4',
      '2026-05-01T14:08:00Z,ant_req_002,bluebird_support,support_agent,claude-sonnet-4.6,90000,24000,31,930,success,sess_support_001,run_support_001,32000,4000,2',
    ].join('\n'),
  },
  {
    id: 'gemini_usage',
    kind: 'usage',
    label: 'Gemini 사용량',
    source: 'gemini',
    requiredColumns: ['customer_id', 'feature', 'model', 'input_tokens', 'output_tokens'],
    optionalColumns: ['request_id', 'total_cost', 'latency_ms', 'status', 'session_id', 'agent_run_id', 'cached_tokens', 'image_input_tokens', 'tool_call_count'],
    sampleCsv: [
      'timestamp,request_id,customer_id,feature,model,input_tokens,output_tokens,total_cost,latency_ms,status,session_id,agent_run_id,cached_tokens,image_input_tokens,tool_call_count',
      '2026-05-01T15:00:00Z,gem_req_001,atlas_legal,rag_search,gemini-3.1-flash,64000,14000,9,760,success,sess_rag_001,run_rag_001,18000,0,1',
      '2026-05-01T15:08:00Z,gem_req_002,northstar_health,media_summary,gemini-3.1-flash,50000,12000,12,1120,success,sess_media_001,run_media_001,9000,2200,1',
    ].join('\n'),
  },
  {
    id: 'vercel_ai_gateway_usage',
    kind: 'usage',
    label: 'Vercel AI Gateway 사용량',
    source: 'vercel_ai_gateway',
    requiredColumns: ['customer_id', 'feature', 'model', 'input_tokens', 'output_tokens'],
    optionalColumns: ['request_id', 'provider', 'total_cost', 'latency_ms', 'status', 'session_id', 'agent_run_id', 'cached_tokens', 'tool_call_count', 'web_search_count'],
    sampleCsv: [
      'timestamp,request_id,customer_id,feature,provider,model,input_tokens,output_tokens,total_cost,latency_ms,status,session_id,agent_run_id,cached_tokens,tool_call_count,web_search_count',
      '2026-05-01T16:00:00Z,vai_req_001,northstar_health,report_generation,anthropic,claude-sonnet-4.6,110000,52000,45,1180,success,sess_report_004,run_report_004,26000,2,0',
      '2026-05-01T16:12:00Z,vai_req_002,atlas_legal,rag_search,google,gemini-3.1-flash,36000,9000,6,690,success,sess_rag_002,run_rag_002,12000,1,1',
    ].join('\n'),
  },
  {
    id: 'stripe_allowance',
    kind: 'allowance',
    label: '요금제/매출 샘플',
    source: 'stripe',
    requiredColumns: ['customer_id', 'revenue_collected', 'included_tokens'],
    optionalColumns: ['customer_name', 'plan_id', 'overage_rate_usd_per_1k_tokens'],
    sampleCsv: [
      'customer_id,customer_name,plan_id,revenue_collected,included_tokens,overage_rate_usd_per_1k_tokens',
      'northstar_health,Northstar Health,growth,49,100000,0.18',
      'atlas_legal,Atlas Legal,growth,49,100000,0.18',
      'bluebird_support,Bluebird Support,team,199,500000,0.12',
    ].join('\n'),
  },
  {
    id: 'billing_db_allowance',
    kind: 'allowance',
    label: 'Billing DB 요금제/매출',
    source: 'billing_db',
    requiredColumns: ['customer_id', 'revenue_collected', 'included_tokens'],
    optionalColumns: ['customer_name', 'plan_id', 'overage_rate_usd_per_1k_tokens', 'billing_period'],
    sampleCsv: [
      'customer_id,customer_name,plan_id,revenue_collected,included_tokens,overage_rate_usd_per_1k_tokens,billing_period',
      'northstar_health,Northstar Health,growth,49,100000,0.18,2026-05',
      'atlas_legal,Atlas Legal,growth,49,100000,0.18,2026-05',
      'bluebird_support,Bluebird Support,team,199,500000,0.12,2026-05',
    ].join('\n'),
  },
  {
    id: 'manual_outcome_events',
    kind: 'outcome',
    label: '성과 이벤트 CSV',
    source: 'manual_outcome_csv',
    requiredColumns: ['customer_id', 'feature', 'agent_run_id', 'outcome_type', 'outcome_count', 'accepted'],
    optionalColumns: ['timestamp', 'customer_name', 'outcome_value_usd'],
    sampleCsv: [
      'timestamp,customer_id,customer_name,feature,agent_run_id,outcome_type,outcome_count,outcome_value_usd,accepted',
      '2026-05-01,northstar_health,Northstar Health,report_generation,run_report_001,report_downloaded,1,15,true',
      '2026-05-01,northstar_health,Northstar Health,agent_workflow,run_agent_001,workflow_completed,1,25,true',
    ].join('\n'),
  },
  {
    id: 'manual_policy_decisions',
    kind: 'policy',
    label: '정책 결정 CSV',
    source: 'manual_policy_csv',
    requiredColumns: ['decision_id', 'policy_candidate', 'decision_choice', 'reason'],
    optionalColumns: ['decided_at', 'owner_role', 'connector_status'],
    sampleCsv: [
      'decided_at,decision_id,policy_candidate,decision_choice,reason,owner_role,connector_status',
      '2026-05-28,decision_001,usage_cap_and_overage,hold,성과 이벤트 검증 후 적용,ceo,connector_not_configured',
      '2026-05-29,decision_002,cache_and_output_limit,adopt,개발자가 캐시와 출력 제한부터 적용,developer,connector_not_configured',
    ].join('\n'),
  },
]

export function importTemplateById(id: string): ImportTemplateProfile | undefined {
  return REPORT_FIRST_IMPORT_TEMPLATES.find(template => template.id === id)
}

export function importTemplatesByKind(kind: ImportTemplateKind): ImportTemplateProfile[] {
  return REPORT_FIRST_IMPORT_TEMPLATES.filter(template => template.kind === kind)
}
