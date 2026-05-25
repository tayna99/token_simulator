export type RagCollection =
  | 'official_docs'
  | 'benchmark_evidence'
  | 'serving_economics'
  | 'usage_schema'
  | 'decision_history'

export type ApiDocSectionType =
  | 'overview'
  | 'endpoint'
  | 'pricing'
  | 'authentication'
  | 'rate_limit'
  | 'error'
  | 'schema'
  | 'example'

export interface ApiDocSource {
  id: string
  modelOwner: string
  servingProvider: string
  modelFamilies?: string[]
  sourceKind: string
  url: string
  pricingRegion: string
  sourceLanguage: string
  officialSourceTrust: string
}

export interface NormalizedApiDocBlock {
  kind: 'heading' | 'paragraph' | 'table' | 'code'
  text: string
  headingPath: string[]
  level?: number
}

export interface NormalizedApiDoc {
  source: ApiDocSource
  capturedAt: string
  blocks: NormalizedApiDocBlock[]
}

export interface ApiDocChunkMetadata {
  sourceId: string
  provider: string
  servingProvider: string
  modelFamilies: string[]
  sourceKind: string
  sourceLanguage: string
  pricingRegion: string
  officialSourceTrust: string
  capturedAt: string
  headingPath: string[]
  sectionType: ApiDocSectionType
  endpointMethod?: string
  endpointPath?: string
  contentHash: string
}

export interface ApiDocChunk {
  id: string
  collection: RagCollection
  text: string
  sourceUrl: string
  refs: string[]
  metadata: ApiDocChunkMetadata
}

export interface EmbeddingProvider {
  readonly dimensions: number
  embed(text: string): Promise<number[]>
}

export interface VectorIndexItem {
  chunk: ApiDocChunk
  embedding: number[]
}

export interface VectorIndex {
  collection: RagCollection
  dimensions: number
  items: VectorIndexItem[]
}

export interface VectorSearchResult {
  chunk: ApiDocChunk
  score: number
}

export interface VectorStoreStats {
  collection: RagCollection
  dimensions: number
  itemCount: number
}

export interface VectorStore {
  upsertChunks(chunks: ApiDocChunk[]): Promise<void>
  search(input: {
    query: string
    topK?: number
    filter?: Partial<ApiDocChunkMetadata>
  }): Promise<VectorSearchResult[]>
  deleteBySource(sourceId: string): Promise<void>
  stats(): Promise<VectorStoreStats>
}

export interface RagContextBlock {
  collection: RagCollection
  text: string
  refs: string[]
  sourceUrl: string
  score: number
  mayOverrideFacts: false
  metadata: ApiDocChunkMetadata
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function normalizeHtmlTables(value: string): string {
  return value.replace(/<table[\s\S]*?<\/table>/gi, table => {
    const rows = Array.from(table.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map(rowMatch => {
      const row = rowMatch[0]
      return Array.from(row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi))
        .map(cellMatch => stripTags(cellMatch[1]))
        .filter(Boolean)
        .join(' | ')
    }).filter(Boolean)
    return rows.length > 0 ? `\n${rows.join('\n')}\n` : '\n'
  })
}

function htmlToMarkdownish(value: string): string {
  return normalizeHtmlTables(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code: string) => (
      `\n\`\`\`\n${decodeEntities(code).trim()}\n\`\`\`\n`
    ))
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, text: string) => (
      `\n${'#'.repeat(Number(level))} ${stripTags(text)}\n`
    ))
    .replace(/<\/?(p|div|section|article|li|ul|ol|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
}

function normalizedLines(rawText: string): string[] {
  const markdownish = htmlToMarkdownish(rawText)
  return decodeEntities(markdownish)
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function stableHash(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function tableLine(line: string): boolean {
  return line.includes('|') && !line.startsWith('```')
}

export function normalizeApiDoc(input: {
  source: ApiDocSource
  rawText: string
  capturedAt: string
}): NormalizedApiDoc {
  const blocks: NormalizedApiDocBlock[] = []
  const headingStack: Array<{ level: number; text: string }> = []
  const lines = normalizedLines(input.rawText)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const text = heading[2].trim()
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop()
      }
      headingStack.push({ level, text })
      blocks.push({
        kind: 'heading',
        text,
        level,
        headingPath: headingStack.map(item => item.text),
      })
      continue
    }

    if (line === '```') {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && lines[index] !== '```') {
        codeLines.push(lines[index])
        index += 1
      }
      blocks.push({
        kind: 'code',
        text: codeLines.join('\n'),
        headingPath: headingStack.map(item => item.text),
      })
      continue
    }

    if (tableLine(line)) {
      const tableLines = [line]
      while (index + 1 < lines.length && tableLine(lines[index + 1])) {
        index += 1
        tableLines.push(lines[index])
      }
      blocks.push({
        kind: 'table',
        text: tableLines.join('\n'),
        headingPath: headingStack.map(item => item.text),
      })
      continue
    }

    blocks.push({
      kind: 'paragraph',
      text: line,
      headingPath: headingStack.map(item => item.text),
    })
  }

  return {
    source: input.source,
    capturedAt: input.capturedAt,
    blocks,
  }
}

function endpointFromHeading(headingPath: string[]): { method?: string; path?: string } {
  const heading = headingPath[headingPath.length - 1] ?? ''
  const methodPattern = HTTP_METHODS.join('|')
  const match = new RegExp(`\\b(${methodPattern})\\s+([^\\s]+)`, 'i').exec(heading)
  if (!match) return {}
  return {
    method: match[1].toUpperCase(),
    path: match[2],
  }
}

function sectionTypeFrom(headingPath: string[], text: string): ApiDocSectionType {
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

function chunkMetadata(input: {
  doc: NormalizedApiDoc
  headingPath: string[]
  text: string
}): ApiDocChunkMetadata {
  const endpoint = endpointFromHeading(input.headingPath)
  return {
    sourceId: input.doc.source.id,
    provider: input.doc.source.modelOwner,
    servingProvider: input.doc.source.servingProvider,
    modelFamilies: input.doc.source.modelFamilies ?? [],
    sourceKind: input.doc.source.sourceKind,
    sourceLanguage: input.doc.source.sourceLanguage,
    pricingRegion: input.doc.source.pricingRegion,
    officialSourceTrust: input.doc.source.officialSourceTrust,
    capturedAt: input.doc.capturedAt,
    headingPath: input.headingPath,
    sectionType: sectionTypeFrom(input.headingPath, input.text),
    endpointMethod: endpoint.method,
    endpointPath: endpoint.path,
    contentHash: stableHash(`${input.doc.source.id}:${input.headingPath.join('/')}:${input.text}`),
  }
}

function buildChunk(input: {
  doc: NormalizedApiDoc
  headingPath: string[]
  text: string
  part: number
}): ApiDocChunk {
  const metadata = chunkMetadata(input)
  const chunkRef = `source:${input.doc.source.id}#${metadata.contentHash}${input.part > 0 ? `-${input.part}` : ''}`
  return {
    id: chunkRef,
    collection: 'official_docs',
    text: input.text,
    sourceUrl: input.doc.source.url,
    refs: [`source:${input.doc.source.id}`, chunkRef],
    metadata,
  }
}

function splitLongSection(text: string, maxChunkChars: number): string[] {
  if (text.length <= maxChunkChars) return [text]
  const paragraphs = text.split(/\n{2,}/)
  const chunks: string[] = []
  let current = ''
  for (const paragraph of paragraphs) {
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

export function chunkApiDoc(doc: NormalizedApiDoc, options: { maxChunkChars?: number } = {}): ApiDocChunk[] {
  const maxChunkChars = options.maxChunkChars ?? 1200
  const sections: Array<{ headingPath: string[]; lines: string[] }> = []
  let current: { headingPath: string[]; lines: string[] } | null = null

  const flush = () => {
    if (!current) return
    const hasBody = current.lines.length > 1
    if (hasBody) sections.push(current)
    current = null
  }

  for (const block of doc.blocks) {
    if (block.kind === 'heading') {
      flush()
      current = {
        headingPath: block.headingPath,
        lines: [block.text],
      }
      continue
    }
    if (!current) {
      current = {
        headingPath: block.headingPath.length > 0 ? block.headingPath : ['Overview'],
        lines: block.headingPath.length > 0 ? [block.headingPath[block.headingPath.length - 1]] : ['Overview'],
      }
    }
    current.lines.push(block.text)
  }
  flush()

  return sections.flatMap(section => {
    const sectionText = section.lines.join('\n\n')
    return splitLongSection(sectionText, maxChunkChars).map((text, part) => buildChunk({
      doc,
      headingPath: section.headingPath,
      text,
      part,
    }))
  })
}

function termsFrom(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9._:/{}-]+/)
    .map(term => term.replace(/s$/, ''))
    .filter(term => term.length > 1)
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (magnitude === 0) return vector
  return vector.map(value => Number((value / magnitude).toFixed(8)))
}

export function createHashEmbeddingProvider(options: { dimensions?: number } = {}): EmbeddingProvider {
  const dimensions = options.dimensions ?? 64
  return {
    dimensions,
    async embed(text: string) {
      const vector = Array.from({ length: dimensions }, () => 0)
      for (const term of termsFrom(text)) {
        const hash = parseInt(stableHash(term), 16)
        const index = hash % dimensions
        const sign = hash % 2 === 0 ? 1 : -1
        vector[index] += sign
      }
      return normalizeVector(vector)
    },
  }
}

export async function buildVectorIndex(input: {
  collection: RagCollection
  chunks: ApiDocChunk[]
  embeddingProvider: EmbeddingProvider
}): Promise<VectorIndex> {
  const items = await Promise.all(input.chunks.map(async chunk => ({
    chunk,
    embedding: await input.embeddingProvider.embed(`${chunk.metadata.headingPath.join(' ')}\n${chunk.text}`),
  })))
  return {
    collection: input.collection,
    dimensions: input.embeddingProvider.dimensions,
    items,
  }
}

function cosine(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length)
  let score = 0
  for (let index = 0; index < length; index += 1) score += left[index] * right[index]
  return Number(score.toFixed(6))
}

function matchesFilter(chunk: ApiDocChunk, filter: Partial<ApiDocChunkMetadata> = {}): boolean {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = chunk.metadata[key as keyof ApiDocChunkMetadata]
    if (expected === undefined) return true
    if (Array.isArray(actual)) return Array.isArray(expected)
      ? expected.every(item => actual.includes(item))
      : actual.includes(String(expected))
    return actual === expected
  })
}

export async function searchVectorIndex(input: {
  index: VectorIndex
  query: string
  topK?: number
  embeddingProvider: EmbeddingProvider
  filter?: Partial<ApiDocChunkMetadata>
}): Promise<VectorSearchResult[]> {
  const queryEmbedding = await input.embeddingProvider.embed(input.query)
  const limit = Number.isFinite(input.topK) && input.topK && input.topK > 0 ? input.topK : 5
  return input.index.items
    .filter(item => matchesFilter(item.chunk, input.filter))
    .map(item => ({
      chunk: item.chunk,
      score: cosine(queryEmbedding, item.embedding),
    }))
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id))
    .slice(0, limit)
}

export function createMemoryVectorStore(input: {
  collection: RagCollection
  embeddingProvider: EmbeddingProvider
}): VectorStore {
  let index: VectorIndex = {
    collection: input.collection,
    dimensions: input.embeddingProvider.dimensions,
    items: [],
  }

  return {
    async upsertChunks(chunks: ApiDocChunk[]) {
      const existing = new Map(index.items.map(item => [item.chunk.id, item]))
      const next = await buildVectorIndex({
        collection: input.collection,
        chunks,
        embeddingProvider: input.embeddingProvider,
      })
      for (const item of next.items) existing.set(item.chunk.id, item)
      index = {
        collection: input.collection,
        dimensions: input.embeddingProvider.dimensions,
        items: Array.from(existing.values()).sort((left, right) => left.chunk.id.localeCompare(right.chunk.id)),
      }
    },
    async search(searchInput) {
      return searchVectorIndex({
        index,
        query: searchInput.query,
        topK: searchInput.topK,
        filter: searchInput.filter,
        embeddingProvider: input.embeddingProvider,
      })
    },
    async deleteBySource(sourceId) {
      index = {
        ...index,
        items: index.items.filter(item => item.chunk.metadata.sourceId !== sourceId),
      }
    },
    async stats() {
      return {
        collection: index.collection,
        dimensions: index.dimensions,
        itemCount: index.items.length,
      }
    },
  }
}

export function buildRagContextBlocks(
  results: VectorSearchResult[],
  options: { maxChunks?: number; maxCharsPerChunk?: number } = {},
): RagContextBlock[] {
  const maxChunks = options.maxChunks ?? 5
  const maxCharsPerChunk = options.maxCharsPerChunk ?? 1600
  return results.slice(0, maxChunks).map(result => ({
    collection: result.chunk.collection,
    text: result.chunk.text.slice(0, maxCharsPerChunk),
    refs: result.chunk.refs,
    sourceUrl: result.chunk.sourceUrl,
    score: result.score,
    mayOverrideFacts: false,
    metadata: result.chunk.metadata,
  }))
}
