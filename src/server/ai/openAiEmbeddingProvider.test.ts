import { describe, expect, it } from 'vitest'
import { OpenAiEmbeddingProvider, createOpenAiEmbeddingProviderFromEnv } from './openAiEmbeddingProvider'

describe('OpenAiEmbeddingProvider', () => {
  it('creates a provider only when OPENAI_API_KEY is configured', () => {
    expect(createOpenAiEmbeddingProviderFromEnv({})).toBeNull()
    expect(createOpenAiEmbeddingProviderFromEnv({ OPENAI_API_KEY: 'sk-test' })).not.toBeNull()
  })

  it('calls the embeddings endpoint with model and dimensions', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const provider = new OpenAiEmbeddingProvider({
      apiKey: 'sk-test',
      model: 'text-embedding-3-small',
      dimensions: 1536,
      fetcher: async (input, init) => {
        calls.push({ url: String(input), init: init ?? {} })
        return new Response(JSON.stringify({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }), { status: 200 })
      },
    })

    const embedding = await provider.embed('cached token pricing')

    expect(calls[0].url).toBe('https://api.openai.com/v1/embeddings')
    expect(calls[0].init.headers).toMatchObject({
      Authorization: 'Bearer sk-test',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      model: 'text-embedding-3-small',
      input: 'cached token pricing',
      dimensions: 1536,
    })
    expect(embedding).toEqual([0.1, 0.2, 0.3])
  })
})
