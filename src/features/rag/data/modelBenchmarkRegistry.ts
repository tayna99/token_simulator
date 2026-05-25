import benchmarkRegistryJson from '../../research/data/modelBenchmarkRegistry.json'
import { normalizeCorpusSource, type CorpusSource, type CorpusSourceInput } from '../lib/corpusTypes'

export type BenchmarkQualityBasis = 'assumption' | 'third_party_benchmark' | 'official_model_card' | 'internal_eval'
export type BenchmarkReviewStatus = 'verified' | 'needs_review'

export interface ModelBenchmarkRecord {
  id: string
  corpusId: 'model_benchmark'
  title: string
  text: string
  modelIds: string[]
  taskTags: string[]
  benchmarkSuite: string[]
  metricKinds: string[]
  sourceRefs: string[]
  sourceUrl: string
  reviewStatus: BenchmarkReviewStatus
  qualityBasis: BenchmarkQualityBasis
}

export interface ModelPerfMatrixRow {
  taskType: string
  modelId: string
  qualityBasis: BenchmarkQualityBasis
  evidenceRefs: string[]
  risk: string
}

export const MODEL_BENCHMARK_SOURCES: CorpusSource[] = (benchmarkRegistryJson as CorpusSourceInput[])
  .filter(source => source.active)
  .map(source => normalizeCorpusSource(source))

export const MODEL_BENCHMARK_RECORDS: ModelBenchmarkRecord[] = [
  {
    id: 'lmarena-routing-quality',
    corpusId: 'model_benchmark',
    title: 'LMArena human preference signal for routing quality',
    text: 'LMArena leaderboard is a third-party human preference benchmark signal for model routing quality. Treat it as evidence for review, not as official pricing or deterministic fact authority.',
    modelIds: ['gpt-5.5', 'claude-sonnet-4.6', 'gemini-3.5-flash'],
    taskTags: ['routing', 'general', 'quality', 'human-preference'],
    benchmarkSuite: ['arena_elo'],
    metricKinds: ['quality'],
    sourceRefs: ['evidence:lmarena-leaderboard'],
    sourceUrl: 'https://lmarena.ai/leaderboard',
    reviewStatus: 'needs_review',
    qualityBasis: 'third_party_benchmark',
  },
  {
    id: 'artificial-analysis-quality-latency',
    corpusId: 'model_benchmark',
    title: 'Artificial Analysis public quality and latency signal',
    text: 'Artificial Analysis public model material is a third-party benchmark and latency signal. Use it to frame quality, latency, and cost tradeoffs before a human approves routing changes.',
    modelIds: ['gpt-5.5', 'claude-sonnet-4.6', 'gemini-3.5-flash', 'gemini-3.1-flash'],
    taskTags: ['routing', 'latency', 'quality', 'cost-quality'],
    benchmarkSuite: ['intelligence_index', 'latency', 'throughput'],
    metricKinds: ['quality', 'latency', 'throughput'],
    sourceRefs: ['evidence:artificial-analysis-models'],
    sourceUrl: 'https://artificialanalysis.ai/models',
    reviewStatus: 'needs_review',
    qualityBasis: 'third_party_benchmark',
  },
  {
    id: 'official-model-card-routing-constraints',
    corpusId: 'model_benchmark',
    title: 'Official model card routing constraints',
    text: 'Official model cards and model documentation describe capability, modality, context, and safety constraints. They can constrain routing but do not create benchmark averages.',
    modelIds: ['gpt-5.5', 'claude-sonnet-4.6', 'gemini-3.5-flash'],
    taskTags: ['routing', 'capability', 'safety', 'model-card'],
    benchmarkSuite: ['model_card'],
    metricKinds: ['capability', 'risk'],
    sourceRefs: ['evidence:provider-model-cards'],
    sourceUrl: 'evidence:provider-model-cards',
    reviewStatus: 'needs_review',
    qualityBasis: 'official_model_card',
  },
]

export const MODEL_PERF_MATRIX: ModelPerfMatrixRow[] = [
  {
    taskType: 'classification',
    modelId: 'gemini-3.1-flash',
    qualityBasis: 'third_party_benchmark',
    evidenceRefs: ['evidence:lmarena-leaderboard', 'evidence:artificial-analysis-models'],
    risk: 'Low-risk classification can be routed only after sample quality checks.',
  },
  {
    taskType: 'report_generation',
    modelId: 'claude-sonnet-4.6',
    qualityBasis: 'assumption',
    evidenceRefs: [],
    risk: 'Executive-facing reports need review before cheaper-model routing.',
  },
]
