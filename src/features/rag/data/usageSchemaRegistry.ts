import { normalizeCorpusSource, type CorpusChunk, type CorpusSource } from '../lib/corpusTypes'

export type UsageSchemaAdapterSource =
  | 'openai'
  | 'anthropic'
  | 'vercel_ai_gateway'
  | 'helicone'
  | 'langfuse'
  | 'openrouter'
  | 'litellm'
  | 'application_gateway'

export interface UsageSchemaSource extends CorpusSource {
  connector: UsageSchemaAdapterSource | 'csv'
  requiredDimensions: string[]
}

const REQUIRED_DIMENSIONS = ['customer', 'feature', 'model', 'plan', 'session', 'agent_run', 'input_tokens', 'output_tokens']

function usageSource(input: {
  id: string
  connector: UsageSchemaSource['connector']
  url: string | null
  parserStrategy: string
}): UsageSchemaSource {
  return {
    ...normalizeCorpusSource({
      id: input.id,
      corpusId: 'usage_schema',
      sourceKind: 'log_schema',
      url: input.url,
      active: true,
      parserStrategy: input.parserStrategy,
      cadence: 'weekly',
      sourceLanguage: 'en',
      corpusTrust: input.url ? 'official_docs' : 'internal_authoritative',
      ownerAgentIds: ['usage_data_ingestion'],
      consumerAgentIds: ['usage_data_ingestion', 'trust_security_compliance', 'cost_engine_qa'],
      evidenceRefPrefix: 'evidence:',
    }),
    connector: input.connector,
    requiredDimensions: REQUIRED_DIMENSIONS,
  }
}

export const USAGE_SCHEMA_SOURCES: UsageSchemaSource[] = [
  usageSource({ id: 'usage-schema-openai', connector: 'openai', url: 'https://platform.openai.com/docs/api-reference/usage', parserStrategy: 'usage_api_docs' }),
  usageSource({ id: 'usage-schema-anthropic', connector: 'anthropic', url: 'https://docs.anthropic.com/en/api/usage-cost-api', parserStrategy: 'usage_api_docs' }),
  usageSource({ id: 'usage-schema-vercel-ai-gateway', connector: 'vercel_ai_gateway', url: 'https://vercel.com/docs/ai-gateway', parserStrategy: 'gateway_usage_docs' }),
  usageSource({ id: 'usage-schema-helicone', connector: 'helicone', url: 'https://docs.helicone.ai/', parserStrategy: 'observability_export_docs' }),
  usageSource({ id: 'usage-schema-langfuse', connector: 'langfuse', url: 'https://langfuse.com/docs', parserStrategy: 'observability_export_docs' }),
  usageSource({ id: 'usage-schema-openrouter', connector: 'openrouter', url: 'https://openrouter.ai/docs', parserStrategy: 'router_usage_docs' }),
  usageSource({ id: 'usage-schema-litellm', connector: 'litellm', url: 'https://docs.litellm.ai/docs/proxy/usage', parserStrategy: 'gateway_usage_docs' }),
  usageSource({ id: 'usage-schema-csv', connector: 'csv', url: null, parserStrategy: 'csv_header_mapping' }),
]

export function usageSchemaSourceForAdapter(source: UsageSchemaAdapterSource): UsageSchemaSource {
  return USAGE_SCHEMA_SOURCES.find(item => item.connector === source) ?? USAGE_SCHEMA_SOURCES.find(item => item.connector === 'csv')!
}

export function schemaEvidenceRefsForAdapter(source: UsageSchemaAdapterSource): string[] {
  return [...usageSchemaSourceForAdapter(source).refs]
}

export function usageSchemaSourcesAsCorpusChunks(sources: UsageSchemaSource[] = USAGE_SCHEMA_SOURCES): CorpusChunk[] {
  return sources.map(source => ({
    id: source.refs[0],
    corpusId: 'usage_schema',
    text: `${source.connector} usage schema maps required dimensions: ${source.requiredDimensions.join(', ')}.`,
    sourceUrl: source.url,
    refs: [...source.refs],
    mayOverrideFacts: false,
    metadata: {
      sourceKind: source.sourceKind,
      corpusTrust: source.corpusTrust,
      ownerAgentIds: source.ownerAgentIds,
      consumerAgentIds: source.consumerAgentIds,
      cadence: source.cadence,
      sourceId: source.id,
    },
  }))
}
