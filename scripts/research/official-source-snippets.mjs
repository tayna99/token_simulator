import { createHash } from 'node:crypto'

function normalizeText(text) {
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function isUsefulSnippet(line) {
  return /\d/.test(line) && (
    /\b(Gemini|Qwen|Kimi|DeepSeek|GLM|MiniMax|Doubao|Seedream|Seedance|ERNIE|Hunyuan|Step|Yi|Baichuan|SenseChat)\b/i.test(line)
    || /\b(input|output|cached input|cache read|cache write|context window|batch discount)\b/i.test(line)
  )
}

function hash(value) {
  return createHash('sha1').update(value).digest('hex').slice(0, 12)
}

export function buildOfficialSourceSnippets({ source, text, capturedAt, maxSnippets = 40 }) {
  const lines = normalizeText(text)
    .filter(isUsefulSnippet)
    .slice(0, maxSnippets)

  return lines.map(line => ({
    snippetId: `source:${source.id}#${hash(line)}`,
    sourceId: source.id,
    sourceUrl: source.url,
    sourceKind: source.sourceKind,
    provider: source.modelOwner,
    servingProvider: source.servingProvider,
    pricingRegion: source.pricingRegion,
    text: line,
    hash: hash(`${source.id}:${line}`),
    capturedAt,
    refs: [`source:${source.id}`],
  }))
}

export function serializeOfficialSourceSnippetsJsonl(snippets) {
  return snippets.map(snippet => JSON.stringify(snippet)).join('\n') + (snippets.length ? '\n' : '')
}
