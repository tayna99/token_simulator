import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '../../../../src/server/supabase/serverClient'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return Response.json({ error: 'supabase_env_missing' }, { status: 503 })
  }

  const form = await request.formData()
  const email = String(form.get('email') ?? '')
  const password = String(form.get('password') ?? '')
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return Response.json({ error: error.message }, { status: 401 })
  }

  redirect('/w/demo')
}
