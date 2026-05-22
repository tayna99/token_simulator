export type StorageErrorCode = 'storage_not_configured'

export class StorageNotConfiguredError extends Error {
  code: StorageErrorCode = 'storage_not_configured'

  constructor(message = 'Vercel KV storage is not configured') {
    super(message)
    this.name = 'StorageNotConfiguredError'
  }
}

export interface JsonKvStore {
  readonly persistence: 'kv' | 'not_configured'
  getJson<T>(key: string): Promise<T | null>
  setJson<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
}

export function createUnavailableKvStore(): JsonKvStore {
  const reject = async (): Promise<never> => {
    throw new StorageNotConfiguredError()
  }

  return {
    persistence: 'not_configured',
    getJson: reject,
    setJson: reject,
    delete: reject,
  }
}

export function createMemoryKvStore(initial?: Record<string, unknown>): JsonKvStore {
  const values = new Map<string, unknown>(Object.entries(initial ?? {}))

  return {
    persistence: 'kv',
    async getJson<T>(key: string) {
      return values.has(key) ? structuredClone(values.get(key)) as T : null
    },
    async setJson<T>(key: string, value: T) {
      values.set(key, structuredClone(value))
    },
    async delete(key: string) {
      values.delete(key)
    },
  }
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

interface VercelKvEnv {
  KV_REST_API_URL?: string
  KV_REST_API_TOKEN?: string
}

interface VercelKvResult {
  result?: unknown
  error?: string
}

export function createVercelRestKvStore(env: VercelKvEnv, fetcher: FetchLike = fetch): JsonKvStore {
  const url = env.KV_REST_API_URL?.trim()
  const token = env.KV_REST_API_TOKEN?.trim()
  if (!url || !token) return createUnavailableKvStore()
  const endpoint = url
  const bearerToken = token

  async function command<T>(parts: unknown[]): Promise<T | null> {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parts),
    })
    if (!response.ok) {
      throw new Error(`Vercel KV request failed with ${response.status}`)
    }
    const body = await response.json() as VercelKvResult
    if (body.error) throw new Error(body.error)
    return body.result === undefined ? null : body.result as T
  }

  return {
    persistence: 'kv',
    async getJson<T>(key: string) {
      const raw = await command<string>(['GET', key])
      if (raw === null) return null
      return typeof raw === 'string' ? JSON.parse(raw) as T : raw as T
    },
    async setJson<T>(key: string, value: T) {
      await command(['SET', key, JSON.stringify(value)])
    },
    async delete(key: string) {
      await command(['DEL', key])
    },
  }
}

function runtimeEnv(): VercelKvEnv {
  return (globalThis as { process?: { env?: VercelKvEnv } }).process?.env ?? {}
}

export function createKvStoreFromEnv(env: VercelKvEnv = runtimeEnv()): JsonKvStore {
  return createVercelRestKvStore(env)
}

export function isStorageNotConfigured(error: unknown): error is StorageNotConfiguredError {
  return error instanceof StorageNotConfiguredError
    || Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'storage_not_configured')
}
