const env = process.env
const baseUrl = (env.PRODUCTION_SMOKE_BASE_URL || env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const workspaceId = env.DEMO_WORKSPACE_ID || 'demo'
const demoEmail = env.DEMO_USER_EMAIL || env.NEXT_PUBLIC_DEMO_LOGIN_EMAIL
const demoPassword = env.DEMO_USER_PASSWORD
const agentServiceUrl = env.AGENT_SERVICE_URL?.replace(/\/$/, '')

const missing = [
  ...(!env.NEXT_PUBLIC_SUPABASE_URL ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
  ...(!env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? ['NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
    : []),
  ...(!env.SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_URL ? ['SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL'] : []),
  ...(!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SECRET_KEY
    ? ['SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY']
    : []),
  ...(!env.AGENT_SERVICE_URL ? ['AGENT_SERVICE_URL'] : []),
  ...(!env.DEMO_USER_PASSWORD ? ['DEMO_USER_PASSWORD'] : []),
]

function cookieHeader(headers) {
  const raw = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie')].filter(Boolean)
  return raw.map(value => value.split(';')[0]).join('; ')
}

async function expectOk(label, request) {
  const response = await request()
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}: ${text.slice(0, 240)}`)
  }
  if (/\bdeterministic_preview\b/.test(text) || /\bpreview\b/i.test(text)) {
    throw new Error(`${label} returned preview data on production smoke`)
  }
  return { response, text }
}

async function login() {
  const form = new URLSearchParams()
  form.set('email', demoEmail)
  form.set('password', demoPassword)
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    body: form,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const cookies = cookieHeader(response.headers)
  if (!cookies) throw new Error(`login did not return session cookies; HTTP ${response.status}`)
  return cookies
}

async function main() {
  if (missing.length > 0 || !demoEmail) {
    throw new Error(`Missing required env: ${[...missing, ...(!demoEmail ? ['DEMO_USER_EMAIL or NEXT_PUBLIC_DEMO_LOGIN_EMAIL'] : [])].join(', ')}`)
  }

  const cookies = await login()
  const headers = { Cookie: cookies }
  const reportRunId = `report:${workspaceId}:latest`

  await expectOk('/w/demo', () => fetch(`${baseUrl}/w/${encodeURIComponent(workspaceId)}`, { headers }))
  await expectOk('/api/runtime/status', () => fetch(`${baseUrl}/api/runtime/status?workspaceId=${encodeURIComponent(workspaceId)}`, { headers }))
  await expectOk('/api/rag/p1-evidence', () => fetch(
    `${baseUrl}/api/rag/p1-evidence?workspaceId=${encodeURIComponent(workspaceId)}&query=${encodeURIComponent('production demo pricing evidence')}&topK=3`,
    { headers },
  ))
  await expectOk('/api/watchtower/runs', () => fetch(`${baseUrl}/api/watchtower/runs?workspaceId=${encodeURIComponent(workspaceId)}`, { headers }))
  await expectOk('/api/reports/[id]/download', () => fetch(
    `${baseUrl}/api/reports/${encodeURIComponent(reportRunId)}/download?workspaceId=${encodeURIComponent(workspaceId)}&reportId=${encodeURIComponent(reportRunId)}&artifactId=demo-report`,
    { headers },
  ))
  await expectOk('agent_service /health', () => fetch(`${agentServiceUrl}/health`))

  console.log(`Production smoke passed for ${baseUrl}/w/${workspaceId}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
