import { describe, expect, it } from 'vitest'

import {
  SERVING_ECONOMICS_SOURCES,
  servingEconomicsSourcesAsCorpusChunks,
} from './servingEconomicsRegistry'

describe('serving economics corpus registry', () => {
  it('registers vLLM benchmark docs as C3 evidence without provider API cost authority', () => {
    const source = SERVING_ECONOMICS_SOURCES.find(item => item.id === 'vllm-benchmark-docs')

    expect(source).toBeDefined()
    expect(source?.corpusId).toBe('serving_economics')
    expect(source?.corpusTrust).toBe('standard_reference')
    expect(source?.refs).toEqual(['evidence:vllm-benchmark-docs'])
    expect(source?.costAuthority).toBe('self_hosted_serving_economics_only')
    expect(source?.providerApiCostExcluded).toBe(true)
    expect(source?.mayOverrideFacts).toBe(false)
  })

  it('turns serving economics sources into corpus chunks with latency and KV-cache context', () => {
    const chunks = servingEconomicsSourcesAsCorpusChunks()
    const chunk = chunks.find(item => item.id === 'evidence:vllm-benchmark-docs')

    expect(chunk).toBeDefined()
    expect(chunk?.corpusId).toBe('serving_economics')
    expect(chunk?.text).toContain('TTFT')
    expect(chunk?.text).toContain('TPOT')
    expect(chunk?.text).toContain('throughput')
    expect(chunk?.text).toContain('KV cache')
    expect(chunk?.text).toContain('provider API cost excluded')
    expect(chunk?.mayOverrideFacts).toBe(false)
    expect(chunk?.metadata.consumerAgentIds).toContain('finance_ops')
  })
})
