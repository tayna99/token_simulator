import { deriveMonthlyWorkload, type WorkloadInputs } from '../lib/workload'

export interface WorkloadPreset {
  id: string
  name: string
  workload: WorkloadInputs
  defaultCacheHitRate: number
  defaultBatchEnabled: boolean
  description: string
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequestsDefault: number
  activeUsersDefault: number
}

function preset(
  id: string,
  name: string,
  workload: WorkloadInputs,
  defaultCacheHitRate: number,
  defaultBatchEnabled: boolean,
  description: string,
): WorkloadPreset {
  const derived = deriveMonthlyWorkload(workload)
  return {
    id,
    name,
    workload,
    defaultCacheHitRate,
    defaultBatchEnabled,
    description,
    monthlyInputTokens: derived.monthlyInputTokens,
    monthlyOutputTokens: derived.monthlyOutputTokens,
    monthlyRequestsDefault: derived.monthlyRequests,
    activeUsersDefault: workload.activeUsers,
  }
}

export const PRESETS: WorkloadPreset[] = [
  preset('basic-chat', 'Basic Chat', {
    volumeBasis: 'requestsPerDay',
    activeDaysPerMonth: 30,
    retryRate: 0,
    requestsPerDay: 333,
    activeUsers: 200,
    requestsPerUserPerDay: 1.67,
    avgInputTokensPerRequest: 100,
    avgOutputTokensPerRequest: 50,
  }, 0.3, false, 'Small Q&A workload with light context and short responses.'),

  preset('document-analysis', 'Document Analysis', {
    volumeBasis: 'requestsPerDay',
    activeDaysPerMonth: 20,
    retryRate: 0,
    requestsPerDay: 1_000,
    activeUsers: 500,
    requestsPerUserPerDay: 2,
    avgInputTokensPerRequest: 2_500,
    avgOutputTokensPerRequest: 250,
  }, 0.8, false, 'Document summarization and question answering with high input reuse.'),

  preset('code-generation', 'Code Generation', {
    volumeBasis: 'activeUsers',
    activeDaysPerMonth: 25,
    retryRate: 0,
    requestsPerDay: 0,
    activeUsers: 300,
    requestsPerUserPerDay: 13.33,
    avgInputTokensPerRequest: 100,
    avgOutputTokensPerRequest: 150,
  }, 0.4, false, 'IDE and agent code generation with output-heavy responses.'),

  preset('batch-processing', 'Batch Processing', {
    volumeBasis: 'requestsPerDay',
    activeDaysPerMonth: 30,
    retryRate: 0,
    requestsPerDay: 33_333,
    activeUsers: 0,
    requestsPerUserPerDay: 0,
    avgInputTokensPerRequest: 100,
    avgOutputTokensPerRequest: 50,
  }, 0.2, true, 'Offline ETL and scheduled analysis where batch processing is acceptable.'),

  preset('data-extraction', 'Data Extraction', {
    volumeBasis: 'requestsPerDay',
    activeDaysPerMonth: 25,
    retryRate: 0,
    requestsPerDay: 20_000,
    activeUsers: 0,
    requestsPerUserPerDay: 0,
    avgInputTokensPerRequest: 400,
    avgOutputTokensPerRequest: 200,
  }, 0.6, true, 'Structured extraction from repeated schemas with cache and batch leverage.'),

  preset('summarization', 'Summarization', {
    volumeBasis: 'requestsPerDay',
    activeDaysPerMonth: 20,
    retryRate: 0,
    requestsPerDay: 5_000,
    activeUsers: 1_000,
    requestsPerUserPerDay: 5,
    avgInputTokensPerRequest: 5_000,
    avgOutputTokensPerRequest: 500,
  }, 0.5, false, 'Input-heavy summarization with relatively compact outputs.'),

  preset('coding-agent', 'Coding Agent (IDE)', {
    volumeBasis: 'activeUsers',
    activeDaysPerMonth: 25,
    retryRate: 0,
    requestsPerDay: 0,
    activeUsers: 500,
    requestsPerUserPerDay: 40,
    avgInputTokensPerRequest: 60,
    avgOutputTokensPerRequest: 10,
  }, 0.4, false, 'Developer agent interactions with frequent short requests.'),

  preset('rag-chatbot', 'RAG Chatbot', {
    volumeBasis: 'activeUsers',
    activeDaysPerMonth: 30,
    retryRate: 0,
    requestsPerDay: 0,
    activeUsers: 5_000,
    requestsPerUserPerDay: 2,
    avgInputTokensPerRequest: 667,
    avgOutputTokensPerRequest: 33,
  }, 0.7, false, 'Retrieval-augmented support chatbot with repeated context.'),

  preset('customer-support', 'Customer Support', {
    volumeBasis: 'activeUsers',
    activeDaysPerMonth: 20,
    retryRate: 0,
    requestsPerDay: 0,
    activeUsers: 50_000,
    requestsPerUserPerDay: 0.2,
    avgInputTokensPerRequest: 500,
    avgOutputTokensPerRequest: 100,
  }, 0.6, false, 'Support automation with moderate request volume and reusable instructions.'),

  preset('meeting-summary', 'Meeting Summary', {
    volumeBasis: 'activeUsers',
    activeDaysPerMonth: 20,
    retryRate: 0,
    requestsPerDay: 0,
    activeUsers: 500,
    requestsPerUserPerDay: 0.2,
    avgInputTokensPerRequest: 25_000,
    avgOutputTokensPerRequest: 1_500,
  }, 0.1, true, 'Transcript summarization suitable for scheduled batch runs.'),

  preset('content-moderation', 'Content Moderation', {
    volumeBasis: 'requestsPerDay',
    activeDaysPerMonth: 30,
    retryRate: 0,
    requestsPerDay: 333_333,
    activeUsers: 0,
    requestsPerUserPerDay: 0,
    avgInputTokensPerRequest: 50,
    avgOutputTokensPerRequest: 1,
  }, 0.2, true, 'High-volume classification with tiny outputs.'),

  preset('semantic-search', 'Semantic Search', {
    volumeBasis: 'activeUsers',
    activeDaysPerMonth: 25,
    retryRate: 0,
    requestsPerDay: 0,
    activeUsers: 100_000,
    requestsPerUserPerDay: 20,
    avgInputTokensPerRequest: 4,
    avgOutputTokensPerRequest: 0.02,
  }, 0.3, false, 'Search and reranking style workload with very small generations.'),
]
