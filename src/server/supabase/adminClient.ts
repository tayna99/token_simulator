import 'server-only'

import {
  createSupabaseClientFromEnv,
  type SupabaseClient,
} from '../storage/supabaseProductionStore'
import { hasServiceSupabaseEnv, runtimeEnv } from './env'

let cachedClient: SupabaseClient | null | undefined

export function getSupabaseAdminRestClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient
  const env = runtimeEnv()
  cachedClient = hasServiceSupabaseEnv(env) ? createSupabaseClientFromEnv(env) : null
  return cachedClient
}
