import { handleReportDownloadApi } from '../../../src/server/p1ApiHandlers'

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
  const reportId = Array.isArray(req.query?.id) ? req.query?.id[0] : req.query?.id
  const result = await handleReportDownloadApi(req.method ?? 'GET', req.body, {
    query: { ...(req.query ?? {}), reportId },
  })
  res.status(result.status).json(result.body)
}
