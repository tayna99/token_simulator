interface VercelRequest {
  method?: string
  body?: unknown
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

function serverEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if ((req.method ?? 'GET') !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const serviceUrl = serverEnv().AGENT_SERVICE_URL?.replace(/\/$/, '')
  if (!serviceUrl) {
    res.status(503).json({
      llmMode: 'deterministic-fallback',
      runtime: {
        status: 'unavailable',
        fallbackReason: 'agent_service_url_not_configured',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      events: [],
      answer: '',
      report: '',
      supervisorSummary: '',
      disagreements: [],
      decisionReadiness: 'needs_review',
      nextQuestions: ['Configure AGENT_SERVICE_URL before running provider-backed agents.'],
      calledAgentIds: [],
      primaryAgentId: null,
      reviewerAgentIds: [],
      agentRoute: {},
      snapshotVersion: '',
      usedTools: [],
      toolResultRefs: [],
      riskCardIds: [],
      decisionIds: [],
      evidenceRefs: [],
      evidenceCoverage: {},
      assetRefs: [],
      warnings: ['agent_service_url_not_configured'],
    })
    return
  }

  try {
    const upstream = await fetch(`${serviceUrl}/api/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    const body = await upstream.json()
    res.status(upstream.status).json(body)
  } catch {
    res.status(503).json({
      llmMode: 'deterministic-fallback',
      runtime: {
        status: 'unavailable',
        fallbackReason: 'agent_service_unreachable',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      events: [],
      answer: '',
      report: '',
      supervisorSummary: '',
      disagreements: [],
      decisionReadiness: 'needs_review',
      nextQuestions: ['Start the Python agent_service before running provider-backed agents.'],
      calledAgentIds: [],
      primaryAgentId: null,
      reviewerAgentIds: [],
      agentRoute: {},
      snapshotVersion: '',
      usedTools: [],
      toolResultRefs: [],
      riskCardIds: [],
      decisionIds: [],
      evidenceRefs: [],
      evidenceCoverage: {},
      assetRefs: [],
      warnings: ['agent_service_unreachable'],
    })
  }
}
