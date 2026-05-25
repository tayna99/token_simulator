import { handleP1ExternalActionsApi } from '../../src/server/p1ApiHandlers'

interface VercelRequest {
  method?: string
  body?: unknown
  query?: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = await handleP1ExternalActionsApi(req.method ?? 'GET', req.body, { query: req.query })
  res.status(result.status).json(result.body)
}
