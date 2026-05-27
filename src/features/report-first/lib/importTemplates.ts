export type ImportTemplateKind = 'usage' | 'allowance'

export interface ImportTemplateProfile {
  id: string
  kind: ImportTemplateKind
  label: string
  source: 'Helicone' | 'Langfuse' | 'OpenAI' | 'Stripe'
  requiredColumns: string[]
  optionalColumns: string[]
  sampleCsv: string
}

export const REPORT_FIRST_IMPORT_TEMPLATES: ImportTemplateProfile[] = [
  {
    id: 'helicone_usage',
    kind: 'usage',
    label: 'Helicone 사용량',
    source: 'Helicone',
    requiredColumns: ['customer_id', 'feature', 'model', 'input_tokens', 'output_tokens'],
    optionalColumns: ['request_id', 'total_cost', 'latency_ms', 'status'],
    sampleCsv: [
      'timestamp,request_id,customer_id,feature,model,input_tokens,output_tokens,total_cost,latency_ms,status',
      '2026-05-01T10:00:00Z,hc_req_001,cus_heavy,report_generation,claude-sonnet-4.6,180000,90000,82,1400,success',
      '2026-05-01T10:03:00Z,hc_req_002,cus_heavy,agent_workflow,claude-sonnet-4.6,240000,120000,96,2200,success',
      '2026-05-01T11:00:00Z,hc_req_003,cus_light,faq_summary,gemini-3.1-flash,20000,7000,4,520,success',
    ].join('\n'),
  },
  {
    id: 'langfuse_usage',
    kind: 'usage',
    label: 'Langfuse 사용량',
    source: 'Langfuse',
    requiredColumns: ['user_id', 'use_case', 'model_id', 'prompt_tokens', 'completion_tokens'],
    optionalColumns: ['id', 'cost_usd', 'latency', 'result'],
    sampleCsv: [
      'created_at,id,user_id,use_case,model_id,prompt_tokens,completion_tokens,cost_usd,latency,result',
      '2026-05-01T12:00:00Z,lf_obs_001,cus_heavy,report_generation,claude-sonnet-4.6,150000,70000,69,1250,success',
      '2026-05-01T12:20:00Z,lf_obs_002,cus_team,document_summary,gemini-3.1-flash,70000,30000,18,820,success',
    ].join('\n'),
  },
  {
    id: 'openai_usage',
    kind: 'usage',
    label: 'OpenAI 사용량',
    source: 'OpenAI',
    requiredColumns: ['customer_id', 'route', 'model', 'prompt_tokens', 'completion_tokens'],
    optionalColumns: ['request_id', 'cost_usd'],
    sampleCsv: [
      'timestamp,request_id,customer_id,route,model,prompt_tokens,completion_tokens,cost_usd,status',
      '2026-05-01T13:00:00Z,oai_req_001,cus_heavy,report_generation,gpt-5.5,120000,60000,58,success',
      '2026-05-01T13:05:00Z,oai_req_002,cus_light,chat_assistant,gpt-5.4-mini,30000,9000,5,success',
    ].join('\n'),
  },
  {
    id: 'stripe_allowance',
    kind: 'allowance',
    label: 'Stripe 요금제/매출',
    source: 'Stripe',
    requiredColumns: ['customer_id', 'revenue_collected', 'included_tokens'],
    optionalColumns: ['plan_id', 'overage_rate_usd_per_1k_tokens'],
    sampleCsv: [
      'customer_id,plan_id,revenue_collected,included_tokens,overage_rate_usd_per_1k_tokens',
      'cus_heavy,growth,49,100000,0.18',
      'cus_light,growth,49,100000,0.18',
      'cus_team,team,199,500000,0.12',
    ].join('\n'),
  },
]

export function importTemplateById(id: string): ImportTemplateProfile | undefined {
  return REPORT_FIRST_IMPORT_TEMPLATES.find(template => template.id === id)
}

export function importTemplatesByKind(kind: ImportTemplateKind): ImportTemplateProfile[] {
  return REPORT_FIRST_IMPORT_TEMPLATES.filter(template => template.kind === kind)
}
