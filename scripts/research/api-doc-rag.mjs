const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function normalizeHtmlTables(value) {
  return String(value).replace(/<table[\s\S]*?<\/table>/gi, table => {
    const rows = Array.from(table.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map(rowMatch => {
      const row = rowMatch[0]
      return Array.from(row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi))
        .map(cellMatch => stripTags(cellMatch[1]))
        .filter(Boolean)
        .join(' | ')
    }).filter(Boolean)
    return rows.length ? `\n${rows.join('\n')}\n` : '\n'
  })
}

function htmlToMarkdownish(value) {
  return normalizeHtmlTables(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code) => (
      `\n\`\`\`\n${decodeEntities(code).trim()}\n\`\`\`\n`
    ))
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) => (
      `\n${'#'.repeat(Number(level))} ${stripTags(text)}\n`
    ))
    .replace(/<\/?(p|div|section|article|li|ul|ol|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
}

function normalizedLines(rawText) {
  return decodeEntities(htmlToMarkdownish(rawText))
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function stableHash(value) {
  let hash = 2166136261
  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function tableLine(line) {
  return line.includes('|') && !line.startsWith('```')
}

function normalizeApiDoc({ source, text, capturedAt }) {
  const blocks = []
  const headingStack = []
  const lines = normalizedLines(text)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const title = heading[2].trim()
      while (headingStack.length && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop()
      }
      headingStack.push({ level, text: title })
      blocks.push({
        kind: 'heading',
        text: title,
        level,
        headingPath: headingStack.map(item => item.text),
      })
      continue
    }
    if (line === '```') {
      const codeLines = []
      index += 1
      while (index < lines.length && lines[index] !== '```') {
        codeLines.push(lines[index])
        index += 1
      }
      blocks.push({ kind: 'code', text: codeLines.join('\n'), headingPath: headingStack.map(item => item.text) })
      continue
    }
    if (tableLine(line)) {
      const tableLines = [line]
      while (index + 1 < lines.length && tableLine(lines[index + 1])) {
        index += 1
        tableLines.push(lines[index])
      }
      blocks.push({ kind: 'table', text: tableLines.join('\n'), headingPath: headingStack.map(item => item.text) })
      continue
    }
    blocks.push({ kind: 'paragraph', text: line, headingPath: headingStack.map(item => item.text) })
  }
  return { source, capturedAt, blocks }
}

function endpointFromHeading(headingPath) {
  const heading = headingPath[headingPath.length - 1] ?? ''
  const match = new RegExp(`\\b(${HTTP_METHODS.join('|')})\\s+([^\\s]+)`, 'i').exec(heading)
  if (!match) return {}
  return { method: match[1].toUpperCase(), path: match[2] }
}

function sectionTypeFrom(headingPath, text) {
  const haystack = `${headingPath.join(' ')} ${text}`.toLowerCase()
  if (endpointFromHeading(headingPath).method) return 'endpoint'
  if (/\b(pricing|price|cost|token|cache|cached|discount|billing)\b/.test(haystack)) return 'pricing'
  if (/\b(auth|authentication|authorization|api key|oauth|bearer)\b/.test(haystack)) return 'authentication'
  if (/\b(rate limit|quota|throttle)\b/.test(haystack)) return 'rate_limit'
  if (/\b(error|status code|exception)\b/.test(haystack)) return 'error'
  if (/\b(schema|parameter|request|response)\b/.test(haystack)) return 'schema'
  if (/\b(example|curl|sample)\b/.test(haystack)) return 'example'
  return 'overview'
}

function splitLongSection(text, maxChunkChars) {
  if (text.length <= maxChunkChars) return [text]
  const chunks = []
  let current = ''
  for (const paragraph of text.split(/\n{2,}/)) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph
    if (next.length <= maxChunkChars) {
      current = next
      continue
    }
    if (current) chunks.push(current)
    current = paragraph.length <= maxChunkChars ? paragraph : paragraph.slice(0, maxChunkChars)
  }
  if (current) chunks.push(current)
  return chunks
}

function chunkMetadata({ doc, headingPath, text }) {
  const endpoint = endpointFromHeading(headingPath)
  return {
    sourceId: doc.source.id,
    provider: doc.source.modelOwner,
    servingProvider: doc.source.servingProvider,
    modelFamilies: doc.source.modelFamilies ?? [],
    sourceKind: doc.source.sourceKind,
    sourceLanguage: doc.source.sourceLanguage,
    pricingRegion: doc.source.pricingRegion,
    officialSourceTrust: doc.source.officialSourceTrust,
    capturedAt: doc.capturedAt,
    headingPath,
    sectionType: sectionTypeFrom(headingPath, text),
    endpointMethod: endpoint.method,
    endpointPath: endpoint.path,
    contentHash: stableHash(`${doc.source.id}:${headingPath.join('/')}:${text}`),
  }
}

function buildChunk({ doc, headingPath, text, part }) {
  const metadata = chunkMetadata({ doc, headingPath, text })
  const chunkRef = `source:${doc.source.id}#${metadata.contentHash}${part > 0 ? `-${part}` : ''}`
  return {
    id: chunkRef,
    collection: 'official_docs',
    text,
    sourceUrl: doc.source.url,
    refs: [`source:${doc.source.id}`, chunkRef],
    metadata,
  }
}

export function buildOfficialApiDocChunks({ source, text, capturedAt, maxChunkChars = 1200 }) {
  const doc = normalizeApiDoc({ source, text, capturedAt })
  const sections = []
  let current = null
  const flush = () => {
    if (!current) return
    if (current.lines.length > 1) sections.push(current)
    current = null
  }
  for (const block of doc.blocks) {
    if (block.kind === 'heading') {
      flush()
      current = { headingPath: block.headingPath, lines: [block.text] }
      continue
    }
    if (!current) {
      current = {
        headingPath: block.headingPath.length ? block.headingPath : ['Overview'],
        lines: block.headingPath.length ? [block.headingPath[block.headingPath.length - 1]] : ['Overview'],
      }
    }
    current.lines.push(block.text)
  }
  flush()
  return sections.flatMap(section => {
    const sectionText = section.lines.join('\n\n')
    return splitLongSection(sectionText, maxChunkChars).map((chunkText, part) => buildChunk({
      doc,
      headingPath: section.headingPath,
      text: chunkText,
      part,
    }))
  })
}

function termsFrom(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9._:/{}-]+/)
    .map(term => term.replace(/s$/, ''))
    .filter(term => term.length > 1)
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (magnitude === 0) return vector
  return vector.map(value => Number((value / magnitude).toFixed(8)))
}

export function createHashEmbeddingProvider({ dimensions = 64 } = {}) {
  return {
    dimensions,
    async embed(text) {
      const vector = Array.from({ length: dimensions }, () => 0)
      for (const term of termsFrom(text)) {
        const hash = parseInt(stableHash(term), 16)
        vector[hash % dimensions] += hash % 2 === 0 ? 1 : -1
      }
      return normalizeVector(vector)
    },
  }
}

export async function buildOfficialDocsVectorIndex({ chunks, embeddingProvider = createHashEmbeddingProvider() }) {
  const items = await Promise.all(chunks.map(async chunk => ({
    chunk,
    embedding: await embeddingProvider.embed(`${chunk.metadata.headingPath.join(' ')}\n${chunk.text}`),
  })))
  return {
    collection: 'official_docs',
    dimensions: embeddingProvider.dimensions,
    items,
  }
}

function cosine(left, right) {
  const length = Math.min(left.length, right.length)
  let score = 0
  for (let index = 0; index < length; index += 1) score += left[index] * right[index]
  return Number(score.toFixed(6))
}

export async function searchOfficialDocsVectorIndex({ index, query, topK = 5, embeddingProvider = createHashEmbeddingProvider({ dimensions: index.dimensions }) }) {
  const queryEmbedding = await embeddingProvider.embed(query)
  return index.items
    .map(item => ({ chunk: item.chunk, score: cosine(queryEmbedding, item.embedding) }))
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id))
    .slice(0, topK)
}
