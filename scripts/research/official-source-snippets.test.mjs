import { describe, expect, it } from 'vitest'
import {
  buildOfficialSourceSnippets,
  officialSourceSnippetsToRagRecords,
  serializeOfficialSourceSnippetsJsonl,
} from './official-source-snippets.mjs'

const SOURCE = {
  id: 'google-gemini-pricing',
  modelOwner: 'google',
  servingProvider: 'first_party',
  sourceKind: 'pricing',
  url: 'https://ai.google.dev/gemini-api/docs/pricing',
  pricingRegion: 'global',
  sourceLanguage: 'en',
}

describe('official source snippets', () => {
  it('builds stable official source snippets around model and pricing evidence', () => {
    const snippets = buildOfficialSourceSnippets({
      source: SOURCE,
      text: `
        <h1>Gemini API pricing</h1>
        <p>Gemini 3.5 Flash input price is USD $1.50 / 1M tokens.</p>
        <p>Gemini 3.5 Flash output price is USD $9.00 / 1M tokens.</p>
      `,
      capturedAt: '2026-05-24T00:00:00.000Z',
      maxSnippets: 4,
    })

    expect(snippets).toHaveLength(2)
    expect(snippets[0]).toEqual(expect.objectContaining({
      sourceId: 'google-gemini-pricing',
      sourceUrl: SOURCE.url,
      capturedAt: '2026-05-24T00:00:00.000Z',
      refs: ['source:google-gemini-pricing'],
    }))
    expect(snippets[0].snippetId).toMatch(/^source:google-gemini-pricing#/)
    expect(snippets[0].text).toMatch(/Gemini 3\.5 Flash input price/i)
  })

  it('serializes snippets as JSONL for the future official-docs RAG store', () => {
    const snippets = buildOfficialSourceSnippets({
      source: SOURCE,
      text: 'Gemini 3.5 Flash input price is USD $1.50 / 1M tokens.',
      capturedAt: '2026-05-24T00:00:00.000Z',
    })

    const lines = serializeOfficialSourceSnippetsJsonl(snippets).trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0])).toMatchObject({
      sourceId: 'google-gemini-pricing',
      refs: ['source:google-gemini-pricing'],
    })
  })

  it('converts captured source snippets into official_docs RAG records with refs intact', () => {
    const snippets = buildOfficialSourceSnippets({
      source: SOURCE,
      text: 'Gemini 3.5 Flash input price is USD $1.50 / 1M tokens.',
      capturedAt: '2026-05-24T00:00:00.000Z',
    })

    expect(officialSourceSnippetsToRagRecords(snippets)).toEqual([
      expect.objectContaining({
        id: snippets[0].snippetId,
        text: snippets[0].text,
        sourceUrl: SOURCE.url,
        refs: ['source:google-gemini-pricing'],
        collection: 'official_docs',
      }),
    ])
  })
})
