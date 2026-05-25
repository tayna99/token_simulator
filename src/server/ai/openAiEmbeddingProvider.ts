import type { EmbeddingProvider } from '../../features/rag/lib/apiDocRag'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface OpenAiEmbeddingEnv {
  OPENAI_API_KEY?: string
  OPENAI_EMBEDDING_MODEL?: string
  OPENAI_EMBEDDING_DIMENSIONS?: string
}

interface OpenAiEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>
  error?: { message?: string }
}

function runtimeEnv(): OpenAiEmbeddingEnv {
  return (globalThis as { process?: { env?: OpenAiEmbeddingEnv } }).process?.env ?? {}
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number
  readonly #apiKey: string
  readonly #model: string
  readonly #fetcher: FetchLike

  constructor(input: {
    apiKey: string
    model?: string
    dimensions?: number
    fetcher?: FetchLike
  }) {
    this.#apiKey = input.apiKey
    this.#model = input.model ?? 'text-embedding-3-small'
    this.dimensions = input.dimensions ?? 1536
    this.#fetcher = input.fetcher ?? fetch
  }

  async embed(text: string): Promise<number[]> {
    const input = text.trim()
    if (!input) return Array.from({ length: this.dimensions }, () => 0)
    const response = await this.#fetcher('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.#model,
        input,
        dimensions: this.dimensions,
      }),
    })
    const body = await response.json() as OpenAiEmbeddingResponse
    if (!response.ok) {
      throw new Error(body.error?.message ?? `OpenAI embeddings request failed with ${response.status}`)
    }
    const embedding = body.data?.[0]?.embedding
    if (!Array.isArray(embedding) || !embedding.every(value => typeof value === 'number' && Number.isFinite(value))) {
      throw new Error('OpenAI embeddings response did not include a numeric embedding')
    }
    return embedding
  }
}

export function createOpenAiEmbeddingProviderFromEnv(
  env: OpenAiEmbeddingEnv = runtimeEnv(),
  fetcher?: FetchLike,
): OpenAiEmbeddingProvider | null {
  const apiKey = env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  return new OpenAiEmbeddingProvider({
    apiKey,
    model: env.OPENAI_EMBEDDING_MODEL,
    dimensions: positiveInt(env.OPENAI_EMBEDDING_DIMENSIONS, 1536),
    fetcher,
  })
}
