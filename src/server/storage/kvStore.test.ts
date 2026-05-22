import { describe, expect, it } from 'vitest'
import { createMemoryKvStore, createUnavailableKvStore, StorageNotConfiguredError } from './kvStore'

describe('P1 KV storage', () => {
  it('reports storage_not_configured when Vercel KV env is missing', async () => {
    const store = createUnavailableKvStore()

    await expect(store.getJson('workspace:demo:decisions')).rejects.toMatchObject({
      code: 'storage_not_configured',
    })
    await expect(store.setJson('workspace:demo:decisions', [])).rejects.toBeInstanceOf(StorageNotConfiguredError)
  })

  it('stores JSON values with workspace-isolated keys', async () => {
    const store = createMemoryKvStore()

    await store.setJson('workspace:a:decisions', [{ id: 'decision-a' }])
    await store.setJson('workspace:b:decisions', [{ id: 'decision-b' }])

    expect(await store.getJson('workspace:a:decisions')).toEqual([{ id: 'decision-a' }])
    expect(await store.getJson('workspace:b:decisions')).toEqual([{ id: 'decision-b' }])
  })
})
