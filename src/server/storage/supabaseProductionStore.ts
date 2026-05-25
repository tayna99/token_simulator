import type {
  ApiDocChunk,
  ApiDocChunkMetadata,
  EmbeddingProvider,
  RagCollection,
  VectorSearchResult,
  VectorStore,
  VectorStoreStats,
} from '../../features/rag/lib/apiDocRag'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface SupabaseEnv {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

export interface SupabaseClient {
  readonly url: string
  upsert(table: string, rows: unknown[], onConflict: string): Promise<unknown>
  select<T>(table: string, query: Record<string, string>): Promise<T[]>
  delete(table: string, query: Record<string, string>): Promise<void>
  rpc<T>(name: string, payload: Record<string, unknown>): Promise<T>
}

function runtimeEnv(): SupabaseEnv {
  return (globalThis as { process?: { env?: SupabaseEnv } }).process?.env ?? {}
}

function queryString(query: Record<string, string>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) params.set(key, value)
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function createSupabaseClientFromEnv(
  env: SupabaseEnv = runtimeEnv(),
  fetcher: FetchLike = fetch,
): SupabaseClient | null {
  const url = env.SUPABASE_URL?.replace(/\/$/, '')
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  const serviceRoleKey = key

  async function request(path: string, init: RequestInit): Promise<unknown> {
    const response = await fetcher(`${url}${path}`, {
      ...init,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    })
    if (!response.ok) throw new Error(`Supabase request failed with ${response.status}`)
    if (response.status === 204) return null
    return response.json()
  }

  return {
    url,
    upsert(table: string, rows: unknown[], onConflict: string) {
      return request(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(rows),
      })
    },
    async select<T>(table: string, query: Record<string, string>) {
      const result = await request(`/rest/v1/${table}${queryString(query)}`, {
        method: 'GET',
      })
      return Array.isArray(result) ? result as T[] : []
    },
    async delete(table: string, query: Record<string, string>) {
      await request(`/rest/v1/${table}${queryString(query)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      })
    },
    async rpc<T>(name: string, payload: Record<string, unknown>) {
      return request(`/rest/v1/rpc/${name}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }) as Promise<T>
    },
  }
}

interface SupabaseRagRow {
  workspace_id: string
  chunk_id: string
  collection: RagCollection
  source_id: string
  source_url: string
  text: string
  refs: string[]
  metadata: ApiDocChunkMetadata
  embedding: number[]
  content_hash: string
  captured_at: string
}

interface MatchRagChunkRow {
  chunk_id: string
  collection: RagCollection
  source_url: string
  text: string
  refs: string[]
  metadata: ApiDocChunkMetadata
  similarity: number
}

function metadataMatchesFilter(metadata: ApiDocChunkMetadata, filter: Partial<ApiDocChunkMetadata> = {}): boolean {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = metadata[key as keyof ApiDocChunkMetadata]
    if (expected === undefined) return true
    if (Array.isArray(actual)) {
      return Array.isArray(expected)
        ? expected.every(item => actual.includes(item))
        : actual.includes(String(expected))
    }
    return actual === expected
  })
}

export class SupabasePersistentVectorStore implements VectorStore {
  readonly #client: SupabaseClient
  readonly #workspaceId: string
  readonly #collection: RagCollection
  readonly #embeddingProvider: EmbeddingProvider

  constructor(input: {
    client: SupabaseClient
    workspaceId: string
    collection: RagCollection
    embeddingProvider: EmbeddingProvider
  }) {
    this.#client = input.client
    this.#workspaceId = input.workspaceId
    this.#collection = input.collection
    this.#embeddingProvider = input.embeddingProvider
  }

  async upsertChunks(chunks: ApiDocChunk[]): Promise<void> {
    const rows: SupabaseRagRow[] = []
    for (const chunk of chunks) {
      rows.push({
        workspace_id: this.#workspaceId,
        chunk_id: chunk.id,
        collection: chunk.collection,
        source_id: chunk.metadata.sourceId,
        source_url: chunk.sourceUrl,
        text: chunk.text,
        refs: chunk.refs,
        metadata: chunk.metadata,
        embedding: await this.#embeddingProvider.embed(chunk.text),
        content_hash: chunk.metadata.contentHash,
        captured_at: chunk.metadata.capturedAt,
      })
    }
    if (rows.length > 0) await this.#client.upsert('rag_chunks', rows, 'workspace_id,chunk_id')
  }

  async search(input: {
    query: string
    topK?: number
    filter?: Partial<ApiDocChunkMetadata>
  }): Promise<VectorSearchResult[]> {
    const queryEmbedding = await this.#embeddingProvider.embed(input.query)
    const rows = await this.#client.rpc<MatchRagChunkRow[]>('match_rag_chunks', {
      query_embedding: queryEmbedding,
      match_workspace_id: this.#workspaceId,
      match_collection: this.#collection,
      match_count: input.topK ?? 5,
      match_threshold: 0,
    })
    return rows
      .filter(row => metadataMatchesFilter(row.metadata, input.filter))
      .map(row => ({
        score: row.similarity,
        chunk: {
          id: row.chunk_id,
          collection: row.collection === 'official_docs' ? 'official_docs' : 'official_docs',
          text: row.text,
          sourceUrl: row.source_url,
          refs: row.refs,
          metadata: row.metadata,
        },
      }))
  }

  async deleteBySource(sourceId: string): Promise<void> {
    await this.#client.delete('rag_chunks', {
      workspace_id: `eq.${this.#workspaceId}`,
      source_id: `eq.${sourceId}`,
    })
  }

  async stats(): Promise<VectorStoreStats> {
    const rows = await this.#client.select<{ chunk_id: string }>('rag_chunks', {
      workspace_id: `eq.${this.#workspaceId}`,
      collection: `eq.${this.#collection}`,
      select: 'chunk_id',
    })
    return {
      collection: this.#collection,
      dimensions: this.#embeddingProvider.dimensions,
      itemCount: rows.length,
    }
  }
}

export interface SupabaseCheckpointRecord {
  workspaceId: string
  threadId: string
  checkpointId: string
  status: 'interrupt_requested' | 'resumed' | 'completed' | 'failed'
  graphState: Record<string, unknown>
}

interface SupabaseCheckpointRow {
  workspace_id: string
  thread_id: string
  checkpoint_id: string
  status: SupabaseCheckpointRecord['status']
  graph_state: Record<string, unknown>
}

export class SupabaseCheckpointStore {
  readonly #client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.#client = client
  }

  async save(record: SupabaseCheckpointRecord): Promise<void> {
    await this.#client.upsert('checkpoints', [{
      workspace_id: record.workspaceId,
      thread_id: record.threadId,
      checkpoint_id: record.checkpointId,
      status: record.status,
      graph_state: record.graphState,
      updated_at: new Date().toISOString(),
    }], 'workspace_id,thread_id')
  }

  async load(input: { workspaceId: string; threadId: string }): Promise<SupabaseCheckpointRecord | null> {
    const rows = await this.#client.select<SupabaseCheckpointRow>('checkpoints', {
      workspace_id: `eq.${input.workspaceId}`,
      thread_id: `eq.${input.threadId}`,
      select: '*',
      limit: '1',
    })
    const row = rows[0]
    return row
      ? {
          workspaceId: row.workspace_id,
          threadId: row.thread_id,
          checkpointId: row.checkpoint_id,
          status: row.status,
          graphState: row.graph_state,
        }
      : null
  }
}
