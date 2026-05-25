import { describe, expect, it } from 'vitest'
import {
  buildRagContextBlocks,
  buildVectorIndex,
  createMemoryVectorStore,
  chunkApiDoc,
  createHashEmbeddingProvider,
  normalizeApiDoc,
  searchVectorIndex,
} from './apiDocRag'

const SOURCE = {
  id: 'google-gemini-pricing',
  modelOwner: 'google',
  servingProvider: 'first_party',
  modelFamilies: ['gemini'],
  sourceKind: 'pricing',
  url: 'https://ai.google.dev/gemini-api/docs/pricing',
  pricingRegion: 'global',
  sourceLanguage: 'en',
  officialSourceTrust: 'official_pricing',
}

const CAPTURED_AT = '2026-05-24T00:00:00.000Z'

describe('apiDocRag', () => {
  it('normalizes API docs into endpoint-aware chunks with source refs and metadata', () => {
    const doc = normalizeApiDoc({
      source: SOURCE,
      rawText: `
        <h1>Gemini API</h1>
        <h2>POST /v1beta/models/{model}:generateContent</h2>
        <p>Generate content with Gemini models.</p>
        <table>
          <tr><th>Parameter</th><th>Type</th></tr>
          <tr><td>model</td><td>string</td></tr>
        </table>
        <pre><code>curl https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent</code></pre>
        <h2>Pricing</h2>
        <p>Cached input tokens are discounted for repeated context.</p>
      `,
      capturedAt: CAPTURED_AT,
    })

    const chunks = chunkApiDoc(doc, { maxChunkChars: 900 })

    const endpointChunk = chunks.find(chunk => chunk.metadata.sectionType === 'endpoint')
    const pricingChunk = chunks.find(chunk => chunk.metadata.sectionType === 'pricing')

    expect(endpointChunk).toMatchObject({
      collection: 'official_docs',
      sourceUrl: SOURCE.url,
      metadata: {
        sourceId: SOURCE.id,
        provider: 'google',
        servingProvider: 'first_party',
        sourceKind: 'pricing',
        endpointMethod: 'POST',
        endpointPath: '/v1beta/models/{model}:generateContent',
        headingPath: ['Gemini API', 'POST /v1beta/models/{model}:generateContent'],
        officialSourceTrust: 'official_pricing',
      },
    })
    expect(endpointChunk?.text).toContain('Parameter | Type')
    expect(endpointChunk?.text).toContain('curl https://generativelanguage.googleapis.com')
    expect(endpointChunk?.refs).toEqual(expect.arrayContaining([
      'source:google-gemini-pricing',
      expect.stringMatching(/^source:google-gemini-pricing#/),
    ]))
    expect(pricingChunk?.metadata.sectionType).toBe('pricing')
    expect(pricingChunk?.text).toContain('Cached input tokens')
  })

  it('embeds chunks, performs similarity search, and builds bounded context blocks without fact authority', async () => {
    const doc = normalizeApiDoc({
      source: SOURCE,
      rawText: [
        '# Gemini API',
        '## Authentication',
        'Use an API key or OAuth bearer token.',
        '## POST /v1beta/models/{model}:generateContent',
        'Generate content from prompt parts.',
        '## Pricing',
        'Cached input tokens receive a discount when repeated context is reused.',
      ].join('\n'),
      capturedAt: CAPTURED_AT,
    })
    const chunks = chunkApiDoc(doc)
    const embeddingProvider = createHashEmbeddingProvider({ dimensions: 48 })
    const index = await buildVectorIndex({
      collection: 'official_docs',
      chunks,
      embeddingProvider,
    })

    const results = await searchVectorIndex({
      index,
      query: 'cached token pricing discount',
      topK: 2,
      embeddingProvider,
      filter: { sourceKind: 'pricing', officialSourceTrust: 'official_pricing' },
    })
    const context = buildRagContextBlocks(results, { maxChunks: 1, maxCharsPerChunk: 220 })

    expect(results[0].chunk.metadata.headingPath).toContain('Pricing')
    expect(results[0].score).toBeGreaterThan(0)
    expect(context).toEqual([
      expect.objectContaining({
        collection: 'official_docs',
        mayOverrideFacts: false,
        refs: expect.arrayContaining(['source:google-gemini-pricing']),
        sourceUrl: SOURCE.url,
      }),
    ])
    expect(context[0].text).toContain('Cached input tokens')
    expect(context[0].text.length).toBeLessThanOrEqual(220)
  })

  it('stores official doc chunks behind a vector store boundary before search', async () => {
    const chunks = chunkApiDoc(normalizeApiDoc({
      source: SOURCE,
      rawText: [
        '# Gemini API',
        '## Authentication',
        'Use OAuth bearer tokens.',
        '## Pricing',
        'Repeated context receives a cached input discount.',
      ].join('\n'),
      capturedAt: CAPTURED_AT,
    }))
    const store = createMemoryVectorStore({
      collection: 'official_docs',
      embeddingProvider: createHashEmbeddingProvider({ dimensions: 32 }),
    })

    await store.upsertChunks(chunks)
    const results = await store.search({
      query: 'cached input discount pricing',
      topK: 1,
      filter: { sourceId: SOURCE.id },
    })

    expect(await store.stats()).toEqual({
      collection: 'official_docs',
      dimensions: 32,
      itemCount: chunks.length,
    })
    expect(results[0].chunk.metadata.headingPath).toContain('Pricing')
  })
})
