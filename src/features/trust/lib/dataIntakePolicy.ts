export type TrustWarning =
  | 'raw_prompt_detected'
  | 'pii_candidate_detected'
  | 'api_key_candidate_detected'
  | 'schema_mapping_required'
  | 'plan_id_missing'
  | 'customer_id_missing'
  | 'revenue_missing'
  | 'retention_policy_unconfirmed'

export interface DataIntakePolicy {
  allowRawPrompt: false
  allowPiiByDefault: false
  allowedFileTypes: readonly ['csv', 'jsonl']
  maxFileSizeMb: number
  retentionDays: number
  requiredColumns: readonly string[]
}

export const DEFAULT_DATA_INTAKE_POLICY: DataIntakePolicy = {
  allowRawPrompt: false,
  allowPiiByDefault: false,
  allowedFileTypes: ['csv', 'jsonl'],
  maxFileSizeMb: 10,
  retentionDays: 30,
  requiredColumns: ['timestamp', 'feature', 'model', 'input_tokens', 'output_tokens'],
}
