import { describe, expect, it } from 'vitest'
import {
  buildOfficialApiDocChunks,
  buildOfficialDocsVectorIndex,
  createHashEmbeddingProvider,
  searchOfficialDocsVectorIndex,
} from './api-doc-rag.mjs'

const SOURCE = {
  id: 'deepseek-api-pricing',
  modelOwner: 'deepseek',
  servingProvider: 'first_party',
  modelFamilies: ['deepseek'],
  sourceKind: 'pricing',
  url: 'https://api-docs.deepseek.com/quick_start/pricing',
  pricingRegion: 'global',
  sourceLanguage: 'en',
  officialSourceTrust: 'official_pricing',
}

describe('api-doc-rag research pipeline', () => {
  it('builds API-aware official doc chunks with endpoint and pricing metadata', () => {
    const chunks = buildOfficialApiDocChunks({
      source: SOURCE,
      text: `
        <h1>DeepSeek API</h1>
        <h2>POST /chat/completions</h2>
        <p>Create a chat completion.</p>
        <table><tr><th>Parameter</th><th>Type</th></tr><tr><td>model</td><td>string</td></tr></table>
        <pre><code>curl https://api.deepseek.com/chat/completions</code></pre>
        <h2>Pricing</h2>
        <p>Cached input tokens use a lower unit price.</p>
      `,
      capturedAt: '2026-05-24T00:00:00.000Z',
    })

    const endpoint = chunks.find(chunk => chunk.metadata.sectionType === 'endpoint')
    const pricing = chunks.find(chunk => chunk.metadata.sectionType === 'pricing')

    expect(endpoint).toMatchObject({
      collection: 'official_docs',
      sourceUrl: SOURCE.url,
      metadata: {
        sourceId: SOURCE.id,
        endpointMethod: 'POST',
        endpointPath: '/chat/completions',
        headingPath: ['DeepSeek API', 'POST /chat/completions'],
      },
    })
    expect(endpoint.text).toContain('Parameter | Type')
    expect(endpoint.text).toContain('curl https://api.deepseek.com/chat/completions')
    expect(pricing.refs).toEqual(expect.arrayContaining(['source:deepseek-api-pricing']))
  })

  it('creates a vector index and searches it by query embedding', async () => {
    const chunks = buildOfficialApiDocChunks({
      source: SOURCE,
      text: [
        '# DeepSeek API',
        '## Authentication',
        'Requests use bearer tokens.',
        '## Pricing',
        'Cached input tokens use a lower unit price for repeated context.',
      ].join('\n'),
      capturedAt: '2026-05-24T00:00:00.000Z',
    })
    const embeddingProvider = createHashEmbeddingProvider({ dimensions: 48 })
    const index = await buildOfficialDocsVectorIndex({ chunks, embeddingProvider })

    const results = await searchOfficialDocsVectorIndex({
      index,
      query: 'cached token pricing',
      topK: 1,
      embeddingProvider,
    })

    expect(index.collection).toBe('official_docs')
    expect(index.items[0].embedding).toHaveLength(48)
    expect(results[0].chunk.metadata.headingPath).toContain('Pricing')
    expect(results[0].score).toBeGreaterThan(0)
  })
})
