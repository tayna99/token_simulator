export interface WorkloadPreset {
  id: string
  name: string
  monthlyInputTokens: number
  monthlyOutputTokens: number
  defaultCacheHitRate: number  // 0-1
  defaultBatchEnabled: boolean
}

export const PRESETS: WorkloadPreset[] = [
  { id: 'basic-chat', name: 'Basic Chat', monthlyInputTokens: 1_000_000, monthlyOutputTokens: 500_000, defaultCacheHitRate: 0.3, defaultBatchEnabled: false },
  { id: 'document-analysis', name: 'Document Analysis', monthlyInputTokens: 50_000_000, monthlyOutputTokens: 5_000_000, defaultCacheHitRate: 0.8, defaultBatchEnabled: false },
  { id: 'code-generation', name: 'Code Generation', monthlyInputTokens: 10_000_000, monthlyOutputTokens: 15_000_000, defaultCacheHitRate: 0.4, defaultBatchEnabled: false },
  { id: 'batch-processing', name: 'Batch Processing', monthlyInputTokens: 100_000_000, monthlyOutputTokens: 50_000_000, defaultCacheHitRate: 0.2, defaultBatchEnabled: true },
  { id: 'data-extraction', name: 'Data Extraction', monthlyInputTokens: 200_000_000, monthlyOutputTokens: 100_000_000, defaultCacheHitRate: 0.6, defaultBatchEnabled: true },
  { id: 'summarization', name: 'Summarization', monthlyInputTokens: 500_000_000, monthlyOutputTokens: 50_000_000, defaultCacheHitRate: 0.5, defaultBatchEnabled: false },
]
