import { normalizeDecisionRecord, type Decision } from './decisionLog'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface DecisionStore {
  load: () => Promise<Decision[]>
  save: (decisions: Decision[]) => Promise<void>
  delete: (id: string) => Promise<void>
}

interface DecisionLoadBody {
  decisions?: unknown
}

interface RemoteDecisionStoreOptions {
  workspaceId: string
  fetcher?: FetchLike
}

async function assertOk(response: Response, label: string): Promise<void> {
  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}`)
  }
}

function normalizeOptions(options?: FetchLike | RemoteDecisionStoreOptions): Required<RemoteDecisionStoreOptions> {
  if (typeof options === 'function') {
    return { workspaceId: 'default', fetcher: options }
  }

  return {
    workspaceId: options?.workspaceId ?? 'default',
    fetcher: options?.fetcher ?? fetch,
  }
}

export function createRemoteDecisionStore(options?: FetchLike | RemoteDecisionStoreOptions): DecisionStore {
  const { workspaceId, fetcher } = normalizeOptions(options)
  const encodedWorkspaceId = encodeURIComponent(workspaceId)

  return {
    async load() {
      const response = await fetcher(`/api/decisions?workspaceId=${encodedWorkspaceId}`, { method: 'GET' })
      await assertOk(response, 'Decision load')
      const body = await response.json() as DecisionLoadBody
      return Array.isArray(body.decisions)
        ? body.decisions.map(normalizeDecisionRecord).filter((decision): decision is Decision => Boolean(decision))
        : []
    },
    async save(decisions) {
      const response = await fetcher('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, decisions }),
      })
      await assertOk(response, 'Decision save')
    },
    async delete(id) {
      const response = await fetcher(`/api/decisions?workspaceId=${encodedWorkspaceId}&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      await assertOk(response, 'Decision delete')
    },
  }
}
