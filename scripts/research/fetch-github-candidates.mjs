const query = process.argv[2] ?? 'LLM cost tracking tokens'
const limit = Number(process.argv[3] ?? 10)

if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
  console.error('Usage: node scripts/research/fetch-github-candidates.mjs "query" [limit 1-50]')
  process.exit(1)
}

const params = new URLSearchParams({
  q: `${query} is:issue`,
  per_page: String(limit),
  sort: 'updated',
  order: 'desc',
})

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

const response = await fetch(`https://api.github.com/search/issues?${params.toString()}`, { headers })

if (!response.ok) {
  throw new Error(`GitHub search request failed: ${response.status} ${response.statusText}`)
}

const payload = await response.json()
const candidates = payload.items.map(item => ({
  source: 'GitHub',
  id: item.id,
  url: item.html_url,
  title: item.title,
  state: item.state,
  comments: item.comments,
  created_at: item.created_at,
  updated_at: item.updated_at,
  repository_url: item.repository_url,
  labels: item.labels.map(label => label.name),
  text: (item.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 1200),
}))

console.log(JSON.stringify(candidates, null, 2))
