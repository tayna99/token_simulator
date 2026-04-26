import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import { MODELS } from '../../data/models'
import type { SimState } from '../../App'

type UseCase = 'RAG' | 'CodeGen' | 'ClassificationChunks' | 'CustomerService' | 'Reasoning' | 'Translation' | 'Summarization'

interface UseCaseProfile {
  name: string
  description: string
  emoji: string
  importance: {
    latency: number
    reasoning: number
    codeQuality: number
    contextWindow: number
    costEfficiency: number
  }
}

interface Props {
  state: SimState
  onSelectCandidate: (modelId: string) => void
}

export function UseCaseRecommendations({ state, onSelectCandidate }: Props) {
  const [selectedUseCases, setSelectedUseCases] = useState<UseCase[]>(['RAG', 'CodeGen'])

  const useCaseProfiles: Record<UseCase, UseCaseProfile> = {
    RAG: {
      name: 'Retrieval Augmented Generation',
      description: 'Using external knowledge bases to ground responses',
      emoji: '🔍',
      importance: { latency: 3, reasoning: 5, codeQuality: 0, contextWindow: 10, costEfficiency: 6 },
    },
    CodeGen: {
      name: 'Code Generation & Completion',
      description: 'Writing and analyzing code in multiple languages',
      emoji: '⚙️',
      importance: { latency: 2, reasoning: 8, codeQuality: 10, contextWindow: 7, costEfficiency: 5 },
    },
    ClassificationChunks: {
      name: 'Text Classification & Chunking',
      description: 'Categorizing and structuring text data',
      emoji: '📂',
      importance: { latency: 5, reasoning: 2, codeQuality: 0, contextWindow: 4, costEfficiency: 9 },
    },
    CustomerService: {
      name: 'Customer Service & Support',
      description: 'Responding to customer questions and issues',
      emoji: '💬',
      importance: { latency: 7, reasoning: 6, codeQuality: 0, contextWindow: 6, costEfficiency: 7 },
    },
    Reasoning: {
      name: 'Complex Reasoning & Analysis',
      description: 'Multi-step problem solving and analysis',
      emoji: '🧠',
      importance: { latency: 1, reasoning: 10, codeQuality: 0, contextWindow: 8, costEfficiency: 2 },
    },
    Translation: {
      name: 'Machine Translation',
      description: 'Translating between languages',
      emoji: '🌍',
      importance: { latency: 4, reasoning: 3, codeQuality: 0, contextWindow: 5, costEfficiency: 8 },
    },
    Summarization: {
      name: 'Content Summarization',
      description: 'Creating concise summaries of longer texts',
      emoji: '📝',
      importance: { latency: 4, reasoning: 4, codeQuality: 0, contextWindow: 9, costEfficiency: 7 },
    },
  }

  const recommendations = useMemo(() => {
    if (selectedUseCases.length === 0) return []

    // Calculate average importance across selected use cases
    const avgImportance = {
      latency: 0,
      reasoning: 0,
      codeQuality: 0,
      contextWindow: 0,
      costEfficiency: 0,
    }

    selectedUseCases.forEach(uc => {
      const profile = useCaseProfiles[uc]
      Object.keys(avgImportance).forEach(key => {
        avgImportance[key as keyof typeof avgImportance] += profile.importance[key as keyof typeof profile.importance]
      })
    })

    Object.keys(avgImportance).forEach(key => {
      avgImportance[key as keyof typeof avgImportance] /= selectedUseCases.length
    })

    // Score each model
    const modelScores = MODELS.map(model => {
      // Model characteristics (0-10 scale)
      const modelTraits = {
        'claude-opus-4-7': { latency: 3, reasoning: 10, codeQuality: 9, contextWindow: 9, costEfficiency: 2 },
        'claude-sonnet-4.6': { latency: 5, reasoning: 8, codeQuality: 8, contextWindow: 8, costEfficiency: 6 },
        'claude-3.5-haiku': { latency: 8, reasoning: 6, codeQuality: 6, contextWindow: 6, costEfficiency: 9 },
        'gemini-2-flash': { latency: 7, reasoning: 6, codeQuality: 5, contextWindow: 5, costEfficiency: 8 },
        'gemini-3.1-flash': { latency: 8, reasoning: 7, codeQuality: 7, contextWindow: 7, costEfficiency: 8 },
        'gpt-4o': { latency: 4, reasoning: 9, codeQuality: 9, contextWindow: 8, costEfficiency: 5 },
        'gpt-4-turbo': { latency: 2, reasoning: 9, codeQuality: 9, contextWindow: 9, costEfficiency: 3 },
        'gpt-4o-mini': { latency: 7, reasoning: 7, codeQuality: 7, contextWindow: 7, costEfficiency: 8 },
      }

      const traits = modelTraits[model.id as keyof typeof modelTraits] || {
        latency: 5,
        reasoning: 5,
        codeQuality: 5,
        contextWindow: 5,
        costEfficiency: 5,
      }

      // Calculate weighted score (higher is better)
      const score =
        (traits.latency * avgImportance.latency) +
        (traits.reasoning * avgImportance.reasoning) +
        (traits.codeQuality * avgImportance.codeQuality) +
        (traits.contextWindow * avgImportance.contextWindow) +
        (traits.costEfficiency * avgImportance.costEfficiency)

      const cost = calculateCost({
        model,
        monthlyInputTokens: state.periodInputTokens,
        monthlyOutputTokens: state.periodOutputTokens,
        cacheHitRate: state.cacheHitRate,
        batchEnabled: state.batchEnabled,
      }).monthlyCost

      return { model, score, traits, cost }
    })

    return modelScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [state, selectedUseCases, useCaseProfiles])

  const toggleUseCase = (uc: UseCase) => {
    setSelectedUseCases(prev =>
      prev.includes(uc)
        ? prev.filter(u => u !== uc)
        : [...prev, uc]
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Use Case-Based Recommendations
      </h2>

      <div className="mb-6">
        <div className="text-xs font-medium text-gray-700 mb-3">Select your use cases:</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {(Object.keys(useCaseProfiles) as UseCase[]).map(uc => (
            <button
              key={uc}
              onClick={() => toggleUseCase(uc)}
              className={`p-2 rounded-lg border-2 transition-colors text-left ${
                selectedUseCases.includes(uc)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="text-lg mb-1">{useCaseProfiles[uc].emoji}</div>
              <div className="text-xs font-medium text-gray-900 leading-tight">{useCaseProfiles[uc].name.split(' ')[0]}</div>
              <div className="text-xs text-gray-600 leading-tight">{useCaseProfiles[uc].description.split(' ').slice(0, 2).join(' ')}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedUseCases.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Select at least one use case to see recommendations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map(({ model, score, traits, cost }, idx) => (
            <button
              key={model.id}
              onClick={() => onSelectCandidate(model.id)}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-400">#{idx + 1}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{model.name}</div>
                    <div className="text-xs text-gray-600">{model.provider} • {(model.contextWindow / 1000).toFixed(0)}K context</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{(score / 50).toFixed(1)}⭐</div>
                  <div className="text-xs text-gray-600">{fmtCurrency(cost)}/mo</div>
                </div>
              </div>

              {/* Trait bars */}
              <div className="grid grid-cols-5 gap-2 text-xs">
                {['latency', 'reasoning', 'codeQuality', 'contextWindow', 'costEfficiency'].map(trait => (
                  <div key={trait}>
                    <div className="text-gray-600 text-xs mb-1 capitalize">{trait.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div
                        className="bg-blue-600 h-2 rounded"
                        style={{ width: `${(traits[trait as keyof typeof traits] / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-gray-700 mt-1 font-medium">{traits[trait as keyof typeof traits]}/10</div>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How recommendations work:</strong> We weight model strengths (reasoning, code quality, latency, context, cost) based on your selected use cases.
        </p>
        <p>
          <strong>Recommendation score:</strong> Higher scores mean better fit for your use cases. Consider cost and your specific requirements when choosing.
        </p>
        <p>
          <strong>Note:</strong> These recommendations are based on typical model characteristics. Test models with your actual workloads for definitive results.
        </p>
      </div>
    </section>
  )
}
