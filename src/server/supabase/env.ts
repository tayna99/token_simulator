export interface SupabaseBrowserEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
}

export interface SupabaseServerEnv extends SupabaseBrowserEnv {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

export function runtimeEnv(): SupabaseServerEnv {
  return (globalThis as { process?: { env?: SupabaseServerEnv } }).process?.env ?? {}
}

export function hasBrowserSupabaseEnv(env: SupabaseBrowserEnv = runtimeEnv()): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
}

export function hasServiceSupabaseEnv(env: SupabaseServerEnv = runtimeEnv()): boolean {
  return Boolean(env.SUPABASE_URL?.trim() && env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}
