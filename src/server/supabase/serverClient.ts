import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { hasBrowserSupabaseEnv, runtimeEnv } from './env'

export async function createServerSupabaseClient() {
  const env = runtimeEnv()
  if (!hasBrowserSupabaseEnv(env)) return null
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot always write cookies. Route handlers and
            // middleware refresh sessions through the same client contract.
          }
        },
      },
    },
  )
}

export async function getServerSupabaseUser() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { user: null, error: 'supabase_env_missing' }
  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error: error?.message }
}
