export type BuyerObjectionBucketId =
  | 'objection_margin_not_felt'
  | 'objection_data_trust'
  | 'objection_excel_sql_console'
  | 'objection_roi_unclear'
  | 'objection_wrong_timing'
  | 'objection_positioning_confusing'

export type BuyerInterviewPromotionKind = 'product_copy' | 'requirement'
export type BuyerInterviewPromotionSource = 'repeated_bucket' | 'repeated_exact_quote'

export interface BuyerObjectionBucket {
  id: BuyerObjectionBucketId
  label: string
  representativeQuote: string
  nextAction: string
  promotionKind: BuyerInterviewPromotionKind
  promotedText: string
  keywords: string[]
}

export interface CodedBuyerQuote {
  quote: string
  bucketId: BuyerObjectionBucketId
  bucketLabel: string
  matchedKeyword: string
}

export interface BuyerObjectionBucketSummary {
  id: BuyerObjectionBucketId
  label: string
  count: number
  nextAction: string
  representativeQuote: string
}

export interface BuyerInterviewPromotion {
  bucketId: BuyerObjectionBucketId
  bucketLabel: string
  kind: BuyerInterviewPromotionKind
  source: BuyerInterviewPromotionSource
  quote: string
  count: number
  exactQuoteCount: number
  promotedText: string
}

export interface BuyerInterviewCodingResult {
  codedQuotes: CodedBuyerQuote[]
  bucketSummaries: BuyerObjectionBucketSummary[]
  promotions: BuyerInterviewPromotion[]
  uncodedQuotes: string[]
}

export const BUYER_OBJECTION_BUCKETS: BuyerObjectionBucket[] = [
  {
    id: 'objection_margin_not_felt',
    label: '마진 문제 미인식',
    representativeQuote: '비용은 보는데 아직 마진 문제는 아니에요.',
    nextAction: 'AI 비용을 COGS와 고객/기능 손익으로 번역하는 첫 화면 문구 보강',
    promotionKind: 'product_copy',
    promotedText: 'AI 기능이 성장할수록 gross margin이 깨지는 지점을 찾아드립니다.',
    keywords: ['마진', 'gross margin', 'cogs', '손익', '비용은 보는데', '문제는 아니'],
  },
  {
    id: 'objection_data_trust',
    label: '데이터 불안',
    representativeQuote: 'prompt나 고객 데이터가 들어가는 것 아닌가요?',
    nextAction: '리포트 준비 확인, 차단 필드, 진단 필드, 보관/삭제 근거 강화',
    promotionKind: 'requirement',
    promotedText: '업로드 전 blocked columns, snapshot fields, retention/delete proof를 보여준다.',
    keywords: ['prompt', '프롬프트', 'api key', '고객 데이터', 'pii', '개인정보', '유출', '보안', '외부'],
  },
  {
    id: 'objection_excel_sql_console',
    label: '대체재 충분',
    representativeQuote: '엑셀이나 SQL로 보면 됩니다.',
    nextAction: '반복 리포트, decision log, PM/CEO 공유 artifact를 비교 포인트로 제시',
    promotionKind: 'product_copy',
    promotedText: '엑셀/SQL이 보여주는 숫자를 PM/CEO가 승인할 결정 리포트로 바꿉니다.',
    keywords: ['엑셀', 'excel', 'sql', '콘솔', 'dashboard', 'helicone', 'langfuse', '직접 뽑', '스크립트'],
  },
  {
    id: 'objection_roi_unclear',
    label: 'ROI 불명확',
    representativeQuote: '그래서 얼마를 아끼는 건가요?',
    nextAction: 'monthly leak, policy delta, payback hint를 리포트 첫 줄에 표시',
    promotionKind: 'requirement',
    promotedText: 'Report preview 첫 줄에 monthly leak, policy delta, payback hint를 표시한다.',
    keywords: ['얼마를 아끼', 'roi', '회수', 'payback', '값어치', '누수', '개선', '아낄'],
  },
  {
    id: 'objection_wrong_timing',
    label: '타이밍 부적합',
    representativeQuote: '아직 비용이 작아요.',
    nextAction: 'free/low-cost diagnosis로 라우팅하고 재접촉 시점 기록',
    promotionKind: 'requirement',
    promotedText: 'ICP timing gate가 낮은 지출/낮은 긴급도 lead를 free sample로 보내고 follow-up 시점을 남긴다.',
    keywords: ['아직', '작아요', '작다', '나중에', '타이밍', '초기', '문제 아님', 'not a problem yet'],
  },
  {
    id: 'objection_positioning_confusing',
    label: '메시지 혼선',
    representativeQuote: 'Payroll이면 HR 도구인가요?',
    nextAction: 'AgentPayroll보다 AI 비용 진단/손해 고객 찾기/AI 기능 마진 분석 문구 우선',
    promotionKind: 'product_copy',
    promotedText: 'AI 비용 누수 리포트: 손해 고객과 미회수 토큰 원가를 5분 안에 보여드립니다.',
    keywords: ['payroll', 'hr', '급여', '이름', '무슨 뜻', '뭐 하는', '운영체제', '복잡'],
  },
]

export const BUYER_INTERVIEW_SAMPLE_NOTES = [
  '그래서 얼마를 아끼는 건가요?',
  '얼마를 아끼는지 바로 보여주나요?',
  'prompt나 고객 데이터가 들어가는 것 아닌가요?',
  'prompt나 고객 데이터가 들어가는 것 아닌가요?',
  'Payroll이면 HR 도구인가요?',
  'Payroll이면 HR 도구인가요?',
].join('\n')

export function codeBuyerInterviewNotes(
  rawNotes: string,
  options: { minPromotionCount?: number } = {},
): BuyerInterviewCodingResult {
  const minPromotionCount = Math.max(1, options.minPromotionCount ?? 2)
  const quotes = quotesFrom(rawNotes)
  const codedQuotes: CodedBuyerQuote[] = []
  const uncodedQuotes: string[] = []

  for (const quote of quotes) {
    const match = bucketForQuote(quote)
    if (!match) {
      uncodedQuotes.push(quote)
      continue
    }
    codedQuotes.push({
      quote,
      bucketId: match.bucket.id,
      bucketLabel: match.bucket.label,
      matchedKeyword: match.keyword,
    })
  }

  const bucketSummaries = BUYER_OBJECTION_BUCKETS
    .map(bucket => ({
      id: bucket.id,
      label: bucket.label,
      count: codedQuotes.filter(item => item.bucketId === bucket.id).length,
      nextAction: bucket.nextAction,
      representativeQuote: bucket.representativeQuote,
    }))
    .filter(summary => summary.count > 0)

  return {
    codedQuotes,
    bucketSummaries,
    promotions: promotionsFrom(codedQuotes, minPromotionCount),
    uncodedQuotes,
  }
}

function quotesFrom(rawNotes: string): string[] {
  return rawNotes
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function bucketForQuote(quote: string): { bucket: BuyerObjectionBucket; keyword: string } | null {
  const normalizedQuote = normalize(quote)
  for (const bucket of BUYER_OBJECTION_BUCKETS) {
    const keyword = bucket.keywords.find(item => normalizedQuote.includes(normalize(item)))
    if (keyword) return { bucket, keyword }
  }
  return null
}

function promotionsFrom(codedQuotes: CodedBuyerQuote[], minPromotionCount: number): BuyerInterviewPromotion[] {
  return BUYER_OBJECTION_BUCKETS.flatMap(bucket => {
    const bucketQuotes = codedQuotes.filter(item => item.bucketId === bucket.id)
    if (bucketQuotes.length < minPromotionCount) return []
    const repeatedQuote = mostRepeatedQuote(bucketQuotes)

    return [{
      bucketId: bucket.id,
      bucketLabel: bucket.label,
      kind: bucket.promotionKind,
      source: repeatedQuote.count >= minPromotionCount ? 'repeated_exact_quote' : 'repeated_bucket',
      quote: repeatedQuote.quote,
      count: bucketQuotes.length,
      exactQuoteCount: repeatedQuote.count,
      promotedText: bucket.promotedText,
    }]
  })
}

function mostRepeatedQuote(quotes: CodedBuyerQuote[]): { quote: string; count: number } {
  const counts = quotes.reduce<Map<string, { quote: string; count: number }>>((map, item) => {
    const key = normalize(item.quote)
    const current = map.get(key) ?? { quote: item.quote, count: 0 }
    current.count += 1
    map.set(key, current)
    return map
  }, new Map())

  return [...counts.values()].sort((left, right) => right.count - left.count)[0] ?? { quote: '', count: 0 }
}
