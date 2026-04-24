export interface WorkloadPreset {
  id: string
  name: string
  monthlyInputTokens: number
  monthlyOutputTokens: number
  defaultCacheHitRate: number  // 0-1
  defaultBatchEnabled: boolean
  monthlyRequestsDefault: number
  activeUsersDefault: number
  description: string
}

export const PRESETS: WorkloadPreset[] = [
  { id: 'basic-chat', name: 'Basic Chat',
    monthlyInputTokens: 1_000_000, monthlyOutputTokens: 500_000,
    defaultCacheHitRate: 0.3, defaultBatchEnabled: false,
    monthlyRequestsDefault: 10_000, activeUsersDefault: 200,
    description: '짧은 Q&A, 적은 볼륨 — 초기 프로토타입에 적합' },
  { id: 'document-analysis', name: 'Document Analysis',
    monthlyInputTokens: 50_000_000, monthlyOutputTokens: 5_000_000,
    defaultCacheHitRate: 0.8, defaultBatchEnabled: false,
    monthlyRequestsDefault: 20_000, activeUsersDefault: 500,
    description: '긴 문서 요약/질의 — 시스템 프롬프트 재사용으로 cache 높음' },
  { id: 'code-generation', name: 'Code Generation',
    monthlyInputTokens: 10_000_000, monthlyOutputTokens: 15_000_000,
    defaultCacheHitRate: 0.4, defaultBatchEnabled: false,
    monthlyRequestsDefault: 100_000, activeUsersDefault: 300,
    description: 'IDE/agent 대량 생성 — output 지배' },
  { id: 'batch-processing', name: 'Batch Processing',
    monthlyInputTokens: 100_000_000, monthlyOutputTokens: 50_000_000,
    defaultCacheHitRate: 0.2, defaultBatchEnabled: true,
    monthlyRequestsDefault: 1_000_000, activeUsersDefault: 0,
    description: 'ETL/오프라인 작업 — batch 할인 필수' },
  { id: 'data-extraction', name: 'Data Extraction',
    monthlyInputTokens: 200_000_000, monthlyOutputTokens: 100_000_000,
    defaultCacheHitRate: 0.6, defaultBatchEnabled: true,
    monthlyRequestsDefault: 500_000, activeUsersDefault: 0,
    description: '구조화 추출 — 스키마 cache + batch 조합' },
  { id: 'summarization', name: 'Summarization',
    monthlyInputTokens: 500_000_000, monthlyOutputTokens: 50_000_000,
    defaultCacheHitRate: 0.5, defaultBatchEnabled: false,
    monthlyRequestsDefault: 100_000, activeUsersDefault: 1_000,
    description: 'input 위주, output tiny — input 가격이 비용 지배' },
  { id: 'coding-agent', name: 'Coding Agent (IDE)',
    monthlyInputTokens: 30_000_000, monthlyOutputTokens: 5_000_000,
    defaultCacheHitRate: 0.4, defaultBatchEnabled: false,
    monthlyRequestsDefault: 500_000, activeUsersDefault: 500,
    description: 'Cursor/Copilot autocomplete — 고빈도, 짧은 컨텍스트' },
  { id: 'rag-chatbot', name: 'RAG Chatbot',
    monthlyInputTokens: 200_000_000, monthlyOutputTokens: 10_000_000,
    defaultCacheHitRate: 0.7, defaultBatchEnabled: false,
    monthlyRequestsDefault: 300_000, activeUsersDefault: 5_000,
    description: '벡터 retrieval + Q&A — cache 히트가 비용 지배' },
  { id: 'customer-support', name: 'Customer Support',
    monthlyInputTokens: 100_000_000, monthlyOutputTokens: 20_000_000,
    defaultCacheHitRate: 0.6, defaultBatchEnabled: false,
    monthlyRequestsDefault: 200_000, activeUsersDefault: 50_000,
    description: '멀티턴 고객 응대 — 미들 볼륨, 템플릿 응답 cache' },
  { id: 'meeting-summary', name: 'Meeting Summary',
    monthlyInputTokens: 50_000_000, monthlyOutputTokens: 3_000_000,
    defaultCacheHitRate: 0.1, defaultBatchEnabled: true,
    monthlyRequestsDefault: 2_000, activeUsersDefault: 500,
    description: '긴 트랜스크립트 → 요약, 일일 batch — batch 할인 적합' },
  { id: 'content-moderation', name: 'Content Moderation',
    monthlyInputTokens: 500_000_000, monthlyOutputTokens: 5_000_000,
    defaultCacheHitRate: 0.2, defaultBatchEnabled: true,
    monthlyRequestsDefault: 10_000_000, activeUsersDefault: 0,
    description: '초소형 per-call × 극대량 — 작은 모델이 정답' },
  { id: 'semantic-search', name: 'Semantic Search',
    monthlyInputTokens: 200_000_000, monthlyOutputTokens: 1_000_000,
    defaultCacheHitRate: 0.3, defaultBatchEnabled: false,
    monthlyRequestsDefault: 50_000_000, activeUsersDefault: 100_000,
    description: '검색 re-ranking — input 위주, 출력 tiny' },
]
