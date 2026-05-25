import { handleAgentApi } from '../../src/server/p1ApiHandlers'

interface VercelRequest {
  method?: string
  body?: unknown
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = await handleAgentApi(req.method ?? 'GET', req.body)
  res.status(result.status).json(result.body)
}
