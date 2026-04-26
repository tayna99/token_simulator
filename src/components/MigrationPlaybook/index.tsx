import { useState } from 'react'
import type { SimState } from '../../App'

interface ChecklistItem {
  id: string
  category: string
  task: string
  description: string
  completed: boolean
  estimatedHours: number
}

interface Props {
  state: SimState
}

export function MigrationPlaybook({ state }: Props) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    // Pre-Migration
    {
      id: 'pm-1',
      category: 'Pre-Migration Planning',
      task: 'Identify all API endpoints using current model',
      description: 'Map every place in your codebase that calls the LLM API. Document model-specific parameters.',
      completed: false,
      estimatedHours: 2,
    },
    {
      id: 'pm-2',
      category: 'Pre-Migration Planning',
      task: 'Document current model parameters & settings',
      description: 'List temperature, max tokens, system prompts, any model-specific settings.',
      completed: false,
      estimatedHours: 1,
    },
    {
      id: 'pm-3',
      category: 'Pre-Migration Planning',
      task: 'Collect sample prompts & inputs',
      description: 'Gather representative examples from production to use for testing.',
      completed: false,
      estimatedHours: 3,
    },
    {
      id: 'pm-4',
      category: 'Pre-Migration Planning',
      task: 'Define success metrics',
      description: 'What does success look like? Response time, quality scores, cost reduction, user satisfaction?',
      completed: false,
      estimatedHours: 2,
    },

    // Development
    {
      id: 'dev-1',
      category: 'Development & Testing',
      task: 'Update client library/SDK versions',
      description: `Ensure you have the latest ${state.candidateModel.name} SDK if needed.`,
      completed: false,
      estimatedHours: 1,
    },
    {
      id: 'dev-2',
      category: 'Development & Testing',
      task: 'Create feature flag for model selection',
      description: 'Implement a flag to toggle between old and new model without code changes.',
      completed: false,
      estimatedHours: 3,
    },
    {
      id: 'dev-3',
      category: 'Development & Testing',
      task: 'Update model parameters in code',
      description: 'Change model ID, adjust temperature/tokens for new model if needed.',
      completed: false,
      estimatedHours: 2,
    },
    {
      id: 'dev-4',
      category: 'Development & Testing',
      task: 'Run candidate model on sample inputs',
      description: 'Test with your collected prompts. Compare quality with current model.',
      completed: false,
      estimatedHours: 4,
    },
    {
      id: 'dev-5',
      category: 'Development & Testing',
      task: 'Test edge cases & error handling',
      description: 'What happens with empty inputs, very long prompts, unexpected formats?',
      completed: false,
      estimatedHours: 3,
    },
    {
      id: 'dev-6',
      category: 'Development & Testing',
      task: 'Measure latency & costs',
      description: 'Run load tests to measure response time and actual API costs.',
      completed: false,
      estimatedHours: 3,
    },

    // Staging
    {
      id: 'staging-1',
      category: 'Staging & QA',
      task: 'Deploy to staging environment',
      description: 'Use feature flag to enable new model for a subset of requests.',
      completed: false,
      estimatedHours: 1,
    },
    {
      id: 'staging-2',
      category: 'Staging & QA',
      task: 'Run QA test suite against staging',
      description: 'Execute all automated tests with new model enabled.',
      completed: false,
      estimatedHours: 2,
    },
    {
      id: 'staging-3',
      category: 'Staging & QA',
      task: 'Manual testing with real users',
      description: 'Have QA team and stakeholders test with the new model.',
      completed: false,
      estimatedHours: 4,
    },
    {
      id: 'staging-4',
      category: 'Staging & QA',
      task: 'Monitor costs in staging',
      description: 'Verify actual costs match projections. Check for cost anomalies.',
      completed: false,
      estimatedHours: 2,
    },

    // Deployment
    {
      id: 'deploy-1',
      category: 'Production Deployment',
      task: 'Create rollback plan',
      description: 'Document exact steps to revert to old model if issues arise.',
      completed: false,
      estimatedHours: 1,
    },
    {
      id: 'deploy-2',
      category: 'Production Deployment',
      task: 'Set up monitoring & alerts',
      description: 'Monitor latency, error rates, costs. Set up alerts for anomalies.',
      completed: false,
      estimatedHours: 2,
    },
    {
      id: 'deploy-3',
      category: 'Production Deployment',
      task: 'Gradual rollout (canary deployment)',
      description: 'Route 5% → 25% → 50% → 100% traffic to new model over time.',
      completed: false,
      estimatedHours: 2,
    },
    {
      id: 'deploy-4',
      category: 'Production Deployment',
      task: 'Monitor for 24 hours post-deployment',
      description: 'Watch error rates, latency, costs, and user feedback closely.',
      completed: false,
      estimatedHours: 8,
    },

    // Post-Deployment
    {
      id: 'post-1',
      category: 'Post-Deployment Verification',
      task: 'Verify success metrics achieved',
      description: 'Do actual results match projections? Quality scores, costs, latency?',
      completed: false,
      estimatedHours: 2,
    },
    {
      id: 'post-2',
      category: 'Post-Deployment Verification',
      task: 'Cleanup: remove old model code',
      description: 'After 1-2 weeks, remove feature flag and old model references.',
      completed: false,
      estimatedHours: 1,
    },
    {
      id: 'post-3',
      category: 'Post-Deployment Verification',
      task: 'Document learnings',
      description: 'What worked? What surprised you? Update runbooks for next migration.',
      completed: false,
      estimatedHours: 1,
    },
  ])

  const toggleTask = (id: string) => {
    setChecklist(checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  const categories = Array.from(new Set(checklist.map(item => item.category)))

  const categoryStats = categories.map(cat => {
    const items = checklist.filter(item => item.category === cat)
    const completed = items.filter(item => item.completed).length
    const totalHours = items.reduce((sum, item) => sum + item.estimatedHours, 0)
    return { category: cat, items, completed, total: items.length, totalHours }
  })

  const overallProgress = Math.round((checklist.filter(i => i.completed).length / checklist.length) * 100)
  const totalEstimatedHours = checklist.reduce((sum, item) => sum + item.estimatedHours, 0)
  const completedHours = checklist
    .filter(item => item.completed)
    .reduce((sum, item) => sum + item.estimatedHours, 0)

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm md:text-base font-semibold text-gray-800">
          Migration Playbook & Checklist
        </h2>
        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-900 rounded">
          {overallProgress}% Complete
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-700 font-medium">Overall Progress</span>
          <span className="text-xs text-gray-600">{completedHours}h / {totalEstimatedHours}h</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {categoryStats.map(({ category, completed, total }) => (
          <div key={category} className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{completed}/{total}</div>
            <div className="text-xs text-gray-600 line-clamp-2">{category}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {categoryStats.map(({ category, items, completed, total, totalHours }) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">{category}</h3>
              <span className="text-xs text-gray-600">
                {completed}/{total} tasks • ~{totalHours}h
              </span>
            </div>

            <div className="space-y-2">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleTask(item.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    item.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => {}}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        item.completed ? 'text-green-900 line-through' : 'text-gray-900'
                      }`}>
                        {item.task}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        ⏱️ Estimated: {item.estimatedHours}h
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-blue-900 mb-1">Total Estimated Effort</div>
          <div className="text-lg font-bold text-blue-900">{totalEstimatedHours} hours</div>
          <div className="text-xs text-blue-700 mt-1">
            ({(totalEstimatedHours / 8).toFixed(1)} engineer-days at 8h/day)
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-green-900 mb-1">Critical Success Factors</div>
          <ul className="text-xs text-green-800 space-y-1">
            <li>✓ Test thoroughly before production (quality regressions are expensive)</li>
            <li>✓ Use feature flags for gradual rollout (canary 5%→25%→50%→100%)</li>
            <li>✓ Monitor costs & latency closely (catch anomalies early)</li>
            <li>✓ Have a quick rollback plan (be ready to revert within minutes)</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>Why this matters:</strong> Migrations often fail because teams skip testing, deploy too quickly, or lack rollback plans. Following this playbook significantly reduces risk.
        </p>
        <p>
          <strong>Timeline:</strong> Most migrations take 2-4 weeks end-to-end. Schedule accordingly.
        </p>
      </div>
    </section>
  )
}
