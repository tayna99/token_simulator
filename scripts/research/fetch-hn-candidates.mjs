const query = process.argv[2] ?? 'LLM token cost'
const limit = Number(process.argv[3] ?? 10)

if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
  console.error('Usage: node scripts/research/fetch-hn-candidates.mjs "query" [limit 1-50]')
  process.exit(1)
}

const params = new URLSearchParams({
  query,
  tags: 'comment',
  hitsPerPage: String(limit),
})

const response = await fetch(`https://hn.algolia.com/api/v1/search?${params.toString()}`)

if (!response.ok) {
  throw new Error(`HN Algolia request failed: ${response.status} ${response.statusText}`)
}

const payload = await response.json()
const candidates = payload.hits.map(hit => ({
  source: 'HN',
  objectID: hit.objectID,
  url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
  created_at: hit.created_at,
  author: hit.author,
  points: hit.points ?? null,
  title: hit.title ?? hit.story_title ?? '',
  story_url: hit.story_url ?? '',
  text: (hit.comment_text ?? hit.story_text ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
}))

console.log(JSON.stringify(candidates, null, 2))
