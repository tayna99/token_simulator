import { normalizeCorpusSource, type CorpusChunk, type CorpusSource } from '../lib/corpusTypes'

export type ServingEconomicsMetricKind =
  | 'ttft'
  | 'tpot'
  | 'throughput'
  | 'gpu_utilization'
  | 'kv_cache'
  | 'prefix_cache'
  | 'batching'

export interface ServingEconomicsSource extends CorpusSource {
  engine: 'vllm'
  metricKinds: ServingEconomicsMetricKind[]
  costAuthority: 'self_hosted_serving_economics_only'
  providerApiCostExcluded: true
}

export const SERVING_ECONOMICS_SOURCES: ServingEconomicsSource[] = [
  {
    ...normalizeCorpusSource({
      id: 'vllm-benchmark-docs',
      corpusId: 'serving_economics',
      sourceKind: 'serving_benchmark_docs',
      url: 'https://docs.vllm.ai/en/stable/api/vllm/benchmarks/',
      active: true,
      parserStrategy: 'manual_review',
      cadence: 'weekly',
      sourceLanguage: 'en',
      corpusTrust: 'standard_reference',
      ownerAgentIds: ['model_inference_research', 'finance_ops'],
      consumerAgentIds: ['model_inference_research', 'optimization_routing', 'finance_ops'],
      evidenceRefPrefix: 'serving:',
    }),
    engine: 'vllm',
    metricKinds: ['ttft', 'tpot', 'throughput', 'gpu_utilization', 'kv_cache', 'prefix_cache', 'batching'],
    costAuthority: 'self_hosted_serving_economics_only',
    providerApiCostExcluded: true,
  },
]

export function servingEconomicsSourcesAsCorpusChunks(
  sources: ServingEconomicsSource[] = SERVING_ECONOMICS_SOURCES,
): CorpusChunk[] {
  return sources.map(source => ({
    id: source.refs[0],
    corpusId: 'serving_economics',
    text: [
      'vLLM benchmark docs provide serving-economics evidence for TTFT, TPOT, throughput, GPU utilization, KV cache pressure, prefix caching, and batching.',
      'Use this corpus only for self-hosted serving economics; provider API cost excluded.',
    ].join(' '),
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
      taskTags: ['serving-economics', 'latency', 'self-hosted'],
      costAuthority: source.costAuthority,
      providerApiCostExcluded: source.providerApiCostExcluded,
    },
  }))
}
